"use client";

import type { ResultCardData } from "@/redux/features/exams/examTypes";
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
}: {
  card: ResultCardData;
  onPrint?: () => void;
}) {
  const { school, exam, student, summary, lines, classPosition, classStrength } =
    card;
  const logo = resolveUrl(school?.logoUrl);
  const photo = resolveUrl(student.photoUrl);
  const classLabel = `${student.className}${
    student.sectionName ? `-${student.sectionName}` : ""
  }`;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden print:shadow-none print:border-black print:rounded-none">
      {/* Toolbar */}
      <div className="flex justify-end gap-2 px-4 py-3 border-b border-slate-100 print:hidden">
        <button
          type="button"
          onClick={onPrint ?? (() => window.print())}
          className="px-4 h-10 rounded-lg bg-black text-white text-sm font-semibold hover:bg-slate-800"
        >
          Print Result Card
        </button>
      </div>

      <div className="p-6 md:p-8 print:p-6" id="student-result-card">
        {/* School header */}
        <div className="flex items-start gap-4 border-b-2 border-slate-900 pb-4 mb-5">
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
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
        <div className="text-center mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Academic Result Card
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
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
        <div className="border border-slate-300 rounded-xl mb-5 overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            Student Particulars
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm">
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
        <div className="border border-slate-300 rounded-xl overflow-hidden mb-5">
          <div className="bg-slate-900 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            Subject-wise Marks
          </div>
          {lines.length === 0 ? (
            <p className="p-6 text-center text-slate-500 text-sm">
              No subjects scheduled for this student&apos;s class yet. Add papers
              in Exam Schedule, then enter marks.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-left">
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
                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {line.subjectName}
                      {line.subjectCode ? (
                        <span className="text-xs text-slate-400 ml-1">
                          ({line.subjectCode})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">{line.maxMarks}</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {line.passMarks}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {line.isAbsent ? "Absent" : (line.obtainedMarks ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {line.percent ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {line.grade ?? "—"}
                    </td>
                    <td className="px-3 py-2">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat
            label="Total Marks"
            value={`${summary.totalObtained} / ${summary.totalMax}`}
          />
          <Stat label="Percentage" value={`${summary.overallPercent}%`} />
          <Stat label="Grade" value={summary.grade} />
          <Stat
            label="Class Position"
            value={
              classPosition
                ? `${classPosition}${ordinal(classPosition)} / ${classStrength ?? "—"}`
                : "—"
            }
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
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
