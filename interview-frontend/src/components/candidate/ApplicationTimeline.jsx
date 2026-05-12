import { CalendarClock, Check, Circle, ClipboardCheck, SearchCheck, Trophy } from "lucide-react";
import { cn } from "../../utils/utils";

const STEPS = [
  { key: "Applied", label: "Applied", icon: ClipboardCheck },
  { key: "Under Review", label: "Review", icon: SearchCheck },
  { key: "Shortlisted", label: "Shortlist", icon: Check },
  { key: "Interview Scheduled", label: "Interview", icon: CalendarClock },
  { key: "Selected", label: "Selected", icon: Trophy },
];

export default function ApplicationTimeline({ status }) {
  const rejected = status === "Rejected";
  const currentIndex = rejected ? 1 : Math.max(0, STEPS.findIndex((step) => step.key === status));

  return (
    <div className="w-full" aria-label={`Application progress: ${status}`}>
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const complete = !rejected && index <= currentIndex;
          const active = index === currentIndex;
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300",
                    complete && "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200",
                    rejected && active && "border-red-500 bg-red-500 text-white",
                    !complete && !(rejected && active) && "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                  )}
                >
                  {complete || (rejected && active) ? <Icon size={15} /> : <Circle size={10} fill="currentColor" />}
                </div>
                <span className={cn("hidden text-[11px] font-bold sm:block", complete ? "text-slate-700 dark:text-slate-200" : "text-slate-400")}>
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn("mx-2 h-0.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700", complete && index < currentIndex && "bg-blue-600", rejected && index < currentIndex && "bg-red-400")} />
              )}
            </div>
          );
        })}
      </div>
      {rejected && <p className="mt-2 text-xs font-bold text-red-600">Application closed</p>}
    </div>
  );
}
