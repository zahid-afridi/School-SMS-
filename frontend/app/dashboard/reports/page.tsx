"use client";

import Link from "next/link";
import {
  FaIdCard,
  FaUserGraduate,
  FaUsers,
  FaCalendarCheck,
  FaUserTie,
  FaMoneyBillWave,
  FaChartLine,
  FaFileInvoiceDollar,
  FaCogs,
} from "react-icons/fa";

const REPORTS = [
  {
    name: "Students report Card",
    href: "/dashboard/reports/students-report-card",
    desc: "Print individual or class result cards from exams",
    icon: FaIdCard,
  },
  {
    name: "Students info report",
    href: "/dashboard/reports/students-info",
    desc: "Complete student directory with class and guardian",
    icon: FaUserGraduate,
  },
  {
    name: "Parents info report",
    href: "/dashboard/reports/parents-info",
    desc: "Parent / guardian contacts and linked children",
    icon: FaUsers,
  },
  {
    name: "Students Monthly Attendance Report",
    href: "/dashboard/reports/students-monthly-attendance",
    desc: "Day-by-day monthly attendance matrix by class",
    icon: FaCalendarCheck,
  },
  {
    name: "Staff Monthly Attendance Report",
    href: "/dashboard/reports/staff-monthly-attendance",
    desc: "Staff monthly matrix with optional daily marking",
    icon: FaUserTie,
  },
  {
    name: "Fee Collection Report",
    href: "/dashboard/reports/fee-collection",
    desc: "Payments collected by date range and method",
    icon: FaMoneyBillWave,
  },
  {
    name: "Student Progress Report",
    href: "/dashboard/reports/student-progress",
    desc: "Attendance, fees and exam performance for one student",
    icon: FaChartLine,
  },
  {
    name: "Accounts Report",
    href: "/dashboard/reports/accounts",
    desc: "Yearly billed, collected and outstanding summary",
    icon: FaFileInvoiceDollar,
  },
  {
    name: "Customised Reports",
    href: "/dashboard/reports/customised",
    desc: "Pick a report type and jump in with your filters",
    icon: FaCogs,
  },
];

export default function ReportsHomePage() {
  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">
          School reports for students, parents, attendance, fees and accounts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-900 hover:shadow-md transition"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition">
                <Icon />
              </div>
              <h2 className="font-semibold text-slate-900">{report.name}</h2>
              <p className="text-sm text-slate-500 mt-1">{report.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
