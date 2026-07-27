"use client";

import Link from "next/link";
import {
  FaCalendarAlt,
  FaClipboardList,
  FaFileAlt,
  FaListOl,
  FaPenFancy,
  FaPlus,
  FaTable,
  FaUserGraduate,
} from "react-icons/fa";
import { useGetExamsQuery } from "@/redux/features/exams/examApi";
import { ExamBreadcrumb, formatExamDate } from "./_components/ExamUI";

const tiles = [
  {
    href: "/dashboard/exams/create",
    title: "Create New Exam",
    desc: "Add exam name and dates",
    icon: <FaPlus className="text-violet-600" />,
  },
  {
    href: "/dashboard/exams/marks",
    title: "Add / Update Marks",
    desc: "Enter student marks by subject",
    icon: <FaPenFancy className="text-violet-600" />,
  },
  {
    href: "/dashboard/exams/result-card",
    title: "Result Card",
    desc: "Student or class result cards",
    icon: <FaUserGraduate className="text-violet-600" />,
  },
  {
    href: "/dashboard/exams/result-sheet",
    title: "Result Sheet",
    desc: "Class-wise marks sheet",
    icon: <FaTable className="text-violet-600" />,
  },
  {
    href: "/dashboard/exams/schedule",
    title: "Exam Schedule",
    desc: "Subjects, dates, max marks",
    icon: <FaCalendarAlt className="text-violet-600" />,
  },
  {
    href: "/dashboard/exams/date-sheet",
    title: "Date Sheet",
    desc: "Printable exam date sheet",
    icon: <FaClipboardList className="text-violet-600" />,
  },
  {
    href: "/dashboard/exams/award-list",
    title: "Blank Award List",
    desc: "Print blank mark entry list",
    icon: <FaListOl className="text-violet-600" />,
  },
];

export default function ExamsHubPage() {
  const { data: exams = [], isLoading } = useGetExamsQuery();

  return (
    <div className="w-full min-w-0">
      <div className="max-w-7xl mx-auto">
        <ExamBreadcrumb current="Overview" />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Exams</h1>
            <p className="text-slate-500 mt-1">
              Create exams, schedule papers, enter marks, and print results
            </p>
          </div>
          <Link
            href="/dashboard/exams/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-slate-800"
          >
            <FaPlus size={12} /> Create Exam
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {tiles.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                {t.icon}
              </div>
              <h3 className="font-semibold text-slate-900">{t.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{t.desc}</p>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FaFileAlt className="text-violet-600" />
            <h2 className="font-semibold text-slate-900">Recent Exams</h2>
          </div>
          {isLoading ? (
            <p className="p-8 text-slate-400 text-center">Loading exams...</p>
          ) : exams.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-medium text-slate-600 mb-1">No Exams Yet</p>
              <p className="text-sm">Create your first exam to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3">Exam</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {exam.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatExamDate(exam.startDate)}
                        {exam.endDate
                          ? ` → ${formatExamDate(exam.endDate)}`
                          : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-violet-50 text-violet-700">
                          {exam.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{exam._count?.subjects ?? 0}</td>
                      <td className="px-4 py-3">{exam._count?.marks ?? 0}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/dashboard/exams/schedule?examId=${exam.id}`}
                          className="text-violet-700 hover:underline mr-3"
                        >
                          Schedule
                        </Link>
                        <Link
                          href={`/dashboard/exams/marks?examId=${exam.id}`}
                          className="text-emerald-700 hover:underline"
                        >
                          Marks
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
    </div>
  );
}
