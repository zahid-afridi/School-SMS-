"use client";

import PageLoader from "@/app/components/PageLoader";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaPrint,
  FaBan,
  FaWallet,
} from "react-icons/fa";
import {
  useGetStudentFeeLedgerQuery,
  useLazyGetFeePaymentReceiptQuery,
  useVoidFeePaymentMutation,
} from "@/redux/features/fees/feeApi";
import type { FeeReceiptData } from "@/redux/features/fees/feeTypes";
import FeeReceiptModal from "../../components/FeeReceiptModal";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function StudentFeeLedgerPage() {
  const params = useParams();
  const studentId = String(params.studentId ?? "");
  const { data, isLoading, isError, refetch } = useGetStudentFeeLedgerQuery(
    studentId,
    { skip: !studentId }
  );

  const [activeReceipt, setActiveReceipt] = useState<FeeReceiptData | null>(null);
  const [getReceipt, { isFetching: loadingReceipt }] =
    useLazyGetFeePaymentReceiptQuery();
  const [voidPayment, { isLoading: voiding }] = useVoidFeePaymentMutation();

  const handlePrintReceipt = async (paymentId: string) => {
    try {
      const receiptData = await getReceipt(paymentId).unwrap();
      setActiveReceipt(receiptData);
    } catch {
      toast.error("Failed to load receipt details");
    }
  };

  const handleVoidPayment = async (paymentId: string, receiptNo: string) => {
    const reason = window.prompt(
      `Are you sure you want to VOID payment #${receiptNo}?\nThis will revert all invoice balances and deduct any advance credit.\n\nPlease enter a reason:`,
      "Entered by mistake"
    );
    if (!reason) return;

    try {
      await voidPayment({ id: paymentId, reason }).unwrap();
      toast.success(`Payment #${receiptNo} voided successfully`);
      void refetch();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to void payment"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading ledger" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">Failed to load student ledger.</p>
      </div>
    );
  }

  const { student, summary, months, payments } = data;
  const enrollment = student.enrollment;

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6 text-sm text-slate-500">
          <Link
            href="/dashboard/fees/ledger"
            className="inline-flex items-center gap-1.5 hover:text-blue-600 transition font-medium"
          >
            <FaArrowLeft size={12} /> Search Another Student
          </Link>
          <span className="text-slate-300">·</span>
          <Link
            href="/dashboard/fees/collect"
            className="hover:text-blue-600 transition"
          >
            Collect Fees
          </Link>
          <span className="text-slate-300">·</span>
          <Link
            href="/dashboard/fees/defaulters"
            className="hover:text-slate-800 transition"
          >
            Defaulters
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {student.name}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {student.registrationNo}
                {enrollment
                  ? ` · ${enrollment.class.className}${
                      enrollment.section
                        ? `-${enrollment.section.sectionName}`
                        : ""
                    }`
                  : ""}
                {enrollment?.rollNo ? ` · Roll ${enrollment.rollNo}` : ""}
              </p>
              {enrollment && (
                <p className="text-xs text-slate-400 mt-1">
                  Year {enrollment.academicYear} · Discount{" "}
                  {enrollment.feeDiscount}% · Tuition{" "}
                  {money(enrollment.class.montlyFee)}
                </p>
              )}
            </div>
            <Link
              href={`/dashboard/fees/collect?studentId=${studentId}`}
              className="inline-flex justify-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-sm"
            >
              Collect Payment
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <MiniStat label="Total Billed" value={money(summary.totalBilled)} />
            <MiniStat label="Total Paid" value={money(summary.totalPaid)} />
            <MiniStat
              label="Remaining Due"
              value={money(summary.totalBalance)}
              danger={summary.totalBalance > 0}
            />
            <MiniStat
              label="Advance Wallet"
              value={money(summary.advanceBalance ?? 0)}
              highlight={(summary.advanceBalance ?? 0) > 0}
            />
            <MiniStat
              label="Months Status"
              value={`${summary.paidMonths} paid / ${summary.unpaidMonths} due`}
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Month-wise Invoices
        </h2>
        {months.length === 0 ? (
          <p className="text-slate-400 mb-8">
            No invoices yet. Generate monthly fees first.
          </p>
        ) : (
          <div className="space-y-3 mb-10">
            {months.map((m) => (
              <div
                key={m.id}
                className={`bg-white rounded-xl border p-4 ${
                  m.isPaid ? "border-emerald-100" : "border-rose-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {m.isPaid ? (
                        <FaCheckCircle className="text-emerald-500" />
                      ) : (
                        <FaTimesCircle className="text-rose-500" />
                      )}
                      <p className="font-semibold text-slate-800">
                        {m.monthLabel}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{m.invoiceNo}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Total: {money(m.totalAmount)}</p>
                    <p className="text-emerald-600">Paid: {money(m.paidAmount)}</p>
                    <p className="text-rose-600 font-semibold">
                      Due: {money(m.balanceAmount)}
                    </p>
                  </div>
                </div>
                {m.items?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-500">
                    {m.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-2">
                        <span>
                          {item.isDiscount ? `− ${item.label}` : item.label}
                        </span>
                        <span>{money(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Payment History
        </h2>
        {payments.length === 0 ? (
          <p className="text-slate-400">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Applied to</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isVoided = p.status === "VOIDED";
                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-slate-100 ${
                        isVoided ? "bg-slate-50/70 opacity-75" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">
                        <span className={isVoided ? "line-through text-slate-400" : ""}>
                          {p.receiptNo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(p.paidAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{p.method.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        {isVoided ? (
                          <span
                            title={p.voidReason || "Voided by admin"}
                            className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold cursor-help"
                          >
                            VOIDED
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                            PAID
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p.allocations
                          ?.map((a) => a.invoice.invoiceNo)
                          .join(", ") || (
                          <span className="italic text-emerald-700">
                            Advance Wallet Deposit
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span
                          className={
                            isVoided
                              ? "line-through text-slate-400"
                              : "text-emerald-700"
                          }
                        >
                          {money(p.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(p.id)}
                          disabled={loadingReceipt}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 mr-2"
                          title="Print Receipt / Challan"
                        >
                          <FaPrint size={14} />
                        </button>
                        {!isVoided && (
                          <button
                            type="button"
                            onClick={() => handleVoidPayment(p.id, p.receiptNo)}
                            disabled={voiding}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                            title="Void Payment"
                          >
                            <FaBan size={14} />
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

      {/* Printable Receipt Modal */}
      <FeeReceiptModal
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger,
  highlight,
}: {
  label: string;
  value: string;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        highlight
          ? "bg-emerald-50 border-emerald-200"
          : "bg-slate-50 border-slate-100"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-sm font-bold mt-1 ${
          danger
            ? "text-rose-600"
            : highlight
            ? "text-emerald-700"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
