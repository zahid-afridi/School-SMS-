"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  FaSearch,
  FaPrint,
  FaFileDownload,
  FaExclamationCircle,
  FaMoneyBillWave,
  FaPlusCircle,
} from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useApplyBulkLateFinesMutation,
  useApplyInvoiceLateFineMutation,
  useCancelFeeInvoiceMutation,
  useGetFeeInvoicesQuery,
  useGetBulkInvoiceChallansMutation,
  useLazyGetFeeInvoiceChallanQuery,
  useWaiveInvoiceFineMutation,
} from "@/redux/features/fees/feeApi";
import type {
  FeeChallanData,
  FeeInvoiceStatus,
} from "@/redux/features/fees/feeTypes";
import InvoiceChallanModal from "../components/InvoiceChallanModal";

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

  const [activeChallans, setActiveChallans] = useState<FeeChallanData[] | null>(
    null
  );

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
  const [waiveFine, { isLoading: waiving }] = useWaiveInvoiceFineMutation();
  const [applyFine, { isLoading: applyingFine }] =
    useApplyInvoiceLateFineMutation();
  const [applyBulkFines, { isLoading: applyingBulkFines }] =
    useApplyBulkLateFinesMutation();
  const [getChallan, { isFetching: loadingChallan }] =
    useLazyGetFeeInvoiceChallanQuery();
  const [getBulkChallans, { isLoading: loadingBulkChallans }] =
    useGetBulkInvoiceChallansMutation();

  const rows = useMemo(() => invoices, [invoices]);

  const handlePrintChallan = async (id: string) => {
    try {
      const data = await getChallan(id).unwrap();
      setActiveChallans([data]);
    } catch {
      toast.error("Failed to load invoice challan");
    }
  };

  const handleBulkPrint = async () => {
    if (rows.length === 0) {
      toast.error("No invoices to print");
      return;
    }
    try {
      const challans = await getBulkChallans({
        invoiceIds: rows.map((r) => r.id),
      }).unwrap();
      if (!challans || challans.length === 0) {
        toast.error("No printable challans found");
        return;
      }
      setActiveChallans(challans);
    } catch {
      toast.error("Failed to load bulk challans");
    }
  };

  const handleApplyLateFine = async (id: string, invoiceNo: string) => {
    const amountStr = window.prompt(
      `Apply Late Fine to ${invoiceNo}?\nEnter fine amount:`,
      "100"
    );
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Invalid fine amount");
      return;
    }
    const reason =
      window.prompt("Enter reason for late fine:", "Paid after due date") ||
      "Late payment";

    try {
      await applyFine({ id, amount, reason }).unwrap();
      toast.success(`Late fine of PKR ${amount} applied to ${invoiceNo}`);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to apply late fine"
      );
    }
  };

  const handleBulkApplyFines = async () => {
    const overdueCount = rows.filter(
      (r) =>
        r.dueDate &&
        new Date(r.dueDate) < now &&
        r.balanceAmount > 0 &&
        r.fineAmount === 0
    ).length;

    if (overdueCount === 0) {
      toast.error("No eligible overdue invoices without fine in current view");
      return;
    }

    if (
      !window.confirm(
        `Apply late fine to ${overdueCount} overdue invoice(s) in this filter?`
      )
    ) {
      return;
    }

    const fineAmountStr = window.prompt("Enter fine amount per invoice:", "100");
    if (!fineAmountStr) return;
    const amount = Number(fineAmountStr);

    try {
      const res = await applyBulkFines({
        amount,
        classId: classId || undefined,
        billingMonth: billingMonth || undefined,
        billingYear: billingYear || undefined,
      }).unwrap();
      toast.success(res.message);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to apply bulk fines"
      );
    }
  };

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

  const handleWaiveFine = async (
    id: string,
    invoiceNo: string,
    fineAmount: number
  ) => {
    const reason = window.prompt(
      `Waive fine of PKR ${fineAmount} on invoice ${invoiceNo}?\nEnter reason:`,
      "Principal approved waiver"
    );
    if (!reason) return;
    try {
      await waiveFine({ id, reason }).unwrap();
      toast.success(`Fine on ${invoiceNo} waived successfully`);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to waive fine"
      );
    }
  };

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "Invoice No",
      "Student Name",
      "Registration No",
      "Class",
      "Month",
      "Year",
      "Status",
      "Due Date",
      "Subtotal",
      "Discount",
      "Fine",
      "Total Amount",
      "Paid Amount",
      "Balance Amount",
    ];

    const csvRows = rows.map((r) => [
      `"${r.invoiceNo}"`,
      `"${r.student.name.replace(/"/g, '""')}"`,
      `"${r.student.registrationNo}"`,
      `"${r.enrollment?.class.className ?? ""}${
        r.enrollment?.section ? `-${r.enrollment.section.sectionName}` : ""
      }"`,
      `"${MONTHS[r.billingMonth - 1] ?? r.billingMonth}"`,
      r.billingYear,
      `"${r.status}"`,
      `"${r.dueDate ? new Date(r.dueDate).toLocaleDateString() : ""}"`,
      r.subtotal,
      r.discountAmount,
      r.fineAmount,
      r.totalAmount,
      r.paidAmount,
      r.balanceAmount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `fee_dues_${billingYear}_${billingMonth || "all"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="w-full min-w-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Monthly Dues & Challans
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Search invoices, print official 3-part challans, collect payments,
              and apply late fines
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loadingBulkChallans || rows.length === 0}
              onClick={handleBulkPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-xs sm:text-sm text-slate-700 hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
            >
              <FaPrint size={13} className="text-blue-600" /> Bulk Print (
              {rows.length})
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-xs sm:text-sm text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <FaFileDownload size={13} className="text-emerald-600" /> Export CSV
            </button>
            <button
              type="button"
              disabled={applyingBulkFines}
              onClick={handleBulkApplyFines}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 font-semibold text-xs sm:text-sm text-amber-800 hover:bg-amber-100 shadow-xs transition disabled:opacity-50"
              title="Apply late fines to all overdue invoices in this filter"
            >
              <FaExclamationCircle size={13} /> Apply Late Fines
            </button>
            <Link
              href="/dashboard/fees/generate"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm hover:bg-slate-800 shadow-xs transition"
            >
              <PlusIcon /> Generate
            </Link>
            <Link
              href="/dashboard/fees/collect"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm hover:bg-emerald-700 shadow-xs transition"
            >
              <FaMoneyBillWave size={13} /> Collect
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Summary label="Invoices Found" value={String(totals.count)} />
          <Summary label="Total Billed" value={money(totals.billed)} />
          <Summary label="Total Collected" value={money(totals.paid)} />
          <Summary label="Total Outstanding" value={money(totals.due)} danger />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div className="relative md:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student / registration / invoice no..."
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm"
            />
          </div>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                status === value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading || isFetching ? (
          <PageLoader compact label="Loading dues" />
        ) : isError ? (
          <p className="text-red-500">Failed to load dues.</p>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            No invoices match these filters. Generate monthly invoices first.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[960px]">
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
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((inv) => {
                  const isOverdue =
                    inv.dueDate &&
                    new Date(inv.dueDate) < now &&
                    inv.balanceAmount > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {inv.student.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
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
                        {isOverdue && (
                          <span className="block text-[10px] font-semibold text-rose-600">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">
                        {inv.invoiceNo}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {money(inv.totalAmount)}
                        {inv.fineAmount > 0 && (
                          <span className="block text-[10px] text-amber-600">
                            Fine: +{money(inv.fineAmount)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                        {money(inv.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">
                        {money(inv.balanceAmount)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => handlePrintChallan(inv.id)}
                          disabled={loadingChallan}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                          title="Print 3-Part Fee Challan"
                        >
                          <FaPrint size={10} /> Challan
                        </button>
                        <Link
                          href={`/dashboard/fees/collect?studentId=${inv.student.id}`}
                          className="text-xs font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          Collect
                        </Link>
                        <Link
                          href={`/dashboard/fees/ledger/${inv.student.id}`}
                          className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          Ledger
                        </Link>
                        {inv.balanceAmount > 0 && inv.fineAmount === 0 && (
                          <button
                            type="button"
                            disabled={applyingFine}
                            onClick={() =>
                              handleApplyLateFine(inv.id, inv.invoiceNo)
                            }
                            className="text-xs text-amber-700 hover:underline disabled:opacity-50"
                            title="Apply Late Fine"
                          >
                            +Fine
                          </button>
                        )}
                        {inv.fineAmount > 0 && (
                          <button
                            type="button"
                            disabled={waiving}
                            onClick={() =>
                              handleWaiveFine(
                                inv.id,
                                inv.invoiceNo,
                                inv.fineAmount
                              )
                            }
                            className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                            title="Waive fine"
                          >
                            Waive
                          </button>
                        )}
                        {inv.status === "UNPAID" && inv.paidAmount === 0 && (
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={() => handleCancel(inv.id, inv.invoiceNo)}
                            className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Challan Modal */}
      <InvoiceChallanModal
        challans={activeChallans}
        onClose={() => setActiveChallans(null)}
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function StatusBadge({ status }: { status: FeeInvoiceStatus }) {
  const map: Record<FeeInvoiceStatus, { label: string; cls: string }> = {
    PAID: {
      label: "PAID",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    PARTIAL: {
      label: "PARTIAL",
      cls: "bg-amber-50 text-amber-800 border-amber-200",
    },
    UNPAID: {
      label: "UNPAID",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
    },
    WAIVED: {
      label: "WAIVED",
      cls: "bg-purple-50 text-purple-700 border-purple-200",
    },
    CANCELLED: {
      label: "CANCELLED",
      cls: "bg-slate-100 text-slate-500 border-slate-200",
    },
  };

  const current = map[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${current.cls}`}
    >
      {current.label}
    </span>
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
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
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
