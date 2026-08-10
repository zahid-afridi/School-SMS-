"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGetParentsInfoReportQuery } from "@/redux/features/reports/reportApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  reportInputClass,
} from "../_components/ReportUI";

function ParentsInfoReportInner() {
  const searchParams = useSearchParams();
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const args = useMemo(
    () => ({
      type: type || undefined,
      search: appliedSearch || undefined,
    }),
    [type, appliedSearch]
  );

  const { data, isLoading, isError, isFetching } =
    useGetParentsInfoReportQuery(args);

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Parents info report" />
      <ReportHeader
        title="Parents info report"
        subtitle="Guardian contacts with linked students"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 print:hidden grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={reportInputClass}
        >
          <option value="">All types</option>
          <option value="FATHER">Father</option>
          <option value="MOTHER">Mother</option>
          <option value="GUARDIAN">Guardian</option>
          <option value="OTHER">Other</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / CNIC / phone"
          className={reportInputClass}
          onKeyDown={(e) => {
            if (e.key === "Enter") setAppliedSearch(search.trim());
          }}
        />
        <button
          type="button"
          onClick={() => setAppliedSearch(search.trim())}
          className="h-11 rounded-xl bg-black text-white text-sm font-semibold"
        >
          Apply filters
        </button>
      </div>

      {isLoading || isFetching ? (
        <PageLoader compact label="Loading report" />
      ) : isError || !data ? (
        <p className="text-rose-500">Failed to load parents info report.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between text-sm text-slate-500">
            <span>{data.total} parent(s)</span>
            <span>Generated {new Date(data.generatedAt).toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">CNIC</th>
                  <th className="px-3 py-3">Mobile</th>
                  <th className="px-3 py-3">Occupation</th>
                  <th className="px-3 py-3">Children</th>
                </tr>
              </thead>
              <tbody>
                {data.parents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      No parents found.
                    </td>
                  </tr>
                ) : (
                  data.parents.map((p, idx) => (
                    <tr key={p.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{p.name}</td>
                      <td className="px-3 py-2.5">{p.type}</td>
                      <td className="px-3 py-2.5">{p.nationalId ?? "—"}</td>
                      <td className="px-3 py-2.5">{p.mobileNo ?? "—"}</td>
                      <td className="px-3 py-2.5">{p.occupation ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <ul className="space-y-1">
                          {p.children.map((c) => (
                            <li key={c.id}>
                              {c.name} ({c.registrationNo})
                              {c.className ? ` — ${c.className}` : ""}
                              {c.sectionName ? `-${c.sectionName}` : ""}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentsInfoReportPage() {
  return (
    <Suspense fallback={<PageLoader compact label="Loading" />}>
      <ParentsInfoReportInner />
    </Suspense>
  );
}
