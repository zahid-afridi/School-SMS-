"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import {
  useGetExamsQuery,
  useLazyGetResultCardQuery,
  useLazyGetResultSheetQuery,
} from "@/redux/features/exams/examApi";
import type {
  ResultCardData,
  ResultSheetData,
} from "@/redux/features/exams/examTypes";
import StudentResultCard from "@/app/dashboard/exams/_components/StudentResultCard";
import ExamTemplatePicker, {
  type ExamDocumentTemplate,
} from "@/app/dashboard/exams/_components/ExamTemplatePicker";
import ResultCardFormatPicker from "@/app/dashboard/exams/_components/ResultCardFormatPicker";
import {
  ReportBreadcrumb,
  ReportHeader,
  reportInputClass,
} from "../_components/ReportUI";
import { useGetMySchoolQuery } from "@/redux/features/school/schoolApi";
import {
  DEFAULT_SCHOOL_DOCUMENT_DESIGN,
  designToCustomStyle,
  parseSchoolDocumentDesign,
  type ResultCardLayout,
} from "@/lib/schoolDocumentDesign";

export default function StudentsReportCardPage() {
  const [mode, setMode] = useState<"student" | "class">("student");
  const [template, setTemplate] =
    useState<ExamDocumentTemplate>("custom");
  const [layoutOverride, setLayoutOverride] =
    useState<ResultCardLayout | null>(null);
  const { data: school } = useGetMySchoolQuery();
  const schoolDesign = useMemo(
    () =>
      school
        ? parseSchoolDocumentDesign(school.documentDesign)
        : DEFAULT_SCHOOL_DOCUMENT_DESIGN,
    [school]
  );
  const customStyle = useMemo(
    () => designToCustomStyle(schoolDesign),
    [schoolDesign]
  );
  const layout = layoutOverride ?? schoolDesign.resultCardLayout;
  const { data: exams = [] } = useGetExamsQuery();
  const { data: classes = [] } = useGetAllClassesQuery();
  const [examId, setExamId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState("");
  const [card, setCard] = useState<ResultCardData | null>(null);
  const [sheet, setSheet] = useState<ResultSheetData | null>(null);
  const [classCards, setClassCards] = useState<ResultCardData[]>([]);

  const { data: studentsData } = useGetAllStudentsQuery(
    { search: studentSearch || undefined, status: "ACTIVE", limit: 20 },
    { skip: mode !== "student" || studentSearch.trim().length < 1 }
  );
  const students = useMemo(
    () => studentsData?.students ?? [],
    [studentsData?.students]
  );

  const [loadCard, { isFetching: loadingCard }] = useLazyGetResultCardQuery();
  const [loadSheet, { isFetching: loadingSheet }] = useLazyGetResultSheetQuery();
  const [loadingClassCards, setLoadingClassCards] = useState(false);

  useEffect(() => {
    const styleId = "report-result-card-print-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        body * { visibility: hidden !important; }
        #result-card-print-area, #result-card-print-area * { visibility: visible !important; }
        #result-card-print-area {
          position: absolute !important;
          left: 0; top: 0; width: 100%;
        }
        #result-card-print-area {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .result-card-document { break-inside: avoid; page-break-inside: avoid; }
        .result-card-page-break { page-break-after: always; break-after: page; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId]
  );

  const handleGenerate = async () => {
    if (!examId) {
      toast.error("Select an exam");
      return;
    }
    try {
      if (mode === "student") {
        if (!studentId) {
          toast.error("Select a student");
          return;
        }
        const data = await loadCard({ examId, studentId }).unwrap();
        setCard(data);
        setSheet(null);
        setClassCards([]);
        toast.success("Report card ready");
      } else {
        if (!classId) {
          toast.error("Select a class");
          return;
        }
        setLoadingClassCards(true);
        const sheetData = await loadSheet({ examId, classId }).unwrap();
        setSheet(sheetData);
        const cards: ResultCardData[] = [];
        for (const row of sheetData.rows) {
          try {
            const c = await loadCard({
              examId,
              studentId: row.student.id,
            }).unwrap();
            cards.push(c);
          } catch {
            /* skip missing */
          }
        }
        setClassCards(cards);
        setCard(null);
        toast.success(`${cards.length} report card(s) ready`);
      }
    } catch {
      toast.error("Could not generate report card");
    } finally {
      setLoadingClassCards(false);
    }
  };

  const busy = loadingCard || loadingSheet || loadingClassCards;

  return (
    <div className="min-h-screen">
      <ReportBreadcrumb current="Students report Card" />
      <ReportHeader
        title="Students report Card"
        subtitle="Generate printable result cards for a student or whole class"
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 print:hidden space-y-4">
        <ResultCardFormatPicker
          value={layout}
          onChange={setLayoutOverride}
          title="Choose result card format"
        />
        <ExamTemplatePicker
          value={template}
          onChange={setTemplate}
          title="Choose color theme"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("student")}
            className={`h-10 px-4 rounded-xl text-sm font-semibold ${
              mode === "student" ? "bg-black text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Single student
          </button>
          <button
            type="button"
            onClick={() => setMode("class")}
            className={`h-10 px-4 rounded-xl text-sm font-semibold ${
              mode === "class" ? "bg-black text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Whole class
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className={reportInputClass}
          >
            <option value="">Select exam</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>

          {mode === "student" ? (
            <>
              <input
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
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
            </>
          ) : (
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={reportInputClass}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedStudent ? (
          <p className="text-sm text-slate-500">
            Selected: <span className="font-medium text-slate-800">{selectedStudent.name}</span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="h-11 px-6 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate report card"}
        </button>
      </div>

      <div id="result-card-print-area">
        {card ? (
          <StudentResultCard
            card={card}
            template={template}
            customStyle={customStyle}
            design={template === "custom" ? schoolDesign : undefined}
            layout={layout}
            hideToolbar
          />
        ) : null}
        {classCards.map((c, idx) => (
          <div
            key={c.student.id}
            className={idx < classCards.length - 1 ? "result-card-page-break" : ""}
          >
            <StudentResultCard
              card={c}
              template={template}
              customStyle={customStyle}
              design={template === "custom" ? schoolDesign : undefined}
              layout={layout}
              hideToolbar
            />
          </div>
        ))}
        {!card && classCards.length === 0 && sheet && sheet.rows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            No students found for this exam / class.
          </div>
        ) : null}
      </div>
    </div>
  );
}
