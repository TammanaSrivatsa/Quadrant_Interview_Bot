import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { interviewApi, proctorApi } from "../services/api";

export default function Interview() {
  const { resultId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const interviewToken = new URLSearchParams(location.search).get("token") || "";

  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [maxQuestions, setMaxQuestions] = useState(1);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // LOAD SESSION
  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await interviewApi.start({
        result_id: Number(resultId),
        interview_token: interviewToken,
      });

      if (!res.current_question) {
        navigate(`/interview/${resultId}/completed`);
        return;
      }

      setSessionId(res.session_id);
      setCurrentQuestion(res.current_question);
      setQuestionNumber(res.question_number || 1);
      setMaxQuestions(res.max_questions || 1);
      setTimeLeft(res.time_limit_seconds || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [resultId, interviewToken, navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // TIMER
  useEffect(() => {
    if (!currentQuestion) return;
    const t = setInterval(() => {
      setTimeLeft((p) => (p > 0 ? p - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [currentQuestion]);

  // CAMERA
  useEffect(() => {
    async function initCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setPreviewReady(true);
        }
      } catch {
        setPreviewReady(false);
      }
    }
    initCam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // SUBMIT
  const handleSubmit = async () => {
    if (!sessionId || !currentQuestion) return;
    setIsSubmitting(true);
    try {
      const res = await interviewApi.submitAnswer({
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer_text: answer,
      });

      if (!res.next_question) {
        navigate(`/interview/${resultId}/completed`);
        return;
      }

      setCurrentQuestion(res.next_question);
      setAnswer("");
      setQuestionNumber(res.question_number);
      setTimeLeft(res.time_limit_seconds || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold">Live AI Interview</h1>
          <div>{formatTime(timeLeft)}</div>
        </div>

        {/* PROGRESS */}
        <div className="flex gap-2">
          {[...Array(maxQuestions)].map((_, i) => (
            <div key={i} className={i < questionNumber ? "bg-green-500 w-4 h-2" : "bg-gray-300 w-4 h-2"} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-4">

            {/* QUESTION */}
            <div className="bg-white border rounded-2xl p-6">
              <h2 className="text-lg font-bold">{currentQuestion?.text}</h2>
            </div>

            {/* ANSWER */}
            <div className="bg-white border rounded-2xl p-6 space-y-4">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full h-40 border rounded p-3"
                placeholder="Type your answer..."
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </button>

                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 text-white py-2 rounded"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <div className="bg-white border rounded-2xl p-4">
              <h3>Camera</h3>
              <video ref={videoRef} autoPlay className="w-full" />
              {!previewReady && <p>Camera not ready</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}