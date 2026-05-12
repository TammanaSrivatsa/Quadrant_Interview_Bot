import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";
import ApplicationStatusBadge, { APPLICATION_STATUSES } from "./ApplicationStatusBadge";

function countByStatus(applications) {
  return applications.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
}

export default function ApplicationsOverview({ applications }) {
  const counts = countByStatus(applications);
  const recent = applications.slice(0, 4);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">My Applications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{applications.length} submitted applications</p>
          </div>
        </div>
        <Link to="/candidate/applications" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-300">
          View all <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {APPLICATION_STATUSES.map((status) => (
          <div key={status} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-xl font-black text-slate-950 dark:text-white">{counts[status] || 0}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{status}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent</h3>
        {recent.length ? recent.map((application) => (
          <Link key={application.id} to="/candidate/applications" className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-slate-800">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{application.jobTitle}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{application.updatedAt ? `Updated ${new Date(application.updatedAt).toLocaleDateString()}` : "Status pending"}</p>
            </div>
            <ApplicationStatusBadge status={application.status} />
          </Link>
        )) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Applications you submit will appear here.
          </div>
        )}
      </div>
    </section>
  );
}
