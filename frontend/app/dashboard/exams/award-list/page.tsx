"use client";

import { ButtonLoader } from "@/app/components/PageLoader";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useGetExamScheduleQuery,
  useGetExamsQuery,
  useLazyGetAwardListQuery,
} from "@/redux/features/exams/examApi";
import type { AwardListData } from "@/redux/features/exams/examTypes";
import {
  ExamBreadcrumb,
  examInputClass,
} from "../_components/ExamUI";

export default function AwardListPage() {
  const { data: exams = [] } = useGetExamsQuery();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [blank, setBlank] = useState(true);
  const [list, setList] = useState<AwardListData | null>(null);

  useEffect(() => {
    const styleId = "award-list-print-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 10mm; }
        body * { visibility: hidden !important; }
        #award-list-print-area, #award-list-print-area * {
          visibility: visible !important;
        }
        #award-list-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const selectedClass = classes.find((c) => c.id === classId);
  const { data: schedule = [] } = useGetExamScheduleQuery(
    { examId, classId: classId || undefined },
    { skip: !examId || !classId }
  );

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    schedule.forEach((s) => map.set(s.subjectId, s.subject.name));
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [schedule]);

  const [load, { isFetching }] = useLazyGetAwardListQuery();

  const handleLoad = async () => {
    if (!examId || !classId || !subjectId) {
      toast.error("Select exam, class, and subject");
      return;
    }
    try {
      const data = await load({
        examId,
        classId,
        subjectId,
        sectionId: sectionId || undefined,
        blank,
      }).unwrap();
      setList(data);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load award list"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <ExamBreadcrumb current="Blank Award List" />
        <h1 className="mb-2 break-words text-xl font-bold text-slate-900 sm:text-2xl md:text-3xl print:hidden">
          Blank Award List
        </h1>
        <p className="mb-6 text-slate-500 print:hidden">
          Print a blank (or filled) mark list for teachers to record awards.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:grid-cols-2 print:hidden">
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
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="blank"
              type="checkbox"
              checked={blank}
              onChange={(e) => setBlank(e.target.checked)}
            />
            <label htmlFor="blank" className="text-sm text-slate-700">
              Blank list (hide obtained marks)
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <button
              type="button"
              onClick={handleLoad}
              disabled={isFetching}
              className="h-11 w-full rounded-xl bg-black px-5 font-semibold text-white sm:w-auto"
            >
              {isFetching ? (
                <ButtonLoader label="Generating" />
              ) : (
                "Generate List"
              )}
            </button>
            {list && (
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 w-full rounded-xl border px-4 print:hidden sm:w-auto"
              >
                Print
              </button>
            )}
          </div>
        </div>

        {list && (
          <div
            id="award-list-print-area"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">{list.exam.name}</h2>
              <p className="text-slate-500">
                Award List — {list.examSubject.subject.name} (
                {list.examSubject.class.className})
              </p>
              <p className="text-sm text-slate-400">
                Max Marks: {list.examSubject.maxMarks}
              </p>
            </div>
            {list.students.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                No active students found in this class.
              </p>
            ) : (
            <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[640px] text-sm print:min-w-0">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2 w-12">Sr</th>
                  <th className="px-3 py-2">Roll</th>
                  <th className="px-3 py-2">Student Name</th>
                  <th className="px-3 py-2">Reg No</th>
                  <th className="px-3 py-2 text-center">Marks</th>
                  <th className="px-3 py-2 text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {list.students.map((s) => (
                  <tr key={s.studentId} className="border-t">
                    <td className="px-3 py-3">{s.sr}</td>
                    <td className="px-3 py-3">{s.rollNo ?? ""}</td>
                    <td className="px-3 py-3 font-medium">{s.name}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {s.registrationNo}
                    </td>
                    <td className="px-3 py-3 text-center border-l border-dashed">
                      {list.blank
                        ? ""
                        : s.isAbsent
                          ? "Absent"
                          : (s.obtainedMarks ?? "")}
                    </td>
                    <td className="px-3 py-3 border-l border-dashed min-w-[120px]"></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            )}
            <div className="mt-8 grid grid-cols-2 gap-8 text-sm text-slate-500 print:mt-12">
              <p>Teacher Signature: ________________</p>
              <p className="text-right">Principal Signature: ________________</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
