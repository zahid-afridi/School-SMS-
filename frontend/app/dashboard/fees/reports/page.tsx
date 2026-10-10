"use client";

import PageLoader from "@/app/components/PageLoader";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FaDownload,
  FaPrint,
  FaFilter,
  FaReceipt,
  FaFileInvoiceDollar,
  FaGraduationCap,
} from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useGetFeeCollectionReportQuery,
  useLazyGetFeePaymentReceiptQuery,
} from "@/redux/features/fees/feeApi";
import type { FeeReceiptData } from "@/redux/features/fees/feeTypes";
import FeeReceiptModal from "../components/FeeReceiptModal";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function exportToCSV(filename: string, rows: (string | number)[][]) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function FeeReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(toInputDate(monthStart));
  const [to, setTo] = useState(toInputDate(now));
  const [classId, setClassId] = useState("");
  const [activeReceipt, setActiveReceipt] = useState<FeeReceiptData | null>(null);

  const { data: classes = [] } = useGetAllClassesQuery();
  const [getReceipt, { isFetching: loadingReceipt }] =
    useLazyGetFeePaymentReceiptQuery();

  const queryArgs = useMemo(
    () => ({
      from,
      to,
      classId: classId || undefined,
    }),
    [from, to, classId]
  );

  const { data, isLoading, isError, isFetching } =
    useGetFeeCollectionReportQuery(queryArgs);

  const handleExportCSV = () => {
    if (!data?.payments || data.payments.length === 0) return;
    const header = [
      "Receipt No",
      "Student Name",
      "Admission No",
      "Class",
      "Date",
      "Payment Method",
      "Amount (PKR)",
    ];
    const rows = data.payments.map((p) => [
      p.receiptNo,
      p.student?.name ?? "—",
      p.student?.registrationNo ?? "—",
      p.student?.enrollments?.[0]?.class?.className ?? "—",
      new Date(p.paidAt).toLocaleDateString(),
      p.method,
      p.amount,
    ]);
    exportToCSV(`fee_collection_report_${from}_to_${to}.csv`, [header, ...rows]);
  };

  const handleExportClassSummaryCSV = () => {
    if (!data?.classSummary || data.classSummary.length === 0) return;
    const header = [
      "Class Name",
      "Total Invoices",
      "Total Billed (PKR)",
      "Total Collected (PKR)",
      "Remaining Balance (PKR)",
      "Collection Rate (%)",
    ];
    const rows = data.classSummary.map((c) => {
      const billed = c.totalBilled ?? c.billed ?? 0;
      const collected = c.totalCollected ?? c.collected ?? 0;
      const balance = c.totalOutstanding ?? c.balance ?? 0;
      const rate = c.rate ?? (billed > 0 ? Math.round((collected / billed) * 100) : 0);
      return [
        c.className,
        c.invoiceCount,
        billed,
        collected,
        balance,
        rate,
      ];
    });
    exportToCSV(`class_wise_collection_summary.csv`, [header, ...rows]);
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Fee Collection Reports
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Detailed collection breakdown by date range, class, and payment methods
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!data?.payments || data.payments.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-2xs"
            >
              <FaDownload size={11} /> Export Payments CSV
            </button>
            <Link
              href="/dashboard/fees/collect"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-2xs"
            >
              <FaReceipt size={11} /> Collect Fees
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-end gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs text-slate-800"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Class Filter
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs text-slate-800"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {classId && (
            <button
              type="button"
              onClick={() => setClassId("")}
              className="h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition"
            >
              Clear Class Filter
            </button>
          )}
        </div>

        {isLoading || isFetching ? (
          <div className="py-16 flex justify-center">
            <PageLoader compact label="Loading collection report" />
          </div>
        ) : isError || !data ? (
          <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center text-sm">
            Failed to load fee collection report.
          </div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-xs">
                <p className="text-xs uppercase font-semibold opacity-85">
                  Total Collected
                </p>
                <p className="text-2xl font-extrabold mt-1">
                  {money(data.totalCollected)}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  In selected date range
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <p className="text-xs uppercase font-semibold text-slate-500">
                  Total Payment Transactions
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {data.paymentCount}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Official receipts issued
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <p className="text-xs uppercase font-semibold text-slate-500 mb-2">
                  Collection By Method
                </p>
                <div className="space-y-1.5 text-xs">
                  {Object.keys(data.byMethod).length === 0 ? (
                    <p className="text-slate-400">No payment data</p>
                  ) : (
                    Object.entries(data.byMethod).map(([method, amt]) => (
                      <div key={method} className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">
                          {method.replace("_", " ")}
                        </span>
                        <span className="font-bold text-slate-900">
                          {money(amt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Class-wise Collection Summary Table */}
            {data.classSummary && data.classSummary.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FaGraduationCap className="text-blue-600" /> Class-wise Collection Summary
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Breakdown of billed vs collected fees per class
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportClassSummaryCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <FaDownload size={10} /> Export Summary CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3 text-center">Invoices</th>
                        <th className="py-2.5 px-3 text-right">Total Billed</th>
                        <th className="py-2.5 px-3 text-right">Total Collected</th>
                        <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                        <th className="py-2.5 px-3 text-right">Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.classSummary.map((cs) => {
                        const billed = cs.totalBilled ?? cs.billed ?? 0;
                        const collected = cs.totalCollected ?? cs.collected ?? 0;
                        const balance = cs.totalOutstanding ?? cs.balance ?? 0;
                        const rate =
                          cs.rate ??
                          (billed > 0 ? Math.round((collected / billed) * 100) : 0);
                        return (
                          <tr key={cs.classId} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {cs.className}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                              {cs.invoiceCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                              {money(billed)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              {money(collected)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                              {money(balance)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rate >= 90
                                    ? "bg-emerald-100 text-emerald-800"
                                    : rate >= 60
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payments List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FaReceipt className="text-emerald-600" /> Payment Records ({data.payments.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-left uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Receipt #</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-slate-400 text-xs"
                        >
                          No payments recorded matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      data.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 font-mono font-medium text-slate-800">
                            #{p.receiptNo}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/dashboard/fees/ledger/${p.student?.id ?? p.studentId ?? ""}`}
                              className="font-semibold text-slate-900 hover:text-blue-600"
                            >
                              {p.student?.name}
                            </Link>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {p.student?.registrationNo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.student?.enrollments?.[0]?.class?.className ?? "—"}
                            {p.student?.enrollments?.[0]?.section?.sectionName
                              ? ` (${p.student.enrollments[0].section.sectionName})`
                              : ""}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(p.paidAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {p.method.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">
                            {money(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const rec = await getReceipt(p.id).unwrap();
                                  setActiveReceipt(rec);
                                } catch {
                                  // handled by api
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Printable Receipt Modal */}
        <FeeReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      </div>
    </div>
  );
}
