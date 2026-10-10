"use client";

import { useState } from "react";
import PageLoader from "@/app/components/PageLoader";

import Link from "next/link";
import {
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaHandHoldingUsd,
  FaChartLine,
  FaUsers,
  FaPlus,
  FaReceipt,
  FaPrint,
  FaClock,
  FaCheckCircle,
} from "react-icons/fa";
import {
  useGetFeesDashboardQuery,
  useLazyGetFeePaymentReceiptQuery,
} from "@/redux/features/fees/feeApi";
import type { FeeReceiptData } from "@/redux/features/fees/feeTypes";
import FeeReceiptModal from "./components/FeeReceiptModal";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function FeesOverviewPage() {
  const { data, isLoading, isError } = useGetFeesDashboardQuery();
  const [activeReceipt, setActiveReceipt] = useState<FeeReceiptData | null>(null);
  const [getReceipt, { isFetching: loadingReceipt }] =
    useLazyGetFeePaymentReceiptQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading fees dashboard" />
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Today's Collection"
            value={money(data.today.collected)}
            tone="emerald"
          />
          <StatCard
            label={`This Month (${data.thisMonth.label})`}
            value={money(data.thisMonth.collected)}
            tone="emerald"
          />
          <StatCard
            label="Total Outstanding Dues"
            value={money(data.totalOutstanding)}
            tone="amber"
          />
          <StatCard
            label="Overdue Invoices"
            value={`${data.overdueInvoices?.count ?? 0} (${money(data.overdueInvoices?.amount)})`}
            tone="rose"
          />
        </div>

        {/* Invoice Status & Month vs Today Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Invoice Status Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
              <FaFileInvoiceDollar className="text-blue-600" /> Invoices Status Breakdown
            </h2>
            <div className="space-y-3 text-sm">
              <Row
                label="Fully Paid Invoices"
                value={String(data.paidInvoiceCount ?? 0)}
              />
              <Row
                label="Partially Paid Invoices"
                value={String(data.partialInvoiceCount ?? 0)}
              />
              <Row
                label="Unpaid / Open Invoices"
                value={String(data.unpaidInvoiceCount ?? 0)}
              />
              <Row
                label="Defaulter Students"
                value={String(data.defaulterCount)}
              />
              <Row
                label="Total Historical Billed"
                value={money(data.totalBilled)}
              />
              <Row
                label="Total Historical Collected"
                value={money(data.totalCollected)}
              />
            </div>
          </div>

          {/* This Month Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="font-bold text-base text-slate-900 mb-4">
              This Month — {data.thisMonth.label}
            </h2>
            <div className="space-y-3 text-sm">
              <Row label="Invoices Generated" value={String(data.thisMonth.invoiceCount)} />
              <Row label="Total Billed" value={money(data.thisMonth.billed)} />
              <Row label="Total Collected" value={money(data.thisMonth.collected)} />
              <Row label="Month Outstanding" value={money(data.thisMonth.outstanding)} />
              <div className="pt-2">
                <Link
                  href="/dashboard/fees/dues"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View month defaulters & dues →
                </Link>
              </div>
            </div>
          </div>

          {/* Today's Cash Flow */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
              <FaClock className="text-emerald-600" /> Today's Activity
            </h2>
            <div className="space-y-3 text-sm">
              <Row label="Receipts Issued Today" value={String(data.today.paymentCount)} />
              <Row label="Cash / Payments Received" value={money(data.today.collected)} />
              <Row
                label="System Open Invoices"
                value={String(data.unpaidInvoiceCount)}
              />
              <div className="pt-2">
                <Link
                  href="/dashboard/fees/collect"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                >
                  <FaHandHoldingUsd size={12} /> Collect payment now →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Fee Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FaReceipt className="text-emerald-600" /> Recent Fee Collections
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest recorded payments and official receipts
              </p>
            </div>
            <Link
              href="/dashboard/fees/reports"
              className="text-xs font-semibold text-blue-600 hover:underline self-start sm:self-auto"
            >
              View all collection reports →
            </Link>
          </div>

          {data.recentPayments && data.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        #{p.receiptNo}
                      </td>
                      <td className="py-2.5 px-3">
                        {p.studentId ? (
                          <Link
                            href={`/dashboard/fees/ledger/${p.studentId}`}
                            className="font-semibold text-slate-900 hover:text-blue-600"
                          >
                            {p.studentName || "Student"}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {p.studentName || "Student"}
                          </span>
                        )}
                        {p.registrationNo && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {p.registrationNo}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {p.className || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {money(p.amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(p.paidAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const rec = await getReceipt(p.id).unwrap();
                              setActiveReceipt(rec);
                            } catch {
                              // error handled by api
                            }
                          }}
                          disabled={loadingReceipt}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition shadow-2xs"
                          title="Print official receipt slip"
                        >
                          <FaPrint size={10} className="text-slate-500" />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recent payments recorded today.
            </div>
          )}
        </div>

        {/* Quick Nav Tiles */}
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
            desc="Who unpaid which month & challans"
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
            desc="Collection history & summaries"
            icon={<FaChartLine className="text-violet-600" />}
          />
          <NavTile
            href="/dashboard/settings/fees-structure"
            title="Fee Structure"
            desc="Tuition, admission, books, fine..."
            icon={<FaFileInvoiceDollar className="text-slate-600" />}
          />
        </div>

        {/* Printable Receipt Modal */}
        <FeeReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
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
