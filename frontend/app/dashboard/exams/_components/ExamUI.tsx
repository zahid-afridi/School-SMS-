"use client";

import Link from "next/link";
import { FaFileAlt } from "react-icons/fa";

export function ExamBreadcrumb({ current }: { current: string }) {
  return (
    <div className="mb-4 flex min-w-0 items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:mb-6 sm:items-center sm:px-4 print:hidden">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <FaFileAlt />
      </span>
      <p className="min-w-0 break-words text-sm">
        <Link href="/dashboard/exams" className="font-semibold text-violet-700">
          Exams
        </Link>
        <span className="mx-1.5 text-slate-400 sm:mx-2">&gt;</span>
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
    <div className="mb-4 flex min-w-0 items-center gap-2.5 sm:mb-5 sm:gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
        {step}
      </span>
      <h2 className="min-w-0 text-base font-semibold text-slate-900 sm:text-lg">
        {title}
      </h2>
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
