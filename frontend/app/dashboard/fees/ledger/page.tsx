"use client";

import PageLoader from "@/app/components/PageLoader";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaPrint,
  FaBan,
  FaWallet,
  FaReceipt,
  FaFileInvoiceDollar,
  FaSearch,
  FaUserGraduate,
  FaMoneyBillWave,
  FaCalendarAlt,
} from "react-icons/fa";
import {
  useGetStudentFeeLedgerQuery,
  useLazyGetFeeInvoiceChallanQuery,
  useLazyGetFeePaymentReceiptQuery,
  useVoidFeePaymentMutation,
} from "@/redux/features/fees/feeApi";
import type {
  FeeChallanData,
  FeeReceiptData,
} from "@/redux/features/fees/feeTypes";
import FeeReceiptModal from "../components/FeeReceiptModal";
import InvoiceChallanModal from "../components/InvoiceChallanModal";
import StudentFeePicker from "../components/StudentFeePicker";
import { resolveUploadUrl } from "@/lib/apiBase";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function StudentFeeHistorySearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <PageLoader compact label="Loading student fee history" />
        </div>
      }
    >
      <StudentFeeHistoryInner />
    </Suspense>
  );
}

function StudentFeeHistoryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetStudentId = searchParams.get("studentId") ?? "";

  const [studentId, setStudentId] = useState(presetStudentId);

  useEffect(() => {
    if (presetStudentId && presetStudentId !== studentId) {
      setStudentId(presetStudentId);
    }
  }, [presetStudentId, studentId]);

  const { data, isLoading, isError, refetch } = useGetStudentFeeLedgerQuery(
    studentId,
    { skip: !studentId }
  );

  const [activeReceipt, setActiveReceipt] = useState<FeeReceiptData | null>(null);
  const [activeChallan, setActiveChallan] = useState<FeeChallanData | null>(null);
  const [getReceipt, { isFetching: loadingReceipt }] =
    useLazyGetFeePaymentReceiptQuery();
  const [getChallan, { isFetching: loadingChallan }] =
    useLazyGetFeeInvoiceChallanQuery();
  const [voidPayment, { isLoading: voiding }] = useVoidFeePaymentMutation();

  const handlePrintChallan = async (invoiceId: string) => {
    try {
      const challanData = await getChallan(invoiceId).unwrap();
      setActiveChallan(challanData);
    } catch {
      toast.error("Failed to load invoice challan");
    }
  };

  const handleSelectStudent = (id: string) => {
    setStudentId(id);
    if (id) {
      router.push(`/dashboard/fees/ledger?studentId=${id}`, { scroll: false });
    } else {
      router.push("/dashboard/fees/ledger", { scroll: false });
    }
  };

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

  const handlePrintStatement = () => {
    window.print();
  };

  const student = data?.student;
  const summary = data?.summary;
  const months = data?.months ?? [];
  const payments = data?.payments ?? [];
  const enrollment = student?.enrollment;

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header (Hidden on Print) */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Student Fee History
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Search any student to check their complete fee statements, monthly
              invoice breakdown, and payment history.
            </p>
          </div>

          {studentId && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handlePrintStatement}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                <FaPrint /> Print Statement
              </button>
              <Link
                href={`/dashboard/fees/collect?studentId=${studentId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <FaMoneyBillWave /> Collect Fee
              </Link>
            </div>
          )}
        </div>

        {/* Student Search Picker (Hidden on Print) */}
        <div className="print:hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <StudentFeePicker
            selectedStudentId={studentId}
            onSelectStudent={(s) => {
              handleSelectStudent(s?.id ?? "");
            }}
            showHistoryLink={false}
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-16 flex items-center justify-center">
            <PageLoader compact label="Loading complete fee history" />
          </div>
        )}

        {/* No student selected empty state */}
        {!studentId && !isLoading && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 px-6 text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <FaSearch size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">
              Select a Student to View Fee History
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Use the search bar above to look up any student by Name, Roll No,
              Registration No, or Class to review their complete invoices and
              ledger.
            </p>
          </div>
        )}

        {/* Error state */}
        {studentId && !isLoading && (isError || !data) && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center text-rose-800">
            <p className="font-semibold">Failed to load student fee ledger.</p>
            <p className="text-xs text-rose-600 mt-1">
              Please verify the student enrollment or try selecting again.
            </p>
          </div>
        )}

        {/* Complete Fee History Ledger Container */}
        {studentId && !isLoading && data && student && summary && (
          <div className="space-y-6">
            {/* Student Profile & Summary Banner */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    {student.photoUrl ? (
                      <img
                        src={resolveUploadUrl(student.photoUrl) ?? ""}
                        alt={student.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FaUserGraduate size={28} className="text-blue-500" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {student.name}
                      </h2>
                      <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                        #{student.registrationNo}
                      </span>
                    </div>

                    <p className="text-slate-600 text-sm mt-1">
                      {enrollment ? (
                        <span>
                          <strong>{enrollment.class.className}</strong>
                          {enrollment.section
                            ? ` (${enrollment.section.sectionName})`
                            : ""}
                          {enrollment.rollNo
                            ? ` · Roll #${enrollment.rollNo}`
                            : ""}
                        </span>
                      ) : (
                        "No Current Class"
                      )}
                      {student.contactPhone ? ` · Ph: ${student.contactPhone}` : ""}
                    </p>

                    {enrollment && (
                      <p className="text-xs text-slate-400 mt-1">
                        Academic Year: {enrollment.academicYear} · Fee Discount:{" "}
                        {enrollment.feeDiscount}% · Monthly Tuition:{" "}
                        {money(enrollment.class.montlyFee)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="print:hidden flex items-center gap-2">
                  <Link
                    href={`/dashboard/fees/collect?studentId=${studentId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-xs transition text-xs"
                  >
                    <FaMoneyBillWave /> Collect Fee
                  </Link>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
                <MiniStat
                  label="Total Invoiced"
                  value={money(summary.totalBilled)}
                />
                <MiniStat
                  label="Total Paid"
                  value={money(summary.totalPaid)}
                  tone="emerald"
                />
                <MiniStat
                  label="Outstanding Due"
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
                  value={`${summary.paidMonths} Paid / ${summary.unpaidMonths} Due`}
                />
              </div>
            </div>

            {/* Section 1: Month-wise Invoices */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaFileInvoiceDollar className="text-blue-600" />
                  Monthly Invoice Breakdown
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {months.length} Total Invoices
                </span>
              </div>

              {months.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 text-sm">
                  No fee invoices generated yet for this student.
                </div>
              ) : (
                <div className="space-y-3">
                  {months.map((m) => (
                    <div
                      key={m.id}
                      className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition ${
                        m.isPaid
                          ? "border-emerald-200/90 bg-emerald-50/20"
                          : "border-slate-200/90 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {m.isPaid ? (
                              <FaCheckCircle className="text-emerald-500 text-lg" />
                            ) : (
                              <FaTimesCircle className="text-rose-500 text-lg" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-base">
                                {m.monthLabel}
                              </h4>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  m.isPaid
                                    ? "bg-emerald-100 text-emerald-800"
                                    : m.status === "PARTIAL"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                              <span className="font-mono">#{m.invoiceNo}</span>
                              {m.dueDate && (
                                <span>
                                  Due Date:{" "}
                                  {new Date(m.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right text-xs sm:text-sm font-medium border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex sm:flex-col justify-between sm:justify-start gap-1">
                          <span className="text-slate-500">
                            Total: <strong>{money(m.totalAmount)}</strong>
                          </span>
                          <span className="text-emerald-700">
                            Paid: <strong>{money(m.paidAmount)}</strong>
                          </span>
                          <span
                            className={
                              m.balanceAmount > 0
                                ? "text-rose-600 font-bold"
                                : "text-emerald-600 font-semibold"
                            }
                          >
                            Due: {money(m.balanceAmount)}
                          </span>
                          <div className="print:hidden flex items-center gap-2 mt-2 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handlePrintChallan(m.id)}
                              disabled={loadingChallan}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                              title="Print Monthly Challan"
                            >
                              <FaPrint size={10} /> Challan
                            </button>
                            {m.balanceAmount > 0 && (
                              <Link
                                href={`/dashboard/fees/collect?studentId=${studentId}&invoiceId=${m.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                Pay
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Particulars Breakdown */}
                      {m.items && m.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600">
                          {m.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1 rounded-lg"
                            >
                              <span className="text-slate-600 truncate">
                                {item.isDiscount ? `− ${item.label}` : item.label}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {money(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Payment History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaReceipt className="text-emerald-600" />
                  Payment Transactions
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {payments.length} Payments Recorded
                </span>
              </div>

              {payments.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400 text-sm">
                  No payment transactions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                  <table className="w-full min-w-[700px] text-sm text-left">
                    <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5">Receipt #</th>
                        <th className="px-4 py-3.5">Date</th>
                        <th className="px-4 py-3.5">Method</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Reference / Notes</th>
                        <th className="px-4 py-3.5 text-right">Amount</th>
                        <th className="px-4 py-3.5 text-right print:hidden">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => {
                        const isVoided = p.status === "VOIDED";
                        return (
                          <tr
                            key={p.id}
                            className={`transition hover:bg-slate-50/50 ${
                              isVoided ? "bg-slate-50/60 opacity-60" : ""
                            }`}
                          >
                            <td className="px-4 py-3.5 font-bold text-slate-900">
                              <span
                                className={
                                  isVoided
                                    ? "line-through text-slate-400"
                                    : "text-blue-700"
                                }
                              >
                                {p.receiptNo}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 text-xs">
                              {new Date(p.paidAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5">
                                {p.method.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-xs">
                              {isVoided ? (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                                  <FaBan size={10} /> VOIDED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                  <FaCheckCircle size={10} /> Completed
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                              {p.reference || p.remarks || "—"}
                            </td>
                            <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">
                              {money(p.amount)}
                            </td>
                            <td className="px-4 py-3.5 text-right print:hidden">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePrintReceipt(p.id)}
                                  disabled={loadingReceipt}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                                  title="Print Receipt"
                                >
                                  <FaPrint size={11} /> Print
                                </button>
                                {!isVoided && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleVoidPayment(p.id, p.receiptNo)
                                    }
                                    disabled={voiding}
                                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                                    title="Void this payment"
                                  >
                                    <FaBan size={11} /> Void
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Official Printable Receipt Modal */}
      <FeeReceiptModal
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />

      {/* Official Printable Challan Modal */}
      <InvoiceChallanModal
        challan={activeChallan}
        challans={null}
        onClose={() => setActiveChallan(null)}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  danger?: boolean;
  highlight?: boolean;
  tone?: "emerald" | "blue";
}) {
  return (
    <div
      className={`p-3 rounded-xl border text-center transition ${
        danger
          ? "border-rose-200 bg-rose-50/60 text-rose-900"
          : highlight
          ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
          : tone === "emerald"
          ? "border-emerald-100 bg-emerald-50/30 text-emerald-900"
          : "border-slate-100 bg-slate-50/60 text-slate-900"
      }`}
    >
      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-sm sm:text-base font-extrabold mt-0.5 block truncate ${
          danger
            ? "text-rose-600"
            : highlight
            ? "text-emerald-700"
            : tone === "emerald"
            ? "text-emerald-700"
            : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
