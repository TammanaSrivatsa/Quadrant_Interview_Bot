import { useState } from "react";
import { Calendar, Clock, FileText, MapPin, Monitor, X } from "lucide-react";
import { cn } from "../../utils/utils";

const MODES = [
  { key: "Online", label: "Online", icon: Monitor },
  { key: "Offline", label: "In-person", icon: MapPin },
];

export default function ScheduleInterviewModal({ application, loading = false, onClose, onSchedule }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState("Online");
  const [notes, setNotes] = useState("");

  const canSubmit = !loading && date && time;
  const minDate = new Date().toISOString().split("T")[0];

  function handleSubmit() {
    if (!canSubmit) return;
    onSchedule({ date, time, mode, notes: notes.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/10 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <Calendar size={24} />
              </div>
              <div className="min-w-0">
                <h2 id="schedule-modal-title" className="text-xl font-black text-slate-950 dark:text-white">
                  Schedule Interview
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400 max-w-[320px]">
                  {application?.jobTitle || "Select a date and time"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              Interview Date
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-950"
              />
            </label>
            <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              Interview Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-950"
              />
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Meeting Mode
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MODES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-3xl border px-4 py-3 text-sm font-semibold transition",
                    mode === key
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
              Notes <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any preparation notes or questions…"
              className="w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-950"
            />
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex min-h-[50px] items-center justify-center rounded-3xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex min-h-[50px] items-center justify-center rounded-3xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200/30 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {loading ? "Scheduling…" : "Confirm Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
