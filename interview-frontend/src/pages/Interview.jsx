import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Mic,
  MicOff,
  Send,
  MessageSquare,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { interviewApi, proctorApi } from "../services/api";
import { cn } from "../utils/utils";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function appendTranscript(currentText, nextText) {
  const base = String(currentText || "").trim();
  const transcript = String(nextText || "").trim();

  if (!transcript) return base;
  if (!base) return transcript;
  return `${base} ${transcript}`;
}

function hasActiveAudioTrack(stream) {
  if (!stream) return false;
  return stream.getAudioTracks().some((track) => track.readyState === "live" && track.enabled !== false);
}

function stopStreamTracks(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

function getPreferredAudioMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  return candidates.find((type) => window.MediaRecorder.isTypeSupported(type)) || "";
}

async function attachPreviewStream(videoElement, stream) {
  if (!videoElement) return;
  videoElement.srcObject = stream;
  videoElement.muted = true;
  videoElement.playsInline = true;

  try {
    await videoElement.play();
  } catch {
    await new Promise((resolve) => {
      const timeoutId = window.setTimeout(resolve, 500);
      videoElement.onloadedmetadata = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
    });
    try {
      await videoElement.play();
    } catch {
      // Some browsers still block autoplay; the assigned srcObject is retained.
    }
  }
}

