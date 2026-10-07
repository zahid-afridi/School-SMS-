"use client";

import { useState } from "react";
import { FaPrint, FaTimes, FaReceipt } from "react-icons/fa";
import type { FeeReceiptData } from "@/redux/features/fees/feeTypes";

interface FeeReceiptModalProps {
  receipt: FeeReceiptData | null;
  onClose: () => void;
}

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function FeeReceiptModal({
  receipt,
  onClose,
}: FeeReceiptModalProps) {
  const [layout, setLayout] = useState<"challan" | "thermal">("challan");

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const copies = [
    { title: "Student Copy", badge: "bg-blue-50 text-blue-700" },
    { title: "School Copy", badge: "bg-emerald-50 text-emerald-700" },
    { title: "Accounts Copy", badge: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* On screen dialog container */}
      <div className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
              <FaReceipt size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Official Fee Receipt & Challan
              </h2>
              <p className="text-xs text-slate-500">
                Receipt #{receipt.receiptNo} ·{" "}
                {new Date(receipt.paidAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold mr-2">
              <button
                type="button"
                onClick={() => setLayout("challan")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  layout === "challan"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                3-Part Challan
              </button>
              <button
                type="button"
                onClick={() => setLayout("thermal")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  layout === "thermal"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Thermal Slip
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <FaPrint size={14} /> Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        {/* Modal Printable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/40">
          {layout === "challan" ? (
            /* 3-Copy Challan View (Student, School, Accounts) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2 print:p-0">
              {copies.map((copy) => (
                <div
                  key={copy.title}
                  className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col justify-between text-xs text-slate-700 shadow-sm print:shadow-none print:border-slate-400 print:text-[10px] print:p-2.5"
                >
                  {/* Copy Badge & School Header */}
                  <div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-2">
                      <span className="font-bold text-slate-900 truncate uppercase text-[11px] print:text-[9px]">
                        {receipt.school.name || "School SMS"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold print:text-[8px] ${copy.badge}`}
                      >
                        {copy.title}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 mb-2 leading-tight">
                      {receipt.school.address}
                      {receipt.school.phone && ` · ${receipt.school.phone}`}
                    </p>

                    {/* Receipt & Student Details */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 mb-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Receipt:</span>
                        <span className="font-bold text-slate-800">
                          {receipt.receiptNo}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date:</span>
                        <span>
                          {new Date(receipt.paidAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Student:</span>
                        <span className="font-semibold text-slate-900 truncate">
                          {receipt.student.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Reg No:</span>
                        <span className="font-mono">
                          {receipt.student.registrationNo}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Class:</span>
                        <span>
                          {receipt.student.className}
                          {receipt.student.sectionName
                            ? `-${receipt.student.sectionName}`
                            : ""}
                          {receipt.student.rollNo
                            ? ` (Roll ${receipt.student.rollNo})`
                            : ""}
                        </span>
                      </div>
                      {receipt.student.fatherName && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Father:</span>
                          <span>{receipt.student.fatherName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mode:</span>
                        <span className="font-medium">
                          {receipt.method.replace("_", " ")}
                        </span>
                      </div>
                      {receipt.reference && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ref:</span>
                          <span>{receipt.reference}</span>
                        </div>
                      )}
                    </div>

                    {/* Allocated Months / Items */}
                    <table className="w-full mb-3 text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-medium">
                          <th className="pb-1">Particular / Month</th>
                          <th className="pb-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {receipt.allocations.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="py-2 text-slate-400 italic">
                              Advance Deposit (Credited to Wallet)
                            </td>
                          </tr>
                        ) : (
                          receipt.allocations.map((a, idx) => (
                            <tr key={idx}>
                              <td className="py-1">
                                <span className="font-medium text-slate-800">
                                  {a.monthLabel}
                                </span>
                                <span className="block text-[9px] text-slate-400">
                                  {a.invoiceNo}
                                </span>
                              </td>
                              <td className="py-1 text-right font-semibold text-slate-900">
                                {money(a.allocatedAmount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Stamp Line */}
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-900">
                      <span>Total Paid:</span>
                      <span className="text-emerald-700">
                        {money(receipt.amount)}
                      </span>
                    </div>
                    {receipt.student.advanceBalance > 0 && (
                      <div className="flex justify-between text-[10px] text-emerald-600 font-medium">
                        <span>Advance Balance:</span>
                        <span>{money(receipt.student.advanceBalance)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Remaining Dues:</span>
                      <span
                        className={
                          receipt.student.remainingDue > 0
                            ? "text-rose-600 font-semibold"
                            : "text-emerald-600 font-medium"
                        }
                      >
                        {money(receipt.student.remainingDue)}
                      </span>
                    </div>

                    <div className="pt-6 mt-4 flex justify-between items-end text-[9px] text-slate-400">
                      <div className="text-center">
                        <div className="w-16 border-b border-slate-300 mb-1" />
                        <span>Cashier</span>
                      </div>
                      <div className="text-center">
                        <div className="w-16 border-b border-slate-300 mb-1" />
                        <span>Principal Stamp</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Thermal POS Receipt View (~80mm) */
            <div className="max-w-xs mx-auto bg-white p-5 rounded-xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 text-slate-900 text-xs font-mono">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h3 className="font-bold text-sm uppercase">
                  {receipt.school.name || "School SMS"}
                </h3>
                <p className="text-[10px] text-slate-500">{receipt.school.address}</p>
                {receipt.school.phone && (
                  <p className="text-[10px] text-slate-500">{receipt.school.phone}</p>
                )}
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wider">
                  *** FEE RECEIPT ***
                </p>
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span className="font-bold">{receipt.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(receipt.paidAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Student:</span>
                  <span className="font-semibold">{receipt.student.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reg / Roll:</span>
                  <span>
                    {receipt.student.registrationNo}
                    {receipt.student.rollNo ? ` / ${receipt.student.rollNo}` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Class:</span>
                  <span>
                    {receipt.student.className}
                    {receipt.student.sectionName
                      ? `-${receipt.student.sectionName}`
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span>{receipt.method.replace("_", " ")}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 text-[11px]">
                <div className="flex justify-between font-bold mb-1">
                  <span>Item / Month</span>
                  <span>Amount</span>
                </div>
                {receipt.allocations.length === 0 ? (
                  <p className="text-slate-500 italic">Advance Deposit</p>
                ) : (
                  receipt.allocations.map((a, i) => (
                    <div key={i} className="flex justify-between py-0.5">
                      <span>{a.monthLabel}</span>
                      <span>{money(a.allocatedAmount)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL PAID:</span>
                  <span>{money(receipt.amount)}</span>
                </div>
                {receipt.student.advanceBalance > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Advance Balance:</span>
                    <span>{money(receipt.student.advanceBalance)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Remaining Dues:</span>
                  <span>{money(receipt.student.remainingDue)}</span>
                </div>
              </div>

              <div className="text-center pt-4 text-[10px] text-slate-500">
                <p>Thank you for paying on time!</p>
                <p className="mt-4 border-t border-slate-300 pt-1 w-28 mx-auto">
                  Authorized Sign
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
