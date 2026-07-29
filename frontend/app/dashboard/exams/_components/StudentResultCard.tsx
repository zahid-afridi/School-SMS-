"use client";

import type { ResultCardData } from "@/redux/features/exams/examTypes";
import { formatExamDate } from "./ExamUI";
import type { ExamDocumentTemplate } from "./ExamTemplatePicker";

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

const TEMPLATE_STYLES: Record<
  ExamDocumentTemplate,
  {
    name: string;
    shell: string;
    topBar: string;
    headerBorder: string;
    eyebrow: string;
    title: string;
    section: string;
    tableHead: string;
    stat: string;
    accentLine: string;
  }
> = {
  classic: {
    name: "Classic",
    shell: "border-slate-300",
    topBar: "bg-slate-900",
    headerBorder: "border-slate-900",
    eyebrow: "text-slate-500",
    title: "text-slate-900",
    section: "bg-slate-900 text-white",
    tableHead: "bg-slate-100 text-slate-700",
    stat: "border-slate-200 bg-slate-50",
    accentLine: "bg-slate-900",
  },
  modern: {
    name: "Modern",
    shell: "border-slate-200",
    topBar: "bg-gradient-to-r from-black via-slate-900 to-sky-600",
    headerBorder: "border-sky-500",
    eyebrow: "text-sky-600",
    title: "text-black",
    section: "bg-black text-white",
    tableHead: "bg-sky-50 text-slate-800",
    stat: "border-sky-200 bg-sky-50/60",
    accentLine: "bg-sky-500",
  },
  royal: {
    name: "Royal",
    shell: "border-emerald-800",
    topBar: "bg-gradient-to-r from-emerald-950 via-emerald-800 to-amber-500",
    headerBorder: "border-amber-500",
    eyebrow: "text-amber-700",
    title: "text-emerald-950",
    section: "bg-emerald-900 text-amber-50",
    tableHead: "bg-amber-50 text-emerald-950",
    stat: "border-amber-300 bg-amber-50",
    accentLine: "bg-amber-500",
  },
  minimal: {
    name: "Minimal",
    shell: "border-zinc-400",
    topBar: "bg-zinc-800",
    headerBorder: "border-zinc-400",
    eyebrow: "text-zinc-500",
    title: "text-zinc-900",
    section: "bg-zinc-100 text-zinc-900 border-y border-zinc-300",
    tableHead: "bg-white text-zinc-700 border-b-2 border-zinc-700",
    stat: "border-zinc-300 bg-white",
    accentLine: "bg-zinc-500",
  },
};

