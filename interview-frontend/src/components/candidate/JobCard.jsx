import { Bookmark, BriefcaseBusiness, Clock3, DollarSign, MapPin } from "lucide-react";
import { cn } from "../../utils/utils";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
];

function getAvatarColor(title) {
  const index = ((title || "").charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function JobCard({ job, applied, saved, onSave, onView, onApply }) {
  const avatarColor = getAvatarColor(job.title);
  const initial = (job.title || "J")[0].toUpperCase();

  return (
    <article className="group flex rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900 dark:hover:shadow-none">
      {/* Left — Logo avatar */}
      <div className="flex-shrink-0 p-4 pr-0 flex items-start pt-5">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-xl text-xl font-black select-none",
            avatarColor
          )}
          aria-hidden="true"
        >
          {initial}
        </div>
      </div>

      {/* Middle — Job info */}
      <div className="flex-1 min-w-0 p-4 pl-3">
        {/* Title + save button */}
        <div className="flex items-start gap-2 justify-between">
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
              "flex-shrink-0 rounded-xl border p-1.5 transition",
              saved
                ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40"
                : "border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700"
            )}
            aria-label={saved ? "Unsave job" : "Save job"}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Meta */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin size={12} aria-hidden="true" />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <BriefcaseBusiness size={12} aria-hidden="true" />
            {job.jobType}
          </span>
          {job.experienceLevel && (
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {job.experienceLevel}
            </span>
          )}
        </div>

        {/* Salary */}
        {job.salary && (
          <p className="mt-1.5 flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-white">
            <DollarSign size={13} className="text-emerald-500" aria-hidden="true" />
            {job.salary}
          </p>
        )}

        {/* Skills */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              +{job.skills.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex flex-shrink-0 flex-col items-end justify-between p-4 pl-2">
        {/* Posted time */}
        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Clock3 size={12} aria-hidden="true" />
          {job.postedTime}
        </span>

        {/* Buttons */}
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={applied}
            className={cn(
              "w-28 rounded-xl py-2 text-sm font-bold transition",
              applied
                ? "cursor-default bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
            aria-label={applied ? `Already applied to ${job.title}` : `Apply to ${job.title}`}
          >
            {applied ? "Applied ✓" : "Apply"}
          </button>
          <button
            type="button"
            onClick={onView}
            className="w-28 rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={`View details for ${job.title}`}
          >
            View Job
          </button>
        </div>
      </div>
    </article>
  );
}
