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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let frame = 0;
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      frame = window.requestAnimationFrame(() => {
        setSidebarVisible(window.innerWidth >= 1024 && saved !== "0");
        setHydrated(true);
      });
    } catch {
      frame = window.requestAnimationFrame(() => setHydrated(true));
    }
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarVisible(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Never persist mobile drawer state — it would wipe the desktop preference.
    if (typeof window !== "undefined" && window.innerWidth < 1024) return;
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
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-slate-100">
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
          style={{
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <Sidebar onNavigate={() => {
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setSidebarVisible(false);
            }
          }} />
        </div>

        <main
          className="dashboard-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 px-2.5 py-3 print:overflow-visible print:bg-white print:p-0 sm:p-4 md:p-6"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="dashboard-content mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