export default function StudentResultCard({
  card,
  onPrint,
  template = "classic",
}: {
  card: ResultCardData;
  onPrint?: () => void;
  template?: ExamDocumentTemplate;
}) {
  const { school, exam, student, summary, lines, classPosition, classStrength } =
    card;
  const logo = resolveUrl(school?.logoUrl);
  const photo = resolveUrl(student.photoUrl);
  const classLabel = `${student.className}${
    student.sectionName ? `-${student.sectionName}` : ""
  }`;
  const theme = TEMPLATE_STYLES[template];

  return (
    <div
      className={`result-card-document overflow-hidden rounded-2xl border bg-white shadow-sm print:rounded-none print:shadow-none ${theme.shell}`}
      data-template={template}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 print:hidden">
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

      <div className={`h-2 ${theme.topBar}`} />

      <div
        className="p-6 md:p-8 print:p-[5mm] print:text-[11px]"
        id="student-result-card"
      >
        {/* School header */}
        <div
          className={`mb-5 flex items-start gap-4 border-b-2 pb-4 print:mb-3 print:pb-3 ${theme.headerBorder}`}
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

        {/* Exam title band */}
        <div className="relative mb-5 text-center print:mb-3">
          <div
            className={`mx-auto mb-3 h-1 w-16 rounded-full ${theme.accentLine}`}
          />
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${theme.eyebrow}`}
          >
            Academic Result Card
          </p>
          <h2
            className={`mt-1 text-xl font-bold md:text-2xl print:text-xl ${theme.title}`}
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

        {/* Student particulars */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-300 print:mb-3">
          <div
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide print:py-1.5 ${theme.section}`}
          >
            Student Particulars
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2 print:grid-cols-2 print:gap-y-1 print:p-3 print:text-[10px]">
            <Info label="Student Name" value={student.name} strong />
            <Info label="Registration No" value={student.registrationNo} />
            <Info label="Father Name" value={student.fatherName ?? "—"} />
            <Info label="Mother Name" value={student.motherName ?? "—"} />
            <Info label="Guardian" value={student.guardianName ?? "—"} />
            <Info label="Class / Section" value={classLabel} />
            <Info label="Roll No" value={student.rollNo ?? "—"} />
            <Info label="Date of Birth" value={formatDob(student.dateOfBirth)} />
            <Info label="Gender" value={student.gender ?? "—"} />
            <Info label="Religion" value={student.religion ?? "—"} />
            <Info label="Nationality" value={student.nationality ?? "—"} />
            <Info label="Email" value={student.email ?? "—"} />
            <Info label="Contact" value={student.contactPhone ?? "—"} />
            <Info
              label="Father Contact"
              value={student.fatherPhone ?? "—"}
            />
            <Info
              label="Mother Contact"
              value={student.motherPhone ?? "—"}
            />
            <Info
              label="Guardian Contact"
              value={student.guardianPhone ?? "—"}
            />
            <Info
              label="Father Occupation"
              value={student.fatherOccupation ?? "—"}
            />
            <Info label="Father CNIC" value={student.fatherCnic ?? "—"} />
            <Info
              label="Address"
              value={
                [student.address, student.city].filter(Boolean).join(", ") ||
                "—"
              }
            />
            <Info
              label="Admission Date"
              value={formatDob(student.admissionDate)}
            />
          </div>
        </div>

        {/* Marks table */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-300 print:mb-3">
          <div
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide print:py-1.5 ${theme.section}`}
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
              <thead className={`text-left ${theme.tableHead}`}>
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
                  <tr key={line.examSubjectId} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-slate-400 print:py-1.5">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900 print:py-1.5">
                      {line.subjectName}
                      {line.subjectCode ? (
                        <span className="text-xs text-slate-400 ml-1">
                          ({line.subjectCode})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right print:py-1.5">{line.maxMarks}</td>
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

        {/* Summary strip */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 print:mb-3 print:grid-cols-4">
          <Stat
            label="Total Marks"
            value={`${summary.totalObtained} / ${summary.totalMax}`}
            className={theme.stat}
          />
          <Stat
            label="Percentage"
            value={`${summary.overallPercent}%`}
            className={theme.stat}
          />
          <Stat label="Grade" value={summary.grade} className={theme.stat} />
          <Stat
            label="Class Position"
            value={
              classPosition
                ? `${classPosition}${ordinal(classPosition)} / ${classStrength ?? "—"}`
                : "—"
            }
            className={theme.stat}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
          <Mini label="Passed Subjects" value={String(summary.passedSubjects)} />
          <Mini label="Failed Subjects" value={String(summary.failedSubjects)} />
          <Mini label="Absent" value={String(summary.absentSubjects)} />
          <Mini label="Subjects" value={String(summary.subjectCount)} />
        </div>

        {/* Grade key */}
        <div className="border border-slate-200 rounded-xl p-3 mb-8 text-[11px] text-slate-500">
          <p className="font-semibold text-slate-700 mb-1">Grading Key</p>
          <p>
            A+ ≥ 90% · A ≥ 80% · B ≥ 70% · C ≥ 60% · D ≥ 50% · E ≥ 40% · F &lt;
            40% · Pass requires marks ≥ subject pass marks
          </p>
        </div>

        {/* Signatures */}
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
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-800"}>
        {value}
      </span>
    </p>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 text-center print:py-2 ${
        className ?? "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
