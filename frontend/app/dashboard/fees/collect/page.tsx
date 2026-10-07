"use client";

import PageLoader from "@/app/components/PageLoader";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaPrint, FaWallet } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import {
  useCollectFeePaymentMutation,
  useLazyGetFeePaymentReceiptQuery,
  useLazyPreviewStudentFeeQuery,
} from "@/redux/features/fees/feeApi";
import type {
  FeeReceiptData,
  StudentFeePreview,
} from "@/redux/features/fees/feeTypes";
import FeeReceiptModal from "../components/FeeReceiptModal";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function CollectFeesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <PageLoader compact label="Loading collect fees" />
        </div>
      }
    >
      <CollectFeesInner />
    </Suspense>
  );
}

function CollectFeesInner() {
  const searchParams = useSearchParams();
  const presetStudentId = searchParams.get("studentId") ?? "";

  const { data: classes = [] } = useGetAllClassesQuery();
  const [classId, setClassId] = useState("");
  const { data: studentsData, isFetching: loadingStudents } =
    useGetAllStudentsQuery({
      status: "ACTIVE",
      ...(classId ? { classId } : {}),
      limit: 500,
    });
  const students = studentsData?.students ?? [];

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [lastReceipt, setLastReceipt] = useState<{
    id?: string;
    receiptNo: string;
    amount: number;
  } | null>(null);
  const [preview, setPreview] = useState<StudentFeePreview | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<FeeReceiptData | null>(null);

  const [previewFee, { isFetching: loadingPreview }] =
    useLazyPreviewStudentFeeQuery();
  const [getReceipt, { isFetching: loadingReceipt }] =
    useLazyGetFeePaymentReceiptQuery();
  const [collect, { isLoading: collecting }] = useCollectFeePaymentMutation();

  const filteredStudents = useMemo(() => students, [students]);

  const applyPreview = (data: StudentFeePreview) => {
    setPreview(data);
    const openIds = data.openInvoices.map((i) => i.id);
    setSelectedInvoices(openIds);
    setAmount(String(data.outstandingBalance || ""));
  };

  const loadStudent = async (id: string) => {
    setStudentId(id);
    setSelectedInvoices([]);
    setAmount("");
    setLastReceipt(null);
    if (!id) {
      setPreview(null);
      return;
    }
    try {
      const data = await previewFee(id).unwrap();
      applyPreview(data);
    } catch (err: unknown) {
      setPreview(null);
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load student fees"
      );
    }
  };

  useEffect(() => {
    if (!presetStudentId) return;
    if (studentId === presetStudentId) return;
    void loadStudent(presetStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetStudentId]);

  const toggleInvoice = (id: string) => {
    setSelectedInvoices((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (preview) {
        const sum = preview.openInvoices
          .filter((i) => next.includes(i.id))
          .reduce((s, i) => s + i.balanceAmount, 0);
        setAmount(String(sum));
      }
      return next;
    });
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error("Select a student");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const res = await collect({
        studentId,
        amount: Number(amount),
        method,
        invoiceIds: selectedInvoices.length ? selectedInvoices : undefined,
        reference: reference || undefined,
        remarks: remarks || undefined,
      }).unwrap();

      toast.success(res.message || `Payment saved. Receipt: ${res.data.receiptNo}`);
      setLastReceipt({
        id: res.data.id,
        receiptNo: res.data.receiptNo,
        amount: res.data.amount,
      });

      // Automatically open receipt modal
      try {
        const receiptData = await getReceipt(res.data.id).unwrap();
        setActiveReceipt(receiptData);
      } catch {
        // Fallback if receipt query fails
      }

      const refreshed = await previewFee(studentId).unwrap();
      applyPreview(refreshed);
      setReference("");
      setRemarks("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Payment failed"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Collect Fees</h1>
        <p className="text-slate-500 mb-8">
          Select a student, review unpaid months or advance credit, and record payment. Amount is
          applied oldest-month first, and extra cash is credited to advance balance.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form
            onSubmit={handleCollect}
            className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Class</label>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setStudentId("");
                    setSelectedInvoices([]);
                    setAmount("");
                    setLastReceipt(null);
                    setPreview(null);
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white"
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Student *
                </label>
                <select
                  value={studentId}
                  onChange={(e) => loadStudent(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white"
                  disabled={loadingStudents}
                >
                  <option value="">Select student</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.registrationNo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {preview && (preview.advanceBalance ?? 0) > 0 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm">
                <FaWallet className="text-emerald-600" />
                <span>
                  Student has <strong>{money(preview.advanceBalance)}</strong> existing credit in Advance Wallet.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount Received (PKR) *
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 font-semibold text-slate-800"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Reference No (cheque / bank transfer ID)
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3"
                placeholder="Optional cheque # or transaction ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Remarks</label>
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3"
                placeholder="Optional cashier note"
              />
            </div>

            <button
              type="submit"
              disabled={collecting || !studentId}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-sm"
            >
              {collecting ? "Saving Payment..." : "Record Payment & Print Receipt"}
            </button>

            {lastReceipt && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    Payment Saved: Receipt #{lastReceipt.receiptNo}
                  </p>
                  <p className="text-xs text-emerald-600">
                    Amount: {money(lastReceipt.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (lastReceipt.id) {
                        const receiptData = await getReceipt(lastReceipt.id).unwrap();
                        setActiveReceipt(receiptData);
                      }
                    }}
                    disabled={loadingReceipt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 shadow-sm"
                  >
                    <FaPrint size={12} /> Print Receipt
                  </button>
                  {studentId && (
                    <Link
                      href={`/dashboard/fees/ledger/${studentId}`}
                      className="text-xs text-emerald-800 underline font-medium"
                    >
                      Ledger →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">
              Billing & Dues Status
            </h2>
            {loadingPreview ? (
              <PageLoader compact label="Loading dues" />
            ) : !preview ? (
              <p className="text-slate-400 text-sm">
                Select a student to see unpaid invoices or advance status.
              </p>
            ) : preview.openInvoices.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-sm">
                  <p className="font-semibold">All Invoices Cleared!</p>
                  <p className="text-xs mt-1 text-emerald-600">
                    Student has no outstanding balance. Any payment recorded now will be added as credit to their Advance Balance.
                  </p>
                </div>
                <Link
                  href={`/dashboard/fees/ledger/${studentId}`}
                  className="text-sm text-blue-600 underline inline-block"
                >
                  Open student fee ledger →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Total outstanding:{" "}
                  <strong className="text-rose-600 font-bold">
                    {money(preview.outstandingBalance)}
                  </strong>
                </p>
                {preview.openInvoices.map((inv) => (
                  <label
                    key={inv.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(inv.id)}
                      onChange={() => toggleInvoice(inv.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-slate-800">
                        {inv.monthLabel}
                      </p>
                      <p className="text-xs text-slate-400">{inv.invoiceNo}</p>
                      <p className="text-rose-600 font-semibold mt-1">
                        Due: {money(inv.balanceAmount)}
                      </p>
                    </div>
                  </label>
                ))}
                <Link
                  href={`/dashboard/fees/ledger/${studentId}`}
                  className="text-sm text-blue-600 underline inline-block pt-2"
                >
                  Full payment history →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <FeeReceiptModal
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
}
