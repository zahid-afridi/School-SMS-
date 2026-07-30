"use client";

import { useState } from "react";
import {
  MessageSquare,
  Bell,
  ShoppingCart,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logout } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { useRouter } from "next/navigation";
import { useGetMySchoolQuery } from "@/redux/features/school/schoolApi";

import { resolveUploadUrl } from "@/lib/apiBase";

function resolveUrl(url?: string | null): string | null {
  return resolveUploadUrl(url);
}

type HeaderProps = {
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
};

export default function Header({
  sidebarVisible,
  onToggleSidebar,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: school } = useGetMySchoolQuery();

  const instituteName = school?.name?.trim() || "Institute Name";
  const logoUrl = resolveUrl(school?.logoUrl);
  const headerLogo = logoUrl && !logoFailed ? logoUrl : "/images.png";

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <nav
      className="h-14 sm:h-16 md:h-20 shrink-0 bg-white flex items-center justify-between gap-2 px-2.5 sm:px-4 md:px-6 shadow-sm relative z-30"
      style={{
        paddingLeft: "max(0.625rem, env(safe-area-inset-left))",
        paddingRight: "max(0.625rem, env(safe-area-inset-right))",
      }}
    >
      <div className="flex flex-1 items-center gap-1.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-slate-700 transition active:bg-slate-100 hover:bg-slate-100"
          aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
          title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarVisible ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </button>

        <img
          key={logoUrl ?? "default"}
          src={headerLogo}
          alt={instituteName}
          className="h-8 max-w-[96px] object-contain sm:h-11 sm:max-w-[160px] md:h-14 md:max-w-[220px]"
          onError={() => {
            if (logoUrl && !logoFailed) setLogoFailed(true);
          }}
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5 shrink-0">
        <MessageSquare className="hidden md:block w-5 h-5 cursor-pointer text-slate-600" />
        <Bell className="hidden md:block w-5 h-5 cursor-pointer text-slate-600" />
        <ShoppingCart className="hidden lg:block w-5 h-5 cursor-pointer text-slate-600" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex min-h-11 touch-manipulation items-center gap-1.5 sm:gap-3 min-w-0"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={instituteName}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border object-cover shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}

            <span className="hidden sm:inline font-medium max-w-[100px] md:max-w-[180px] truncate text-sm md:text-base">
              {instituteName}
            </span>

            <ChevronDown
              className={`hidden h-4 w-4 shrink-0 transition sm:block ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40"
                aria-label="Close profile menu"
                onClick={() => setOpen(false)}
              />
              <div className="fixed inset-x-2 top-[calc(3.5rem+0.35rem)] z-50 rounded-2xl border bg-white py-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/dashboard/settings/account");
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 text-sm"
                >
                  <User size={18} />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/dashboard/settings/account");
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 text-sm"
                >
                  <Settings size={18} />
                  Settings
                </button>

                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 text-sm"
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
