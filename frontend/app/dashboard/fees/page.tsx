"use client";

import Link from "next/link";
import {
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaHandHoldingUsd,
  FaChartLine,
  FaUsers,
  FaPlus,
} from "react-icons/fa";
import { useGetFeesDashboardQuery } from "@/redux/features/fees/feeApi";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function FeesOverviewPage() {
  const { data, isLoading, isError } = useGetFeesDashboardQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Loading fees dashboard...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">Failed to load fees dashboard.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
              Fee Management
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Fees Overview
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Track billing, collections, outstanding dues, and defaulters
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
            <Link
              href="/dashboard/fees/generate"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              <FaPlus size={12} /> Generate Month
            </Link>
            <Link
              href="/dashboard/fees/collect"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              <FaHandHoldingUsd size={14} /> Collect Fees
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Billed" value={money(data.totalBilled)} tone="slate" />
          <StatCard
            label="Total Collected"
            value={money(data.totalCollected)}
            tone="emerald"
          />
          <StatCard
            label="Outstanding"
            value={money(data.totalOutstanding)}
            tone="amber"
          />
          <StatCard
            label="Defaulters"
            value={String(data.defaulterCount)}
            tone="rose"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">
              This Month — {data.thisMonth.label}
            </h2>
            <div className="space-y-3 text-sm">
              <Row label="Invoices" value={String(data.thisMonth.invoiceCount)} />
              <Row label="Billed" value={money(data.thisMonth.billed)} />
              <Row label="Collected" value={money(data.thisMonth.collected)} />
              <Row label="Outstanding" value={money(data.thisMonth.outstanding)} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">Today</h2>
            <div className="space-y-3 text-sm">
              <Row label="Payments" value={String(data.today.paymentCount)} />
              <Row label="Collected" value={money(data.today.collected)} />
              <Row
                label="Unpaid invoices"
                value={String(data.unpaidInvoiceCount)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NavTile
            href="/dashboard/fees/collect"
            title="Collect Fees"
            desc="Receive payment & print receipt"
            icon={<FaHandHoldingUsd className="text-emerald-600" />}
          />
          <NavTile
            href="/dashboard/fees/generate"
            title="Generate Invoices"
            desc="Create monthly fee demands"
            icon={<FaFileInvoiceDollar className="text-blue-600" />}
          />
          <NavTile
            href="/dashboard/fees/dues"
            title="Monthly Dues"
            desc="Who unpaid which month & how much"
            icon={<FaExclamationTriangle className="text-amber-600" />}
          />
          <NavTile
            href="/dashboard/fees/defaulters"
            title="Defaulters"
            desc="Students with unpaid months"
            icon={<FaUsers className="text-rose-600" />}
          />
          <NavTile
            href="/dashboard/fees/reports"
            title="Fee Reports"
            desc="Collection history & methods"
            icon={<FaChartLine className="text-violet-600" />}
          />
          <NavTile
            href="/dashboard/settings/fees-structure"
            title="Fee Structure"
            desc="Tuition, admission, books, fine..."
            icon={<FaFileInvoiceDollar className="text-slate-600" />}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    slate: "bg-slate-900 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-600 text-white",
  };
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function NavTile({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </Link>
  );
}
