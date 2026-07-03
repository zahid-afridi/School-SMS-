// import React from "react";

// export default function Header() {
//   return (
//     <nav className="bg-red-500 h-16 flex items-center px-4 text-white">
//       Header
//     </nav>
//   );
// }



"use client";

import { useState } from "react";
import {
  Menu,
  Search,
  Expand,
  MessageSquare,
  Bell,
  ShoppingCart,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/redux/features/auth/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { useRouter } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };
  return (
    <nav className="h-20 bg-white  flex items-center justify-between px-6 shadow-sm">
      {/* LEFT */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <img
          src="/images.png"
          alt="logo"
          className="h-15 object-contain"
        />

        {/* Icons */}
        <div className="flex items-center gap-8 text-gray-700">
          {/* <Menu className="w-6 h-6 cursor-pointer" />
          <Search className="w-6 h-6 cursor-pointer" /> */}
          {/* <Expand className="w-6 h-6 cursor-pointer" /> */}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">
        {/* App Store */}
        {/* <button className="bg-sky-500 text-white px-5 py-2 rounded-full flex items-center gap-2">
          <span className="text-lg"></span>
          <div className="text-left leading-none">
            <p className="text-[10px]">DOWNLOAD ON THE</p>
            <p className="text-xs font-semibold">APP STORE</p>
          </div>
        </button> */}

        {/* Google Play */}
        {/* <button className="bg-purple-600 text-white px-5 py-2 rounded-full flex items-center gap-2">
          <span>▶</span>
          <div className="text-left leading-none">
            <p className="text-[10px]">GET IT ON</p>
            <p className="text-xs font-semibold">GOOGLE PLAY</p>
          </div>
        </button> */}

        {/* Profile Circle */}
        <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-500" />
        </div>

        {/* Icons */}
        <MessageSquare className="w-5 h-5 cursor-pointer" />
        <Bell className="w-5 h-5 cursor-pointer" />
        <ShoppingCart className="w-5 h-5 cursor-pointer" />

        {/* Institute Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full border flex items-center justify-center">
              🏫
            </div>

            <span className="font-medium">
              Institute Name
            </span>

            <ChevronDown
              className={`w-4 h-4 transition ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-14 w-52 bg-white rounded-xl shadow-lg border py-2 z-50">
              <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100">
                <User size={18} />
                Profile
              </button>

              <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100">
                <Settings size={18} />
                Settings
              </button>

              <button className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50" onClick={handleLogout}>
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