export default function Interview() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [maxQuestions, setMaxQuestions] = useState(1);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [previewWarning, setPreviewWarning] = useState("");

  const videoRef = useRef(null);
  const autoSubmittedRef = useRef(false);
  const streamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const consentGiven = sessionStorage.getItem(`interview-consent:${resultId}`) === "true";
      const response = await interviewApi.start({
        result_id: Number(resultId),
        consent_given: consentGiven,
      });

      if (response.interview_completed || !response.current_question) {
        navigate(`/interview/${resultId}/completed`, { replace: true });
        return;
      }

      setSessionId(response.session_id);
      setCurrentQuestion(response.current_question);
      setQuestionNumber(response.question_number || 1);
      setMaxQuestions(response.max_questions || 1);
      setTimeLeft(response.time_limit_seconds || 0);
      setTotalTimeLeft(response.remaining_total_seconds || 0);
      autoSubmittedRef.current = false;
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [navigate, resultId]);

  const releaseAudioStream = useCallback(() => {
    if (audioStreamRef.current) {
      stopStreamTracks(audioStreamRef.current);
      audioStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    let disposed = false;
    const videoElement = videoRef.current;

    async function startPreview() {
      setPreviewReady(false);
      setPreviewWarning("");

      if (streamRef.current) {
        stopStreamTracks(streamRef.current);
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        await attachPreviewStream(videoElement, stream);
        setPreviewReady(true);
        return;
      } catch {
        // Fall back to camera-only if audio permission blocks the combined request.
      }

      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (disposed) {
          videoOnlyStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = videoOnlyStream;
        await attachPreviewStream(videoElement, videoOnlyStream);
        setPreviewReady(true);
        setPreviewWarning("Microphone permission is unavailable. Camera preview is still active.");
      } catch {
        setPreviewWarning("Camera preview is unavailable. Check browser camera permission and device access.");
      }
    }

    startPreview();

    return () => {
      disposed = true;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        recorderRef.current = null;
      }
      releaseAudioStream();
      if (streamRef.current) {
        stopStreamTracks(streamRef.current);
        streamRef.current = null;
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [releaseAudioStream]);

  useEffect(() => {
    if (!currentQuestion || loading || isSubmitting) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setTotalTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, isSubmitting, loading]);

  const submitAnswer = useCallback(async ({ skipCurrent = false, answerOverride } = {}) => {
    if (!sessionId || !currentQuestion) return;

    const resolvedAnswer = skipCurrent ? "" : String(answerOverride ?? answer);
    const normalizedAnswer = resolvedAnswer.trim();

    setIsSubmitting(true);
    setError("");
    try {
      const timeTaken = Math.max(0, (currentQuestion.allotted_seconds || 0) - timeLeft);
      const response = await interviewApi.submitAnswer({
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer_text: skipCurrent ? "" : resolvedAnswer,
        skipped: skipCurrent || !normalizedAnswer,
        time_taken_sec: timeTaken,
      });

      setTranscripts((current) => [
        ...current,
        {
          q: currentQuestion.text,
          a: skipCurrent ? "" : resolvedAnswer,
        },
      ]);

      if (response.interview_completed || !response.next_question) {
        navigate(`/interview/${resultId}/completed`);
        return;
      }

      setCurrentQuestion(response.next_question);
      setQuestionNumber(response.question_number || questionNumber + 1);
      setMaxQuestions(response.max_questions || maxQuestions);
      setTimeLeft(response.time_limit_seconds || 0);
      setTotalTimeLeft(response.remaining_total_seconds || 0);
      setAnswer("");
      setIsRecording(false);
      setIsTranscribing(false);
      autoSubmittedRef.current = false;
    } catch (submitError) {
      setError(submitError.message);
      autoSubmittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [answer, currentQuestion, maxQuestions, navigate, questionNumber, resultId, sessionId, timeLeft]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return "";
    }

    setIsRecording(false);
    setIsTranscribing(true);
    setError("");

    try {
      const transcript = await new Promise((resolve, reject) => {
        recorder.onerror = (event) => {
          const message = event?.error?.message || "Voice recording failed. Check microphone access and try again.";
          reject(new Error(message));
        };

        recorder.onstop = async () => {
          recorderRef.current = null;

          try {
            const mimeType = recorder.mimeType || getPreferredAudioMimeType() || "audio/webm";
            const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
            recordedChunksRef.current = [];
            releaseAudioStream();

            if (!audioBlob.size) {
              resolve("");
              return;
            }

            const formData = new FormData();
            const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
            const preferredLanguage = (navigator.language || "en").split("-")[0] || "en";

            formData.append("audio", audioBlob, `answer.${extension}`);
            formData.append("language", preferredLanguage);

            const response = await interviewApi.transcribe(formData);
            resolve(String(response?.text || "").trim());
          } catch (transcriptionError) {
            reject(transcriptionError);
          }
        };

        recorder.stop();
      });

      return transcript;
    } finally {
      setIsTranscribing(false);
    }
  }, [releaseAudioStream]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
      setError("Voice recording is not supported in this browser. Use Chrome, Edge, or Brave.");
      return;
    }

    setError("");

    try {
      let recordingStream;

      if (hasActiveAudioTrack(streamRef.current)) {
        recordingStream = new MediaStream(streamRef.current.getAudioTracks());
      } else {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioStreamRef.current = recordingStream;
      }

      recordedChunksRef.current = [];

      const mimeType = getPreferredAudioMimeType();
      const recorder = mimeType
        ? new window.MediaRecorder(recordingStream, { mimeType })
        : new window.MediaRecorder(recordingStream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        recorderRef.current = null;
        recordedChunksRef.current = [];
        releaseAudioStream();
        setIsRecording(false);
        setError("Voice recording failed. Check microphone access and try again.");
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      releaseAudioStream();
      setError("Microphone access is unavailable. Allow microphone permission and try again.");
    }
  }, [releaseAudioStream]);

  const handleRecordingToggle = useCallback(async () => {
    if (isSubmitting || isTranscribing) {
      return;
    }

    if (!isRecording) {
      await startRecording();
      return;
    }

    try {
      const transcript = await stopRecordingAndTranscribe();
      if (!transcript) {
        setError("No speech was detected. Try again or edit your answer manually.");
        return;
      }

      setAnswer((current) => appendTranscript(current, transcript));
    } catch (recordingError) {
      setError(recordingError.message);
    }
  }, [isRecording, isSubmitting, isTranscribing, startRecording, stopRecordingAndTranscribe]);

  const captureAndUploadFrame = useCallback(async () => {
    if (!sessionId || !videoRef.current || !previewReady) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      ctx.drawImage(videoRef.current, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          try {
            await proctorApi.uploadFrame(sessionId, blob);
          } catch {
            // Silently fail frame uploads to not interrupt the interview
          }
        },
        "image/jpeg",
        0.7
      );
    } catch {
      // Silently fail frame capture to not interrupt the interview
    }
  }, [sessionId, previewReady]);

  const handleSubmit = useCallback(async (skipCurrent = false) => {
    if (isSubmitting || isTranscribing) {
      return;
    }

    let nextAnswer = answer;

    if (isRecording) {
      try {
        const transcript = await stopRecordingAndTranscribe();
        nextAnswer = appendTranscript(answer, transcript);

        if (transcript) {
          setAnswer(nextAnswer);
        }
      } catch (submitError) {
        setError(submitError.message);
        autoSubmittedRef.current = false;
        return;
      }
    }

    await submitAnswer({
      skipCurrent,
      answerOverride: nextAnswer,
    });
  }, [answer, isRecording, isSubmitting, isTranscribing, stopRecordingAndTranscribe, submitAnswer]);

  useEffect(() => {
    if (!currentQuestion || isSubmitting || isTranscribing) return;
    if (timeLeft > 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void handleSubmit(false);
  }, [currentQuestion, handleSubmit, isSubmitting, isTranscribing, timeLeft]);

  useEffect(() => {
    if (!sessionId || !previewReady) return;

    // Capture and upload frames every 15 seconds for proctoring
    const frameInterval = setInterval(() => {
      captureAndUploadFrame();
    }, 15000);

    return () => clearInterval(frameInterval);
  }, [sessionId, previewReady, captureAndUploadFrame]);

  if (loading) {
    return <p className="center muted">Starting interview session...</p>;
  }

  if (error && !currentQuestion) {
    return <p className="alert error">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-4 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        <div className="lg:col-span-2 space-y-6">
          {error ? <p className="alert error">{error}</p> : null}
          {previewWarning ? <p className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 px-4 py-3">{previewWarning}</p> : null}

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-10 h-10 rounded-xl flex items-center justify-center font-bold">
                {questionNumber}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                  Question {questionNumber} of {maxQuestions}
                </h4>
                <p className="text-slate-900 dark:text-white font-bold mt-1">Live Interview Session</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question Timer</p>
                <p className={cn("text-xl font-black font-mono", timeLeft < 20 ? "text-red-500 animate-pulse" : "text-slate-900 dark:text-white")}>
                  {formatTime(timeLeft)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Time</p>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">{formatTime(totalTimeLeft)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 transition-all duration-300 group-hover:w-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white font-display leading-tight">
              {currentQuestion?.text}
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
                <MessageSquare className="mr-2 text-blue-600" size={18} />
                Your Response
              </h4>
              <div className="flex items-center space-x-2">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isRecording
                      ? "bg-red-500 animate-pulse"
                      : isTranscribing
                        ? "bg-amber-500 animate-pulse"
                        : "bg-emerald-500",
                  )}
                />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "Voice Ready"}
                </span>
              </div>
            </div>

            <textarea
              className="w-full h-48 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 text-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none font-medium leading-relaxed"
              placeholder="Your Whisper transcript appears here. You can still edit before submitting."
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Voice-first mode uses Whisper transcription. Typed edits are optional.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRecordingToggle}
                  disabled={isSubmitting || isTranscribing}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl font-black transition-all disabled:cursor-not-allowed disabled:opacity-60",
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200",
                  )}
                >
                  {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                  <span>{isRecording ? "Stop & Transcribe" : isTranscribing ? "Transcribing..." : "Start Speaking"}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAnswer("")}
                  disabled={isSubmitting || isTranscribing}
                  className="flex-1 sm:flex-none px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || isTranscribing}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-all shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{isSubmitting ? "Submitting..." : questionNumber === maxQuestions ? "Finish Interview" : "Next Question"}</span>
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
              <Activity className="mr-2 text-emerald-500" size={18} />
              Proctoring Feed
            </h4>
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800">
              <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
              {!previewReady ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <Activity size={32} className="mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No Live Preview</p>
                </div>
              ) : null}
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Video</span>
                  <div className={cn("w-2 h-2 rounded-full", previewReady ? "bg-emerald-500" : "bg-red-500")} />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">{previewReady ? "Active" : "Unavailable"}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">#{sessionId}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6 flex-1 flex flex-col min-h-[400px]">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
              <CheckCircle2 className="mr-2 text-blue-600" size={18} />
              Session Log
            </h4>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {transcripts.length === 0 && (
                <div className="text-center py-12 opacity-30">
                  <MessageSquare size={48} className="mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No history yet</p>
                </div>
              )}
              {transcripts.map((item, index) => (
                <div key={`${item.q}-${index}`} className="space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Question {index + 1}</p>
                  <p className="text-xs text-slate-900 dark:text-white font-bold line-clamp-2">{item.q}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-3">"{item.a || "(skipped)"}"</p>
                </div>
              ))}
              {isRecording && (
                <div className="space-y-2 border-l-2 border-blue-500 pl-4 animate-pulse">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Recording...</p>
                  <p className="text-xs text-slate-400 italic">Your voice answer is being captured for Whisper transcription.</p>
                </div>
              )}
              {isTranscribing && (
                <div className="space-y-2 border-l-2 border-amber-500 pl-4 animate-pulse">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Transcribing...</p>
                  <p className="text-xs text-slate-400 italic">Please wait while Whisper converts your voice answer to text.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
