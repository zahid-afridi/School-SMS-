"use client";

import PageLoader from "@/app/components/PageLoader";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  useGetStaffAttendanceSheetQuery,
  useGetStaffMonthlyAttendanceReportQuery,
  useSaveStaffAttendanceSheetMutation,
  type AttendanceStatus,
} from "@/redux/features/reports/reportApi";
import {
  ReportBreadcrumb,
  ReportHeader,
  attendanceCellClass,
  reportInputClass,
  statusBadge,
} from "../_components/ReportUI";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function StaffMonthlyAttendanceInner() {
  const now = new Date();
  const searchParams = useSearchParams();
  const [year, setYear] = useState(
    Number(searchParams.get("year")) || now.getFullYear()
  );
  const [month, setMonth] = useState(
    Number(searchParams.get("month")) || now.getMonth() + 1
  );
  const [markDate, setMarkDate] = useState(todayKey());
  const [showMark, setShowMark] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, AttendanceStatus>
  >({});

  const args = useMemo(() => ({ year, month }), [year, month]);
  const { data, isLoading, isError, isFetching, refetch } =
    useGetStaffMonthlyAttendanceReportQuery(args);

  const { data: sheet, isFetching: sheetLoading } = useGetStaffAttendanceSheetQuery(
    { date: markDate },
    { skip: !showMark }
  );
  const [saveSheet, { isLoading: saving }] = useSaveStaffAttendanceSheetMutation();

  useEffect(() => {
    if (!sheet) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const row of sheet.employees) {
      next[row.employee.id] = row.status;
    }
    setLocalStatuses(next);
  }, [sheet]);

  const handleSaveMark = async () => {
    if (!sheet) return;
    try {
      await saveSheet({
        date: markDate,
        entries: sheet.employees.map((row) => ({
          employeeId: row.employee.id,
          status: localStatuses[row.employee.id] ?? "PRESENT",
        })),
      }).unwrap();
      toast.success("Staff attendance saved");
      refetch();
    } catch {
      toast.error("Failed to save attendance");
    }
  };

  return (
    <div className="w-full min-w-0">
      <ReportBreadcrumb current="Staff Monthly Attendance Report" />
      <ReportHeader
        title="Staff Monthly Attendance Report"
        subtitle="Monthly staff attendance matrix — mark daily attendance when needed"
      />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-end print:hidden">
        <div className="grid flex-1 grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Year</label>
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
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Month</label>
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
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMark((v) => !v)}
          className="h-11 w-full shrink-0 rounded-xl bg-black px-5 text-sm font-semibold text-white lg:w-auto"
        >
          {showMark ? "Hide daily marking" : "Mark daily attendance"}
        </button>
      </div>

      {showMark ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 print:hidden">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-48">
              <label className="mb-1 block text-xs text-slate-500">Date</label>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className={reportInputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleSaveMark}
              disabled={saving || sheetLoading || !sheet}
              className="h-11 w-full shrink-0 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
          {sheetLoading || !sheet ? (
            <PageLoader compact label="Loading staff sheet" />
          ) : sheet.employees.length === 0 ? (
            <p className="text-slate-400 text-sm">No active staff found.</p>
          ) : (
            <>
              {/* Stacked cards on phones — the 4-column table is unreadable there. */}
              <div className="space-y-3 md:hidden">
                {sheet.employees.map((row) => (
                  <div
                    key={row.employee.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <p className="break-words font-medium text-slate-800">
                      {row.employee.name ?? "—"}
                    </p>
                    <p className="mt-0.5 break-words text-xs text-slate-400">
                      {row.employee.employeeCode} · {row.employee.designation}
                    </p>
                    <select
                      value={localStatuses[row.employee.id] ?? "PRESENT"}
                      onChange={(e) =>
                        setLocalStatuses((prev) => ({
                          ...prev,
                          [row.employee.id]: e.target.value as AttendanceStatus,
                        }))
                      }
                      className="mt-3 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="PRESENT">Present</option>
                      <option value="LEAVE">Leave</option>
                      <option value="ABSENT">Absent</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-3 py-2">Staff</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Designation</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.employees.map((row) => (
                      <tr key={row.employee.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">
                          {row.employee.name ?? "—"}
                        </td>
                        <td className="px-3 py-2">{row.employee.employeeCode}</td>
                        <td className="px-3 py-2">{row.employee.designation}</td>
                        <td className="px-3 py-2">
                          <select
                            value={localStatuses[row.employee.id] ?? "PRESENT"}
                            onChange={(e) =>
                              setLocalStatuses((prev) => ({
                                ...prev,
                                [row.employee.id]: e.target
                                  .value as AttendanceStatus,
                              }))
                            }
                            className="h-11 min-w-[7.5rem] rounded-lg border border-slate-200 bg-white px-3 text-sm"
                          >
                            <option value="PRESENT">Present</option>
                            <option value="LEAVE">Leave</option>
                            <option value="ABSENT">Absent</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}

      {isLoading || isFetching ? (
        <PageLoader compact label="Loading report" />
      ) : isError || !data ? (
        <p className="text-rose-500">Failed to load staff attendance report.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600 flex flex-wrap gap-3 justify-between">
            <span>
              {data.monthLabel} · {data.staffCount} staff
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
                    Staff
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
                {data.staff.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.dayKeys.length + 5}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      No active staff found.
                    </td>
                  </tr>
                ) : (
                  data.staff.map((row) => (
                    <tr key={row.employee.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                        <p className="font-medium text-slate-800">
                          {row.employee.name ?? "—"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {row.employee.employeeCode} · {row.employee.designation}
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

export default function StaffMonthlyAttendanceReportPage() {
  return (
    <Suspense fallback={<PageLoader compact label="Loading" />}>
      <StaffMonthlyAttendanceInner />
    </Suspense>
  );
}
