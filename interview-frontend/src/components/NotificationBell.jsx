import { useEffect, useRef, useState } from "react";
import { Bell, BriefcaseBusiness, Calendar, CheckCheck, Sparkles, X, XCircle } from "lucide-react";
import { cn } from "../utils/utils";
import { candidateApi } from "../services/api";

const TYPE_CONFIG = {
  jobs: {
    icon: BriefcaseBusiness,
    colors: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  shortlisted: {
    icon: Sparkles,
    colors: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  interview: {
    icon: Calendar,
    colors: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300",
    dot: "bg-green-500",
  },
  rejected: {
    icon: XCircle,
    colors: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-400",
  },
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Just now";
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true);
      setError("");
      try {
        const response = await candidateApi.notifications();
        setNotifications(Array.isArray(response?.notifications) ? response.notifications : []);
      } catch (err) {
        setError(err.message || "Could not load notifications.");
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markAllRead() {
    try {
      await candidateApi.markNotificationsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  }

  function markRead(id) {
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
  }

  function dismiss(id, e) {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className={cn(
          "relative p-2 rounded-lg transition-all",
          open
            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-slate-400 dark:text-slate-500">Refreshing…</span>}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800" role="list">
            {loading && notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell size={28} className="mb-2 opacity-40" />
                <p className="text-sm font-semibold">Loading notifications…</p>
              </li>
            ) : error ? (
              <li className="p-4 text-sm text-red-600 dark:text-red-300">{error}</li>
            ) : notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell size={28} className="mb-2 opacity-40" />
                <p className="text-sm font-semibold">You're all caught up</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">No new activity yet.</p>
              </li>
            ) : (
              notifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.jobs;
                const Icon = config.icon;
                return (
                  <li key={notification.id} role="listitem">
                    <button
                      type="button"
                      onClick={() => {
                        if (!notification.read) markRead(notification.id);
                      }}
                      className={cn(
                        "group flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        !notification.read && "bg-blue-50/60 dark:bg-blue-950/10"
                      )}
                    >
                      <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl", config.colors)} aria-hidden="true">
                        <Icon size={15} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", notification.read ? "font-medium text-slate-600 dark:text-slate-300" : "font-bold text-slate-900 dark:text-white")}> 
                          {notification.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {!notification.read && <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} aria-hidden="true" />}
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(notification.timestamp)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => dismiss(notification.id, e)}
                        aria-label="Dismiss notification"
                        className="flex-shrink-0 rounded-lg p-1 text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-slate-500 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      >
                        <X size={13} />
                      </button>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
