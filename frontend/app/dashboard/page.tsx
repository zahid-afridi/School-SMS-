"use client";

import PageLoader from "@/app/components/PageLoader";

import Link from "next/link";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaMoneyBillWave,
  FaUsers,
  FaSchool,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaChartLine,
  FaCalendarAlt,
  FaPlus,
  FaHandHoldingUsd,
} from "react-icons/fa";
import { useGetDashboardStatsQuery } from "@/redux/features/dashboard/dashboardApi";

function money(n?: number) {
  return `PKR ${(n ?? 0).toLocaleString()}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function StatCard({
  label,
  value,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "yellow" | "rose" | "slate" | "purple" | "emerald";
  href?: string;
}) {
  const tones = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    rose: "bg-rose-100 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
    purple: "bg-purple-100 text-purple-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  const content = (
    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow h-full min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-gray-500 text-xs sm:text-sm">{label}</h2>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1.5 sm:mt-2 text-slate-900 break-words leading-tight">
            {value}
          </p>
        </div>
        <div
          className={`p-2.5 sm:p-3 md:p-4 rounded-full shrink-0 ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block min-w-0">
        {content}
      </Link>
    );
  }

  return content;
}

function AttendancePanel({
  title,
  summary,
  href,
}: {
  title: string;
  summary: {
    present: number;
    leave: number;
    absent: number;
    marked: number;
    total: number;
    percentage: number;
  };
  href: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm min-w-0">
      <div className="flex items-start sm:items-center justify-between gap-2 mb-4">
        <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug min-w-0">
          {title}
        </h3>
        <Link
          href={href}
          className="text-sm text-emerald-700 font-medium hover:underline shrink-0"
        >
          View
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm mb-4">
        <div className="rounded-xl bg-emerald-50 px-2.5 sm:px-3 py-2">
          <p className="text-emerald-700 text-xs">Present</p>
          <p className="font-bold text-base sm:text-lg">{summary.present}</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-2.5 sm:px-3 py-2">
          <p className="text-amber-700 text-xs">Leave</p>
          <p className="font-bold text-base sm:text-lg">{summary.leave}</p>
        </div>
        <div className="rounded-xl bg-rose-50 px-2.5 sm:px-3 py-2">
          <p className="text-rose-700 text-xs">Absent</p>
          <p className="font-bold text-base sm:text-lg">{summary.absent}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2.5 sm:px-3 py-2">
          <p className="text-slate-500 text-xs">Marked</p>
          <p className="font-bold text-base sm:text-lg">
            {summary.marked}/{summary.total}
          </p>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Attendance rate:{" "}
        <span className="font-semibold text-slate-800">
          {summary.percentage}%
        </span>
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } =
    useGetDashboardStatsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading dashboard" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 px-4">
        <p className="text-rose-500 text-center">Failed to load dashboard.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base break-words">
            {data.school.name} · Live overview of students, staff, fees, and
            attendance
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-row">
          <Link
            href="/dashboard/students/Add-students"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold"
          >
            <FaPlus size={12} /> Add Student
          </Link>
          <Link
            href="/dashboard/fees/collect"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
          >
            <FaHandHoldingUsd size={14} /> Collect Fees
          </Link>
          {isFetching ? (
            <span className="text-xs text-slate-400 self-center text-center sm:text-left">
              Refreshing…
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:mb-6 sm:gap-4 md:gap-6 xl:grid-cols-4">
        <StatCard
          label="Active Students"
          value={data.counts.activeStudents.toLocaleString()}
          icon={<FaUserGraduate className="text-lg sm:text-xl md:text-2xl" />}
          tone="blue"
          href="/dashboard/students"
        />
        <StatCard
          label="Teachers"
          value={data.counts.teachers.toLocaleString()}
          icon={
            <FaChalkboardTeacher className="text-lg sm:text-xl md:text-2xl" />
          }
          tone="green"
          href="/dashboard/teachers/All-Teachers"
        />
        <StatCard
          label="Total Staff"
          value={data.counts.staff.toLocaleString()}
          icon={<FaUsers className="text-lg sm:text-xl md:text-2xl" />}
          tone="purple"
          href="/dashboard/employees/all"
        />
        <StatCard
          label="Classes"
          value={data.counts.classes.toLocaleString()}
          icon={<FaSchool className="text-lg sm:text-xl md:text-2xl" />}
          tone="slate"
          href="/dashboard/classes/all-classes"
        />
        <StatCard
          label="Fees Collected"
          value={money(data.fees.totalCollected)}
          icon={<FaMoneyBillWave className="text-lg sm:text-xl md:text-2xl" />}
          tone="yellow"
          href="/dashboard/fees"
        />
        <StatCard
          label="Outstanding Fees"
          value={money(data.fees.totalOutstanding)}
          icon={
            <FaExclamationTriangle className="text-lg sm:text-xl md:text-2xl" />
          }
          tone="rose"
          href="/dashboard/fees/dues"
        />
        <StatCard
          label="This Month Collected"
          value={money(data.fees.thisMonth.collected)}
          icon={<FaChartLine className="text-lg sm:text-xl md:text-2xl" />}
          tone="emerald"
          href="/dashboard/reports/fee-collection"
        />
        <StatCard
          label="Fee Defaulters"
          value={data.fees.defaulterCount.toLocaleString()}
          icon={
            <FaExclamationTriangle className="text-lg sm:text-xl md:text-2xl" />
          }
          tone="rose"
          href="/dashboard/fees/defaulters"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 min-w-0">
          <AttendancePanel
            title={`Student Attendance · ${formatDate(data.attendance.date)}`}
            summary={data.attendance.students}
            href="/dashboard/attendance/students/mark"
          />
          <AttendancePanel
            title={`Staff Attendance · ${formatDate(data.attendance.date)}`}
            summary={data.attendance.staff}
            href="/dashboard/reports/staff-monthly-attendance"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
            <FaClipboardCheck className="text-slate-400" />
          </div>
          <div className="space-y-2 text-sm">
            <QuickLink
              href="/dashboard/attendance/students/mark"
              label="Mark student attendance"
            />
            <QuickLink
              href="/dashboard/fees/generate"
              label="Generate monthly fees"
            />
            <QuickLink href="/dashboard/reports" label="Open reports" />
            <QuickLink href="/dashboard/exams" label="Manage exams" />
            <QuickLink
              href="/dashboard/students/promote"
              label="Promote students"
            />
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 text-sm">
            <p className="text-slate-500">Today&apos;s collections</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1 break-words">
              {money(data.fees.today.collected)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {data.fees.today.paymentCount} payment(s)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm min-w-0">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              Recent Fee Payments
            </h3>
            <Link
              href="/dashboard/reports/fee-collection"
              className="text-sm text-emerald-700 font-medium hover:underline shrink-0"
            >
              View all
            </Link>
          </div>
          {data.recentPayments.length === 0 ? (
            <p className="px-5 py-10 text-center text-slate-400 text-sm">
              No payments recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-3 sm:px-4 py-2">Student</th>
                    <th className="px-3 sm:px-4 py-2">Receipt</th>
                    <th className="px-3 sm:px-4 py-2">Method</th>
                    <th className="px-3 sm:px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-t border-slate-100">
                      <td className="px-3 sm:px-4 py-2.5">
                        <p className="font-medium">{payment.student.name}</p>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(payment.paidAt)}
                        </p>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                        {payment.receiptNo}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                        {payment.method.replaceAll("_", " ")}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                        {money(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm min-w-0">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              Upcoming Exams
            </h3>
            <Link
              href="/dashboard/exams"
              className="text-sm text-emerald-700 font-medium hover:underline shrink-0"
            >
              View all
            </Link>
          </div>
          {data.exams.upcoming.length === 0 ? (
            <p className="px-5 py-10 text-center text-slate-400 text-sm">
              No upcoming exams scheduled.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.exams.upcoming.map((exam) => (
                <div
                  key={exam.id}
                  className="px-4 sm:px-5 py-3 sm:py-4 flex items-start gap-3"
                >
                  <div className="mt-0.5 text-emerald-600 shrink-0">
                    <FaCalendarAlt />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 break-words">
                      {exam.name}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatDate(exam.startDate)}
                      {exam.endDate ? ` – ${formatDate(exam.endDate)}` : ""}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{exam.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 text-xs sm:text-sm text-slate-500 break-words">
            {data.exams.active} active exam(s) · {data.counts.sections}{" "}
            section(s) · {data.counts.parents} parent(s)
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50 hover:border-slate-300 transition-colors"
    >
      {label}
    </Link>
  );
}
