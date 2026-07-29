"use client";

import { ButtonLoader } from "@/app/components/PageLoader";
import { useState } from "react";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useGetExamsQuery,
  useLazyGetDateSheetQuery,
} from "@/redux/features/exams/examApi";
import type { DateSheetData } from "@/redux/features/exams/examTypes";
import {
  ExamBreadcrumb,
  examInputClass,
  formatExamDate,
} from "../_components/ExamUI";

export default function DateSheetPage() {
  const { data: exams = [] } = useGetExamsQuery();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [data, setData] = useState<DateSheetData | null>(null);
  const [load, { isFetching }] = useLazyGetDateSheetQuery();

  const handleLoad = async () => {
    if (!examId) {
      toast.error("Select an exam");
      return;
    }
    try {
      const res = await load({
        examId,
        classId: classId || undefined,
      }).unwrap();
      setData(res);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load date sheet"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <ExamBreadcrumb current="Date Sheet" />
        <h1 className="text-3xl font-bold text-slate-900 mb-6 print:hidden">Date Sheet</h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              EXAM
            </label>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className={examInputClass}
            >
              <option value="">Select exam</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              CLASS (optional)
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={examInputClass}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleLoad}
              disabled={isFetching}
              className="h-11 px-5 rounded-xl bg-black text-white font-semibold"
            >
              {isFetching ? (
                <ButtonLoader label="Loading date sheet" />
              ) : (
                "View Date Sheet"
              )}
            </button>
            {data && (
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 px-4 rounded-xl border print:hidden"
              >
                Print
              </button>
            )}
          </div>
        </div>

        {data && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {data.exam.name}
              </h2>
              <p className="text-slate-500">Examination Date Sheet</p>
              <p className="text-sm text-slate-400 mt-1">
                {formatExamDate(data.exam.startDate)}
                {data.exam.endDate
                  ? ` — ${formatExamDate(data.exam.endDate)}`
                  : ""}
              </p>
            </div>
            {data.entries.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                No schedule entries. Add papers in Exam Schedule.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Room</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e) => {
                    const d = e.examDate ? new Date(e.examDate) : null;
                    const day =
                      d && !Number.isNaN(d.getTime())
                        ? d.toLocaleDateString("en-GB", { weekday: "long" })
                        : "—";
                    return (
                      <tr key={e.id} className="border-t">
                        <td className="px-4 py-3">
                          {formatExamDate(e.examDate)}
                        </td>
                        <td className="px-4 py-3">{day}</td>
                        <td className="px-4 py-3 font-medium">
                          {e.subject.name}
                        </td>
                        <td className="px-4 py-3">
                          {e.class.className}
                          {e.section ? `-${e.section.sectionName}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          {e.startTime || "—"}
                          {e.endTime ? ` – ${e.endTime}` : ""}
                        </td>
                        <td className="px-4 py-3">{e.room || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
