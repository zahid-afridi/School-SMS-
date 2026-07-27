"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetStudentsInfoReportQuery } from "@/redux/features/reports/reportApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  reportInputClass,
} from "../_components/ReportUI";

function StudentsInfoReportInner() {
  const searchParams = useSearchParams();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [classId, setClassId] = useState(searchParams.get("classId") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "ACTIVE");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const args = useMemo(
    () => ({
      classId: classId || undefined,
      status,
      search: appliedSearch || undefined,
    }),
    [classId, status, appliedSearch]
  );

  const { data, isLoading, isError, isFetching } =
    useGetStudentsInfoReportQuery(args);

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Students info report" />
      <ReportHeader
        title="Students info report"
        subtitle="Full student particulars with class and guardian details"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 print:hidden grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className={reportInputClass}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.className}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={reportInputClass}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ALL">All statuses</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / reg no"
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
        <p className="text-slate-500">Loading report…</p>
      ) : isError || !data ? (
        <p className="text-rose-500">Failed to load students info report.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between text-sm text-slate-500">
            <span>{data.total} student(s)</span>
            <span>Generated {new Date(data.generatedAt).toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Reg No</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Roll</th>
                  <th className="px-3 py-3">Gender</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Guardian</th>
                  <th className="px-3 py-3">Guardian phone</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.students.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  data.students.map((s, idx) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{s.registrationNo}</td>
                      <td className="px-3 py-2.5">{s.name}</td>
                      <td className="px-3 py-2.5">
                        {s.className ?? "—"}
                        {s.sectionName ? `-${s.sectionName}` : ""}
                      </td>
                      <td className="px-3 py-2.5">{s.rollNo ?? "—"}</td>
                      <td className="px-3 py-2.5">{s.gender ?? "—"}</td>
                      <td className="px-3 py-2.5">{s.contactPhone ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        {s.guardianName ?? "—"}
                        {s.guardianType ? ` (${s.guardianType})` : ""}
                      </td>
                      <td className="px-3 py-2.5">{s.guardianPhone ?? "—"}</td>
                      <td className="px-3 py-2.5">{s.status}</td>
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

export default function StudentsInfoReportPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading…</p>}>
      <StudentsInfoReportInner />
    </Suspense>
  );
}
