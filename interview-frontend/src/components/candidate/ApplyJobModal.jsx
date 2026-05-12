import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, UploadCloud, X } from "lucide-react";

const JOB_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
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

  useEffect(() => {
    if (!hasResume && activeOption === "existing") {
      setActiveOption("new");
    }
  }, [hasResume, activeOption]);

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
    if (activeOption === "existing" && hasResume) {
      onApplyExisting();
    } else if (activeOption === "new" && selectedFile) {
      onApplyNew(selectedFile);
    }
  }

  const canSubmit =
    !loading &&
    ((activeOption === "existing" && hasResume) ||
      (activeOption === "new" && selectedFile));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-black ${getJobColor(job?.title)}`}
              aria-hidden="true"
            >
              {(job?.title || "J")[0]}
            </div>
            <div className="min-w-0">
              <h2
                id="apply-modal-title"
                className="text-lg font-black text-slate-950 dark:text-white"
              >
                Apply for Job
              </h2>
              <p className="text-sm text-slate-500 truncate dark:text-slate-400">
                {job?.title || "Position"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
            Choose how to apply
          </p>

          {/* Option A: Existing Resume */}
          {hasResume && (
            <button
              type="button"
              onClick={() => setActiveOption("existing")}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-all duration-150 ${
                activeOption === "existing"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-500"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                    activeOption === "existing"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <FileText size={19} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Apply with Existing Resume
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {resumeName || "Resume uploaded and ready"}
                  </p>
                </div>
                {activeOption === "existing" && (
                  <CheckCircle2 size={20} className="flex-shrink-0 text-blue-600" />
                )}
              </div>
            </button>
          )}

          {/* Option B: New Resume */}
          <label
            className={`block w-full rounded-2xl border-2 p-4 cursor-pointer transition-all duration-150 ${
              activeOption === "new"
                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-500"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                  activeOption === "new"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <UploadCloud size={19} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {hasResume ? "Apply with New Resume" : "Upload Resume & Apply"}
                </p>
                {selectedFile ? (
                  <p className="mt-0.5 text-xs font-semibold text-green-600 dark:text-green-400 truncate">
                    {selectedFile.name}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    PDF, DOC, or DOCX — click to browse
                  </p>
                )}
              </div>
              {activeOption === "new" && selectedFile && (
                <CheckCircle2 size={20} className="flex-shrink-0 text-blue-600" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Applying…
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
