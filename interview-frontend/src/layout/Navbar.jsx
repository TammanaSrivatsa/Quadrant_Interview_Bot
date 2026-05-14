import React, { useState } from "react";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "../context/useAuth";
import NotificationBell from "../components/NotificationBell";

export default function Navbar({ toggleSidebar }) {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      return true;
    }
    return document.documentElement.classList.contains("dark");
  });
  const { user } = useAuth();

  function toggleTheme() {
    const root = document.documentElement;
    const nextDark = !isDark;
    root.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setIsDark(nextDark);
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
      className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-6"
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white md:text-2xl">
          Hello, <span className="text-blue-600">{user?.name || "there"}</span>
        </h1>
      </div>

      <label className="relative hidden max-w-sm flex-1 lg:block" aria-label="Search workspace">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search"
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
        />
      </label>

      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-2 hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
          {formatDate()}
        </span>
        <NotificationBell />
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
