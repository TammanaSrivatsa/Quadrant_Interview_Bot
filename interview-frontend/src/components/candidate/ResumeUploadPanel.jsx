import { CheckCircle2, FileText, UploadCloud } from "lucide-react";
import { cn } from "../../utils/utils";

export default function ResumeUploadPanel({ hasResume, resumeName, uploading, onUpload, compact = false }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", compact ? "p-4" : "p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center rounded-xl", hasResume ? "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-300" : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300", compact ? "h-10 w-10" : "h-12 w-12")}>
            {hasResume ? <CheckCircle2 size={22} /> : <FileText size={22} />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Resume</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hasResume ? resumeName || "Resume uploaded and ready" : "Upload a PDF, DOC, or DOCX before applying"}
            </p>
          </div>
        </div>
        <label className={cn("inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5", uploading ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700")}>
          <UploadCloud size={18} className={uploading ? "animate-pulse" : ""} />
          <span>{uploading ? "Uploading..." : hasResume ? "Replace Resume" : "Upload Resume"}</span>
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploading} onChange={onUpload} />
        </label>
      </div>
    </section>
  );
}
