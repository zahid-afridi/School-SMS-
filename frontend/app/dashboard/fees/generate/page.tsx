"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FaPrint, FaReceipt, FaFileInvoiceDollar } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGenerateFeeInvoicesMutation } from "@/redux/features/fees/feeApi";
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

type GenMode = "MONTH" | "CALENDAR_YEAR" | "ACADEMIC_YEAR" | "RANGE";

export default function GenerateFeesPage() {
  const now = new Date();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [generate, { isLoading }] = useGenerateFeeInvoicesMutation();

  const [mode, setMode] = useState<GenMode>("MONTH");
  const [billingMonth, setBillingMonth] = useState(now.getMonth() + 1);
  const [billingYear, setBillingYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [academicYear, setAcademicYear] = useState(
    `${now.getFullYear()}-${now.getFullYear() + 1}`
  );
  const [dueDate, setDueDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`
  );
  const [bulkChallanParams, setBulkChallanParams] = useState<{
    classId?: string;
    sectionId?: string;
    billingMonth?: number;
    billingYear?: number;
    academicYear?: string;
  } | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    monthLabel: string;
    periods?: string[];
  } | null>(null);

  const years = useMemo(() => {
    const y = now.getFullYear();
    const list: number[] = [];
    for (let i = y - 5; i <= y + 5; i++) list.push(i);
    return list;
  }, [now]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId]
  );
  const availableSections = selectedClass?.sections ?? [];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        mode,
        billingMonth: mode === "MONTH" ? billingMonth : undefined,
        billingYear,
        fromMonth: mode === "RANGE" ? fromMonth : undefined,
        fromYear: mode === "RANGE" ? fromYear : undefined,
        toMonth: mode === "RANGE" ? toMonth : undefined,
        toYear: mode === "RANGE" ? toYear : undefined,
        academicYear: academicYear.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
      };

      const res = await generate(payload).unwrap();
      setResult({
        created: res.data.created,
        skipped: res.data.skipped,
        monthLabel: res.data.monthLabel,
        periods: res.data.periods,
      });
      toast.success(res.message);
      if (res.data.skippedError) {
        toast.error(
          `${res.data.skippedError} student(s) failed — check enrollments / class tuition`
        );
      }
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to generate invoices"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Generate Monthly Invoices
        </h1>
        <p className="text-slate-500 mb-6">
          Build fee demands from fee structure (tuition, transport, books, fine,
          etc.). Admission/registration fees are charged once per student.
        </p>

        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">Before generating</p>
          <ol className="list-decimal ml-4 space-y-1 text-blue-800">
            <li>
              Set class{" "}
              <Link href="/dashboard/classes/all-classes" className="underline">
                monthly tuition
              </Link>
            </li>
            <li>
              Configure{" "}
              <Link
                href="/dashboard/settings/fees-structure"
                className="underline"
              >
                fee structure
              </Link>{" "}
              (admission, books, transport, fine, others)
            </li>
            <li>Generate month(s) → collect → track dues / defaulters</li>
          </ol>
        </div>

        <form
          onSubmit={handleGenerate}
          className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Generate for
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  ["MONTH", "Single month"],
                  ["CALENDAR_YEAR", "Full calendar year (Jan–Dec)"],
                  ["ACADEMIC_YEAR", "Academic year (Apr–Mar)"],
                  ["RANGE", "Custom month range"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                    mode === value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === "MONTH" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldSelect
                label="Month *"
                value={billingMonth}
                onChange={setBillingMonth}
                options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
              />
              <FieldSelect
                label="Year *"
                value={billingYear}
                onChange={setBillingYear}
                options={years.map((y) => ({ value: y, label: String(y) }))}
              />
            </div>
          )}

          {(mode === "CALENDAR_YEAR" || mode === "ACADEMIC_YEAR") && (
            <FieldSelect
              label={
                mode === "ACADEMIC_YEAR"
                  ? "Academic year starting *"
                  : "Calendar year *"
              }
              value={billingYear}
              onChange={setBillingYear}
              options={years.map((y) => ({
                value: y,
                label:
                  mode === "ACADEMIC_YEAR"
                    ? `${y}–${y + 1} (Apr ${y} → Mar ${y + 1})`
                    : String(y),
              }))}
            />
          )}

          {mode === "RANGE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldSelect
                label="From month"
                value={fromMonth}
                onChange={setFromMonth}
                options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
              />
              <FieldSelect
                label="From year"
                value={fromYear}
                onChange={setFromYear}
                options={years.map((y) => ({ value: y, label: String(y) }))}
              />
              <FieldSelect
                label="To month"
                value={toMonth}
                onChange={setToMonth}
                options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
              />
              <FieldSelect
                label="To year"
                value={toYear}
                onChange={setToYear}
                options={years.map((y) => ({ value: y, label: String(y) }))}
              />
            </div>
          )}

          {/* Class and Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Class (optional)
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId("");
                }}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} — tuition PKR {c.montlyFee.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Section (optional)
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId || availableSections.length === 0}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">All sections</option>
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Academic Year and Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026-2027"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Invoice Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? "Generating..." : "Generate Invoices"}
          </button>
        </form>

        {result && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-sm space-y-3">
            <div>
              <p className="font-semibold text-emerald-800">{result.monthLabel}</p>
              <p className="text-emerald-700 text-xs mt-0.5">
                Created: <strong>{result.created}</strong> · Skipped (already generated or 0 dues):{" "}
                <strong>{result.skipped}</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {result.created > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setBulkChallanParams({
                      classId: classId || undefined,
                      sectionId: sectionId || undefined,
                      billingMonth: mode === "MONTH" ? billingMonth : undefined,
                      billingYear,
                      academicYear: academicYear.trim() || undefined,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs flex items-center gap-2 hover:bg-blue-700 transition shadow-xs"
                >
                  <FaPrint size={12} /> Print Batch Challans (3-Part)
                </button>
              )}
              <Link
                href="/dashboard/fees/dues"
                className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-semibold text-xs hover:bg-emerald-50 transition"
              >
                View monthly dues →
              </Link>
              <Link
                href="/dashboard/fees/collect"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
              >
                Collect fees →
              </Link>
            </div>
          </div>
        )}

        {/* Printable Bulk Challan Modal */}
        <InvoiceChallanModal
          bulkParams={bulkChallanParams}
          onClose={() => setBulkChallanParams(null)}
        />
      </div>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-11 rounded-xl border border-slate-200 px-3"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
