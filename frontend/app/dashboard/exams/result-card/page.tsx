"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaFileAlt, FaUsers, FaUser } from "react-icons/fa";
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
import {
  ExamBreadcrumb,
  ExamStepTitle,
  examInputClass,
} from "../_components/ExamUI";
import ExamTemplatePicker, {
  type ExamDocumentTemplate,
} from "../_components/ExamTemplatePicker";
import StudentResultCard from "../_components/StudentResultCard";
import DocumentExportBar from "../_components/DocumentExportBar";
import ResultCardFormatPicker from "../_components/ResultCardFormatPicker";
import SchoolDocumentDesigner from "@/app/components/SchoolDocumentDesigner";
import { useGetMySchoolQuery } from "@/redux/features/school/schoolApi";
import {
  DEFAULT_SCHOOL_DOCUMENT_DESIGN,
  designToCustomStyle,
  parseSchoolDocumentDesign,
  type ResultCardLayout,
  type SchoolDocumentDesign,
} from "@/lib/schoolDocumentDesign";

export default function ResultCardPage() {
  const [mode, setMode] = useState<"student" | "class">("student");
  const [template, setTemplate] =
    useState<ExamDocumentTemplate>("custom");
  const [layoutOverride, setLayoutOverride] =
    useState<ResultCardLayout | null>(null);
  const [draftDesign, setDraftDesign] = useState<SchoolDocumentDesign | null>(
    null
  );
  const { data: school } = useGetMySchoolQuery();
  const persistedDesign = useMemo(
    () =>
      school
        ? parseSchoolDocumentDesign(school.documentDesign)
        : DEFAULT_SCHOOL_DOCUMENT_DESIGN,
    [school]
  );
  const schoolDesign = draftDesign ?? persistedDesign;
  const layout = layoutOverride ?? schoolDesign.resultCardLayout;
  const customStyle = useMemo(
    () => designToCustomStyle(schoolDesign),
    [schoolDesign]
  );
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

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId]
  );

  useEffect(() => {
    const styleId = "result-card-print-style";
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
        if (data.lines.length === 0) {
          toast(
            "No subjects on this card yet — add Exam Schedule papers for this class, then enter marks.",
            { icon: "ℹ️" }
          );
        }
      } else {
        if (!classId) {
          toast.error("Select a class");
          return;
        }
        setLoadingClassCards(true);
        const sheetData = await loadSheet({ examId, classId }).unwrap();
        setSheet(sheetData);
        setCard(null);

        const cards: ResultCardData[] = [];
        const failed: string[] = [];
        for (const row of sheetData.rows) {
          try {
            const c = await loadCard({
              examId,
              studentId: row.student.id,
            }).unwrap();
            cards.push(c);
          } catch {
            failed.push(row.student.name);
          }
        }
        setClassCards(cards);
        setLoadingClassCards(false);

        if (failed.length > 0) {
          toast.error(
            `Could not load ${failed.length} card(s): ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`
          );
        }
        if (cards.length === 0) {
          toast.error("No student result cards could be generated");
        } else if (cards.every((c) => c.lines.length === 0)) {
          toast(
            "Schedule subjects for this class first, then enter marks.",
            { icon: "ℹ️" }
          );
        }
      }
    } catch (err: unknown) {
      setLoadingClassCards(false);
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to generate result"
      );
    }
  };

  const busy = loadingCard || loadingSheet || loadingClassCards;

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <ExamBreadcrumb current="Result Card" />

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:hidden mb-6">
          <div className="mb-7">
            <ResultCardFormatPicker
              value={layout}
              onChange={setLayoutOverride}
              title="Choose result card format"
            />
          </div>

          <div className="mb-7">
            <ExamTemplatePicker
              value={template}
              onChange={setTemplate}
              title="Choose color theme"
            />
          </div>

          {template === "custom" && (
            <div className="mb-7">
              <SchoolDocumentDesigner
                compact
                onChange={(next) => {
                  setDraftDesign(next);
                }}
              />
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("student");
                setSheet(null);
                setClassCards([]);
              }}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-medium ${
                mode === "student"
                  ? "border-slate-900 bg-white text-slate-900"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <FaUser /> Student Wise
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("class");
                setCard(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border font-medium ${
                mode === "class"
                  ? "border-slate-900 bg-white text-slate-900"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <FaUsers /> Class Wise
            </button>
          </div>

          <ExamStepTitle
            step={1}
            title={
              mode === "student"
                ? "Generate Student Result Card"
                : "Generate Class Result Cards"
            }
          />

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                SELECT EXAM
              </label>
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className={examInputClass}
              >
                <option value="">-- Select Exam --</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            {mode === "student" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  SEARCH STUDENT
                </label>
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Type student name"
                  className={examInputClass}
                />
                {studentSearch.trim() && students.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y">
                    {students.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentId(s.id);
                            setStudentSearch(
                              `${s.name} (${s.registrationNo})`
                            );
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                            studentId === s.id ? "bg-slate-100" : ""
                          }`}
                        >
                          {s.name}{" "}
                          <span className="text-slate-400">
                            {s.registrationNo}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedStudent && (
                  <p className="text-xs text-emerald-600 mt-2">
                    Selected: {selectedStudent.name}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  SELECT CLASS
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
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
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            className="w-full h-12 rounded-xl bg-black text-white font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <FaFileAlt />
            {busy ? "Generating..." : "Generate Result Card"}
          </button>
        </div>

        {(card || classCards.length > 0) && (
          <div className="mb-4">
            <DocumentExportBar
              elementId="result-card-print-area"
              filename={
                card
                  ? `result-card-${card.student.name.replace(/\s+/g, "-")}`
                  : `result-cards-${sheet?.class.className ?? "class"}`
              }
              label="Print, PDF, or Word"
              resultCards={card ? [card] : classCards}
              design={template === "custom" ? schoolDesign : undefined}
            />
          </div>
        )}

        <div id="result-card-print-area">
          {card && (
            <StudentResultCard
              card={card}
              template={template}
              customStyle={customStyle}
              design={template === "custom" ? schoolDesign : undefined}
              layout={layout}
              hideToolbar
              onPrint={() => window.print()}
            />
          )}

          {classCards.length > 0 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center print:hidden" data-export-ignore>
                <p className="text-sm text-slate-600">
                  {classCards.length} result card(s)
                  {sheet ? ` · ${sheet.class.className}` : ""}
                </p>
              </div>
              {classCards.map((c, idx) => (
                <div
                  key={c.student.id}
                  className={
                    idx < classCards.length - 1 ? "result-card-page-break" : ""
                  }
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
