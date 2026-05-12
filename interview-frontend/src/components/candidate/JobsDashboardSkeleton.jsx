export default function JobsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />

      {/* Filter bar skeleton */}
      <div className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />

      {/* Section heading skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Job cards skeleton — mirrors the full-width grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
    </div>
  );
}
