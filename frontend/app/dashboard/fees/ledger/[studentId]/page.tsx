"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useGetStudentFeeLedgerQuery } from "@/redux/features/fees/feeApi";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

export default function StudentFeeLedgerPage() {
  const params = useParams();
  const studentId = String(params.studentId ?? "");
  const { data, isLoading, isError } = useGetStudentFeeLedgerQuery(studentId, {
    skip: !studentId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading ledger...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500">Failed to load student ledger.</p>
      </div>
    );
  }

  const { student, summary, months, payments } = data;
  const enrollment = student.enrollment;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/dashboard/fees/defaulters"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6"
        >
          <FaArrowLeft size={12} /> Back
        </Link>

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
              className="inline-flex justify-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Collect Payment
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <MiniStat label="Billed" value={money(summary.totalBilled)} />
            <MiniStat label="Paid" value={money(summary.totalPaid)} />
            <MiniStat
              label="Remaining"
              value={money(summary.totalBalance)}
              danger
            />
            <MiniStat
              label="Months"
              value={`${summary.paidMonths} paid / ${summary.unpaidMonths} due`}
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Month-wise status
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
          Payment history
        </h2>
        {payments.length === 0 ? (
          <p className="text-slate-400">No payments recorded yet.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Applied to</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{p.receiptNo}</td>
                    <td className="px-4 py-3">
                      {new Date(p.paidAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{p.method.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.allocations
                        ?.map((a) => a.invoice.invoiceNo)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {money(p.amount)}
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

function MiniStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-sm font-bold mt-1 ${
          danger ? "text-rose-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
