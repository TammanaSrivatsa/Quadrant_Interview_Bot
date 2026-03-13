import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Play,
  FileSearch,
  Star,
  Clock,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import StepChecklist from "../components/StepChecklist";
import { candidateApi } from "../services/api";
import { cn } from "../utils/utils";

function routeFromInterviewLink(interviewLink) {
  if (!interviewLink) return "";
  try {
    return new URL(interviewLink).pathname;
  } catch {
    return interviewLink;
  }
}

export default function CandidateDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [message, setMessage] = useState("");

  const selectedJd = useMemo(() => {
    return (dashboard?.available_jds || []).find((jd) => jd.id === dashboard?.selected_jd_id) || null;
  }, [dashboard]);

  const result = dashboard?.result || null;
  const explanation = result?.explanation || {};
  const resumeAdvice = dashboard?.resume_advice || null;
  const matchedSkills = explanation?.matched_skills || [];
  const missingSkills = explanation?.missing_skills || [];
  const interviewRoute = routeFromInterviewLink(result?.interview_link);
  const applicationStatusRoute = "/interview/result";
  const interviewSessionStatus = String(result?.interview_session_status || "").toLowerCase();
  const interviewReady = Boolean(result?.interview_ready && interviewRoute);
  const interviewScheduled = Boolean(result?.interview_scheduled);
  const interviewInProgress = interviewSessionStatus === "in_progress";
  const interviewCompleted = Boolean(result?.interview_completed);
  const finalDecision = result?.final_decision || null;
  const showStartInterview = interviewReady && !interviewCompleted && !finalDecision;
  const canScheduleInterview =
    Boolean(result?.shortlisted) && !interviewInProgress && !interviewCompleted && !finalDecision;

  let interviewStepDescription = "Shortlist required first";
  if (finalDecision === "selected") {
    interviewStepDescription = "HR marked your application as selected";
  } else if (finalDecision === "rejected") {
    interviewStepDescription = "HR completed the final review";
  } else if (interviewCompleted) {
    interviewStepDescription = "Interview submitted and waiting for HR review";
  } else if (interviewInProgress) {
    interviewStepDescription = "Interview session is active";
  } else if (interviewReady) {
    interviewStepDescription = "Interview access unlocked";
  } else if (interviewScheduled) {
    interviewStepDescription = "Interview scheduled";
  } else if (result?.shortlisted) {
    interviewStepDescription = "Pick interview date to unlock access";
  }

  async function loadDashboard(jobId) {
    setLoading(true);
    setError("");
    try {
      const response = await candidateApi.dashboard(jobId);
      setDashboard(response);
      setMessage("");
      if (response?.result?.interview_date) {
        setScheduleDate(String(response.result.interview_date).slice(0, 16));
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleSelectJd(event) {
    const jdId = Number(event.target.value);
    setError("");
    setMessage("");
    try {
      await candidateApi.selectJd(jdId);
      await loadDashboard(jdId);
    } catch (selectError) {
      setError(selectError.message);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !dashboard?.selected_jd_id) {
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    try {
      const response = await candidateApi.uploadResume(file, dashboard.selected_jd_id);
      setDashboard(response);
      setMessage(response.message || "Resume uploaded successfully.");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleScheduleInterview() {
    if (!result?.id || !scheduleDate) {
      setError("Pick an interview date and time first.");
      return;
    }

    setScheduling(true);
    setError("");
    setMessage("");
    try {
      const response = await candidateApi.scheduleInterview(result.id, scheduleDate);
      setDashboard((current) =>
        current
          ? {
              ...current,
              result: response.result,
            }
          : current,
      );
      setMessage(response.message || "Interview scheduled.");
    } catch (scheduleError) {
      setError(scheduleError.message);
    } finally {
      setScheduling(false);
    }
  }

  const steps = [
    { title: "Account Ready", description: "Profile is active", completed: true },
    {
      title: "JD Selected",
      description: selectedJd ? selectedJd.title : "Select a role to apply",
      completed: Boolean(selectedJd),
    },
    {
      title: "Resume Uploaded",
      description: dashboard?.candidate?.resume_path ? "Resume stored successfully" : "Upload your latest resume",
      completed: Boolean(dashboard?.candidate?.resume_path),
    },
    {
      title: "AI Analysis",
      description: result ? "Resume evaluated against the JD" : "Resume screening pending",
      completed: Boolean(result),
    },
    {
      title: "Interview Stage",
      description: interviewStepDescription,
      completed: Boolean(
        result?.shortlisted ||
          interviewScheduled ||
          interviewReady ||
          interviewCompleted ||
          finalDecision
      ),
    },
  ];

  if (loading) {
    return <p className="center muted">Loading candidate workspace...</p>;
  }

  if (error && !dashboard) {
    return <p className="alert error">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">Candidate Workspace</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Select a JD, upload your resume, and track interview readiness.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadDashboard(dashboard?.selected_jd_id)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <Link
            to="/candidate/practice"
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center space-x-2"
          >
            <Play size={18} className="text-blue-600" />
            <span>Practice Mode</span>
          </Link>
          {showStartInterview ? (
            <Link
              to={interviewRoute}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center space-x-2"
            >
              <span>{interviewInProgress ? "Resume Interview" : "Start Scheduled Interview"}</span>
              <ArrowRight size={18} />
            </Link>
          ) : interviewCompleted || finalDecision ? (
            <Link
              to={applicationStatusRoute}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center space-x-2"
            >
              <span>{finalDecision ? "View Final Outcome" : "View Application Status"}</span>
              <ArrowRight size={18} />
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="alert error">{error}</p> : null}
      {message ? <p className="alert success">{message}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Apply for Role</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Choose the JD you want the AI screening to evaluate.</p>
              </div>
              <div className="w-full md:w-80">
                <select
                  value={dashboard?.selected_jd_id || ""}
                  onChange={handleSelectJd}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                >
                  <option value="" disabled>
                    Select a JD
                  </option>
                  {(dashboard?.available_jds || []).map((jd) => (
                    <option key={jd.id} value={jd.id}>
                      {jd.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                  <input
                    type="text"
                    value={dashboard?.candidate?.name || ""}
                    disabled
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                  <input
                    type="email"
                    value={dashboard?.candidate?.email || ""}
                    disabled
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white"
                  />
                </div>
              </div>

              {selectedJd ? (
                <div className="p-6 rounded-3xl bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Selected JD</p>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{selectedJd.title}</h3>
                    </div>
                    <div className="text-right text-sm text-slate-600 dark:text-slate-300">
                      <p>Qualify score: <span className="font-bold">{selectedJd.qualify_score}%</span></p>
                      <p>Min academic: <span className="font-bold">{Number(selectedJd.min_academic_percent || 0)}%</span></p>
                      <p>Questions: <span className="font-bold">{selectedJd.total_questions}</span></p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Upload Resume (PDF/DOCX/TXT)</label>
                <label
                  className={cn(
                    "relative flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer group",
                    uploading
                      ? "border-blue-400 bg-blue-50/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/30",
                  )}
                >
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading || !dashboard?.selected_jd_id} />
                  {uploading ? (
                    <div className="text-center w-full max-w-xs">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock size={32} className="text-blue-600 animate-spin" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">Uploading and analyzing...</h4>
                      <p className="text-xs text-slate-500 mt-3 font-bold">The backend is evaluating your resume against the selected JD.</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all">
                        <Upload size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        {dashboard?.selected_jd_id ? "Click to upload or drag and drop" : "Select a JD before uploading"}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {dashboard?.candidate?.resume_path ? "Resume already uploaded. Upload again to replace it." : "Support PDF, DOCX, TXT"}
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {result ? (
            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center font-display">
                    <FileSearch className="text-blue-600 mr-3" size={28} />
                    AI Resume Analysis Result
                  </h3>
                  <StatusBadge status={result.shortlisted ? "Shortlisted" : "Rejected"} className="text-sm px-4 py-1.5" />
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                    <div className="text-5xl font-black text-blue-600 mb-2">{Math.round(result.score)}%</div>
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">Match Score</p>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Matching Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {matchedSkills.length ? matchedSkills.map((skill) => (
                          <span key={skill} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-800/50">
                            {skill}
                          </span>
                        )) : <span className="text-sm text-slate-500 dark:text-slate-400">No matched skills were extracted yet.</span>}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Missing Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.length ? missingSkills.map((skill) => (
                          <span key={skill} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold border border-red-100 dark:border-red-800/50">
                            {skill}
                          </span>
                        )) : <span className="text-sm text-slate-500 dark:text-slate-400">No major skill gaps detected.</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {Array.isArray(explanation?.reasons) && explanation.reasons.length ? (
                  <div className="mt-8 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Why the AI scored it this way</h4>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {explanation.reasons.map((reason) => (
                        <li key={reason} className="flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 mr-3 flex-shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                    <Star className="text-yellow-500 mr-2" size={20} />
                    Resume Strengths
                  </h4>
                  <ul className="space-y-4">
                    {(resumeAdvice?.strengths || []).map((item) => (
                      <li key={item} className="flex items-start text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                    {!resumeAdvice?.strengths?.length ? (
                      <li className="text-sm text-slate-500 dark:text-slate-400">Upload a resume to generate improvement insights.</li>
                    ) : null}
                  </ul>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                    <AlertCircle className="text-blue-500 mr-2" size={20} />
                    Rewrite Tips
                  </h4>
                  <ul className="space-y-4">
                    {(resumeAdvice?.rewrite_tips || []).map((item) => (
                      <li key={item} className="flex items-start text-sm text-slate-600 dark:text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 mr-3 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                    {!resumeAdvice?.rewrite_tips?.length ? (
                      <li className="text-sm text-slate-500 dark:text-slate-400">Advice will appear here after resume analysis.</li>
                    ) : null}
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-lg text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-xl">
                    <h3 className="text-2xl font-bold font-display">Interview Scheduling</h3>
                    <p className="text-blue-100 mt-2">
                      {finalDecision === "selected"
                        ? "HR has completed the final review. Your application has been marked as selected."
                        : finalDecision === "rejected"
                        ? "HR has completed the final review for this application."
                        : interviewCompleted
                        ? "Your interview has been submitted successfully. The recruitment team is now reviewing it."
                        : interviewInProgress
                        ? "Your live interview session is already active. Resume it from the interview action above."
                        : result.interview_ready
                        ? "Your interview is unlocked. You can use the scheduled interview link now."
                        : result.shortlisted
                        ? "Pick a time slot to unlock the live AI interview link."
                        : "This JD is not shortlisted yet. Improve the resume and upload again before scheduling."}
                    </p>
                  </div>
                  {interviewCompleted || finalDecision ? (
                    <Link
                      to={applicationStatusRoute}
                      className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white text-blue-600 font-black text-lg hover:scale-[1.01] shadow-xl shadow-blue-900/20 transition-all"
                    >
                      {finalDecision ? "Open Final Outcome" : "Open Application Status"}
                    </Link>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-700 w-4 h-4" />
                        <input
                          type="datetime-local"
                          value={scheduleDate}
                          onChange={(event) => setScheduleDate(event.target.value)}
                          disabled={!canScheduleInterview || scheduling}
                          className="pl-10 pr-4 py-3 rounded-2xl text-slate-900 bg-white outline-none min-w-[250px]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleScheduleInterview}
                        disabled={!canScheduleInterview || scheduling}
                        className={cn(
                          "px-8 py-4 rounded-2xl font-black text-lg transition-all",
                          result.shortlisted
                            ? "bg-white text-blue-600 hover:scale-[1.01] shadow-xl shadow-blue-900/20"
                            : "bg-blue-300 text-blue-100 cursor-not-allowed",
                        )}
                      >
                        {scheduling ? "Scheduling..." : interviewScheduled ? "Reschedule" : "Schedule Interview"}
                      </button>
                    </div>
                  )}
                </div>
                {interviewScheduled ? (
                  <p className="mt-4 text-sm text-blue-100">
                    Scheduled for: <span className="font-bold">{new Date(result.interview_date).toLocaleString()}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-8">Application Progress</h4>
            <StepChecklist steps={steps} />
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Resume Breakdown</h4>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Semantic Score</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(Number(explanation?.semantic_score || 0))}%</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Skill Match</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(Number(explanation?.matched_percentage || 0))}%</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Experience Check</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(Number(explanation?.experience_score || 0))}%</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Academic Cutoff</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {Number(explanation?.min_academic_percent_required || 0) > 0
                    ? `${explanation?.academic_cutoff_met ? "Passed" : "Not met"} (${explanation?.detected_academic_percent != null ? Math.round(Number(explanation.detected_academic_percent)) + "%" : "not detected"} / ${Math.round(Number(explanation.min_academic_percent_required || 0))}%)`
                    : "No cutoff configured"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Next Steps</h4>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {(resumeAdvice?.next_steps || []).map((step) => (
                <p key={step} className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 mr-3 flex-shrink-0" />
                  {step}
                </p>
              ))}
              {!resumeAdvice?.next_steps?.length ? (
                <p className="text-slate-500 dark:text-slate-400">The backend will generate next steps after resume scoring is completed.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
