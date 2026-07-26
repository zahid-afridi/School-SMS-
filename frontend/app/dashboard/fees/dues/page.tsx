"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FaSearch } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useCancelFeeInvoiceMutation,
  useGetFeeInvoicesQuery,
} from "@/redux/features/fees/feeApi";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function MonthlyDuesPage() {
  const now = new Date();
  const { data: classes = [] } = useGetAllClassesQuery();

  const [classId, setClassId] = useState("");
  const [billingMonth, setBillingMonth] = useState(0); // 0 = all
  const [billingYear, setBillingYear] = useState(now.getFullYear());
  const [status, setStatus] = useState("UNPAID_PARTIAL");
  const [search, setSearch] = useState("");

  const years = useMemo(() => {
    const y = now.getFullYear();
    const list: number[] = [];
    for (let i = y - 5; i <= y + 2; i++) list.push(i);
    return list;
  }, [now]);

  const query = useMemo(() => {
    const statusParam =
      status === "UNPAID_PARTIAL"
        ? "OPEN"
        : status === "ALL"
          ? "ALL"
          : status;
    return {
      classId: classId || undefined,
      billingMonth: billingMonth || undefined,
      billingYear: billingYear || undefined,
      status: statusParam,
      search: search.trim() || undefined,
    };
  }, [classId, billingMonth, billingYear, status, search]);

  const { data: invoices = [], isLoading, isError, isFetching } =
    useGetFeeInvoicesQuery(query);
  const [cancelInvoice, { isLoading: cancelling }] =
    useCancelFeeInvoiceMutation();

  const rows = useMemo(() => invoices, [invoices]);

  const handleCancel = async (id: string, invoiceNo: string) => {
    if (
      !window.confirm(
        `Cancel invoice ${invoiceNo}? This only works for unpaid invoices with no payments.`
      )
    ) {
      return;
    }
    try {
      await cancelInvoice({ id }).unwrap();
      toast.success("Invoice cancelled");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to cancel invoice"
      );
    }
  };

  const totals = useMemo(() => {
    return {
      due: rows.reduce((s, r) => s + r.balanceAmount, 0),
      billed: rows.reduce((s, r) => s + r.totalAmount, 0),
      paid: rows.reduce((s, r) => s + r.paidAmount, 0),
      count: rows.length,
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Monthly Dues</h1>
            <p className="text-slate-500 mt-1">
              See which student owes which month, monthly fee total, paid, and
              remaining due
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/fees/generate"
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm"
            >
              Generate
            </Link>
            <Link
              href="/dashboard/fees/collect"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm"
            >
              Collect
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Summary label="Records" value={String(totals.count)} />
          <Summary label="Billed" value={money(totals.billed)} />
          <Summary label="Paid" value={money(totals.paid)} />
          <Summary label="Due" value={money(totals.due)} danger />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          <div className="relative md:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student / invoice..."
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className}
              </option>
            ))}
          </select>
          <select
            value={billingMonth}
            onChange={(e) => setBillingMonth(Number(e.target.value))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3"
          >
            <option value={0}>All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={billingYear}
            onChange={(e) => setBillingYear(Number(e.target.value))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            ["UNPAID_PARTIAL", "Unpaid / Partial"],
            ["UNPAID", "Unpaid only"],
            ["PARTIAL", "Partial only"],
            ["PAID", "Paid"],
            ["ALL", "All statuses"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                status === value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading || isFetching ? (
          <p className="text-slate-500">Loading dues...</p>
        ) : isError ? (
          <p className="text-red-500">Failed to load dues.</p>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            No invoices match these filters. Generate monthly invoices first.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Monthly total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {inv.student.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {inv.student.registrationNo}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {inv.enrollment?.class.className ?? "—"}
                      {inv.enrollment?.section
                        ? `-${inv.enrollment.section.sectionName}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {inv.monthLabel ??
                        `${MONTHS[inv.billingMonth - 1]} ${inv.billingYear}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {inv.invoiceNo}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {money(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {money(inv.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      {money(inv.balanceAmount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/dashboard/fees/ledger/${inv.student.id}`}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Ledger
                      </Link>
                      <Link
                        href={`/dashboard/fees/collect?studentId=${inv.student.id}`}
                        className="text-emerald-700 hover:underline mr-3"
                      >
                        Collect
                      </Link>
                      {inv.status === "UNPAID" && inv.paidAmount === 0 && (
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => handleCancel(inv.id, inv.invoiceNo)}
                          className="text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-lg font-bold mt-1 ${
          danger ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    UNPAID: "bg-rose-50 text-rose-700",
    PARTIAL: "bg-amber-50 text-amber-700",
    PAID: "bg-emerald-50 text-emerald-700",
    WAIVED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-slate-100 text-slate-400",
  };
  return (
    <span
      className={`text-xs font-semibold px-2 py-1 rounded-full ${
        styles[status] ?? "bg-slate-100"
      }`}
    >
      {status}
    </span>
  );
}
