"use client";

import { useState, useEffect, useMemo } from "react";
import PageLoader from "@/app/components/PageLoader";
import {
  FaPrint,
  FaTimes,
  FaFileInvoiceDollar,
  FaChevronLeft,
  FaChevronRight,
  FaReceipt,
} from "react-icons/fa";
import {
  useGetFeeInvoiceChallanQuery,
  useGetBulkInvoiceChallansMutation,
} from "@/redux/features/fees/feeApi";
import type { FeeChallanData } from "@/redux/features/fees/feeTypes";

interface InvoiceChallanModalProps {
  challans?: FeeChallanData[] | null;
  challan?: FeeChallanData | null;
  invoiceId?: string | null;
  bulkParams?: {
    classId?: string;
    sectionId?: string;
    billingMonth?: number;
    billingYear?: number;
    academicYear?: string;
  } | null;
  onClose: () => void;
}

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export default function InvoiceChallanModal({
  challans,
  challan,
  invoiceId,
  bulkParams,
  onClose,
}: InvoiceChallanModalProps) {
  const [layout, setLayout] = useState<"challan" | "thermal" | "single">(
    "challan"
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: fetchedSingle, isFetching: loadingSingle } =
    useGetFeeInvoiceChallanQuery(invoiceId!, {
      skip: !invoiceId,
    });

  const [getBulkChallans, { data: fetchedBulk, isLoading: loadingBulk }] =
    useGetBulkInvoiceChallansMutation();

  useEffect(() => {
    if (bulkParams) {
      void getBulkChallans(bulkParams);
    }
  }, [bulkParams, getBulkChallans]);

  const list: FeeChallanData[] = useMemo(() => {
    if (challans && challans.length > 0) return challans;
    if (challan) return [challan];
    if (fetchedSingle) return [fetchedSingle];
    if (Array.isArray(fetchedBulk) && fetchedBulk.length > 0) return fetchedBulk;
    return [];
  }, [challans, challan, fetchedSingle, fetchedBulk]);

  const isModalOpen = Boolean(
    (challans && challans.length > 0) ||
      challan ||
      invoiceId ||
      bulkParams
  );

  if (!isModalOpen) return null;

  if (loadingSingle || loadingBulk) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
          <PageLoader compact label="Generating fee challan..." />
        </div>
      </div>
    );
  }

  if (list.length === 0) return null;

  const current = list[currentIndex] || list[0];

  const handlePrint = () => {
    window.print();
  };

  const copies = [
    { title: "Student Copy", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    {
      title: "School Copy",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: "Bank / Accounts Copy",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header (Hidden on print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <FaFileInvoiceDollar size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Official Monthly Fee Challan
                {list.length > 1 && (
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Challan {currentIndex + 1} of {list.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Challan #{current.invoiceNo} · {current.monthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pagination if multiple challans */}
            {list.length > 1 && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                  title="Previous Challan"
                >
                  <FaChevronLeft size={11} />
                </button>
                <span className="px-2 font-medium text-slate-700">
                  {currentIndex + 1} / {list.length}
                </span>
                <button
                  type="button"
                  disabled={currentIndex === list.length - 1}
                  onClick={() =>
                    setCurrentIndex((p) => Math.min(list.length - 1, p + 1))
                  }
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                  title="Next Challan"
                >
                  <FaChevronRight size={11} />
                </button>
              </div>
            )}

            {/* Layout switch */}
            <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLayout("challan")}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  layout === "challan"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3-Part
              </button>
              <button
                type="button"
                onClick={() => setLayout("single")}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  layout === "single"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setLayout("thermal")}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  layout === "thermal"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Slip
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <FaPrint size={13} />
              {list.length > 1 ? `Print (${list.length})` : "Print"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Modal Printable Content */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100/50">
          {/* Printable Container */}
          <div className="challan-printable-root space-y-8">
            {list.map((item, idx) => {
              const isScreenHidden = list.length > 1 && idx !== currentIndex;

              return (
                <div
                  key={item.id}
                  className={`${
                    isScreenHidden ? "hidden print:block" : "block"
                  } print:break-after-page print:page-break-after-always print:m-0`}
                >
                  {layout === "challan" && (
                    <Challan3PartView item={item} copies={copies} />
                  )}
                  {layout === "single" && <ChallanSingleView item={item} />}
                  {layout === "thermal" && <ChallanThermalView item={item} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Challan3PartView({
  item,
  copies,
}: {
  item: FeeChallanData;
  copies: Array<{ title: string; badge: string }>;
}) {
  const lateFine = item.fineAmount > 0 ? 0 : 100;
  const payableAfterDue = roundMoney(item.netPayable + lateFine);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2 print:p-0">
      {copies.map((copy) => (
        <div
          key={copy.title}
          className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-3 sm:p-4 flex flex-col justify-between text-xs text-slate-700 shadow-xs print:shadow-none print:border-slate-400 print:text-[9.5px] print:p-2"
        >
          <div>
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-2">
              <div className="min-w-0 pr-1">
                <h3 className="font-bold text-slate-900 truncate uppercase text-[11px] print:text-[9px]">
                  {item.school.name || "School SMS"}
                </h3>
                <p className="text-[9px] text-slate-500 truncate print:text-[8px]">
                  {item.school.address}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9.5px] font-semibold border whitespace-nowrap print:text-[8px] ${copy.badge}`}
              >
                {copy.title}
              </span>
            </div>

            {/* Challan Info Badge */}
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/70 mb-2.5 space-y-0.5 text-[11px] print:text-[8.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Challan No:</span>
                <span className="font-bold font-mono text-slate-900">
                  {item.invoiceNo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Month:</span>
                <span className="font-semibold text-blue-700">
                  {item.monthLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue Date:</span>
                <span>
                  {item.generatedAt
                    ? new Date(item.generatedAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-semibold text-rose-700">
                  {item.dueDate
                    ? new Date(item.dueDate).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-semibold uppercase ${
                    item.status === "PAID"
                      ? "text-emerald-700"
                      : item.status === "PARTIAL"
                        ? "text-amber-700"
                        : "text-rose-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>

            {/* Student Info */}
            <div className="border border-slate-200/80 rounded-lg p-2 mb-2.5 space-y-0.5 text-[11px] print:text-[8.5px] bg-white">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900 truncate">
                  {item.student.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reg No:</span>
                <span className="font-mono">{item.student.registrationNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class:</span>
                <span>
                  {item.enrollment.className}
                  {item.enrollment.sectionName
                    ? `-${item.enrollment.sectionName}`
                    : ""}
                  {item.enrollment.rollNo
                    ? ` (Roll ${item.enrollment.rollNo})`
                    : ""}
                </span>
              </div>
              {item.student.fatherName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Father Name:</span>
                  <span className="truncate">{item.student.fatherName}</span>
                </div>
              )}
            </div>

            {/* Fee Items Table */}
            <table className="w-full mb-2 text-left text-[11px] print:text-[8.5px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium">
                  <th className="pb-1">Fee Particular</th>
                  <th className="pb-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {item.items && item.items.length > 0 ? (
                  item.items.map((line) => (
                    <tr key={line.id} className="py-0.5">
                      <td className="py-0.5 text-slate-700 truncate pr-1">
                        {line.isDiscount ? `− ${line.label}` : line.label}
                      </td>
                      <td
                        className={`py-0.5 text-right font-medium whitespace-nowrap ${
                          line.isDiscount
                            ? "text-emerald-700"
                            : "text-slate-900"
                        }`}
                      >
                        {line.isDiscount ? `− ${money(line.amount)}` : money(line.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-1 text-slate-700">Monthly Tuition</td>
                    <td className="py-1 text-right font-medium">
                      {money(item.subtotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Arrears Section */}
          <div className="border-t-2 border-slate-200 pt-2 space-y-1 text-[11px] print:text-[8.5px]">
            <div className="flex justify-between text-slate-600">
              <span>Current Month Fee:</span>
              <span>{money(item.totalAmount)}</span>
            </div>

            {item.previousArrears > 0 && (
              <div className="flex justify-between text-rose-700 font-semibold bg-rose-50 px-1 py-0.5 rounded">
                <span>Previous Arrears / Dues:</span>
                <span>+{money(item.previousArrears)}</span>
              </div>
            )}

            {item.paidAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Paid So Far:</span>
                <span>−{money(item.paidAmount)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-[12px] print:text-[9.5px]">
              <span>Payable By Due Date:</span>
              <span className="text-blue-800">{money(item.netPayable)}</span>
            </div>

            {item.status !== "PAID" && (
              <div className="flex justify-between text-slate-500 text-[10px] print:text-[8px] pt-0.5">
                <span>After Due Date (+Fine):</span>
                <span>{money(payableAfterDue)}</span>
              </div>
            )}

            {/* Footer Signatures */}
            <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between text-[9px] print:text-[7.5px] text-slate-400">
              <div className="text-center">
                <div className="w-16 border-b border-slate-300 mb-0.5"></div>
                <span>Depositor</span>
              </div>
              <div className="text-center">
                <div className="w-16 border-b border-slate-300 mb-0.5"></div>
                <span>Cashier / Officer</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChallanSingleView({ item }: { item: FeeChallanData }) {
  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {item.school.name || "School SMS"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{item.school.address}</p>
          {item.school.phone && (
            <p className="text-xs text-slate-500">Phone: {item.school.phone}</p>
          )}
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
            Fee Challan
          </span>
          <p className="text-xs font-mono font-bold text-slate-800 mt-2">
            #{item.invoiceNo}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs mb-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-400 block">Student</span>
          <p className="font-bold text-slate-900 text-sm">{item.student.name}</p>
          <p className="text-slate-500">Reg: {item.student.registrationNo}</p>
          {item.student.fatherName && (
            <p className="text-slate-500">Father: {item.student.fatherName}</p>
          )}
        </div>
        <div>
          <span className="text-slate-400 block">Academic & Billing</span>
          <p className="font-semibold text-slate-800">
            {item.enrollment.className}
            {item.enrollment.sectionName ? `-${item.enrollment.sectionName}` : ""}
            {item.enrollment.rollNo ? ` · Roll ${item.enrollment.rollNo}` : ""}
          </p>
          <p className="text-slate-600">Month: {item.monthLabel}</p>
          <p className="text-rose-700 font-medium">
            Due Date:{" "}
            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>

      <table className="w-full text-xs mb-4">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="py-2 px-3 text-left">Particular</th>
            <th className="py-2 px-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {item.items.map((line) => (
            <tr key={line.id}>
              <td className="py-2 px-3 text-slate-800">
                {line.isDiscount ? `− ${line.label}` : line.label}
              </td>
              <td
                className={`py-2 px-3 text-right font-medium ${
                  line.isDiscount ? "text-emerald-700" : "text-slate-900"
                }`}
              >
                {line.isDiscount ? `− ${money(line.amount)}` : money(line.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-slate-200 pt-3 space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Current Month Charges:</span>
          <span>{money(item.totalAmount)}</span>
        </div>
        {item.previousArrears > 0 && (
          <div className="flex justify-between text-rose-700 font-bold bg-rose-50 p-2 rounded">
            <span>Previous Arrears:</span>
            <span>+{money(item.previousArrears)}</span>
          </div>
        )}
        {item.paidAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Paid Amount:</span>
            <span>−{money(item.paidAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
          <span>Total Payable:</span>
          <span className="text-blue-800">{money(item.netPayable)}</span>
        </div>
      </div>
    </div>
  );
}

function ChallanThermalView({ item }: { item: FeeChallanData }) {
  return (
    <div className="w-[300px] mx-auto bg-white p-4 border border-slate-300 rounded-lg text-xs font-mono shadow-sm">
      <div className="text-center pb-2 border-b border-dashed border-slate-300">
        <p className="font-bold text-sm uppercase">{item.school.name}</p>
        <p className="text-[10px] text-slate-500">{item.school.phone}</p>
        <p className="font-bold mt-1 text-slate-700">FEE CHALLAN</p>
      </div>

      <div className="py-2 space-y-0.5 border-b border-dashed border-slate-300 text-[11px]">
        <div className="flex justify-between">
          <span>Challan:</span>
          <span>{item.invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Month:</span>
          <span>{item.monthLabel}</span>
        </div>
        <div className="flex justify-between">
          <span>Due:</span>
          <span>
            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "—"}
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Student:</span>
          <span>{item.student.name}</span>
        </div>
        <div className="flex justify-between">
          <span>Reg / Class:</span>
          <span>
            {item.student.registrationNo} · {item.enrollment.className}
          </span>
        </div>
      </div>

      <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5">
        {item.items.map((line) => (
          <div key={line.id} className="flex justify-between">
            <span className="truncate pr-1">
              {line.isDiscount ? `− ${line.label}` : line.label}
            </span>
            <span>{money(line.amount)}</span>
          </div>
        ))}
      </div>

      <div className="pt-2 space-y-1">
        {item.previousArrears > 0 && (
          <div className="flex justify-between text-rose-700">
            <span>Arrears:</span>
            <span>+{money(item.previousArrears)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
          <span>Net Total:</span>
          <span>{money(item.netPayable)}</span>
        </div>
      </div>
    </div>
  );
}
