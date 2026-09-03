"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGetReportFeeCollectionQuery } from "@/redux/features/reports/reportApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  money,
  reportInputClass,
} from "../_components/ReportUI";

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function FeeCollectionInner() {
  const now = new Date();
  const searchParams = useSearchParams();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(
    searchParams.get("from") ?? toInputDate(monthStart)
  );
  const [to, setTo] = useState(searchParams.get("to") ?? toInputDate(now));

  const args = useMemo(() => ({ from, to }), [from, to]);
  const { data, isLoading, isError, isFetching } =
    useGetReportFeeCollectionQuery(args);

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Fee Collection Report" />
      <ReportHeader
        title="Fee Collection Report"
        subtitle="Payments received by date range, method and receipt"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 print:hidden flex flex-col sm:flex-row gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={reportInputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={reportInputClass}
          />
        </div>
      </div>

      {isLoading || isFetching ? (
        <PageLoader compact label="Loading report" />
      ) : isError || !data ? (
        <p className="text-rose-500">Failed to load fee collection report.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-600 text-white rounded-2xl p-5">
              <p className="text-sm opacity-80">Total collected</p>
              <p className="text-2xl font-bold mt-1">{money(data.totalCollected)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500">Payments</p>
              <p className="text-2xl font-bold mt-1">{data.paymentCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500 mb-2">By method</p>
              <div className="space-y-1 text-sm">
                {Object.keys(data.byMethod).length === 0 ? (
                  <p className="text-slate-400">No data</p>
                ) : (
                  Object.entries(data.byMethod).map(([method, amt]) => (
                    <div key={method} className="flex justify-between gap-3">
                      <span>{method.replaceAll("_", " ")}</span>
                      <span className="font-semibold">{money(amt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        No payments in this range.
                      </td>
                    </tr>
                  ) : (
                    data.payments.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5">
                          {new Date(p.paidAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{p.receiptNo}</td>
                        <td className="px-4 py-2.5">
                          <p>{p.student.name}</p>
                          <p className="text-xs text-slate-400">
                            {p.student.registrationNo}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          {p.method.replaceAll("_", " ")}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {money(p.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function FeeCollectionReportPage() {
  return (
    <Suspense fallback={<PageLoader compact label="Loading" />}>
      <FeeCollectionInner />
    </Suspense>
  );
}
