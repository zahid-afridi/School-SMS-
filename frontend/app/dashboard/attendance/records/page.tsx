"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FaCalendarAlt } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetStudentAttendanceRecordsQuery } from "@/redux/features/attendance/attendanceApi";

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function monthStartKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function AttendanceRecordsPage() {
  const { data: classes = [] } = useGetAllClassesQuery();
  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState(monthStartKey());
  const [to, setTo] = useState(todayKey());

  const query = useMemo(
    () => ({
      classId: classId || undefined,
      from,
      to,
    }),
    [classId, from, to]
  );

  const { data: records = [], isLoading, isError } =
    useGetStudentAttendanceRecordsQuery(query);

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 mb-6 inline-flex items-center gap-2 text-sm text-slate-600 shadow-sm">
          <FaCalendarAlt className="text-indigo-500" />
          <span className="font-medium text-slate-800">Attendance</span>
          <span className="text-slate-400">›</span>
          <span>Attendance Records</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Students Attendance Records
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Previously taken class attendance sheets
            </p>
          </div>
          <Link
            href="/dashboard/attendance/students"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            Take Attendance
          </Link>
        </div>

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

        {isLoading ? (
          <PageLoader compact label="Loading records" />
        ) : isError ? (
          <p className="text-rose-500">Failed to load records.</p>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            No attendance taken in this range.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3 text-center text-emerald-700">P</th>
                  <th className="px-4 py-3 text-center text-amber-600">L</th>
                  <th className="px-4 py-3 text-center text-rose-600">A</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{r.dateKey}</td>
                    <td className="px-4 py-3">
                      {r.class.className}
                      {r.section ? `-${r.section.sectionName}` : ""}
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-semibold">
                      {r.present}
                    </td>
                    <td className="px-4 py-3 text-center text-amber-600 font-semibold">
                      {r.leave}
                    </td>
                    <td className="px-4 py-3 text-center text-rose-600 font-semibold">
                      {r.absent}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/attendance/students/mark?date=${r.dateKey}&classId=${r.class.id}${
                          r.section ? `&sectionId=${r.section.id}` : ""
                        }`}
                        className="text-indigo-600 hover:underline"
                      >
                        View / Update
                      </Link>
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
