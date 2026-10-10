"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaEdit,
  FaEye,
  FaMagic,
  FaPlus,
  FaPrint,
  FaRedo,
  FaSave,
  FaTrash,
  FaCloudUploadAlt,
} from "react-icons/fa";
import type { ResultCardData } from "@/redux/features/exams/examTypes";
import { useSaveMarksMutation } from "@/redux/features/exams/examApi";
import { resolveUploadUrl } from "@/lib/apiBase";

/* -------------------------------------------------------------------------- */
/* SVG ORNAMENTS & ILLUSTRATIONS                                              */
/* -------------------------------------------------------------------------- */

/** Ornate Victorian/Baroque corner scrollwork filigree */
function FlourishCorner({
  className,
  flipped = false,
}: {
  className?: string;
  flipped?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: flipped ? "rotate(180deg)" : undefined,
      }}
      aria-hidden="true"
    >
      <g stroke="#0f223d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* Main outer corner boundary lines */}
        <path d="M 6 6 L 6 52 C 6 36 18 24 34 24 C 44 24 52 30 52 40 C 52 50 42 56 34 54 C 26 52 24 44 28 38 C 31 34 37 35 37 40 C 37 43 34 45 32 44" />
        <path d="M 6 6 L 52 6 C 36 6 24 18 24 34 C 24 44 30 52 40 52 C 50 52 56 42 54 34 C 52 26 44 24 38 28 C 34 31 35 37 40 37 C 43 37 45 34 44 32" />
        {/* Corner diagonal accent flourish */}
        <path d="M 6 6 L 36 36 C 42 42 48 44 54 42 C 62 40 66 32 64 26 C 62 20 54 18 48 22 C 44 25 45 30 48 31" />
        {/* Ornate curly tendrils */}
        <path d="M 12 12 Q 22 4 36 8 Q 48 12 44 22 C 42 27 34 27 32 22 C 31 18 35 15 39 16" />
        <path d="M 12 12 Q 4 22 8 36 Q 12 48 22 44 C 27 42 27 34 22 32 C 18 31 15 35 16 39" />
        {/* Leaf petals & buds */}
        <path d="M 18 18 C 24 20 28 26 26 32 C 24 28 20 24 18 18 Z" fill="#0f223d" fillOpacity="0.8" />
        <path d="M 18 18 C 20 24 26 28 32 26 C 28 24 24 20 18 18 Z" fill="#0f223d" fillOpacity="0.8" />
        {/* Little scroll droplets */}
        <circle cx="16" cy="16" r="2.2" fill="#0f223d" />
        <circle cx="6" cy="6" r="2.5" fill="#0f223d" />
        <circle cx="58" cy="8" r="1.8" fill="#0f223d" />
        <circle cx="8" cy="58" r="1.8" fill="#0f223d" />
      </g>
    </svg>
  );
}

/** Top-Right curved dynamic ribbons (Lime Green + Dark Navy) */
function RibbonWavesTopRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 260"
      className={className}
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer vibrant lime-green ribbon */}
      <path
        d="M 60 0 C 85 45 125 105 150 170 C 165 210 175 240 180 260 L 180 0 Z"
        fill="#7cb342"
      />
      {/* Dark navy blue ribbon layered along the sweep */}
      <path
        d="M 115 0 C 130 50 148 105 162 170 C 172 215 178 245 180 260 L 180 90 C 175 60 155 25 140 0 Z"
        fill="#0f223d"
      />
    </svg>
  );
}

/** Bottom-Left curved dynamic ribbons (Dark Navy + Lime Green) */
function RibbonWavesBottomLeft({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 260"
      className={className}
      fill="none"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Dark navy ribbon swooshing upwards */}
      <path
        d="M 0 170 C 20 140 40 100 50 50 C 55 20 58 0 60 0 L 0 0 Z"
        transform="scale(1, -1) translate(0, -260)"
        fill="#0f223d"
      />
      {/* Lime green ribbon wrapping along the curve */}
      <path
        d="M 0 260 L 0 80 C 15 110 35 150 55 190 C 75 230 105 255 130 260 Z"
        fill="#7cb342"
      />
      {/* Deep navy ribbon accent */}
      <path
        d="M 0 260 L 0 140 C 12 165 28 200 48 230 C 65 252 85 260 100 260 Z"
        fill="#0f223d"
      />
    </svg>
  );
}

/** Realistic Green Pencil graphic on the right margin */
function PencilGraphic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g>
        {/* Eraser at the top: rounded cap */}
        <rect x="3" y="2" width="12" height="14" rx="3" fill="#2d5a27" />
        {/* Metal Ferrule ring */}
        <rect x="2.5" y="15" width="13" height="10" fill="#94a3b8" rx="0.5" />
        <line x1="3" y1="18" x2="15" y2="18" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="3" y1="21" x2="15" y2="21" stroke="#64748b" strokeWidth="1" />

        {/* Pencil body with 3 faceted vertical stripes */}
        <rect x="3" y="25" width="4" height="130" fill="#65a30d" />
        <rect x="7" y="25" width="4" height="130" fill="#84cc16" />
        <rect x="11" y="25" width="4" height="130" fill="#4d7c0f" />

        {/* Sharpened wooden cone */}
        <polygon points="3,155 15,155 9,185" fill="#fde68a" />
        <polygon points="7,155 11,155 9,185" fill="#fef08a" />

        {/* Graphite lead tip */}
        <polygon points="7.5,172 10.5,172 9,185" fill="#1e293b" />
      </g>
    </svg>
  );
}

