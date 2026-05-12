import { BriefcaseBusiness } from "lucide-react";

export default function ApplicationsEmptyState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
        <BriefcaseBusiness size={30} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">You haven't applied to any jobs yet.</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Submitted applications will appear here with status updates from recruiters.
      </p>
    </div>
  );
}
