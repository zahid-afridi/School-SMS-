"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetStudentsMonthlyAttendanceReportQuery } from "@/redux/features/reports/reportApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  attendanceCellClass,
  reportInputClass,
  statusBadge,
} from "../_components/ReportUI";

function StudentsMonthlyAttendanceInner() {
  const now = new Date();
  const searchParams = useSearchParams();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [year, setYear] = useState(
    Number(searchParams.get("year")) || now.getFullYear()
  );
  const [month, setMonth] = useState(
    Number(searchParams.get("month")) || now.getMonth() + 1
  );
  const [classId, setClassId] = useState(searchParams.get("classId") ?? "");
  const [sectionId, setSectionId] = useState("");

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId]
  );
  const sections = selectedClass?.sections ?? [];

  const args = useMemo(
    () => ({
      year,
      month,
      classId,
      sectionId: sectionId || undefined,
    }),
    [year, month, classId, sectionId]
  );

  const { data, isLoading, isError, isFetching } =
    useGetStudentsMonthlyAttendanceReportQuery(args, { skip: !classId });

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Students Monthly Attendance Report" />
      <ReportHeader
        title="Students Monthly Attendance Report"
        subtitle="Day-by-day attendance matrix for a class and month"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 print:hidden grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className={reportInputClass}
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className={reportInputClass}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i, 1).toLocaleString("en", { month: "long" })}
            </option>
          ))}
        </select>
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSectionId("");
          }}
          className={reportInputClass}
        >
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.className}
            </option>
          ))}
        </select>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className={reportInputClass}
          disabled={!classId}
        >
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.sectionName}
            </option>
          ))}
        </select>
      </div>

      {!classId ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          Select a class to load the monthly attendance report.
        </div>
      ) : isLoading || isFetching ? (
        <PageLoader compact label="Loading report" />
      ) : isError || !data ? (
        <p className="text-rose-500">Failed to load attendance report.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600 flex flex-wrap gap-3 justify-between">
            <span>
              <strong>{data.class.className}</strong>
              {data.class.sectionName ? ` — ${data.class.sectionName}` : ""} ·{" "}
              {data.monthLabel} · {data.studentCount} student(s)
            </span>
            <span className="text-xs text-slate-400">
              P = Present · L = Leave · A = Absent
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs min-w-full">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left sticky left-0 bg-slate-50 z-10">
                    Student
                  </th>
                  {data.dayKeys.map((d) => (
                    <th key={d} className="px-1 py-2 text-center min-w-[28px]">
                      {Number(d.slice(-2))}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center">P</th>
                  <th className="px-2 py-2 text-center">L</th>
                  <th className="px-2 py-2 text-center">A</th>
                  <th className="px-2 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {data.students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.dayKeys.length + 5}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      No students enrolled in this class.
                    </td>
                  </tr>
                ) : (
                  data.students.map((row) => (
                    <tr key={row.student.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                        <p className="font-medium text-slate-800">{row.student.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {row.student.registrationNo}
                          {row.student.rollNo ? ` · Roll ${row.student.rollNo}` : ""}
                        </p>
                      </td>
                      {data.dayKeys.map((d) => (
                        <td
                          key={d}
                          className={`px-1 py-1.5 text-center ${attendanceCellClass(row.days[d])}`}
                        >
                          {statusBadge(row.days[d])}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">{row.summary.present}</td>
                      <td className="px-2 py-1.5 text-center">{row.summary.leave}</td>
                      <td className="px-2 py-1.5 text-center">{row.summary.absent}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">
                        {row.summary.percentage}%
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

export default function StudentsMonthlyAttendanceReportPage() {
  return (
    <Suspense fallback={<PageLoader compact label="Loading" />}>
      <StudentsMonthlyAttendanceInner />
    </Suspense>
  );
}