/** Green Shield emblem with 5-pointed star inside */
function ShieldStarEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 115"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer shield boundary */}
      <path
        d="M 50 4 L 92 20 C 92 68 68 98 50 112 C 32 98 8 68 8 20 Z"
        fill="#7cb342"
        stroke="#65a30d"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner white shield accent line */}
      <path
        d="M 50 12 L 84 25 C 84 64 64 90 50 101 C 36 90 16 64 16 25 Z"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner decorative circle */}
      <circle cx="50" cy="52" r="26" stroke="#ffffff" strokeWidth="2.2" fill="none" />
      {/* 5-pointed star */}
      <path
        d="M 50 34 L 54.5 45.5 L 67 46.2 L 57.5 54.2 L 60.5 66.5 L 50 59.8 L 39.5 66.5 L 42.5 54.2 L 33 46.2 L 45.5 45.5 Z"
        fill="#ffffff"
        stroke="#7cb342"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Subtle chevron lines above star */}
      <path d="M 38 20 L 50 15 L 62 20" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* TYPES & DEFAULT TEMPLATE DATA                                              */
/* -------------------------------------------------------------------------- */

export interface SubjectRowData {
  id: string;
  examSubjectId?: string;
  subject: string;
  term1: string | number;
  term2: string | number;
  term3: string | number;
  term4: string | number;
  total: number;
  obtained: number;
  grade: string;
}

export interface TermsGradesData {
  quarterly: [string, string, string, string];
  average: [string, string, string, string];
}

export interface AttendanceData {
  totalDays: number;
  attended: number;
  absent: number;
}

const DEFAULT_SUBJECT_NAMES = [
  "Reading",
  "Language",
  "Spelling",
  "Writing",
  "Math",
  "Science",
  "Social studies",
  "Physical education",
  "Art",
  "Music",
  "Extracurricular",
];

const SAMPLE_ROWS: SubjectRowData[] = [
  { id: "1", subject: "Reading", term1: 88, term2: 90, term3: 86, term4: 92, total: 100, obtained: 89, grade: "A" },
  { id: "2", subject: "Language", term1: 85, term2: 87, term3: 89, term4: 91, total: 100, obtained: 88, grade: "A" },
  { id: "3", subject: "Spelling", term1: 92, term2: 94, term3: 90, term4: 95, total: 100, obtained: 93, grade: "A+" },
  { id: "4", subject: "Writing", term1: 82, term2: 85, term3: 84, term4: 88, total: 100, obtained: 85, grade: "A" },
  { id: "5", subject: "Math", term1: 95, term2: 96, term3: 94, term4: 98, total: 100, obtained: 96, grade: "A+" },
  { id: "6", subject: "Science", term1: 90, term2: 92, term3: 88, term4: 94, total: 100, obtained: 91, grade: "A" },
  { id: "7", subject: "Social studies", term1: 86, term2: 88, term3: 85, term4: 90, total: 100, obtained: 87, grade: "A" },
  { id: "8", subject: "Physical education", term1: 95, term2: 95, term3: 96, term4: 98, total: 100, obtained: 96, grade: "A+" },
  { id: "9", subject: "Art", term1: 90, term2: 92, term3: 91, term4: 93, total: 100, obtained: 92, grade: "A+" },
  { id: "10", subject: "Music", term1: 88, term2: 90, term3: 89, term4: 92, total: 100, obtained: 90, grade: "A" },
  { id: "11", subject: "Extracurricular", term1: 92, term2: 94, term3: 95, term4: 96, total: 100, obtained: 94, grade: "A+" },
];

const FEEDBACK_PRESETS = [
  "Demonstrates outstanding academic curiosity, disciplined study habits, and excellent classroom participation.",
  "Consistent hard work and positive attitude throughout all four terms. Keep aiming high!",
  "Excellent progress across all subjects. Shows strong analytical and creative thinking abilities.",
  "Very good performance overall; encouraged to dedicate regular daily reading time for vocabulary expansion.",
  "Commendable enthusiasm in classroom discussions, sports, and collaborative team projects.",
];

function computeGradeFromPercent(percent: number): string {
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  return "F";
}

/* -------------------------------------------------------------------------- */
/* MAIN PRO REPORT CARD COMPONENT                                             */
/* -------------------------------------------------------------------------- */

