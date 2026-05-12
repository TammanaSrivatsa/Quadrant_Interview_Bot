import React, { useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/useAuth";
import NotificationBell from "../components/NotificationBell";

export default function Navbar({ toggleSidebar }) {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const { user } = useAuth();

  function toggleTheme() {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }
    setIsDark(!isDark);
  }

  function formatDate() {
    const date = new Date();
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <header
      className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-40"
      role="banner"
    >
      {/* Left — greeting */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
          Hello,{" "}
          <span className="text-blue-600">{user?.name || "there"}</span>
        </h1>
      </div>

      {/* Right — date, notifications, theme */}
      <div className="flex items-center gap-1">
        <span className="hidden sm:block mr-2 text-sm text-slate-500 dark:text-slate-400">
          {formatDate()}
        </span>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-all"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
