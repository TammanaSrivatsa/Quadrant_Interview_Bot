import { Bookmark, BriefcaseBusiness, Check, Clock3, DollarSign, MapPin } from "lucide-react";
import { cn } from "../../utils/utils";

const AVATAR_COLORS = [
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
];

function getAvatarColor(title) {
  const index = ((title || "").charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function JobCard({ job, applied, saved, onSave, onView, onApply }) {
  const avatarColor = getAvatarColor(job.title);
  const initial = (job.title || "J")[0].toUpperCase();

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900 dark:hover:shadow-none">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-black select-none",
              avatarColor
            )}
            aria-hidden="true"
          >
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={onView}
                className="min-w-0 text-left"
                aria-label={`View ${job.title} job details`}
              >
                <h3 className="line-clamp-1 text-base font-black leading-snug text-slate-950 transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
                  {job.title}
                </h3>
              </button>
              <button
                type="button"
                onClick={onSave}
                className={cn(
                  "shrink-0 rounded-xl border p-1.5 transition lg:hidden",
                  saved
                    ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40"
                    : "border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700"
                )}
                aria-label={saved ? "Unsave job" : "Save job"}
              >
                <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} aria-hidden="true" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <BriefcaseBusiness size={12} aria-hidden="true" />
                {job.jobType}
              </span>
              {job.experienceLevel && <span>{job.experienceLevel}</span>}
              {job.salary && (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <DollarSign size={12} aria-hidden="true" />
                  {job.salary}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 4 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  +{job.skills.length - 4}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Clock3 size={12} aria-hidden="true" />
              {job.postedTime}
            </span>
            <button
              type="button"
              onClick={onSave}
              className={cn(
                "hidden rounded-xl border p-1.5 transition lg:inline-flex",
                saved
                  ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40"
                  : "border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700"
              )}
              aria-label={saved ? "Unsave job" : "Save job"}
            >
              <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onApply}
              disabled={applied}
              className={cn(
                "inline-flex h-11 min-w-28 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-black transition",
                applied
                  ? "cursor-default bg-emerald-500 text-white"
                  : "bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 dark:shadow-blue-950/30"
              )}
              aria-label={applied ? `Already applied to ${job.title}` : `Apply to ${job.title}`}
            >
              {applied && <Check size={15} />}
              {applied ? "Applied" : "Apply"}
            </button>
            <button
              type="button"
              onClick={onView}
              className="h-11 min-w-28 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={`View details for ${job.title}`}
            >
              View Job
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
