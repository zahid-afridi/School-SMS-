"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGetAccountsReportQuery } from "@/redux/features/reports/reportApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  money,
  reportInputClass,
} from "../_components/ReportUI";

function AccountsReportInner() {
  const now = new Date();
  const searchParams = useSearchParams();
  const [year, setYear] = useState(
    Number(searchParams.get("year")) || now.getFullYear()
  );
  const args = useMemo(() => ({ year }), [year]);
  const { data, isLoading, isError, isFetching } =
    useGetAccountsReportQuery(args);

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Accounts Report" />
      <ReportHeader
        title="Accounts Report"
        subtitle="Yearly billed, collected and outstanding fee accounts"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 print:hidden max-w-xs">
        <label className="block text-xs text-slate-500 mb-1">Year</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className={reportInputClass}
        >
          {[year - 2, year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {isLoading || isFetching ? (
        <p className="text-slate-500">Loading report…</p>
      ) : isError || !data ? (
        <p className="text-rose-500">Failed to load accounts report.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 text-white rounded-2xl p-5">
              <p className="text-sm opacity-80">Total billed</p>
              <p className="text-2xl font-bold mt-1">{money(data.totals.billed)}</p>
            </div>
            <div className="bg-emerald-600 text-white rounded-2xl p-5">
              <p className="text-sm opacity-80">Collected (invoices)</p>
              <p className="text-2xl font-bold mt-1">
                {money(data.totals.collected)}
              </p>
            </div>
            <div className="bg-rose-600 text-white rounded-2xl p-5">
              <p className="text-sm opacity-80">Outstanding</p>
              <p className="text-2xl font-bold mt-1">
                {money(data.totals.outstanding)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500">Cash / payments received</p>
              <p className="text-2xl font-bold mt-1">
                {money(data.totals.cashCollected)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {data.totals.invoiceCount} invoice(s)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 font-semibold">
                Monthly breakdown · {data.year}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-2">Month</th>
                      <th className="px-4 py-2 text-center">Invoices</th>
                      <th className="px-4 py-2 text-right">Billed</th>
                      <th className="px-4 py-2 text-right">Collected</th>
                      <th className="px-4 py-2 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.months.map((m) => (
                      <tr key={m.month} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium">{m.label}</td>
                        <td className="px-4 py-2 text-center">{m.invoiceCount}</td>
                        <td className="px-4 py-2 text-right">{money(m.billed)}</td>
                        <td className="px-4 py-2 text-right">{money(m.collected)}</td>
                        <td className="px-4 py-2 text-right">{money(m.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">Payments by method</h3>
              {Object.keys(data.byMethod).length === 0 ? (
                <p className="text-slate-400 text-sm">No payments this year.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {Object.entries(data.byMethod).map(([method, amt]) => (
                    <div key={method} className="flex justify-between gap-3">
                      <span>{method.replaceAll("_", " ")}</span>
                      <span className="font-semibold">{money(amt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AccountsReportPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading…</p>}>
      <AccountsReportInner />
    </Suspense>
  );
}
