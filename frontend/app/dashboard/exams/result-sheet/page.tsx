"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useGetExamsQuery,
  useLazyGetResultSheetQuery,
} from "@/redux/features/exams/examApi";
import type { ResultSheetData } from "@/redux/features/exams/examTypes";
import {
  ExamBreadcrumb,
  examInputClass,
} from "../_components/ExamUI";

export default function ResultSheetPage() {
  const { data: exams = [] } = useGetExamsQuery();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sheet, setSheet] = useState<ResultSheetData | null>(null);
  const [loadSheet, { isFetching }] = useLazyGetResultSheetQuery();

  const selectedClass = classes.find((c) => c.id === classId);

  const handleLoad = async () => {
    if (!examId || !classId) {
      toast.error("Select exam and class");
      return;
    }
    try {
      const data = await loadSheet({
        examId,
        classId,
        sectionId: sectionId || undefined,
      }).unwrap();
      setSheet(data);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load result sheet"
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <ExamBreadcrumb current="Result Sheet" />
        <h1 className="text-3xl font-bold text-slate-900 mb-6 print:hidden">Result Sheet</h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
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
              CLASS
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
              }}
              className={examInputClass}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              SECTION
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className={examInputClass}
            >
              <option value="">All</option>
              {selectedClass?.sections?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sectionName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleLoad}
              disabled={isFetching}
              className="h-11 px-5 rounded-xl bg-black text-white font-semibold hover:bg-slate-800"
            >
              {isFetching ? "Loading..." : "Load Sheet"}
            </button>
            {sheet && (
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 px-4 rounded-xl border border-slate-200 print:hidden"
              >
                Print
              </button>
            )}
          </div>
        </div>

        {sheet && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-lg">
                {sheet.exam.name} — {sheet.class.className}
              </h2>
            </div>
            {sheet.subjects.length === 0 ? (
              <p className="p-8 text-center text-slate-400">
                No subjects scheduled for this class. Add them in Exam Schedule.
              </p>
            ) : (
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-3 py-2">Student</th>
                    {sheet.subjects.map((s) => (
                      <th key={s.id} className="px-3 py-2 text-center">
                        {s.name}
                        <span className="block text-[10px] font-normal">
                          /{s.maxMarks}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">%</th>
                    <th className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row) => {
                    const bySubject = new Map(
                      row.lines.map((l) => [l.subjectId, l])
                    );
                    return (
                      <tr key={row.student.id} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">{row.student.name}</p>
                          <p className="text-xs text-slate-400">
                            {row.student.registrationNo}
                          </p>
                        </td>
                        {sheet.subjects.map((s) => {
                          const line = bySubject.get(s.subjectId);
                          return (
                            <td key={s.id} className="px-3 py-2 text-center">
                              {line?.isAbsent
                                ? "A"
                                : (line?.obtainedMarks ?? "—")}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-medium">
                          {row.summary.totalObtained}/{row.summary.totalMax}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.summary.overallPercent}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              row.summary.overallStatus === "PASS"
                                ? "bg-emerald-50 text-emerald-700"
                                : row.summary.overallStatus === "FAIL"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.summary.overallStatus}
                          </span>
                        </td>
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
