"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

const SIDEBAR_KEY = "sms-sidebar-visible";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved === "0") setSidebarVisible(false);
      else if (saved === "1") setSidebarVisible(true);
      else if (window.innerWidth < 1024) setSidebarVisible(false);
    } catch {
      // ignore storage errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarVisible ? "1" : "0");
    } catch {
      // ignore
    }
  }, [sidebarVisible, hydrated]);

  useEffect(() => {
    if (!sidebarVisible) return;
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarVisible]);

  const toggleSidebar = () => setSidebarVisible((v) => !v);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="print:hidden shrink-0">
        <Header
          sidebarVisible={sidebarVisible}
          onToggleSidebar={toggleSidebar}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {sidebarVisible ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 print:hidden lg:hidden"
            onClick={() => setSidebarVisible(false)}
          />
        ) : null}

        <div
          className={`
            print:hidden z-50 h-full
            fixed inset-y-0 left-0 transform transition-all duration-300 ease-out
            lg:static lg:shrink-0
            ${
              sidebarVisible
                ? "translate-x-0 opacity-100"
                : "-translate-x-full opacity-0 pointer-events-none lg:w-0 lg:overflow-hidden lg:opacity-0 lg:pointer-events-none"
            }
          `}
        >
          <Sidebar onNavigate={() => {
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setSidebarVisible(false);
            }
          }} />
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-3 print:overflow-visible print:bg-white print:p-0 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
