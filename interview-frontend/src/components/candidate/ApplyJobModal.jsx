import { useRef, useState } from "react";
import { CheckCircle2, FileText, UploadCloud, X } from "lucide-react";

const JOB_COLORS = [
  "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
];

function getJobColor(title) {
  const index = ((title || "").charCodeAt(0) || 0) % JOB_COLORS.length;
  return JOB_COLORS[index];
}

export default function ApplyJobModal({
  job,
  hasResume,
  resumeName,
  loading = false,
  onClose,
  onApplyExisting,
  onApplyNew,
}) {
  const [activeOption, setActiveOption] = useState(hasResume ? "existing" : "new");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const effectiveActiveOption = hasResume ? activeOption : "new";

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (file) {
      setSelectedFile(file);
      setActiveOption("new");
    }
  }

  function handleSubmit() {
    if (loading) return;
    if (effectiveActiveOption === "existing" && hasResume) {
      onApplyExisting();
    } else if (effectiveActiveOption === "new" && selectedFile) {
      onApplyNew(selectedFile);
    }
  }

  const canSubmit =
    !loading &&
    ((effectiveActiveOption === "existing" && hasResume) ||
      (effectiveActiveOption === "new" && selectedFile));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black ${getJobColor(job?.title)}`}
              aria-hidden="true"
            >
              {(job?.title || "J")[0]}
            </div>
            <div className="min-w-0">
              <h2 id="apply-modal-title" className="text-lg font-black text-slate-950 dark:text-white">
                Apply for Job
              </h2>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {job?.title || "Position"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            Resume options
          </p>

          {hasResume && (
            <button
              type="button"
              onClick={() => setActiveOption("existing")}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-150 ${
                effectiveActiveOption === "existing"
                  ? "border-blue-500 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.08)] dark:bg-blue-950/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                    effectiveActiveOption === "existing"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <FileText size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Use existing resume
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {resumeName || "Resume uploaded and ready"}
                  </p>
                </div>
                {effectiveActiveOption === "existing" && <CheckCircle2 size={20} className="shrink-0 text-blue-600" />}
              </div>
            </button>
          )}

          <label
            className={`block w-full cursor-pointer rounded-2xl border p-4 transition-all duration-150 ${
              effectiveActiveOption === "new"
                ? "border-blue-500 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.08)] dark:bg-blue-950/20"
                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                  effectiveActiveOption === "new"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <UploadCloud size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {hasResume ? "Upload a new resume" : "Upload resume and apply"}
                </p>
                {selectedFile ? (
                  <p className="mt-0.5 truncate text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedFile.name}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    PDF, DOC, or DOCX - click to browse
                  </p>
                )}
              </div>
              {effectiveActiveOption === "new" && selectedFile && <CheckCircle2 size={20} className="shrink-0 text-blue-600" />}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
              onClick={() => setActiveOption("new")}
            />
          </label>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:shadow-blue-950/30 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Applying...
              </span>
            ) : (
              "Confirm Apply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
