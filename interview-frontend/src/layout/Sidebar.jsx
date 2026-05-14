import React from "react";
import { NavLink } from "react-router-dom";
import {
  BriefcaseBusiness,
  BarChart3,
  ClipboardList,
  Columns3,
  Download,
  FileText,
  FileSearch,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { cn } from "../utils/utils";

export default function Sidebar({ isOpen = true, onClose, collapsed = false, onMouseEnter, onMouseLeave }) {
  const { user, logout } = useAuth();
  const isHR = user?.role === "hr";

  const hrLinks = [
    { name: "Dashboard",         path: "/hr",             icon: LayoutDashboard },
    { name: "Candidates",        path: "/hr/candidates",  icon: Users },
    { name: "Pipeline",          path: "/hr/pipeline",    icon: Columns3 },
    { name: "JD Management",     path: "/hr/jds",         icon: FileText },
    { name: "Score Matrix",      path: "/hr/matrix",      icon: LayoutGrid },
    { name: "Interview Reviews", path: "/hr/interviews",  icon: ClipboardList },
    { name: "Analytics",         path: "/hr/analytics",   icon: BarChart3 },
    { name: "Resume Analysis",   path: "/hr/resume-analysis", icon: FileSearch },
    { name: "Backup",            path: "/hr/backup",      icon: Download },
    { name: "Settings",          path: "/settings",       icon: Settings },
  ];

  const candidateLinks = [
    { name: "All Jobs",          path: "/candidate/jobs",          icon: BriefcaseBusiness },
    { name: "My Applications",   path: "/candidate/applications",  icon: FileText },
    { name: "Settings",          path: "/settings",                icon: Settings },
  ];

  const links = isHR ? hrLinks : candidateLinks;

  function handleKeyDown(e, callback) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback();
    }
  }

  const activeClass =
    "bg-slate-100 text-slate-950 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-white dark:ring-slate-700";
  const inactiveClass =
    "text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white";

  return (
    <>
      {/* ── Mobile Sidebar ── */}
      <nav
        aria-label={`${isHR ? "HR" : "Candidate"} navigation menu`}
        className={cn(
          "h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-out lg:hidden",
          isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-200 dark:shadow-blue-950/40 flex-shrink-0" aria-hidden="true">
            <Video className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            Interview<span className="text-blue-600">Bot</span>
          </span>
        </div>

        {/* Nav Links */}
        <ul className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto" role="list">
          {links.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                end={link.path === "/hr" || link.path === "/candidate/jobs"}
                onClick={() => onClose?.()}
                onKeyDown={(e) => handleKeyDown(e, () => onClose?.())}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200",
                    isActive ? activeClass : inactiveClass
                  )
                }
                aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              >
                <link.icon size={18} aria-hidden="true" className="flex-shrink-0" />
                <span>{link.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-1"
            role="region"
            aria-label="User profile"
          >
            <div
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-black flex-shrink-0"
              aria-hidden="true"
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {user?.role || "Role"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full font-semibold text-sm transition-all duration-200",
              "text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            )}
            aria-label="Logout"
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* ── Desktop Hover-Expand Sidebar ── */}
      <nav
        aria-label={`${isHR ? "HR" : "Candidate"} navigation menu`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "hidden lg:flex h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex-col fixed left-0 top-0 z-50 transition-all duration-300 ease-out",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-slate-100 dark:border-slate-800 transition-all duration-300",
            collapsed ? "justify-center px-3" : "gap-2.5 px-5"
          )}
        >
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-200 dark:shadow-blue-950/40 flex-shrink-0" aria-hidden="true">
            <Video className="text-white w-5 h-5" />
          </div>
          <span
            className={cn(
              "text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap transition-all duration-300 overflow-hidden",
              collapsed ? "opacity-0 w-0" : "opacity-100"
            )}
          >
            Interview<span className="text-blue-600">Bot</span>
          </span>
        </div>

        {/* Nav Links */}
        <ul className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" role="list">
          {links.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                end={link.path === "/hr" || link.path === "/candidate/jobs"}
                onClick={() => onClose?.()}
                onKeyDown={(e) => handleKeyDown(e, () => onClose?.())}
                title={collapsed ? link.name : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-xl font-semibold text-sm transition-all duration-200",
                    collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5",
                    isActive ? activeClass : inactiveClass
                  )
                }
                aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              >
                <link.icon size={18} aria-hidden="true" className="flex-shrink-0" />
                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-300 overflow-hidden",
                    collapsed ? "opacity-0 w-0" : "opacity-100"
                  )}
                >
                  {link.name}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* User footer */}
        <div className="px-2 py-2 border-t border-slate-100 dark:border-slate-800">
          <div
            className={cn(
              "flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-1 transition-all duration-300",
              collapsed ? "justify-center p-2" : "gap-3 p-3"
            )}
            role="region"
            aria-label="User profile"
          >
            <div
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-black flex-shrink-0"
              aria-hidden="true"
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div
              className={cn(
                "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
                collapsed ? "opacity-0 w-0" : "opacity-100"
              )}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {user?.role || "Role"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "flex items-center rounded-xl w-full font-semibold text-sm transition-all duration-200",
              collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5",
              "text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            )}
            aria-label="Logout"
          >
            <LogOut size={18} aria-hidden="true" className="flex-shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 overflow-hidden",
                collapsed ? "opacity-0 w-0" : "opacity-100"
              )}
            >
              Logout
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
