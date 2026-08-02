import type { CSSProperties } from "react";
import type { DateSheetData } from "@/redux/features/exams/examTypes";
import type { School } from "@/redux/features/school/schoolTypes";
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
  type SchoolDocumentDesign,
} from "@/lib/schoolDocumentDesign";

function resolveUrl(path?: string | null) {
  return resolveUploadUrl(path);
}

function dayName(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { weekday: "long" });
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const [hourRaw, minute = "00"] = value.split(":");
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:${minute} ${suffix}`;
}

export default function DateSheetDocument({
  data,
  school,
  template = "classic",
  customStyle,
  design,
}: {
  data: DateSheetData;
  school?: School;
  template?: ExamDocumentTemplate;
  customStyle?: DocumentCustomStyle | null;
  design?: SchoolDocumentDesign;
}) {
  const theme = resolveTheme(template, customStyle);
  const logo = resolveUrl(school?.logoUrl);
  const classes = Array.from(
    new Set(
      data.entries.map(
        (entry) =>
          `${entry.class.className}${
            entry.section ? `-${entry.section.sectionName}` : ""
          }`
      )
    )
  );

  return (
    <article
      className={`date-sheet-document overflow-hidden border bg-white shadow-sm print:rounded-none print:shadow-none ${theme.shell} ${
        design ? documentRadiusClass(design.shape) : "rounded-2xl"
      } ${design ? documentFontClass(design.font) : ""}`}
      data-template={template}
      data-layout={design?.dateSheetLayout}
      style={theme.cssVars as CSSProperties | undefined}
    >
      {design?.dateSheetLayout !== "compact" ? (
        <div
          className={`h-2 ${theme.topBar}`}
          style={customInline(theme, "topBar")}
        />
      ) : null}

      <div
        className={`print:p-[7mm] ${
          design?.density === "compact"
            ? "p-3 sm:p-4 md:p-5"
            : "p-3.5 sm:p-6 md:p-8"
        }`}
      >
        <header className="flex items-center gap-2.5 border-b border-slate-200 pb-4 sm:gap-5 sm:pb-5 print:gap-5 print:pb-3">
          {design?.showLogo !== false ? <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-20 sm:w-20 sm:rounded-2xl print:h-16 print:w-16">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={school?.name ?? "School"}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span
                className={`text-3xl font-black ${theme.title}`}
                style={customInline(theme, "title")}
                aria-hidden="true"
              >
                {(school?.name ?? "S").charAt(0)}
              </span>
            )}
          </div> : null}

          <div className="min-w-0 flex-1 text-center">
            <p
              className={`text-[11px] font-bold uppercase tracking-[0.25em] ${theme.eyebrow}`}
              style={customInline(theme, "eyebrow")}
            >
              Official Examination Schedule
            </p>
            <h1
              className={`mt-1 text-lg font-black tracking-tight sm:text-2xl md:text-3xl print:text-2xl ${theme.title}`}
              style={customInline(theme, "title")}
            >
              {school?.name ?? "School Name"}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {[school?.address, school?.phone].filter(Boolean).join(" · ") ||
                "Excellence in education"}
            </p>
          </div>

          <div
            className={`hidden min-w-24 rounded-xl border px-3 py-2 text-center sm:block ${theme.badge}`}
            style={customInline(theme, "badge")}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider">
              Session
            </p>
            <p className="mt-1 text-xs font-bold">
              {data.exam.academicYear ?? "—"}
            </p>
          </div>
        </header>

        <section className="py-6 text-center print:py-4">
          <p
            className={`text-xs font-bold uppercase tracking-[0.22em] ${theme.eyebrow}`}
            style={customInline(theme, "eyebrow")}
          >
            Date Sheet
          </p>
          <h2
            className={`mt-1 text-2xl font-black ${theme.title}`}
            style={customInline(theme, "title")}
          >
            {data.exam.name}
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span
              className={`rounded-full border px-3 py-1.5 ${theme.badge}`}
              style={customInline(theme, "badge")}
            >
              {formatExamDate(data.exam.startDate)}
              {data.exam.endDate
                ? ` — ${formatExamDate(data.exam.endDate)}`
                : ""}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 ${theme.badge}`}
              style={customInline(theme, "badge")}
            >
              {classes.length === 1 ? classes[0] : `${classes.length} classes`}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 ${theme.badge}`}
              style={customInline(theme, "badge")}
            >
              {data.entries.length} paper{data.entries.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>

        {data.entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
            No schedule entries. Add papers in Exam Schedule.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-300 print:overflow-visible">
            <table className="w-full min-w-[640px] text-sm print:min-w-0 print:text-[10px]">
              <thead
                className={theme.tableHead}
                style={customInline(theme, "tableHead")}
              >
                <tr>
                  <th className="w-12 px-3 py-3 text-center">#</th>
                  <th className="px-3 py-3 text-left">Date &amp; Day</th>
                  <th className="px-3 py-3 text-left">Subject</th>
                  <th className="px-3 py-3 text-left">Class</th>
                  <th className="px-3 py-3 text-left">Time</th>
                  <th className="px-3 py-3 text-left">Room</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className="border-t border-slate-200 odd:bg-white even:bg-slate-50/60"
                  >
                    <td className="px-3 py-3 text-center font-bold text-slate-400 print:py-2">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-3 print:py-2">
                      <p className="font-bold text-slate-900">
                        {formatExamDate(entry.examDate)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {dayName(entry.examDate)}
                      </p>
                    </td>
                    <td className="px-3 py-3 print:py-2">
                      <p className="font-bold text-slate-900">
                        {entry.subject.name}
                      </p>
                      {entry.subject.code ? (
                        <p className="text-[11px] text-slate-500">
                          {entry.subject.code}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 print:py-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${theme.rowAccent}`}
                        style={customInline(theme, "rowAccent")}
                      >
                        {entry.class.className}
                        {entry.section
                          ? `-${entry.section.sectionName}`
                          : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-700 print:py-2">
                      {formatTime(entry.startTime)}
                      {entry.endTime
                        ? ` – ${formatTime(entry.endTime)}`
                        : ""}
                    </td>
                    <td className="px-3 py-3 text-slate-600 print:py-2">
                      {entry.room || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 gap-4 text-xs text-slate-600 sm:grid-cols-[1fr_auto] print:mt-4">
          <div
            className={`rounded-xl border p-4 ${theme.badge}`}
            style={customInline(theme, "badge")}
          >
            <p className="font-bold uppercase tracking-wider">Instructions</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              <li>• Report at least 20 minutes before the paper.</li>
              <li>• Bring your school ID / roll number slip.</li>
              <li>• Mobile phones are not permitted.</li>
              <li>• Follow the invigilator&apos;s instructions.</li>
            </ul>
          </div>
          <div className="flex min-w-48 items-end justify-center px-4 pb-1">
            <div
              className={`w-full border-t pt-2 text-center font-semibold ${theme.footer}`}
              style={customInline(theme, "footer")}
            >
              Controller Examinations
            </div>
          </div>
        </section>

        <footer className="mt-5 text-center text-[10px] text-slate-400 print:mt-3">
          This is a computer-generated examination schedule.
        </footer>
      </div>
    </article>
  );
}
