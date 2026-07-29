"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetStudentAttendanceReportQuery } from "@/redux/features/attendance/attendanceApi";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function StudentsAttendanceReportPage() {
  const { data: classes = [] } = useGetAllClassesQuery();
  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState(monthStartKey());
  const [to, setTo] = useState(todayKey());

  const args = useMemo(
    () => ({ from, to, classId: classId || undefined }),
    [from, to, classId]
  );

  const { data, isLoading, isError, isFetching } =
    useGetStudentAttendanceReportQuery(args);

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 mb-6 inline-flex items-center gap-2 text-sm text-slate-600 shadow-sm">
          <FaCalendarAlt className="text-indigo-500" />
          <span className="font-medium text-slate-800">Attendance</span>
          <span className="text-slate-400">›</span>
          <span>Students Attendance Report</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Students Attendance Report
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Present / Leave / Absent summary with attendance percentage
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-3"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-3"
          />
        </div>

        {isLoading || isFetching ? (
          <PageLoader compact label="Loading report" />
        ) : isError || !data ? (
          <p className="text-rose-500">Failed to load report.</p>
        ) : data.students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            No attendance data in this range.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 text-center">Present</th>
                  <th className="px-4 py-3 text-center">Leave</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((row) => (
                  <tr key={row.student.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.student.name}</p>
                      <p className="text-xs text-slate-400">
                        {row.student.registrationNo}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-semibold">
                      {row.present}
                    </td>
                    <td className="px-4 py-3 text-center text-amber-600 font-semibold">
                      {row.leave}
                    </td>
                    <td className="px-4 py-3 text-center text-rose-600 font-semibold">
                      {row.absent}
                    </td>
                    <td className="px-4 py-3 text-center">{row.total}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700">
                      {row.percentage}%
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
