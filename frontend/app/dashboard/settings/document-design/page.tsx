"use client";

import Link from "next/link";
import { FaPalette, FaSlidersH } from "react-icons/fa";
import SchoolDocumentDesigner from "@/app/components/SchoolDocumentDesigner";

export default function DocumentDesignSettingsPage() {
  return (
    <div className="w-full min-w-0">
      <div className="mb-5 flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm sm:px-4">
        <FaSlidersH className="text-indigo-600" />
        <Link
          href="/dashboard/settings/institute-profile"
          className="font-medium text-slate-700 hover:text-indigo-600"
        >
          General Settings
        </Link>
        <span className="text-slate-300">›</span>
        <span className="font-semibold text-indigo-700">Document Design</span>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
          <FaPalette />
          School identity studio
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Design documents that feel like your school
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Create one consistent visual identity for student ID cards, result
          cards, and date sheets. Your design is saved to this school account,
          so every administrator sees the same style on every device.
        </p>
      </header>

      <SchoolDocumentDesigner />
    </div>
  );
}
