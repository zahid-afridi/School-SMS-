"use client";

import type { CSSProperties } from "react";
import type { ResultCardData } from "@/redux/features/exams/examTypes";
import { resolveUploadUrl } from "@/lib/apiBase";
import {
  customInline,
  resolveTheme,
  type DocumentCustomStyle,
  type ExamDocumentTemplate,
} from "@/lib/documentStyles";
import { formatExamDate } from "./ExamUI";
import {
  documentFontClass,
  documentRadiusClass,
  type ResultCardLayout,
  type SchoolDocumentDesign,
} from "@/lib/schoolDocumentDesign";

function resolveUrl(path?: string | null) {
  return resolveUploadUrl(path);
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

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function numberToWords(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const num = Math.round(Math.abs(n));
  if (num === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const under100 = (v: number) => {
    if (v < 20) return ones[v];
    return `${tens[Math.floor(v / 10)]}${v % 10 ? `-${ones[v % 10]}` : ""}`;
  };

  if (num < 100) return under100(num);
  if (num < 1000) {
    const rest = num % 100;
    return `${ones[Math.floor(num / 100)]} Hundred${
      rest ? ` ${under100(rest)}` : ""
    }`;
  }
  if (num < 100000) {
    const rest = num % 1000;
    return `${numberToWords(Math.floor(num / 1000))} Thousand${
      rest ? ` ${numberToWords(rest)}` : ""
    }`;
  }
  return String(num);
}

function positionLabel(
  classPosition?: number | null,
  classStrength?: number | null
) {
  if (!classPosition) return "—";
  return `${classPosition}${ordinal(classPosition)} / ${classStrength ?? "—"}`;
}

export default function StudentResultCard({
  card,
  onPrint,
  template = "classic",
  customStyle,
  design,
  layout,
  hideToolbar = false,
}: {
  card: ResultCardData;
  onPrint?: () => void;
  template?: ExamDocumentTemplate;
  customStyle?: DocumentCustomStyle | null;
  design?: SchoolDocumentDesign;
  /** Overrides school design layout for this card. */
  layout?: ResultCardLayout;
  hideToolbar?: boolean;
}) {
  const theme = resolveTheme(template, customStyle);
  const format: ResultCardLayout =
    layout ?? design?.resultCardLayout ?? "academic";

  return (
    <div
      className={`result-card-document overflow-hidden border bg-white shadow-sm print:rounded-none print:shadow-none ${theme.shell} ${
        design ? documentRadiusClass(design.shape) : "rounded-2xl"
      } ${design ? documentFontClass(design.font) : ""}`}
      data-template={template}
      data-layout={format}
      style={theme.cssVars as CSSProperties | undefined}
    >
      {!hideToolbar && (
        <div
          className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 print:hidden"
          data-export-ignore
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {theme.name} · {format} format
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

      {format === "certificate" ? (
        <CertificateLayout card={card} theme={theme} design={design} />
      ) : format === "modern" ? (
        <ModernLayout card={card} theme={theme} design={design} />
      ) : format === "minimal" ? (
        <MinimalLayout card={card} theme={theme} design={design} />
      ) : (
        <AcademicLayout card={card} theme={theme} design={design} />
      )}
    </div>
  );
}

type LayoutProps = {
  card: ResultCardData;
  theme: ReturnType<typeof resolveTheme>;
  design?: SchoolDocumentDesign;
};

function AcademicLayout({ card, theme, design }: LayoutProps) {
  const { school, exam, student, summary, lines, classPosition, classStrength } =
    card;
  const logo = resolveUrl(school?.logoUrl);
  const photo = resolveUrl(student.photoUrl);
  const showLogo = design?.showLogo !== false;
  const showPhoto = design?.showStudentPhoto !== false;

  return (
    <>
      <div
        className={`h-2 ${theme.topBar}`}
        style={customInline(theme, "topBar")}
      />
      <div
        className={`print:p-[5mm] print:text-[11px] ${
          design?.density === "compact"
            ? "p-3 sm:p-4 md:p-5"
            : "p-3.5 sm:p-6 md:p-8"
        }`}
        id="student-result-card"
      >
        <div
          className={`mb-4 flex flex-col items-center gap-3 border-b-2 pb-3 text-center sm:mb-5 sm:flex-row sm:items-start sm:gap-4 sm:pb-4 sm:text-left print:mb-3 print:flex-row print:items-start print:gap-4 print:pb-3 print:text-left ${theme.headerBorder}`}
          style={customInline(theme, "headerBorder")}
        >
          {showLogo ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-20 sm:w-20 print:h-20 print:w-20">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={school?.name ?? "School"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-400">
                  {(school?.name ?? "S").charAt(0)}
                </span>
              )}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1
              className={`break-words text-lg font-bold tracking-tight sm:text-2xl md:text-3xl print:text-2xl ${theme.title}`}
              style={customInline(theme, "title")}
            >
              {school?.name ?? "School Name"}
            </h1>
            {school?.address && (
              <p className="mt-1 break-words text-sm text-slate-600">
                {school.address}
              </p>
            )}
            <p className="mt-1 break-words text-xs text-slate-500">
              {[school?.phone, school?.email, school?.website]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
          {showPhoto ? (
            <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50 sm:h-24 sm:w-20 print:h-24 print:w-20">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={student.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-slate-400">
                  {student.name.charAt(0)}
                </span>
              )}
            </div>
          ) : null}
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
          <p className="mt-1 text-sm text-slate-500">
            Session {exam.academicYear ?? student.academicYear ?? "—"}
            {" · "}
            {formatExamDate(exam.startDate)}
            {exam.endDate ? ` — ${formatExamDate(exam.endDate)}` : ""}
          </p>
        </div>

        <ParticularsBox
          theme={theme}
          student={student}
          summary={summary}
          classPosition={classPosition}
          classStrength={classStrength}
        />
        <MarksTable theme={theme} lines={lines} summary={summary} />
        <SignatureRow labels={["Class Teacher", "Controller Exams", "Principal"]} />
        <IssuedNote issuedAt={card.issuedAt} />
      </div>
    </>
  );
}

function ModernLayout({ card, theme, design }: LayoutProps) {
  const { school, exam, student, summary, lines, classPosition, classStrength } =
    card;
  const logo = resolveUrl(school?.logoUrl);
  const photo = resolveUrl(student.photoUrl);
  const showLogo = design?.showLogo !== false;
  const showPhoto = design?.showStudentPhoto !== false;

  return (
    <div id="student-result-card">
      <div
        className={`px-4 py-5 text-white sm:px-6 print:px-[5mm] print:py-4 ${theme.topBar}`}
        style={customInline(theme, "topBar")}
      >
        <div className="flex items-start gap-3">
          {showLogo ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/95">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-lg font-bold text-slate-700">
                  {(school?.name ?? "S").charAt(0)}
                </span>
              )}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Result Card
            </p>
            <h1 className="break-words text-xl font-bold sm:text-2xl">
              {school?.name ?? "School Name"}
            </h1>
            <p className="mt-1 text-sm text-white/80">{exam.name}</p>
          </div>
          {showPhoto ? (
            <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white/40 bg-white/20">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={student.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`print:p-[5mm] print:text-[11px] ${
          design?.density === "compact" ? "p-3 sm:p-4" : "p-4 sm:p-6"
        }`}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
            <p className="text-sm text-slate-500">
              {student.fatherName ? `S/D/O ${student.fatherName}` : "—"}
              {" · "}
              {student.className}
              {student.sectionName ? `-${student.sectionName}` : ""}
              {" · Roll "}
              {student.rollNo ?? "—"}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Session {exam.academicYear ?? student.academicYear ?? "—"}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Percentage", `${summary.overallPercent}%`],
            ["Grade", summary.grade],
            ["Position", positionLabel(classPosition, classStrength)],
            ["Status", summary.overallStatus],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`rounded-xl border px-3 py-2 ${theme.stat}`}
              style={customInline(theme, "stat")}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <MarksTable theme={theme} lines={lines} summary={summary} rounded />
        <SignatureRow labels={["Class Teacher", "Exam Controller", "Principal"]} />
        <IssuedNote issuedAt={card.issuedAt} />
      </div>
    </div>
  );
}

function MinimalLayout({ card, theme, design }: LayoutProps) {
  const { school, exam, student, summary, lines, classPosition, classStrength } =
    card;
  const logo = resolveUrl(school?.logoUrl);
  const showLogo = design?.showLogo !== false;

  return (
    <div
      className={`print:p-[6mm] print:text-[11px] ${
        design?.density === "compact" ? "p-4" : "p-5 sm:p-8"
      }`}
      id="student-result-card"
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {showLogo && logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-8 w-8 object-contain" />
            ) : null}
            <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">
              {school?.name ?? "School Name"}
            </h1>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
            Result card · {exam.name}
          </p>
        </div>
        <p className="shrink-0 text-xs text-slate-500">
          {exam.academicYear ?? student.academicYear ?? "—"}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <Info label="Name" value={student.name} strong />
        <Info label="Father" value={student.fatherName ?? "—"} />
        <Info label="Roll No" value={student.rollNo ?? "—"} />
        <Info
          label="Class"
          value={`${student.className}${
            student.sectionName ? `-${student.sectionName}` : ""
          }`}
        />
        <Info label="%" value={`${summary.overallPercent}%`} />
        <Info
          label="Position"
          value={positionLabel(classPosition, classStrength)}
        />
      </div>

      <MarksTable theme={theme} lines={lines} summary={summary} plain />
      <SignatureRow labels={["Teacher", "Controller", "Principal"]} compact />
      <IssuedNote issuedAt={card.issuedAt} />
    </div>
  );
}

/** Board-style Detailed Marks Certificate layout. */
function CertificateLayout({ card, theme, design }: LayoutProps) {
  const { school, exam, student, summary, lines, classPosition, classStrength } =
    card;
  const logo = resolveUrl(school?.logoUrl);
  const photo = resolveUrl(student.photoUrl);
  const showLogo = design?.showLogo !== false;
  const showPhoto = design?.showStudentPhoto !== false;
  const serial = student.registrationNo || student.id.slice(0, 8).toUpperCase();
  const examMonth = exam.endDate
    ? formatExamDate(exam.endDate)
    : formatExamDate(exam.startDate);

  return (
    <div
      className="relative overflow-hidden print:p-[8mm] p-4 sm:p-7"
      id="student-result-card"
      style={{ color: design?.text ?? "#0f172a" }}
    >
      {/* Soft watermark */}
      {showLogo && logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.06] print:opacity-[0.08]"
        />
      ) : null}

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="w-16 shrink-0 sm:w-20" />
          <div className="min-w-0 flex-1 text-center">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] sm:text-sm"
              style={{ color: design?.primary ?? undefined }}
            >
              {school?.name ?? "School Name"}
            </p>
            {showLogo ? (
              <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-white sm:h-20 sm:w-20"
                style={{ borderColor: design?.accent ?? "#94a3b8" }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-2xl font-bold text-slate-400">
                    {(school?.name ?? "S").charAt(0)}
                  </span>
                )}
              </div>
            ) : null}
            {school?.address ? (
              <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                {school.address}
              </p>
            ) : null}
          </div>
          <div className="w-16 shrink-0 text-right text-[10px] sm:w-24 sm:text-xs">
            <p className="font-semibold text-slate-500">S.No.</p>
            <p className="font-mono font-bold">{serial}</p>
          </div>
        </div>

        <div className="mt-3 text-center">
          <h2
            className="text-base font-bold uppercase tracking-wide sm:text-xl"
            style={{ color: design?.primary ?? undefined }}
          >
            Detailed Marks Certificate
          </h2>
          <p className="mt-1 text-sm font-semibold uppercase text-slate-800">
            {exam.name}
          </p>
          <p className="text-xs text-slate-500">
            Session {exam.academicYear ?? student.academicYear ?? "—"}
            {student.className
              ? ` · ${student.className}${
                  student.sectionName ? `-${student.sectionName}` : ""
                }`
              : ""}
          </p>
        </div>

        <div className="mt-5 flex items-start justify-between gap-3">
          <p className="text-sm">
            <span className="font-semibold">Roll No:</span>{" "}
            <span className="font-bold underline decoration-slate-400 underline-offset-4">
              {student.rollNo ?? "—"}
            </span>
          </p>
          {showPhoto ? (
            <div className="h-[5.5rem] w-[4.2rem] shrink-0 overflow-hidden border border-slate-700 bg-slate-100">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={student.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-slate-400">
                  {student.name.charAt(0)}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed sm:text-sm print:text-[11px]">
          <ProseLine label="Name" value={student.name} />
          <ProseLine
            label="Son / Daughter of"
            value={student.fatherName ?? "—"}
          />
          <ProseLine
            label="of"
            value={school?.name ?? "—"}
            italic
          />
          <p>
            has secured the marks shown against each subject in the examination
            held in{" "}
            <span className="font-semibold underline decoration-slate-400 underline-offset-2">
              {examMonth}
            </span>{" "}
            as a{" "}
            <span className="font-semibold underline decoration-slate-400 underline-offset-2">
              Regular Student
            </span>
            .
          </p>
        </div>

        <div className="mt-5 overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[560px] border border-slate-800 text-sm print:min-w-0 print:text-[10px]">
            <thead>
              <tr className="bg-white">
                <th
                  rowSpan={2}
                  className="border border-slate-800 px-2 py-2 text-left font-bold"
                >
                  Subjects
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-800 px-2 py-2 text-center font-bold"
                >
                  Max
                </th>
                <th
                  colSpan={3}
                  className="border border-slate-800 px-2 py-1.5 text-center font-bold"
                  style={{
                    background: design?.tableHead ?? "#f1f5f9",
                    color: design?.primary ?? undefined,
                  }}
                >
                  Marks Obtained
                </th>
              </tr>
              <tr>
                <th className="border border-slate-800 px-2 py-1.5 text-center text-xs font-semibold">
                  Figures
                </th>
                <th className="border border-slate-800 px-2 py-1.5 text-center text-xs font-semibold">
                  In Words
                </th>
                <th className="border border-slate-800 px-2 py-1.5 text-center text-xs font-semibold">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-slate-800 px-3 py-6 text-center text-slate-500"
                  >
                    No subjects scheduled for this student&apos;s class yet.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.examSubjectId}>
                    <td className="border border-slate-800 px-2 py-1.5 font-medium">
                      {line.subjectName}
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center">
                      {line.maxMarks}
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                      {line.isAbsent
                        ? "Absent"
                        : (line.obtainedMarks ?? "—")}
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 text-left text-xs italic">
                      {line.isAbsent
                        ? "Absent"
                        : numberToWords(line.obtainedMarks)}
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center font-semibold">
                      {line.grade ?? "—"}
                    </td>
                  </tr>
                ))
              )}
              <tr className="font-bold">
                <td className="border border-slate-800 px-2 py-2">Total</td>
                <td className="border border-slate-800 px-2 py-2 text-center">
                  {summary.totalMax}
                </td>
                <td className="border border-slate-800 px-2 py-2 text-center">
                  {summary.totalObtained}
                </td>
                <td className="border border-slate-800 px-2 py-2 text-left text-xs italic">
                  {numberToWords(summary.totalObtained)}
                </td>
                <td className="border border-slate-800 px-2 py-2 text-center">
                  {summary.grade}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={5}
                  className="border border-slate-800 px-2 py-2 text-xs"
                >
                  <span className="font-semibold">Remarks:</span>{" "}
                  {summary.overallStatus} · {summary.overallPercent}% · Position{" "}
                  {positionLabel(classPosition, classStrength)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="mb-8 text-xs text-slate-500">Checked By:</p>
            <div className="border-t border-slate-700 pt-1 text-xs">
              Signature
            </div>
          </div>
          <div className="text-right">
            <p className="mb-8 text-xs text-slate-500">
              Controller of Examinations
            </p>
            <div className="ml-auto w-40 border-t border-slate-700 pt-1 text-xs">
              Signature
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3 text-xs text-slate-600">
          <p>
            <span className="font-semibold">Date of issue:</span>{" "}
            {formatDob(card.issuedAt ?? new Date().toISOString())}
          </p>
          <p className="max-w-md text-[10px] leading-snug text-slate-400">
            Any correction / alteration in this certificate without official
            confirmation is not acceptable.
          </p>
        </div>
      </div>
    </div>
  );
}

function ParticularsBox({
  theme,
  student,
  summary,
  classPosition,
  classStrength,
}: {
  theme: ReturnType<typeof resolveTheme>;
  student: ResultCardData["student"];
  summary: ResultCardData["summary"];
  classPosition?: number | null;
  classStrength?: number | null;
}) {
  return (
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
          value={positionLabel(classPosition, classStrength)}
        />
      </div>
    </div>
  );
}

function MarksTable({
  theme,
  lines,
  summary,
  rounded = true,
  plain = false,
}: {
  theme: ReturnType<typeof resolveTheme>;
  lines: ResultCardData["lines"];
  summary: ResultCardData["summary"];
  rounded?: boolean;
  plain?: boolean;
}) {
  return (
    <div
      className={`mb-5 overflow-x-auto print:mb-3 print:overflow-visible ${
        plain
          ? "border-y border-slate-800"
          : `border border-slate-300 ${rounded ? "rounded-xl" : ""}`
      }`}
    >
      {!plain ? (
        <div
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide print:py-1.5 ${theme.section}`}
          style={customInline(theme, "section")}
        >
          Subject-wise Marks
        </div>
      ) : null}
      {lines.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">
          No subjects scheduled for this student&apos;s class yet. Add papers in
          Exam Schedule, then enter marks.
        </p>
      ) : (
        <table className="w-full min-w-[640px] text-sm print:min-w-0 print:text-[10px]">
          <thead
            className={`text-left ${theme.tableHead}`}
            style={customInline(theme, "tableHead")}
          >
            <tr>
              <th className="w-10 px-3 py-2.5">#</th>
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
              <tr key={line.examSubjectId} className="border-t border-slate-200">
                <td className="px-3 py-2 text-slate-400 print:py-1.5">
                  {idx + 1}
                </td>
                <td className="px-3 py-2 font-medium text-slate-900 print:py-1.5">
                  {line.subjectName}
                  {line.subjectCode ? (
                    <span className="ml-1 text-xs text-slate-400">
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
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(
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
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(
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
  );
}

function SignatureRow({
  labels,
  compact,
}: {
  labels: string[];
  compact?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 gap-2 text-center text-[10px] text-slate-600 sm:gap-6 sm:text-sm print:gap-6 print:text-sm ${
        compact ? "pt-6" : "pt-8"
      }`}
    >
      {labels.map((label) => (
        <div key={label}>
          <div className="border-t border-slate-400 pt-2">{label}</div>
        </div>
      ))}
    </div>
  );
}

function IssuedNote({ issuedAt }: { issuedAt?: string }) {
  if (!issuedAt) return null;
  return (
    <p className="mt-6 text-center text-[10px] text-slate-400">
      Issued on {formatDob(issuedAt)} · Computer-generated result card
    </p>
  );
}

function ProseLine({
  label,
  value,
  italic,
}: {
  label: string;
  value: string;
  italic?: boolean;
}) {
  return (
    <p>
      <span className="text-slate-600">{label} </span>
      <span
        className={`font-semibold underline decoration-slate-400 underline-offset-4 ${
          italic ? "italic" : ""
        }`}
      >
        {value}
      </span>
    </p>
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
