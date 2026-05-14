import { CheckCircle2, FileText, UploadCloud } from "lucide-react";
import { cn } from "../../utils/utils";

export default function ResumeUploadPanel({ hasResume, resumeName, uploading, onUpload, compact = false }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", compact ? "p-4" : "p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex shrink-0 items-center justify-center rounded-full ring-1", hasResume ? "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900" : "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900", compact ? "h-10 w-10" : "h-12 w-12")}>
            {hasResume ? <CheckCircle2 size={22} /> : <FileText size={22} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Resume</h2>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400" title={hasResume ? resumeName || "Resume uploaded and ready" : undefined}>
              {hasResume ? resumeName || "Resume uploaded and ready" : "Upload a PDF, DOC, or DOCX before applying"}
            </p>
          </div>
        </div>
        <label className={cn("inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 dark:shadow-blue-950/30", uploading ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700")}>
          <UploadCloud size={18} className={uploading ? "animate-pulse" : ""} />
          <span>{uploading ? "Uploading..." : hasResume ? "Replace Resume" : "Upload Resume"}</span>
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" disabled={uploading} onChange={onUpload} />
        </label>
      </div>
    </section>
  );
}
