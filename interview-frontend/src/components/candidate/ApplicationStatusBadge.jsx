import { cn } from "../../utils/utils";

const STATUS_STYLES = {
  Applied: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  "Under Review": "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
  Shortlisted: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  "Interview Scheduled": "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  Selected: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  Rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
};

export const APPLICATION_STATUSES = Object.keys(STATUS_STYLES);

export default function ApplicationStatusBadge({ status, className }) {
  const label = APPLICATION_STATUSES.includes(status) ? status : "Applied";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", STATUS_STYLES[label], className)}>
      {label}
    </span>
  );
}
