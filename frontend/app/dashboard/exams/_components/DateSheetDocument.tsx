import type { DateSheetData } from "@/redux/features/exams/examTypes";
import type { School } from "@/redux/features/school/schoolTypes";
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

const STYLES: Record<
  ExamDocumentTemplate,
  {
    shell: string;
    topBar: string;
    title: string;
    eyebrow: string;
    badge: string;
    tableHead: string;
    rowAccent: string;
    footer: string;
  }
> = {
  classic: {
    shell: "border-slate-300",
    topBar: "bg-slate-900",
    title: "text-slate-900",
    eyebrow: "text-slate-500",
    badge: "border-slate-300 bg-slate-50 text-slate-700",
    tableHead: "bg-slate-900 text-white",
    rowAccent: "bg-slate-100 text-slate-800",
    footer: "border-slate-300",
  },
  modern: {
    shell: "border-sky-200",
    topBar: "bg-gradient-to-r from-black via-slate-900 to-sky-600",
    title: "text-black",
    eyebrow: "text-sky-600",
    badge: "border-sky-200 bg-sky-50 text-sky-800",
    tableHead: "bg-black text-white",
    rowAccent: "bg-sky-50 text-sky-900",
    footer: "border-sky-300",
  },
  royal: {
    shell: "border-emerald-800",
    topBar: "bg-gradient-to-r from-emerald-950 via-emerald-800 to-amber-500",
    title: "text-emerald-950",
    eyebrow: "text-amber-700",
    badge: "border-amber-300 bg-amber-50 text-emerald-900",
    tableHead: "bg-emerald-900 text-amber-50",
    rowAccent: "bg-amber-50 text-emerald-950",
    footer: "border-amber-400",
  },
  minimal: {
    shell: "border-zinc-400",
    topBar: "bg-zinc-800",
    title: "text-zinc-900",
    eyebrow: "text-zinc-500",
    badge: "border-zinc-300 bg-white text-zinc-700",
    tableHead: "border-y-2 border-zinc-800 bg-white text-zinc-900",
    rowAccent: "bg-zinc-100 text-zinc-800",
    footer: "border-zinc-400",
  },
};

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
}: {
  data: DateSheetData;
  school?: School;
  template?: ExamDocumentTemplate;
}) {
  const theme = STYLES[template];
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
      className={`date-sheet-document overflow-hidden rounded-2xl border bg-white shadow-sm print:rounded-none print:shadow-none ${theme.shell}`}
      data-template={template}
    >
      <div className={`h-2 ${theme.topBar}`} />

      <div className="p-6 md:p-8 print:p-[7mm]">
        <header className="flex items-center gap-5 border-b border-slate-200 pb-5 print:pb-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white print:h-16 print:w-16">
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
                aria-hidden="true"
              >
                {(school?.name ?? "S").charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center">
            <p
              className={`text-[11px] font-bold uppercase tracking-[0.25em] ${theme.eyebrow}`}
            >
              Official Examination Schedule
            </p>
            <h1
              className={`mt-1 text-2xl font-black tracking-tight md:text-3xl print:text-2xl ${theme.title}`}
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
          >
            Date Sheet
          </p>
          <h2 className={`mt-1 text-2xl font-black ${theme.title}`}>
            {data.exam.name}
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className={`rounded-full border px-3 py-1.5 ${theme.badge}`}>
              {formatExamDate(data.exam.startDate)}
              {data.exam.endDate
                ? ` — ${formatExamDate(data.exam.endDate)}`
                : ""}
            </span>
            <span className={`rounded-full border px-3 py-1.5 ${theme.badge}`}>
              {classes.length === 1
                ? classes[0]
                : `${classes.length} classes`}
            </span>
            <span className={`rounded-full border px-3 py-1.5 ${theme.badge}`}>
              {data.entries.length} paper{data.entries.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>

        {data.entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
            No schedule entries. Add papers in Exam Schedule.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full text-sm print:text-[10px]">
              <thead className={theme.tableHead}>
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
          <div className={`rounded-xl border p-4 ${theme.badge}`}>
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
