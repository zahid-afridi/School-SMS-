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

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolveUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${IMAGE_BASE}/${url.replace(/^\//, "")}`;
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
    <nav className="h-14 sm:h-16 md:h-20 shrink-0 bg-white flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 shadow-sm relative z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
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
          className="h-9 sm:h-11 md:h-14 object-contain max-w-[120px] sm:max-w-[160px] md:max-w-none"
          onError={() => {
            if (logoUrl && !logoFailed) setLogoFailed(true);
          }}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-5 shrink-0">
        <div className="hidden sm:flex w-9 h-9 md:w-11 md:h-11 rounded-full bg-gray-200 items-center justify-center">
          <User className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
        </div>

        <MessageSquare className="hidden md:block w-5 h-5 cursor-pointer text-slate-600" />
        <Bell className="hidden md:block w-5 h-5 cursor-pointer text-slate-600" />
        <ShoppingCart className="hidden lg:block w-5 h-5 cursor-pointer text-slate-600" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 sm:gap-3 min-w-0"
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
              className={`w-4 h-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
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
              <div className="absolute right-0 top-12 sm:top-14 w-52 bg-white rounded-xl shadow-lg border py-2 z-50">
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