export default function ProReportCard({
  card,
  onPrint,
  editable = true,
  hideToolbar = false,
  sampleMode = false,
}: {
  card?: ResultCardData | null;
  onPrint?: () => void;
  editable?: boolean;
  hideToolbar?: boolean;
  sampleMode?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Core editable fields
  const [schoolName, setSchoolName] = useState(
    card?.school?.name || "School Name Goes Here"
  );
  const [studentName, setStudentName] = useState(
    card?.student?.name || (sampleMode ? "Alexander James Bennett" : "")
  );
  const [classSection, setClassSection] = useState(
    card?.student
      ? `${card.student.className}${
          card.student.sectionName ? ` / ${card.student.sectionName}` : ""
        }`
      : sampleMode
      ? "Grade 6 - Rose"
      : ""
  );
  const [schoolYear, setSchoolYear] = useState(
    card?.exam?.academicYear ||
      card?.student?.academicYear ||
      `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`
  );
  const [teacherName, setTeacherName] = useState(
    sampleMode ? "Ms. Jennifer Sterling" : "Class Teacher"
  );

  // Subject marks rows
  const [rows, setRows] = useState<SubjectRowData[]>(() => {
    if (card && card.lines && card.lines.length > 0) {
      return card.lines.map((l, idx) => ({
        id: String(idx + 1),
        examSubjectId: l.examSubjectId,
        subject: l.subjectName,
        term1: l.obtainedMarks ?? "",
        term2: "",
        term3: "",
        term4: "",
        total: l.maxMarks || 100,
        obtained: l.obtainedMarks ?? 0,
        grade: l.grade || (l.percent != null ? computeGradeFromPercent(l.percent) : "—"),
      }));
    }
    return sampleMode
      ? SAMPLE_ROWS
      : DEFAULT_SUBJECT_NAMES.map((name, idx) => ({
          id: String(idx + 1),
          subject: name,
          term1: "",
          term2: "",
          term3: "",
          term4: "",
          total: 100,
          obtained: 0,
          grade: "",
        }));
  });

  // Terms based grades table
  const [termsGrades, setTermsGrades] = useState<TermsGradesData>({
    quarterly: ["A", "A", "A", "A+"],
    average: ["89%", "91%", "89%", "93%"],
  });

  // Teacher feedback
  const [feedback, setFeedback] = useState(
    "Demonstrates excellent enthusiasm, disciplined study habits, and consistent academic progress throughout all terms. Keep up the brilliant work!"
  );

  // Attendance
  const [attendance, setAttendance] = useState<AttendanceData>({
    totalDays: 180,
    attended: 174,
    absent: 6,
  });

  // Logo toggle (custom school logo vs shield emblem)
  const [useCustomLogo, setUseCustomLogo] = useState(Boolean(card?.school?.logoUrl));

  // Sync when card prop changes
  useEffect(() => {
    if (!card) return;
    if (card.school?.name) setSchoolName(card.school.name);
    if (card.student?.name) setStudentName(card.student.name);
    if (card.student?.className) {
      setClassSection(
        `${card.student.className}${
          card.student.sectionName ? ` / ${card.student.sectionName}` : ""
        }`
      );
    }
    if (card.exam?.academicYear || card.student?.academicYear) {
      setSchoolYear(card.exam.academicYear || card.student.academicYear || "");
    }

    if (card.lines && card.lines.length > 0) {
      setRows(
        card.lines.map((l, idx) => ({
          id: String(idx + 1),
          examSubjectId: l.examSubjectId,
          subject: l.subjectName,
          term1: l.obtainedMarks ?? "",
          term2: "",
          term3: "",
          term4: "",
          total: l.maxMarks || 100,
          obtained: l.obtainedMarks ?? 0,
          grade:
            l.grade ||
            (l.percent != null ? computeGradeFromPercent(l.percent) : "—"),
        }))
      );
    }
    if (card.school?.logoUrl) setUseCustomLogo(true);
  }, [card]);

  // Backend marks saver
  const [saveMarksMutation, { isLoading: savingMarks }] = useSaveMarksMutation();

  /* ------------------------------------------------------------------------ */
  /* AUTO-CALCULATION & HELPER FUNCTIONS                                      */
  /* ------------------------------------------------------------------------ */

  const handleAutoCalculate = () => {
    let term1Sum = 0, term1Count = 0;
    let term2Sum = 0, term2Count = 0;
    let term3Sum = 0, term3Count = 0;
    let term4Sum = 0, term4Count = 0;

    const updatedRows = rows.map((r) => {
      const t1 = Number.parseFloat(String(r.term1));
      const t2 = Number.parseFloat(String(r.term2));
      const t3 = Number.parseFloat(String(r.term3));
      const t4 = Number.parseFloat(String(r.term4));

      const validTerms: number[] = [];
      if (!Number.isNaN(t1)) {
        validTerms.push(t1);
        term1Sum += t1;
        term1Count += 1;
      }
      if (!Number.isNaN(t2)) {
        validTerms.push(t2);
        term2Sum += t2;
        term2Count += 1;
      }
      if (!Number.isNaN(t3)) {
        validTerms.push(t3);
        term3Sum += t3;
        term3Count += 1;
      }
      if (!Number.isNaN(t4)) {
        validTerms.push(t4);
        term4Sum += t4;
        term4Count += 1;
      }

      const total = Number(r.total) || 100;
      let obtained = r.obtained;

      if (validTerms.length > 0) {
        // Average of terms
        const avg = validTerms.reduce((a, b) => a + b, 0) / validTerms.length;
        obtained = Math.round(avg * 10) / 10;
      }

      const percent = total > 0 ? (obtained / total) * 100 : 0;
      const grade = computeGradeFromPercent(percent);

      return {
        ...r,
        total,
        obtained,
        grade,
      };
    });

    setRows(updatedRows);

    // Compute terms grades
    const avg1 = term1Count > 0 ? Math.round(term1Sum / term1Count) : 0;
    const avg2 = term2Count > 0 ? Math.round(term2Sum / term2Count) : 0;
    const avg3 = term3Count > 0 ? Math.round(term3Sum / term3Count) : 0;
    const avg4 = term4Count > 0 ? Math.round(term4Sum / term4Count) : 0;

    setTermsGrades({
      quarterly: [
        avg1 > 0 ? computeGradeFromPercent(avg1) : "—",
        avg2 > 0 ? computeGradeFromPercent(avg2) : "—",
        avg3 > 0 ? computeGradeFromPercent(avg3) : "—",
        avg4 > 0 ? computeGradeFromPercent(avg4) : "—",
      ],
      average: [
        avg1 > 0 ? `${avg1}%` : "—",
        avg2 > 0 ? `${avg2}%` : "—",
        avg3 > 0 ? `${avg3}%` : "—",
        avg4 > 0 ? `${avg4}%` : "—",
      ],
    });

    toast.success("Auto-calculated marks, totals & term averages!");
  };

  /** Pre-fill 4 terms smartly with realistic variation */
  const handlePreFillSampleTerms = () => {
    const filled = rows.map((r, idx) => {
      const base = Number(r.obtained) || Number(r.term1) || (82 + ((idx * 3) % 15));
      const t1 = Math.min(100, Math.max(50, Math.round(base - 2 + Math.random() * 4)));
      const t2 = Math.min(100, Math.max(50, Math.round(base + 1 + Math.random() * 4)));
      const t3 = Math.min(100, Math.max(50, Math.round(base - 1 + Math.random() * 5)));
      const t4 = Math.min(100, Math.max(50, Math.round(base + 3 + Math.random() * 4)));
      const avg = Math.round((t1 + t2 + t3 + t4) / 4);
      return {
        ...r,
        term1: t1,
        term2: t2,
        term3: t3,
        term4: t4,
        total: 100,
        obtained: avg,
        grade: computeGradeFromPercent(avg),
      };
    });

    setRows(filled);
    setTermsGrades({
      quarterly: ["A", "A", "A", "A+"],
      average: ["89%", "91%", "89%", "93%"],
    });
    toast.success("Pre-filled realistic 4-term marks!");
  };

  const handleAddSubject = () => {
    const newId = String(rows.length + 1);
    setRows([
      ...rows,
      {
        id: newId,
        subject: "New Subject",
        term1: "",
        term2: "",
        term3: "",
        term4: "",
        total: 100,
        obtained: 0,
        grade: "",
      },
    ]);
  };

  const handleDeleteSubject = (index: number) => {
    if (rows.length <= 1) {
      toast.error("At least one subject is required");
      return;
    }
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const handleSaveToDatabase = async () => {
    if (!card?.exam?.id || !card?.student?.id) {
      toast("Card is not linked to a database exam. Saved locally!", { icon: "💾" });
      return;
    }

    const marksToSave = rows
      .filter((r) => r.examSubjectId && r.obtained != null)
      .map((r) => ({
        examSubjectId: r.examSubjectId as string,
        studentId: card.student.id,
        obtainedMarks: Number(r.obtained) || null,
        isAbsent: false,
      }));

    if (marksToSave.length === 0) {
      toast("No subjects linked to exam schedule to update in database.", { icon: "ℹ️" });
      return;
    }

    try {
      for (const item of marksToSave) {
        await saveMarksMutation({
          examId: card.exam.id,
          examSubjectId: item.examSubjectId,
          entries: [
            {
              studentId: item.studentId,
              obtainedMarks: item.obtainedMarks,
              isAbsent: item.isAbsent,
            },
          ],
        }).unwrap();
      }
      toast.success("Marks saved successfully to database!");
    } catch {
      toast.error("Failed to update database marks. Check permissions.");
    }
  };

  const handleReset = () => {
    if (card && card.lines) {
      setRows(
        card.lines.map((l, idx) => ({
          id: String(idx + 1),
          examSubjectId: l.examSubjectId,
          subject: l.subjectName,
          term1: l.obtainedMarks ?? "",
          term2: "",
          term3: "",
          term4: "",
          total: l.maxMarks || 100,
          obtained: l.obtainedMarks ?? 0,
          grade: l.grade || "—",
        }))
      );
    } else {
      setRows(SAMPLE_ROWS);
    }
    toast("Reset card to initial state", { icon: "↺" });
  };

  const logoUrl = resolveUploadUrl(card?.school?.logoUrl);

  return (
    <div className="w-full max-w-4xl mx-auto my-4">
      {/* ------------------------------------------------------------------ */}
      {/* TOP FLOATING / PRO CONTROLS BAR (HIDDEN IN PRINT)                   */}
      {/* ------------------------------------------------------------------ */}
      {!hideToolbar && (
        <div
          data-export-ignore
          className="print:hidden mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-4 gap-3"
        >
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Report Card
              </p>
              <h4 className="text-sm font-semibold text-slate-900">
                {isEditing ? "Interactive Edit Mode" : "Print & Preview Ready"}
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editable && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isEditing
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isEditing ? <FaCheck /> : <FaEdit />}
                {isEditing ? "Finish Editing" : "Edit Result Card"}
              </button>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleAutoCalculate}
                  title="Auto calculate total obtained, grades and term averages"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                >
                  <FaMagic /> Auto Calculate
                </button>
                <button
                  type="button"
                  onClick={handlePreFillSampleTerms}
                  title="Fill realistic 4 terms scores"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                >
                  ✨ Fill 4 Terms
                </button>
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <FaPlus /> Add Subject
                </button>
                {card?.exam?.id && card?.student?.id && (
                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    disabled={savingMarks}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <FaCloudUploadAlt /> {savingMarks ? "Saving…" : "Save to DB"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <FaRedo /> Reset
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onPrint ?? (() => window.print())}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <FaPrint /> Print
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RESULT CARD PRINT/DOCUMENT CANVAS (EXACT MATCH TO USER'S IMAGE)   */}
      {/* ------------------------------------------------------------------ */}
      <div
        id="student-result-card"
        className="result-card-document relative bg-white border-2 border-slate-300 shadow-md print:shadow-none print:border-none overflow-hidden mx-auto"
        style={{
          width: "100%",
          maxWidth: "794px", // Standard A4 width in px at 96 DPI
          minHeight: "1080px",
          color: "#0f223d",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Top-Right Dynamic Green + Navy Ribbons */}
        <RibbonWavesTopRight className="absolute top-0 right-0 w-36 sm:w-48 h-48 sm:h-64 pointer-events-none z-0" />

        {/* Bottom-Left Dynamic Green + Navy Ribbons */}
        <RibbonWavesBottomLeft className="absolute bottom-0 left-0 w-36 sm:w-48 h-48 sm:h-64 pointer-events-none z-0" />

        {/* Top-Left Ornate Baroque Corner Filigree */}
        <FlourishCorner className="absolute top-3 left-3 w-16 h-16 sm:w-20 sm:h-20 pointer-events-none z-0" />

        {/* Bottom-Right Ornate Baroque Corner Filigree */}
        <FlourishCorner
          flipped
          className="absolute bottom-3 right-3 w-16 h-16 sm:w-20 sm:h-20 pointer-events-none z-0"
        />

        {/* Green Vertical Pencil Graphic on Right Margin */}
        <div className="absolute right-3.5 sm:right-6 top-96 w-4 h-44 pointer-events-none z-10 hidden sm:block print:block">
          <PencilGraphic className="w-full h-full" />
        </div>

        {/* Inner Card Framing Border */}
        <div className="relative z-10 m-3 sm:m-4.5 p-4 sm:p-7 border border-[#1e3450] min-h-[1040px] flex flex-col justify-between">
          <div>
            {/* -------------------------------------------------------------- */}
            {/* 1. HEADER SECTION (LOGO + TITLE + SCHOOL NAME)                */}
            {/* -------------------------------------------------------------- */}
            <div className="flex items-center justify-center gap-3.5 sm:gap-5 pt-3 pb-5">
              {/* Logo / Shield Emblem */}
              <div
                className="shrink-0 flex items-center justify-center cursor-pointer"
                title="Click to toggle shield or school logo"
                onClick={() => {
                  if (logoUrl) setUseCustomLogo(!useCustomLogo);
                }}
              >
                {useCustomLogo && logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={schoolName}
                    className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-xl p-1 border border-slate-200"
                  />
                ) : (
                  <ShieldStarEmblem className="w-16 h-18 sm:w-20 sm:h-22 drop-shadow-sm" />
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="text-left">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0f223d] uppercase font-sans">
                  REPORT CARD
                </h1>
                {isEditing ? (
                  <input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="School Name Goes Here"
                    className="mt-1 block text-base sm:text-lg font-medium text-slate-700 bg-amber-50/70 border-b-2 border-amber-400 px-1 py-0.5 w-full focus:outline-none"
                  />
                ) : (
                  <p className="text-base sm:text-lg font-medium text-slate-800 tracking-normal mt-0.5">
                    {schoolName || "School Name Goes Here"}
                  </p>
                )}
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* 2. STUDENT DETAILS SECTION (2 ROWS WITH UNDERLINES)           */}
            {/* -------------------------------------------------------------- */}
            <div className="mt-2 mb-6 sm:mb-7 space-y-3.5 text-xs sm:text-[13px] font-semibold text-[#0f223d]">
              {/* Row 1: Student Name & Class/Section */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6 items-end">
                <div className="sm:col-span-7 flex items-end">
                  <span className="whitespace-nowrap shrink-0 pr-1.5 text-slate-800 font-bold">
                    Student Name:
                  </span>
                  {isEditing ? (
                    <input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter student name"
                      className="flex-1 bg-amber-50/60 border-b border-[#0f223d] px-2 py-0.5 text-slate-900 font-semibold focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 border-b border-[#0f223d] px-2 pb-0.5 text-slate-900 font-medium tracking-wide min-h-[1.3rem]">
                      {studentName}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-5 flex items-end">
                  <span className="whitespace-nowrap shrink-0 pr-1.5 text-slate-800 font-bold">
                    Class/Section:
                  </span>
                  {isEditing ? (
                    <input
                      value={classSection}
                      onChange={(e) => setClassSection(e.target.value)}
                      placeholder="e.g. 5th - A"
                      className="flex-1 bg-amber-50/60 border-b border-[#0f223d] px-2 py-0.5 text-slate-900 font-semibold focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 border-b border-[#0f223d] px-2 pb-0.5 text-slate-900 font-medium tracking-wide min-h-[1.3rem]">
                      {classSection}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: School Year & Teacher Name */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6 items-end">
                <div className="sm:col-span-7 flex items-end">
                  <span className="whitespace-nowrap shrink-0 pr-1.5 text-slate-800 font-bold">
                    School Year:
                  </span>
                  {isEditing ? (
                    <input
                      value={schoolYear}
                      onChange={(e) => setSchoolYear(e.target.value)}
                      placeholder="e.g. 2025 - 2026"
                      className="flex-1 bg-amber-50/60 border-b border-[#0f223d] px-2 py-0.5 text-slate-900 font-semibold focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 border-b border-[#0f223d] px-2 pb-0.5 text-slate-900 font-medium tracking-wide min-h-[1.3rem]">
                      {schoolYear}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-5 flex items-end">
                  <span className="whitespace-nowrap shrink-0 pr-1.5 text-slate-800 font-bold">
                    Teacher Name:
                  </span>
                  {isEditing ? (
                    <input
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="e.g. Ms. Sarah"
                      className="flex-1 bg-amber-50/60 border-b border-[#0f223d] px-2 py-0.5 text-slate-900 font-semibold focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 border-b border-[#0f223d] px-2 pb-0.5 text-slate-900 font-medium tracking-wide min-h-[1.3rem]">
                      {teacherName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* 3. PRIMARY GRADES TABLE (EXACT DEEP NAVY HEADER + GRID)        */}
            {/* -------------------------------------------------------------- */}
            <div className="mb-5 overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse border border-[#0f223d] text-xs sm:text-[12px]">
                <thead>
                  <tr className="bg-[#0f223d] text-white">
                    <th className="border border-[#0f223d] px-2 sm:px-3 py-2 text-left font-bold tracking-wide w-[24%]">
                      Subject
                    </th>
                    <th className="border border-[#0f223d] px-1 sm:px-2 py-2 text-center font-bold tracking-wide w-[10.5%]">
                      1<sup className="text-[9px]">st</sup> Term
                    </th>
                    <th className="border border-[#0f223d] px-1 sm:px-2 py-2 text-center font-bold tracking-wide w-[10.5%]">
                      2<sup className="text-[9px]">nd</sup> Term
                    </th>
                    <th className="border border-[#0f223d] px-1 sm:px-2 py-2 text-center font-bold tracking-wide w-[10.5%]">
                      3<sup className="text-[9px]">rd</sup> Term
                    </th>
                    <th className="border border-[#0f223d] px-1 sm:px-2 py-2 text-center font-bold tracking-wide w-[10.5%]">
                      4<sup className="text-[9px]">th</sup> Term
                    </th>
                    <th className="border border-[#0f223d] px-1 sm:px-2 py-2 text-center font-bold tracking-wide w-[11%]">
                      Total
                    </th>
                    <th className="border border-[#0f223d] px-1 sm:px-2 py-2 text-center font-bold tracking-wide w-[11%]">
                      Obtained
                    </th>
                    <th className="border border-[#0f223d] px-1 sm:px-2 py-2 text-center font-bold tracking-wide w-[12%]">
                      Grade
                    </th>
                    {isEditing && (
                      <th className="print:hidden border border-[#0f223d] px-1 py-1 text-center w-8 bg-rose-900 text-white">
                        ✕
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className={idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}
                    >
                      {/* Subject Name */}
                      <td className="border border-[#0f223d] px-2.5 py-1.5 font-semibold text-slate-900">
                        {isEditing ? (
                          <input
                            value={row.subject}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].subject = e.target.value;
                              setRows(updated);
                            }}
                            className="w-full bg-amber-50/50 px-1 py-0.5 rounded border border-amber-300 font-semibold focus:outline-none"
                          />
                        ) : (
                          row.subject
                        )}
                      </td>

                      {/* 1st Term */}
                      <td className="border border-[#0f223d] px-1 py-1.5 text-center font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row.term1}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].term1 = e.target.value;
                              setRows(updated);
                            }}
                            className="w-full text-center bg-amber-50/40 border border-slate-300 rounded px-0.5 py-0.5 focus:outline-none"
                          />
                        ) : (
                          row.term1 ?? "—"
                        )}
                      </td>

                      {/* 2nd Term */}
                      <td className="border border-[#0f223d] px-1 py-1.5 text-center font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row.term2}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].term2 = e.target.value;
                              setRows(updated);
                            }}
                            className="w-full text-center bg-amber-50/40 border border-slate-300 rounded px-0.5 py-0.5 focus:outline-none"
                          />
                        ) : (
                          row.term2 ?? "—"
                        )}
                      </td>

                      {/* 3rd Term */}
                      <td className="border border-[#0f223d] px-1 py-1.5 text-center font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row.term3}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].term3 = e.target.value;
                              setRows(updated);
                            }}
                            className="w-full text-center bg-amber-50/40 border border-slate-300 rounded px-0.5 py-0.5 focus:outline-none"
                          />
                        ) : (
                          row.term3 ?? "—"
                        )}
                      </td>

                      {/* 4th Term */}
                      <td className="border border-[#0f223d] px-1 py-1.5 text-center font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row.term4}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].term4 = e.target.value;
                              setRows(updated);
                            }}
                            className="w-full text-center bg-amber-50/40 border border-slate-300 rounded px-0.5 py-0.5 focus:outline-none"
                          />
                        ) : (
                          row.term4 ?? "—"
                        )}
                      </td>

                      {/* Total */}
                      <td className="border border-[#0f223d] px-1 py-1.5 text-center font-medium">
                        {isEditing ? (
                          <input
                            type="number"
                            value={row.total}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].total = Number(e.target.value);
                              setRows(updated);
                            }}
                            className="w-full text-center bg-amber-50/40 border border-slate-300 rounded px-0.5 py-0.5 focus:outline-none"
                          />
                        ) : (
                          row.total
                        )}
                      </td>

                      {/* Obtained */}
                      <td className="border border-[#0f223d] px-1 py-1.5 text-center font-bold text-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={row.obtained}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].obtained = Number(e.target.value);
                              setRows(updated);
                            }}
                            className="w-full text-center bg-amber-50/40 border border-slate-300 rounded px-0.5 py-0.5 font-bold focus:outline-none"
                          />
                        ) : (
                          row.obtained
                        )}
                      </td>

                      {/* Grade */}
                      <td className="border border-[#0f223d] px-1 py-1.5 text-center font-extrabold text-[#0f223d]">
                        {isEditing ? (
                          <input
                            value={row.grade}
                            onChange={(e) => {
                              const updated = [...rows];
                              updated[idx].grade = e.target.value;
                              setRows(updated);
                            }}
                            className="w-full text-center bg-amber-50/40 border border-slate-300 rounded px-0.5 py-0.5 font-bold focus:outline-none"
                          />
                        ) : (
                          row.grade || "—"
                        )}
                      </td>

                      {/* Delete action in edit mode */}
                      {isEditing && (
                        <td className="print:hidden border border-[#0f223d] px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Delete subject row"
                          >
                            <FaTrash size={11} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* 4. TERMS BASED GRADES SECONDARY TABLE (RIGHT-ALIGNED)          */}
            {/* -------------------------------------------------------------- */}
            <div className="flex justify-end mb-5">
              <div className="w-full sm:w-[58%] overflow-hidden">
                <table className="w-full border-collapse border border-[#0f223d] text-xs sm:text-[11.5px]">
                  <thead>
                    <tr className="bg-[#0f223d] text-white">
                      <th className="border border-[#0f223d] px-3 py-1.5 text-left font-bold tracking-wide w-[46%]">
                        Terms Based Grades
                      </th>
                      <th className="border border-[#0f223d] px-2 py-1.5 text-center font-bold w-[13.5%]">
                        1<sup className="text-[8px]">st</sup>
                      </th>
                      <th className="border border-[#0f223d] px-2 py-1.5 text-center font-bold w-[13.5%]">
                        2<sup className="text-[8px]">nd</sup>
                      </th>
                      <th className="border border-[#0f223d] px-2 py-1.5 text-center font-bold w-[13.5%]">
                        3<sup className="text-[8px]">rd</sup>
                      </th>
                      <th className="border border-[#0f223d] px-2 py-1.5 text-center font-bold w-[13.5%]">
                        4<sup className="text-[8px]">th</sup>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Quarterly Grade */}
                    <tr className="bg-white">
                      <td className="border border-[#0f223d] px-3 py-1.5 font-bold text-slate-900">
                        Quarterly Grade
                      </td>
                      {termsGrades.quarterly.map((g, qIdx) => (
                        <td
                          key={qIdx}
                          className="border border-[#0f223d] px-1.5 py-1.5 text-center font-extrabold text-[#0f223d]"
                        >
                          {isEditing ? (
                            <input
                              value={g}
                              onChange={(e) => {
                                const next = [...termsGrades.quarterly] as [
                                  string,
                                  string,
                                  string,
                                  string
                                ];
                                next[qIdx] = e.target.value;
                                setTermsGrades({ ...termsGrades, quarterly: next });
                              }}
                              className="w-full text-center bg-amber-50/50 border border-slate-300 rounded px-0.5 py-0.5 font-bold focus:outline-none"
                            />
                          ) : (
                            g
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Average Grade */}
                    <tr className="bg-slate-50/40">
                      <td className="border border-[#0f223d] px-3 py-1.5 font-bold text-slate-900">
                        Average Grade
                      </td>
                      {termsGrades.average.map((avg, aIdx) => (
                        <td
                          key={aIdx}
                          className="border border-[#0f223d] px-1.5 py-1.5 text-center font-bold text-slate-800"
                        >
                          {isEditing ? (
                            <input
                              value={avg}
                              onChange={(e) => {
                                const next = [...termsGrades.average] as [
                                  string,
                                  string,
                                  string,
                                  string
                                ];
                                next[aIdx] = e.target.value;
                                setTermsGrades({ ...termsGrades, average: next });
                              }}
                              className="w-full text-center bg-amber-50/50 border border-slate-300 rounded px-0.5 py-0.5 font-bold focus:outline-none"
                            />
                          ) : (
                            avg
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* 5. TEACHER'S FEEDBACK SECTION                                 */}
            {/* -------------------------------------------------------------- */}
            <div className="mt-3 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-right w-full text-xs sm:text-[13px] font-extrabold tracking-wider text-[#0f223d] uppercase">
                  TEACHER&apos;S FEEDBACK
                </h3>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2 print:hidden">
                    <select
                      onChange={(e) => {
                        if (e.target.value) setFeedback(e.target.value);
                      }}
                      className="text-xs border border-slate-300 rounded-lg p-1.5 bg-slate-50 text-slate-700 flex-1"
                    >
                      <option value="">-- Choose preset comment --</option>
                      {FEEDBACK_PRESETS.map((p, pIdx) => (
                        <option key={pIdx} value={p}>
                          {p.slice(0, 70)}…
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    placeholder="Type customized teacher feedback here..."
                    className="w-full border-b border-[#0f223d] bg-amber-50/50 p-2 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none leading-relaxed"
                  />
                </div>
              ) : (
                <div className="relative pt-1">
                  {/* Three clean horizontal ruled underline lines matching image */}
                  <div className="space-y-4">
                    <div className="border-b border-[#0f223d] pb-0.5 min-h-[1.4rem] text-xs sm:text-[13px] font-medium text-slate-800 tracking-wide">
                      {feedback}
                    </div>
                    <div className="border-b border-[#0f223d] min-h-[1.4rem]" />
                    <div className="border-b border-[#0f223d] min-h-[1.4rem]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* 6. FOOTER SECTION: ATTENDANCE DAYS + ACCENTS                    */}
          {/* ---------------------------------------------------------------- */}
          <div className="pt-4 border-t border-slate-200 text-xs sm:text-[12.5px] font-bold text-[#0f223d]">
            <div className="flex flex-wrap items-center gap-6 sm:gap-10">
              {/* Total School Days */}
              <div className="flex items-center gap-2">
                <span>Total School Days:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={attendance.totalDays}
                    onChange={(e) => {
                      const total = Number(e.target.value);
                      setAttendance({
                        ...attendance,
                        totalDays: total,
                        absent: Math.max(0, total - attendance.attended),
                      });
                    }}
                    className="w-16 bg-amber-50/60 border-b border-[#0f223d] px-1 py-0.5 text-center font-bold focus:outline-none"
                  />
                ) : (
                  <span className="inline-block border-b border-[#0f223d] min-w-[50px] text-center pb-0.5 font-bold">
                    {attendance.totalDays}
                  </span>
                )}
              </div>

              {/* Attended */}
              <div className="flex items-center gap-2">
                <span>Attended:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={attendance.attended}
                    onChange={(e) => {
                      const attended = Number(e.target.value);
                      setAttendance({
                        ...attendance,
                        attended,
                        absent: Math.max(0, attendance.totalDays - attended),
                      });
                    }}
                    className="w-16 bg-amber-50/60 border-b border-[#0f223d] px-1 py-0.5 text-center font-bold focus:outline-none"
                  />
                ) : (
                  <span className="inline-block border-b border-[#0f223d] min-w-[50px] text-center pb-0.5 font-bold">
                    {attendance.attended}
                  </span>
                )}
              </div>

              {/* Absent */}
              <div className="flex items-center gap-2">
                <span>Absent:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={attendance.absent}
                    onChange={(e) => {
                      setAttendance({
                        ...attendance,
                        absent: Number(e.target.value),
                      });
                    }}
                    className="w-16 bg-amber-50/60 border-b border-[#0f223d] px-1 py-0.5 text-center font-bold focus:outline-none"
                  />
                ) : (
                  <span className="inline-block border-b border-[#0f223d] min-w-[50px] text-center pb-0.5 font-bold">
                    {attendance.absent}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
