"use client";

import Link from "next/link";
import { FaChartBar, FaPrint } from "react-icons/fa";

export function ReportBreadcrumb({ current }: { current: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 mb-6 flex items-center gap-2 shadow-sm print:hidden">
      <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
        <FaChartBar />
      </span>
      <p className="text-sm">
        <Link href="/dashboard/reports" className="font-semibold text-slate-900">
          Reports
        </Link>
        <span className="text-slate-400 mx-2">&gt;</span>
        <span className="text-slate-600">{current}</span>
      </p>
    </div>
  );
}

export function ReportHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle ? (
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="print:hidden inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-slate-800"
      >
        <FaPrint />
        Print report
      </button>
    </div>
  );
}

export const reportInputClass =
  "w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400";

export function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export function statusBadge(status: string | null | undefined) {
  if (!status) return "—";
  if (status === "PRESENT" || status === "P") return "P";
  if (status === "LEAVE" || status === "L") return "L";
  if (status === "ABSENT" || status === "A") return "A";
  return status;
}

export function attendanceCellClass(status: string | null | undefined) {
  if (status === "PRESENT") return "bg-emerald-50 text-emerald-700 font-semibold";
  if (status === "LEAVE") return "bg-amber-50 text-amber-700 font-semibold";
  if (status === "ABSENT") return "bg-rose-50 text-rose-700 font-semibold";
  return "text-slate-300";
}
