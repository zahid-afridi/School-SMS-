"use client";

import { ButtonLoader } from "@/app/components/PageLoader";
import { useMemo, useState } from "react";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import { useLazyGetStudentProgressReportQuery } from "@/redux/features/reports/reportApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  money,
  reportInputClass,
} from "../_components/ReportUI";

export default function StudentProgressReportPage() {
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const { data: studentsData } = useGetAllStudentsQuery(
    { search: search || undefined, status: "ACTIVE", limit: 20 },
    { skip: search.trim().length < 1 }
  );
  const students = studentsData?.students ?? [];

  const [loadProgress, { data, isFetching, isError }] =
    useLazyGetStudentProgressReportQuery();

  const selected = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId]
  );

  const handleGenerate = async () => {
    if (!studentId) return;
    await loadProgress(studentId);
  };

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Student Progress Report" />
      <ReportHeader
        title="Student Progress Report"
        subtitle="Combined attendance, fee and exam progress for one student"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 print:hidden grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setStudentId("");
          }}
          placeholder="Search student name / reg no"
          className={reportInputClass}
        />
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={reportInputClass}
        >
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.registrationNo})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!studentId || isFetching}
          className="h-11 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-50"
        >
          {isFetching ? (
            <ButtonLoader label="Generating" />
          ) : (
            "Generate progress report"
          )}
        </button>
      </div>

      {selected && !data ? (
        <p className="text-sm text-slate-500 print:hidden mb-4">
          Selected: {selected.name}
        </p>
      ) : null}

      {isError ? (
        <p className="text-rose-500">Failed to load progress report.</p>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {data.student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.student.photoUrl}
                  alt=""
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                  No photo
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {data.student.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {data.student.registrationNo}
                  {data.student.enrollment
                    ? ` · ${data.student.enrollment.class.className}${
                        data.student.enrollment.section
                          ? `-${data.student.enrollment.section.sectionName}`
                          : ""
                      }`
                    : ""}
                  {data.student.enrollment?.rollNo
                    ? ` · Roll ${data.student.enrollment.rollNo}`
                    : ""}
                </p>
                {data.student.guardian ? (
                  <p className="text-sm text-slate-500 mt-1">
                    Guardian: {data.student.guardian.name} (
                    {data.student.guardian.type})
                    {data.student.guardian.mobileNo
                      ? ` · ${data.student.guardian.mobileNo}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500">
                Attendance · {data.attendance.monthLabel}
              </p>
              <p className="text-3xl font-bold mt-2">
                {data.attendance.percentage}%
              </p>
              <p className="text-xs text-slate-500 mt-2">
                P {data.attendance.present} · L {data.attendance.leave} · A{" "}
                {data.attendance.absent} · Days {data.attendance.total}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500">Fee outstanding</p>
              <p className="text-3xl font-bold mt-2 text-rose-600">
                {money(data.fees.outstanding)}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {data.fees.recentInvoices.length} recent invoice(s)
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500">Exams recorded</p>
              <p className="text-3xl font-bold mt-2">{data.exams.length}</p>
              <p className="text-xs text-slate-500 mt-2">
                Latest{" "}
                {data.exams[0]
                  ? `${data.exams[0].exam.name} · ${data.exams[0].percentage}%`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-slate-100 font-semibold">
              Recent fee invoices
            </div>
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2">Invoice</th>
                  <th className="px-4 py-2">Month</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Paid</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.fees.recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No invoices.
                    </td>
                  </tr>
                ) : (
                  data.fees.recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">{inv.invoiceNo}</td>
                      <td className="px-4 py-2">{inv.monthLabel}</td>
                      <td className="px-4 py-2 text-right">{money(inv.totalAmount)}</td>
                      <td className="px-4 py-2 text-right">{money(inv.paidAmount)}</td>
                      <td className="px-4 py-2 text-right">{money(inv.balanceAmount)}</td>
                      <td className="px-4 py-2">{inv.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Exam results</h3>
            {data.exams.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                No exam marks recorded yet.
              </div>
            ) : (
              data.exams.map((exam) => (
                <div
                  key={exam.exam.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between gap-3">
                    <span className="font-semibold">{exam.exam.name}</span>
                    <span className="text-sm text-slate-500">
                      {exam.obtained}/{exam.total} · {exam.percentage}%
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-left">
                      <tr>
                        <th className="px-4 py-2">Subject</th>
                        <th className="px-4 py-2 text-right">Obtained</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-right">Pass</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.subjects.map((sub) => (
                        <tr
                          key={`${exam.exam.id}-${sub.name}`}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-2">{sub.name}</td>
                          <td className="px-4 py-2 text-right">
                            {sub.isAbsent ? "Absent" : (sub.obtained ?? "—")}
                          </td>
                          <td className="px-4 py-2 text-right">{sub.total}</td>
                          <td className="px-4 py-2 text-right">{sub.passing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
