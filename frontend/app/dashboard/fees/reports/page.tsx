"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState } from "react";
import { useGetFeeCollectionReportQuery } from "@/redux/features/fees/feeApi";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function FeeReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(toInputDate(monthStart));
  const [to, setTo] = useState(toInputDate(now));

  const queryArgs = useMemo(() => ({ from, to }), [from, to]);
  const { data, isLoading, isError, isFetching } =
    useGetFeeCollectionReportQuery(queryArgs);

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Fee Reports</h1>
        <p className="text-slate-500 mb-8">
          Collection report by date range and payment method
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 px-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 px-3 bg-white"
            />
          </div>
        </div>

        {isLoading || isFetching ? (
          <PageLoader compact label="Loading report" />
        ) : isError || !data ? (
          <p className="text-red-500">Failed to load report.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-emerald-600 text-white rounded-2xl p-5">
                <p className="text-sm opacity-80">Total collected</p>
                <p className="text-2xl font-bold mt-1">
                  {money(data.totalCollected)}
                </p>
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
                      <div key={method} className="flex justify-between">
                        <span>{method.replace("_", " ")}</span>
                        <span className="font-semibold">{money(amt)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        No payments in this range
                      </td>
                    </tr>
                  ) : (
                    data.payments.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{p.receiptNo}</td>
                        <td className="px-4 py-3">
                          {p.student?.name}
                          <span className="block text-xs text-slate-400">
                            {p.student?.registrationNo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(p.paidAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {p.method.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {money(p.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
