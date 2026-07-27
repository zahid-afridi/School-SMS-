"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaSave } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useGetExamScheduleQuery,
  useGetExamsQuery,
  useLazyGetMarksSheetQuery,
  useSaveMarksMutation,
} from "@/redux/features/exams/examApi";
import {
  ExamBreadcrumb,
  examInputClass,
} from "../_components/ExamUI";

export default function MarksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-\[40vh\]">
          <p className="text-slate-500">Loading...</p>
        </div>
      }
    >
      <MarksInner />
    </Suspense>
  );
}

function MarksInner() {
  const search = useSearchParams();
  const presetExamId = search.get("examId") ?? "";

  const { data: exams = [] } = useGetExamsQuery();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [examId, setExamId] = useState(presetExamId);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [rows, setRows] = useState<
    Record<string, { obtainedMarks: string; isAbsent: boolean }>
  >({});

  useEffect(() => {
    if (presetExamId) setExamId(presetExamId);
  }, [presetExamId]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId]
  );

  const { data: schedule = [] } = useGetExamScheduleQuery(
    { examId, classId: classId || undefined },
    { skip: !examId || !classId }
  );

  const subjectsForClass = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    schedule.forEach((s) => {
      if (!map.has(s.subjectId)) {
        map.set(s.subjectId, { id: s.subjectId, name: s.subject.name });
      }
    });
    return [...map.values()];
  }, [schedule]);

  const [loadSheet, { data: sheet, isFetching }] = useLazyGetMarksSheetQuery();
  const [saveMarks, { isLoading: saving }] = useSaveMarksMutation();

  const handleLoad = async () => {
    if (!examId || !classId || !subjectId) {
      toast.error("Select exam, class, and subject");
      return;
    }
    try {
      const data = await loadSheet({
        examId,
        classId,
        subjectId,
        sectionId: sectionId || undefined,
      }).unwrap();
      const next: Record<string, { obtainedMarks: string; isAbsent: boolean }> =
        {};
      data.students.forEach((s) => {
        next[s.studentId] = {
          obtainedMarks:
            s.obtainedMarks === null || s.obtainedMarks === undefined
              ? ""
              : String(s.obtainedMarks),
          isAbsent: s.isAbsent,
        };
      });
      setRows(next);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load marks sheet"
      );
    }
  };

  const handleSave = async () => {
    if (!sheet || !examId) return;
    try {
      const entries = sheet.students.map((s) => {
        const row = rows[s.studentId];
        return {
          studentId: s.studentId,
          isAbsent: row?.isAbsent ?? false,
          obtainedMarks:
            row?.isAbsent || row?.obtainedMarks === ""
              ? null
              : Number(row?.obtainedMarks),
        };
      });
      const res = await saveMarks({
        examId,
        examSubjectId: sheet.examSubject.id,
        entries,
      }).unwrap();
      toast.success(res.message || "Marks saved");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to save marks"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto">
        <ExamBreadcrumb current="Add / Update Marks" />
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Add / Update Marks
        </h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                SELECT EXAM
              </label>
              <select
                value={examId}
                onChange={(e) => {
                  setExamId(e.target.value);
                  setSubjectId("");
                }}
                className={examInputClass}
              >
                <option value="">Select an Exam</option>
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
                  setSubjectId("");
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
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                SUBJECT
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={examInputClass}
              >
                <option value="">Select subject</option>
                {subjectsForClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoad}
            className="mt-4 px-5 h-11 rounded-xl bg-black text-white font-semibold hover:bg-slate-800"
          >
            Load Students
          </button>
        </div>

        {isFetching ? (
          <p className="text-slate-400">Loading sheet...</p>
        ) : sheet ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {sheet.examSubject.subject.name} ·{" "}
                  {sheet.examSubject.class.className}
                </p>
                <p className="text-sm text-slate-500">
                  Max {sheet.examSubject.maxMarks} · Pass{" "}
                  {sheet.examSubject.passMarks}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-black text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
              >
                <FaSave />
                {saving ? "Saving..." : "Save Marks"}
              </button>
            </div>
            {sheet.students.length === 0 ? (
              <p className="p-8 text-center text-slate-400">
                No active students in this class.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.students.map((s, idx) => (
                      <tr key={s.studentId} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400">
                            {s.registrationNo}
                          </p>
                        </td>
                        <td className="px-4 py-3">{s.rollNo ?? "—"}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={sheet.examSubject.maxMarks}
                            disabled={rows[s.studentId]?.isAbsent}
                            value={rows[s.studentId]?.obtainedMarks ?? ""}
                            onChange={(e) =>
                              setRows((prev) => ({
                                ...prev,
                                [s.studentId]: {
                                  obtainedMarks: e.target.value,
                                  isAbsent: prev[s.studentId]?.isAbsent ?? false,
                                },
                              }))
                            }
                            className="w-28 h-10 rounded-lg border border-slate-200 px-2"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={rows[s.studentId]?.isAbsent ?? false}
                            onChange={(e) =>
                              setRows((prev) => ({
                                ...prev,
                                [s.studentId]: {
                                  obtainedMarks: e.target.checked
                                    ? ""
                                    : prev[s.studentId]?.obtainedMarks ?? "",
                                  isAbsent: e.target.checked,
                                },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
