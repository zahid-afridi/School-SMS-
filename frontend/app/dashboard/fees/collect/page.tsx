"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import {
  useCollectFeePaymentMutation,
  useLazyPreviewStudentFeeQuery,
} from "@/redux/features/fees/feeApi";

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
    receiptNo: string;
    amount: number;
  } | null>(null);

  const [previewFee, { data: preview, isFetching: loadingPreview }] =
    useLazyPreviewStudentFeeQuery();
  const [collect, { isLoading: collecting }] = useCollectFeePaymentMutation();

  const filteredStudents = useMemo(() => students, [students]);

  const loadStudent = async (id: string) => {
    setStudentId(id);
    setSelectedInvoices([]);
    setAmount("");
    setLastReceipt(null);
    if (!id) return;
    try {
      const data = await previewFee(id).unwrap();
      setSelectedInvoices(data.openInvoices.map((i) => i.id));
      setAmount(String(data.outstandingBalance || ""));
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load student fees"
      );
    }
  };

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
      toast.success(
        `Payment saved. Receipt: ${res.data.receiptNo}`
      );
      setLastReceipt({
        receiptNo: res.data.receiptNo,
        amount: res.data.amount,
      });
      await previewFee(studentId);
      setAmount("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Payment failed"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Collect Fees</h1>
        <p className="text-slate-500 mb-8">
          Select a student, review unpaid months, and record payment. Amount is
          applied oldest-month first.
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
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3"
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
                  className="w-full h-11 rounded-xl border border-slate-200 px-3"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount (PKR) *
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3"
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
                Reference (cheque / bank)
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Remarks</label>
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3"
              />
            </div>

            <button
              type="submit"
              disabled={collecting || !studentId}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {collecting ? "Saving..." : "Record Payment"}
            </button>

            {lastReceipt && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                Receipt <strong>{lastReceipt.receiptNo}</strong> ·{" "}
                {money(lastReceipt.amount)}
                {studentId && (
                  <Link
                    href={`/dashboard/fees/ledger/${studentId}`}
                    className="block mt-2 text-emerald-700 underline"
                  >
                    View student ledger →
                  </Link>
                )}
              </div>
            )}
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">
              Outstanding months
            </h2>
            {loadingPreview ? (
              <p className="text-slate-400 text-sm">Loading...</p>
            ) : !preview ? (
              <p className="text-slate-400 text-sm">
                Select a student to see unpaid invoices.
              </p>
            ) : preview.openInvoices.length === 0 ? (
              <div>
                <p className="text-emerald-600 text-sm font-medium">
                  No outstanding balance.
                </p>
                <Link
                  href={`/dashboard/fees/ledger/${studentId}`}
                  className="text-sm text-blue-600 underline mt-2 inline-block"
                >
                  Open ledger
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Total due:{" "}
                  <strong className="text-rose-600">
                    {money(preview.outstandingBalance)}
                  </strong>
                </p>
                {preview.openInvoices.map((inv) => (
                  <label
                    key={inv.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer"
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
                        {money(inv.balanceAmount)}
                      </p>
                    </div>
                  </label>
                ))}
                <Link
                  href={`/dashboard/fees/ledger/${studentId}`}
                  className="text-sm text-blue-600 underline inline-block"
                >
                  Full payment history →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
