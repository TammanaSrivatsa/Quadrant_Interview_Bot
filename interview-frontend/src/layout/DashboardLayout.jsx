import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import HelpSupportButton from "../components/HelpSupportButton";

export default function DashboardLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1024 : true));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 1280 : false));
  const showHelp = !location.pathname.startsWith("/candidate");

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-950 dark:bg-slate-950 dark:text-slate-100 font-sans">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onMouseEnter={() => {
          if (window.innerWidth >= 1024) setSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          if (window.innerWidth >= 1024) setSidebarCollapsed(true);
        }}
      />
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-[260px]"}`}
      >
        <Navbar toggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1210px]">
            <Outlet />
          </div>
        </main>
      </div>
      {showHelp && <HelpSupportButton supportEmail="support@quadranttech.com" />}
    </div>
  );
}
