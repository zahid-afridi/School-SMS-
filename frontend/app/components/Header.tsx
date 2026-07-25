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

export default function Header() {
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: school } = useGetMySchoolQuery();

  const instituteName = school?.name?.trim() || "Institute Name";
  const logoUrl = resolveUrl(school?.logoUrl);
  const headerLogo =
    logoUrl && !logoFailed ? logoUrl : "/images.png";

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <nav className="h-20 shrink-0 bg-white flex items-center justify-between px-6 shadow-sm">
      {/* LEFT */}
      <div className="flex items-center gap-8">
        <img
          key={logoUrl ?? "default"}
          src={headerLogo}
          alt={instituteName}
          className="h-14 object-contain"
          onError={() => {
            if (logoUrl && !logoFailed) setLogoFailed(true);
          }}
        />
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">
        <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-500" />
        </div>

        <MessageSquare className="w-5 h-5 cursor-pointer" />
        <Bell className="w-5 h-5 cursor-pointer" />
        <ShoppingCart className="w-5 h-5 cursor-pointer" />

        {/* Institute Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={instituteName}
                className="w-10 h-10 rounded-full border object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full border bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            )}

            <span className="font-medium max-w-[180px] truncate">
              {instituteName}
            </span>

            <ChevronDown
              className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-14 w-52 bg-white rounded-xl shadow-lg border py-2 z-50">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/settings/account");
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100"
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
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100"
              >
                <Settings size={18} />
                Settings
              </button>

              <button
                type="button"
                className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
