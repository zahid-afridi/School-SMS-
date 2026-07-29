"use client";

import type { CSSProperties } from "react";
import type { ResultCardData } from "@/redux/features/exams/examTypes";
import {
  customInline,
  resolveTheme,
  type DocumentCustomStyle,
  type ExamDocumentTemplate,
} from "@/lib/documentStyles";
import { formatExamDate } from "./ExamUI";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolveUrl(path?: string | null) {
  if (!path) return null;
  return path.startsWith("http")
    ? path
    : `${IMAGE_BASE}/${path.replace(/^\//, "")}`;
}

function formatDob(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: string) {
  if (status === "PASS") return "text-emerald-700 bg-emerald-50";
  if (status === "FAIL") return "text-rose-700 bg-rose-50";
  if (status === "ABSENT") return "text-amber-700 bg-amber-50";
  return "text-slate-600 bg-slate-100";
}

export default function StudentResultCard({
  card,
  onPrint,
  template = "classic",
  customStyle,
  hideToolbar = false,
}: {
  card: ResultCardData;
  onPrint?: () => void;
  template?: ExamDocumentTemplate;
  customStyle?: DocumentCustomStyle | null;
  hideToolbar?: boolean;
}) {
  const { school, exam, student, summary, lines, classPosition, classStrength } =
    card;
  const logo = resolveUrl(school?.logoUrl);
  const photo = resolveUrl(student.photoUrl);
  const theme = resolveTheme(template, customStyle);

  return (
    <div
      className={`result-card-document overflow-hidden rounded-2xl border bg-white shadow-sm print:rounded-none print:shadow-none ${theme.shell}`}
      data-template={template}
      style={theme.cssVars as CSSProperties | undefined}
    >
      {!hideToolbar && (
        <div
          className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 print:hidden"
          data-export-ignore
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {theme.name} template
          </span>
          <button
            type="button"
            onClick={onPrint ?? (() => window.print())}
            className="px-4 h-10 rounded-lg bg-black text-white text-sm font-semibold hover:bg-slate-800"
          >
            Print Result Card
          </button>
        </div>
      )}

      <div
        className={`h-2 ${theme.topBar}`}
        style={customInline(theme, "topBar")}
      />

      <div
        className="p-6 md:p-8 print:p-[5mm] print:text-[11px]"
        id="student-result-card"
      >
        <div
          className={`mb-5 flex items-start gap-4 border-b-2 pb-4 print:mb-3 print:pb-3 ${theme.headerBorder}`}
          style={customInline(theme, "headerBorder")}
        >
          <div className="w-20 h-20 shrink-0 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={school?.name ?? "School"}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-2xl font-bold text-slate-400">
                {(school?.name ?? "S").charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1
              className={`text-2xl font-bold tracking-tight md:text-3xl print:text-2xl ${theme.title}`}
              style={customInline(theme, "title")}
            >
              {school?.name ?? "School Name"}
            </h1>
            {school?.address && (
              <p className="text-sm text-slate-600 mt-1">{school.address}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {[school?.phone, school?.email, school?.website]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
          <div className="w-20 h-24 shrink-0 rounded-lg border border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={student.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-slate-400">
                {student.name.charAt(0)}
              </span>
            )}
          </div>
        </div>

        <div className="relative mb-5 text-center print:mb-3">
          <div
            className={`mx-auto mb-3 h-1 w-16 rounded-full ${theme.accentLine}`}
            style={customInline(theme, "accentLine")}
          />
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${theme.eyebrow}`}
            style={customInline(theme, "eyebrow")}
          >
            Academic Result Card
          </p>
          <h2
            className={`mt-1 text-xl font-bold md:text-2xl print:text-xl ${theme.title}`}
            style={customInline(theme, "title")}
          >
            {exam.name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Session {exam.academicYear ?? student.academicYear ?? "—"}
            {" · "}
            {formatExamDate(exam.startDate)}
            {exam.endDate ? ` — ${formatExamDate(exam.endDate)}` : ""}
          </p>
        </div>

        <div className="mb-5 overflow-hidden rounded-xl border border-slate-300 print:mb-3">
          <div
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide print:py-1.5 ${theme.section}`}
            style={customInline(theme, "section")}
          >
            Student Particulars
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 p-4 text-sm sm:grid-cols-2 print:grid-cols-2 print:gap-y-1.5 print:p-3 print:text-[10px]">
            <Info label="Name" value={student.name} strong />
            <Info label="Father Name" value={student.fatherName ?? "—"} />
            <Info label="Roll No" value={student.rollNo ?? "—"} />
            <Info label="Class" value={student.className || "—"} />
            <Info label="Section" value={student.sectionName ?? "—"} />
            <Info label="Percentage" value={`${summary.overallPercent}%`} />
            <Info label="Grade" value={summary.grade} />
            <Info
              label="Class Position"
              value={
                classPosition
                  ? `${classPosition}${ordinal(classPosition)} / ${classStrength ?? "—"}`
                  : "—"
              }
            />
          </div>
        </div>

        <div className="mb-5 overflow-hidden rounded-xl border border-slate-300 print:mb-3">
          <div
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide print:py-1.5 ${theme.section}`}
            style={customInline(theme, "section")}
          >
            Subject-wise Marks
          </div>
          {lines.length === 0 ? (
            <p className="p-6 text-center text-slate-500 text-sm">
              No subjects scheduled for this student&apos;s class yet. Add papers
              in Exam Schedule, then enter marks.
            </p>
          ) : (
            <table className="w-full text-sm print:text-[10px]">
              <thead
                className={`text-left ${theme.tableHead}`}
                style={customInline(theme, "tableHead")}
              >
                <tr>
                  <th className="px-3 py-2.5 w-10">#</th>
                  <th className="px-3 py-2.5">Subject</th>
                  <th className="px-3 py-2.5 text-right">Max</th>
                  <th className="px-3 py-2.5 text-right">Pass</th>
                  <th className="px-3 py-2.5 text-right">Obtained</th>
                  <th className="px-3 py-2.5 text-right">%</th>
                  <th className="px-3 py-2.5">Grade</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr
                    key={line.examSubjectId}
                    className="border-t border-slate-200"
                  >
                    <td className="px-3 py-2 text-slate-400 print:py-1.5">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900 print:py-1.5">
                      {line.subjectName}
                      {line.subjectCode ? (
                        <span className="text-xs text-slate-400 ml-1">
                          ({line.subjectCode})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right print:py-1.5">
                      {line.maxMarks}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500 print:py-1.5">
                      {line.passMarks}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold print:py-1.5">
                      {line.isAbsent ? "Absent" : (line.obtainedMarks ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-right print:py-1.5">
                      {line.percent ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold print:py-1.5">
                      {line.grade ?? "—"}
                    </td>
                    <td className="px-3 py-2 print:py-1.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusClass(
                          line.status
                        )}`}
                      >
                        {line.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-50 font-semibold">
                  <td className="px-3 py-2.5" colSpan={2}>
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right">{summary.totalMax}</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right">
                    {summary.totalObtained}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {summary.overallPercent}
                  </td>
                  <td className="px-3 py-2.5">{summary.grade}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusClass(
                        summary.overallStatus
                      )}`}
                    >
                      {summary.overallStatus}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6 text-center text-sm text-slate-600 pt-8">
          <div>
            <div className="border-t border-slate-400 pt-2">Class Teacher</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-2">Controller Exams</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-2">Principal</div>
          </div>
        </div>

        {card.issuedAt && (
          <p className="text-[10px] text-slate-400 text-center mt-6">
            Issued on {formatDob(card.issuedAt)} · Computer-generated result card
          </p>
        )}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <p>
      <span className="text-slate-500">{label}: </span>
      <span
        className={strong ? "font-semibold text-slate-900" : "text-slate-800"}
      >
        {value}
      </span>
    </p>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
