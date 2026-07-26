"use client";

import Link from "next/link";
import { FaFileAlt } from "react-icons/fa";

export function ExamBreadcrumb({ current }: { current: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 mb-6 flex items-center gap-2 shadow-sm print:hidden">
      <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
        <FaFileAlt />
      </span>
      <p className="text-sm">
        <Link href="/dashboard/exams" className="font-semibold text-violet-700">
          Exams
        </Link>
        <span className="text-slate-400 mx-2">&gt;</span>
        <span className="text-slate-600">{current}</span>
      </p>
    </div>
  );
}

export function ExamStepTitle({
  step,
  title,
}: {
  step: number | string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-8 h-8 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
        {step}
      </span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

export const examInputClass =
  "w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function formatExamDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
