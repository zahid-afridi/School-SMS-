"use client";

import PageLoader from "@/app/components/PageLoader";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaPrint,
  FaWallet,
  FaCheckDouble,
  FaCalendarCheck,
  FaTimes,
  FaHistory,
  FaFileInvoiceDollar,
  FaInfoCircle,
  FaReceipt,
  FaEdit,
  FaPlusCircle,
  FaSlidersH,
  FaCheck,
  FaSave,
  FaSearch,
} from "react-icons/fa";
import {
  useCollectFeePaymentMutation,
  useGenerateFeeInvoicesMutation,
  useGetFeeStructureQuery,
  useLazyGetFeeInvoicesQuery,
  useLazyGetFeePaymentReceiptQuery,
  useLazyPreviewStudentFeeQuery,
  useSaveFeeStructureMutation,
} from "@/redux/features/fees/feeApi";
import type {
  FeeReceiptData,
  StudentFeePreview,
} from "@/redux/features/fees/feeTypes";
import FeeReceiptModal from "../components/FeeReceiptModal";
import InvoiceChallanModal from "../components/InvoiceChallanModal";
import StudentFeePicker from "../components/StudentFeePicker";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

const MONTH_NAMES = [
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

  const [studentId, setStudentId] = useState(presetStudentId);
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
  const [showParticularsModal, setShowParticularsModal] = useState(false);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [challanInvoiceId, setChallanInvoiceId] = useState<string | null>(null);
  const [reprintReceiptQuery, setReprintReceiptQuery] = useState("");
  const [showReprintModal, setShowReprintModal] = useState(false);

  const [previewFee, { isFetching: loadingPreview }] =
    useLazyPreviewStudentFeeQuery();
  const [getReceipt, { isFetching: loadingReceipt }] =
    useLazyGetFeePaymentReceiptQuery();
  const [collect, { isLoading: collecting }] = useCollectFeePaymentMutation();
  const [generateInvoice, { isLoading: generatingInvoice }] =
    useGenerateFeeInvoicesMutation();
  const [searchInvoices, { isFetching: searchingInvoices }] =
    useLazyGetFeeInvoicesQuery();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentMonthName = MONTH_NAMES[currentMonth - 1];

  // Check if invoice belongs to previous years or past/current month of this year
  const isDueOrPastMonth = (inv: {
    billingYear: number;
    billingMonth: number;
  }) => {
    if (inv.billingYear < currentYear) return true;
    if (inv.billingYear === currentYear && inv.billingMonth <= currentMonth) {
      return true;
    }
    return false;
  };

  const applyPreview = (data: StudentFeePreview) => {
    setPreview(data);

    // Default selection: Invoices due up to and including current month (includes prior years)
    const dueInvoices = data.openInvoices.filter((inv) =>
      isDueOrPastMonth(inv)
    );

    const initialSelection =
      dueInvoices.length > 0
        ? dueInvoices.map((i) => i.id)
        : data.openInvoices.map((i) => i.id);

    setSelectedInvoices(initialSelection);

    const initialSum = data.openInvoices
      .filter((i) => initialSelection.includes(i.id))
      .reduce((s, i) => s + i.balanceAmount, 0);

    setAmount(initialSum > 0 ? String(initialSum) : "");
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
    if (studentId === presetStudentId && preview) return;
    void loadStudent(presetStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetStudentId]);

  // Quick Selection Helpers
  const selectDuesUntilCurrentMonth = () => {
    if (!preview) return;
    const dueIds = preview.openInvoices
      .filter((i) => isDueOrPastMonth(i))
      .map((i) => i.id);

    setSelectedInvoices(dueIds);

    const sum = preview.openInvoices
      .filter((i) => dueIds.includes(i.id))
      .reduce((s, i) => s + i.balanceAmount, 0);

    setAmount(sum > 0 ? String(sum) : "");
  };

  const selectAllInvoices = () => {
    if (!preview) return;
    const allIds = preview.openInvoices.map((i) => i.id);
    setSelectedInvoices(allIds);
    setAmount(String(preview.outstandingBalance || ""));
  };

  const clearSelection = () => {
    setSelectedInvoices([]);
    setAmount("");
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
        setAmount(sum > 0 ? String(sum) : "");
      }
      return next;
    });
  };

  // Selected invoices total calculation
  const selectedTotal = useMemo(() => {
    if (!preview) return 0;
    return preview.openInvoices
      .filter((i) => selectedInvoices.includes(i.id))
      .reduce((s, i) => s + i.balanceAmount, 0);
  }, [preview, selectedInvoices]);

  // Remaining balance calculation
  const calculatedRemainingBalance = useMemo(() => {
    const rcvd = Number(amount) || 0;
    const remaining = selectedTotal - rcvd;
    return remaining >= 0 ? remaining : 0;
  }, [selectedTotal, amount]);

  // Check if current month invoice already exists
  const hasCurrentMonthInvoice = useMemo(() => {
    if (!preview) return false;
    return preview.openInvoices.some(
      (inv) =>
        inv.billingYear === currentYear && inv.billingMonth === currentMonth
    );
  }, [preview, currentYear, currentMonth]);

  // One-click generate current month invoice for this student
  const handleGenerateCurrentMonth = async () => {
    if (!studentId) return;
    try {
      const res = await generateInvoice({
        mode: "MONTH",
        billingMonth: currentMonth,
        billingYear: currentYear,
        studentId,
      }).unwrap();

      toast.success(
        res.message ||
          `Invoice generated for ${currentMonthName} ${currentYear}`
      );
      const refreshed = await previewFee(studentId).unwrap();
      applyPreview(refreshed);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to generate invoice"
      );
    }
  };

  const handleLookupInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = invoiceSearchQuery.trim();
    if (!query) {
      toast.error("Please enter an invoice number to search");
      return;
    }
    try {
      const results = await searchInvoices({ search: query }).unwrap();
      if (!results || results.length === 0) {
        toast.error(`No invoice found matching "${query}"`);
        return;
      }
      const matched = results[0];
      const targetStudentId = matched.student?.id ?? matched.studentId;
      if (targetStudentId) {
        await loadStudent(targetStudentId);
      }
      setSelectedInvoices([matched.id]);
      setAmount(String(matched.balanceAmount));
      toast.success(
        `Loaded invoice #${matched.invoiceNo} for ${matched.student?.name ?? "Student"}`
      );
    } catch {
      toast.error("Failed to lookup invoice");
    }
  };

  const handleReprintReceipt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = reprintReceiptQuery.trim();
    if (!query) {
      toast.error("Please enter a receipt number");
      return;
    }
    try {
      const receiptData = await getReceipt(query).unwrap();
      setActiveReceipt(receiptData);
      setShowReprintModal(false);
      setReprintReceiptQuery("");
    } catch {
      toast.error(`Receipt "${query}" not found`);
    }
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error("Please select a student first");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    // If current month invoice is missing and no open invoices exist, auto-generate it first
    if (!hasCurrentMonthInvoice && (!preview?.openInvoices || preview.openInvoices.length === 0)) {
      try {
        await generateInvoice({
          mode: "MONTH",
          billingMonth: currentMonth,
          billingYear: currentYear,
          studentId,
        }).unwrap();
      } catch {
        // Continue with collection even if auto-generate fails
      }
    }

    try {
      const res = await collect({
        studentId,
        amount: Number(amount),
        method,
        invoiceIds: selectedInvoices.length ? selectedInvoices : undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        reference: reference.trim() || undefined,
        remarks: remarks.trim() || undefined,
      }).unwrap();

      toast.success(
        res.message || `Payment saved. Receipt: ${res.data.receiptNo}`
      );

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

      // Refresh student dues
      const refreshed = await previewFee(studentId).unwrap();
      applyPreview(refreshed);
      setReference("");
      setRemarks("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Payment collection failed"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Collect Fees
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select a student, review fee particulars breakdown, and record
              payments with instant official receipts.
            </p>
          </div>

          {studentId && (
            <Link
              href={`/dashboard/fees/ledger/${studentId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-blue-600 transition self-start sm:self-auto"
            >
              <FaHistory /> Complete Fee History
            </Link>
          )}
        </div>

        {/* Quick Search bar: Invoice # Lookup & Reprint Receipt */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <form
            onSubmit={handleLookupInvoice}
            className="flex-1 flex items-center gap-2 max-w-lg"
          >
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Scan / Type Invoice # (e.g. INV-2026-0001)..."
                className="w-full h-9.5 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={searchingInvoices || !invoiceSearchQuery.trim()}
              className="h-9.5 px-3.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
            >
              {searchingInvoices ? "Searching..." : "Find Invoice"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowReprintModal(true)}
            className="h-9.5 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 text-xs font-semibold transition shrink-0 flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <FaReceipt size={12} className="text-blue-600" />
            Reprint Any Receipt
          </button>
        </div>

        {/* Top: Rich Student Picker */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <StudentFeePicker
            selectedStudentId={studentId}
            onSelectStudent={(student) => {
              if (student) {
                void loadStudent(student.id);
              } else {
                void loadStudent("");
              }
            }}
            showHistoryLink={true}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Side: Fee Record & Payment Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* 1. Fee Record Breakdown Card (Matching Desktop App - Image 2) */}
            {studentId && preview && (
              <div className="rounded-2xl border border-blue-200/80 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FaSlidersH size={14} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        Fee Record & Particulars Breakdown
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Configured fee heads for this student
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!hasCurrentMonthInvoice && (
                      <button
                        type="button"
                        onClick={handleGenerateCurrentMonth}
                        disabled={generatingInvoice}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                        title={`Generate ${currentMonthName} bill`}
                      >
                        <FaPlusCircle size={10} /> Bill {currentMonthName}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowParticularsModal(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                      <FaEdit size={10} /> Adjust Particulars
                    </button>
                  </div>
                </div>

                {/* Grid of Fee Particulars (Tuition, Admission, Transport, Fine, Exam, etc.) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {preview.lines.map((line) => {
                    const isPrevDues = line.key === "PREVIOUS_BALANCE";
                    const isTuition = line.key === "MONTHLY_TUITION";
                    const isAdmission = line.key === "ADMISSION_FEE";
                    const isTransport = line.key === "TRANSPORT";
                    const isFine = line.key === "FINE";

                    return (
                      <div
                        key={line.key || line.label}
                        className={`p-2.5 rounded-xl border flex flex-col justify-between transition ${
                          isPrevDues
                            ? "bg-rose-50/60 border-rose-200 text-rose-900"
                            : isTuition
                            ? "bg-blue-50/50 border-blue-200 text-blue-900"
                            : line.isDiscount
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                            : "bg-slate-50/60 border-slate-200/80 text-slate-800"
                        }`}
                      >
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                          {isTuition
                            ? "Tuition (ماہانہ فیس)"
                            : isPrevDues
                            ? "Prev. Month Dues"
                            : isAdmission
                            ? "Admission Fee"
                            : isTransport
                            ? "Transport (ٹرانسپورٹ)"
                            : isFine
                            ? "Late Fee / Fine"
                            : line.label}
                        </span>
                        <span
                          className={`text-sm font-bold mt-1 ${
                            line.isDiscount
                              ? "text-emerald-700"
                              : isPrevDues
                              ? "text-rose-700"
                              : "text-slate-900"
                          }`}
                        >
                          {line.isDiscount
                            ? `− ${money(line.amount)}`
                            : money(line.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Live Tally Bar: Total Fee | Receiving Fee | Remaining Balance (Just like Image 2) */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/90 text-center">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      Total Fee Dues
                    </span>
                    <span className="block text-sm font-extrabold text-slate-900 mt-0.5">
                      {money(selectedTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-blue-700">
                      Receiving Fee
                    </span>
                    <span className="block text-sm font-extrabold text-blue-700 mt-0.5">
                      {money(Number(amount) || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-rose-600">
                      Balance Due
                    </span>
                    <span className="block text-sm font-extrabold text-rose-600 mt-0.5">
                      {money(calculatedRemainingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Payment Form */}
            <form
              onSubmit={handleCollect}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <FaReceipt className="text-blue-600" /> Payment Collection
                </h2>
                {studentId && preview && (
                  <span className="text-xs text-slate-500">
                    {selectedInvoices.length} month(s) selected
                  </span>
                )}
              </div>

              {/* Advance Wallet Notice */}
              {preview && (preview.advanceBalance ?? 0) > 0 && (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs sm:text-sm">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FaWallet size={16} />
                  </div>
                  <div>
                    <span className="font-semibold">
                      Advance Wallet Credit: {money(preview.advanceBalance)}
                    </span>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Student has credit in their advance balance that will
                      automatically be applied.
                    </p>
                  </div>
                </div>
              )}

              {/* Amount Received, Payment Method & Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Receiving Fee (PKR) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3.5 font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-base"
                      placeholder="0"
                    />
                  </div>
                  {selectedTotal > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Dues: {money(selectedTotal)}</span>
                      {Number(amount) > 0 && Number(amount) < selectedTotal && (
                        <span className="text-amber-600 font-medium">
                          Partial Payment
                        </span>
                      )}
                      {Number(amount) > selectedTotal && (
                        <span className="text-blue-600 font-medium">
                          +Advance: {money(Number(amount) - selectedTotal)}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Reference No & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Reference No
                  </label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Cheque # or bank transaction ID"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Remarks / Notes
                  </label>
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Optional cashier note"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={collecting || !studentId}
                className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {collecting ? (
                  <span>Recording Payment...</span>
                ) : (
                  <>
                    <FaPrint size={15} />
                    <span>
                      Record Payment & Print Fee Slip{" "}
                      {Number(amount) > 0 ? `(${money(Number(amount))})` : ""}
                    </span>
                  </>
                )}
              </button>

              {/* Last Recorded Receipt Banner */}
              {lastReceipt && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      ✓ Payment Saved: Receipt #{lastReceipt.receiptNo}
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Amount Received: <strong>{money(lastReceipt.amount)}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        if (lastReceipt.id) {
                          const receiptData = await getReceipt(
                            lastReceipt.id
                          ).unwrap();
                          setActiveReceipt(receiptData);
                        }
                      }}
                      disabled={loadingReceipt}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 shadow-xs transition"
                    >
                      <FaPrint size={11} /> Print Fee Slip
                    </button>
                    {studentId && (
                      <Link
                        href={`/dashboard/fees/ledger/${studentId}`}
                        className="text-xs text-emerald-800 underline font-semibold ml-1"
                      >
                        Ledger →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right Side: Billing & Dues Status */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FaFileInvoiceDollar className="text-blue-600" />
                Monthly Invoices & Dues
              </h2>

              {preview && preview.openInvoices.length > 0 && (
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  {preview.openInvoices.length} Unpaid
                </span>
              )}
            </div>

            {loadingPreview ? (
              <div className="py-12 flex justify-center">
                <PageLoader compact label="Loading dues" />
              </div>
            ) : !studentId || !preview ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FaInfoCircle size={28} className="mx-auto text-slate-300" />
                <p className="text-sm font-medium">No Student Selected</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Select a student above to review their unpaid monthly invoices,
                  fee particulars, and record payment.
                </p>
              </div>
            ) : preview.openInvoices.length === 0 ? (
              <div className="space-y-4 my-auto py-6">
                {!hasCurrentMonthInvoice ? (
                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-center space-y-3">
                    <div className="h-10 w-10 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
                      <FaFileInvoiceDollar size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-amber-900">
                        No Bill for {currentMonthName} {currentYear}
                      </h3>
                      <p className="text-xs text-amber-700 leading-relaxed mt-1">
                        This student has not been billed for {currentMonthName} yet.
                        Click below to generate their monthly voucher and collect fees.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateCurrentMonth}
                      disabled={generatingInvoice}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition shadow-xs"
                    >
                      <FaPlusCircle size={12} />{" "}
                      {generatingInvoice
                        ? "Generating..."
                        : `Generate ${currentMonthName} Bill Now`}
                    </button>
                  </div>
                ) : (
                  <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-900 text-center space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
                      ✓
                    </div>
                    <h3 className="font-bold text-base text-emerald-900">
                      All Dues Cleared!
                    </h3>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      This student has zero outstanding invoices. Any payment
                      recorded now will be credited to their Advance Wallet.
                    </p>
                  </div>
                )}
                <Link
                  href={`/dashboard/fees/ledger/${studentId}`}
                  className="block text-center text-xs font-semibold text-blue-600 hover:underline"
                >
                  View complete student fee history →
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Total Summary */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">
                    Total Outstanding Dues:
                  </span>
                  <span className="text-base font-extrabold text-rose-600">
                    {money(preview.outstandingBalance)}
                  </span>
                </div>

                {/* Quick Selection Buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Quick Selection:</span>
                    <span className="font-semibold text-blue-700">
                      Selected: {money(selectedTotal)} ({selectedInvoices.length} of {preview.openInvoices.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={selectDuesUntilCurrentMonth}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-blue-200 bg-blue-50/80 font-medium text-blue-700 hover:bg-blue-100 transition"
                      title="Select all dues from previous years up to current month"
                    >
                      <FaCalendarCheck size={10} /> Up to Now
                    </button>
                    <button
                      type="button"
                      onClick={selectAllInvoices}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 transition"
                      title="Select all open invoices including future months"
                    >
                      <FaCheckDouble size={10} /> Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-500 hover:bg-slate-50 transition"
                    >
                      <FaTimes size={10} /> Clear
                    </button>
                  </div>
                </div>

                {/* Invoices List */}
                <div className="flex-1 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {preview.openInvoices.map((inv) => {
                    const isSelected = selectedInvoices.includes(inv.id);
                    const isPriorYear = inv.billingYear < currentYear;
                    const isCurrent =
                      inv.billingYear === currentYear &&
                      inv.billingMonth === currentMonth;

                    return (
                      <label
                        key={inv.id}
                        className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-300 bg-blue-50/40 shadow-xs"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleInvoice(inv.id)}
                          className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 text-sm">
                              {inv.monthLabel}
                            </span>
                            {isPriorYear && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                {inv.billingYear} Due
                              </span>
                            )}
                            {isCurrent && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                                Current Month
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-slate-500 mt-1">
                            <span className="font-mono text-[11px] text-slate-400">
                              #{inv.invoiceNo}
                            </span>
                            {inv.dueDate && (
                              <span className="text-[10px] text-slate-400">
                                Due: {new Date(inv.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/80">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">
                                {inv.paidAmount > 0 ? (
                                  <span>Paid: {money(inv.paidAmount)}</span>
                                ) : (
                                  <span>Total: {money(inv.totalAmount)}</span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setChallanInvoiceId(inv.id);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                                title="Print official Challan"
                              >
                                <FaPrint size={8} /> Challan
                              </button>
                            </div>
                            <span className="font-bold text-rose-600 text-xs">
                              Due: {money(inv.balanceAmount)}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Footer History Link */}
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    href={`/dashboard/fees/ledger/${studentId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    <FaHistory size={11} /> View complete student fee ledger →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adjust Student Particulars Modal */}
      {showParticularsModal && studentId && (
        <AdjustParticularsModal
          studentId={studentId}
          studentName={preview?.student.name ?? "Student"}
          onClose={() => setShowParticularsModal(false)}
          onSaved={async () => {
            setShowParticularsModal(false);
            const refreshed = await previewFee(studentId).unwrap();
            applyPreview(refreshed);
          }}
        />
      )}

      {/* Printable Receipt Modal */}
      <FeeReceiptModal
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />

      {/* Printable Challan Modal */}
      <InvoiceChallanModal
        invoiceId={challanInvoiceId}
        onClose={() => setChallanInvoiceId(null)}
      />

      {/* Reprint Receipt Quick Search Dialog */}
      {showReprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <FaReceipt className="text-blue-600" /> Reprint Payment Receipt
              </h3>
              <button
                type="button"
                onClick={() => setShowReprintModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleReprintReceipt} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Receipt Number or Payment ID
                </label>
                <input
                  type="text"
                  autoFocus
                  value={reprintReceiptQuery}
                  onChange={(e) => setReprintReceiptQuery(e.target.value)}
                  placeholder="e.g. REC-2026-0001"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReprintModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingReceipt || !reprintReceiptQuery.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5"
                >
                  {loadingReceipt ? "Finding..." : "Find & Print Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Modal to customize/add on-the-spot fee particulars (Admission, Fine, Exam, Transport, etc.) */
function AdjustParticularsModal({
  studentId,
  studentName,
  onClose,
  onSaved,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, isLoading } = useGetFeeStructureQuery({
    scope: "STUDENT",
    studentId,
  });

  const [saveStructure, { isLoading: isSaving }] = useSaveFeeStructureMutation();
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data?.items) return;
    const initial: Record<string, string> = {};
    data.items.forEach((item) => {
      initial[item.particularId] = String(item.amount ?? 0);
    });
    setAmounts(initial);
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.items) return;

    const items = data.items
      .filter((item) => item.isEditable)
      .map((item) => ({
        particularId: item.particularId,
        amount: Number(amounts[item.particularId] ?? 0),
      }));

    try {
      await saveStructure({
        scope: "STUDENT",
        studentId,
        items,
      }).unwrap();

      toast.success("Student fee particulars updated successfully");
      onSaved();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update fee particulars"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Adjust Fee Heads for {studentName}
            </h3>
            <p className="text-xs text-slate-500">
              Set or adjust Admission Fee, Fine, Transport, or Exam charges
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <PageLoader compact label="Loading particulars" />
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">
              No editable fee particulars configured in system.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {data.items.map((item) => {
                if (!item.isEditable) return null;
                return (
                  <div
                    key={item.particularId}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                  >
                    <label className="block text-xs font-semibold text-slate-700 truncate">
                      {item.label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        PKR
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={amounts[item.particularId] ?? "0"}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [item.particularId]: e.target.value,
                          }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-11 pr-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <FaSave size={12} /> Save & Update Bill
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
