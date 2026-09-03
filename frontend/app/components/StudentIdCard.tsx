"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaFilePdf,
  FaPhoneAlt,
  FaPrint,
  FaTint,
} from "react-icons/fa";
import type { Student, StudentEnrollmentSummary } from "@/redux/features/students/studentTypes";
import type { School } from "@/redux/features/school/schoolTypes";
import { useGetMySchoolQuery } from "@/redux/features/school/schoolApi";
import { exportDocument } from "@/lib/documentExport";
import { resolveUploadUrl } from "@/lib/apiBase";
import {
  documentFontClass,
  documentRadiusClass,
  parseSchoolDocumentDesign,
  type SchoolDocumentDesign,
} from "@/lib/schoolDocumentDesign";

function resolvePhoto(photo?: string | null): string | null {
  return resolveUploadUrl(photo);
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function genderLabel(g?: string | null) {
  if (!g) return "—";
  if (g === "MALE") return "Male";
  if (g === "FEMALE") return "Female";
  return "Other";
}

function barcodeBars(seed: string) {
  // Deterministic faux barcode from registration / id
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const bars: number[] = [];
  let n = hash || 1;
  for (let i = 0; i < 42; i++) {
    n = (n * 1103515245 + 12345) >>> 0;
    bars.push((n % 3) + 1);
  }
  return bars;
}

type Props = {
  student: Student;
  onBack?: () => void;
  backLabel?: string;
};

export default function StudentIdCard({
  student,
  onBack,
  backLabel = "Back to profile",
}: Props) {
  const { data: school } = useGetMySchoolQuery();
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);

  const enrollment = student.enrollments?.[0];
  const father =
    student.parents?.find((p) => p.parent.type === "FATHER")?.parent ??
    student.parents?.[0]?.parent;
  const photo = resolvePhoto(student.photoUrl);
  const logo = resolvePhoto(school?.logoUrl);
  const design = parseSchoolDocumentDesign(school?.documentDesign);
  const printId = "student-id-card-print-area";

  const bars = useMemo(
    () => barcodeBars(student.registrationNo || student.id),
    [student.registrationNo, student.id]
  );

  useEffect(() => {
    const styleId = "student-id-card-print-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 12mm; }
        body * { visibility: hidden !important; }
        #student-id-card-print-area,
        #student-id-card-print-area * {
          visibility: visible !important;
        }
        #student-id-card-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .student-id-card-face {
          break-inside: avoid;
          page-break-inside: avoid;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const runExport = async (format: "print" | "pdf") => {
    setBusy(format);
    try {
      await exportDocument(format, {
        elementId: printId,
        filename: `student-id-${student.registrationNo || student.name}`,
      });
      if (format === "pdf") toast.success("ID card PDF downloaded");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to export ID card"
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`w-full min-w-0 ${documentFontClass(design.font)}`}>
      <div
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden"
        data-export-ignore
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <FaArrowLeft size={12} /> {backLabel}
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => runExport("print")}
            disabled={busy !== null}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
          >
            <FaPrint />
            {busy === "print" ? "Printing…" : "Print"}
          </button>
          <button
            type="button"
            onClick={() => runExport("pdf")}
            disabled={busy !== null}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:flex-none"
          >
            <FaFilePdf />
            {busy === "pdf" ? "Saving…" : "Download PDF"}
          </button>
        </div>
      </div>

      <div
        id={printId}
        className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-6 sm:max-w-none sm:flex-row sm:items-start sm:justify-center sm:gap-8 print:max-w-none print:flex-row print:gap-8"
      >
        <IdCardFront
          school={school}
          student={student}
          enrollment={enrollment}
          fatherName={father?.name}
          photo={photo}
          logo={logo}
          bars={bars}
          design={design}
        />
        <IdCardBack
          school={school}
          student={student}
          father={father}
          logo={logo}
          design={design}
        />
      </div>

      <p
        className="mt-4 text-center text-xs text-slate-400 print:hidden"
        data-export-ignore
      >
        Standard CR80 student identity card · Front &amp; back
      </p>
    </div>
  );
}

function IdCardFront({
  school,
  student,
  enrollment,
  fatherName,
  photo,
  logo,
  bars,
  design,
}: {
  school?: School;
  student: Student;
  enrollment?: StudentEnrollmentSummary;
  fatherName?: string;
  photo: string | null;
  logo: string | null;
  bars: number[];
  design: SchoolDocumentDesign;
}) {
  const classLabel = [
    enrollment?.class?.className,
    enrollment?.section?.sectionName
      ? `Sec ${enrollment.section.sectionName}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`student-id-card-face relative aspect-[85.6/54] w-full max-w-[380px] overflow-hidden border shadow-[0_18px_40px_-18px_rgba(11,31,51,0.55)] print:max-w-[85.6mm] print:rounded-xl print:shadow-none ${documentRadiusClass(design.shape)} ${
        design.idCardLayout === "clean" ? "bg-white" : ""
      }`}
      style={{
        background:
          design.idCardLayout === "clean" ? "#ffffff" : design.primary,
        color:
          design.idCardLayout === "clean" ? design.text : design.headerText,
        borderColor: design.accent,
      }}
      aria-label="Student ID card front"
    >
      {/* Atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            design.idCardLayout === "clean"
              ? `linear-gradient(135deg, ${design.surface}, transparent 65%)`
              : `radial-gradient(120% 80% at 100% 0%, ${design.accent}66, transparent 55%), radial-gradient(90% 70% at 0% 100%, ${design.accent}2b, transparent 50%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full border border-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-8 h-40 w-40 rounded-full border border-white/10"
        aria-hidden
      />

      <div className="relative flex h-full flex-col p-[4.5%] print:p-[3.5mm]">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-current/15 pb-2">
          {design.showLogo ? <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95 shadow-sm sm:h-10 sm:w-10">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={school?.name ?? "School"}
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <span className="text-sm font-bold text-[#0b1f33]">
                {(school?.name ?? "S").charAt(0)}
              </span>
            )}
          </div> : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
              Student Identity Card
            </p>
            <h3 className="truncate text-sm font-bold leading-tight sm:text-[15px]">
              {school?.name ?? "School Name"}
            </h3>
          </div>
          <div className="hidden shrink-0 rounded-md bg-amber-400/95 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#0b1f33] sm:block">
            ID
          </div>
        </div>

        {/* Body */}
        <div className="mt-2.5 flex min-h-0 flex-1 gap-3">
          {design.showStudentPhoto ? <div className="relative shrink-0">
            <div className="h-[4.6rem] w-[3.55rem] overflow-hidden rounded-lg border-2 border-white/80 bg-slate-200 shadow-md sm:h-[5.1rem] sm:w-[3.9rem]">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={student.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-300 text-2xl font-bold text-slate-600">
                  {student.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            {student.bloodGroup ? (
              <span className="absolute -bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
                <FaTint size={7} /> {student.bloodGroup}
              </span>
            ) : null}
          </div> : null}

          <div className="min-w-0 flex-1 space-y-1 pt-0.5 text-[10px] leading-snug sm:text-[11px]">
            <p className="truncate text-base font-bold leading-tight tracking-tight sm:text-lg">
              {student.name}
            </p>
            <Field label="Father" value={fatherName ?? "—"} />
            <Field
              label="Class"
              value={classLabel || "—"}
            />
            <Field label="Roll No" value={enrollment?.rollNo ?? "—"} />
            <Field
              label="Reg No"
              value={student.registrationNo}
              emphasize
              accent={design.accent}
            />
            <div className="grid grid-cols-2 gap-x-2 pt-0.5">
              <Field label="Gender" value={genderLabel(student.gender)} />
              <Field label="Session" value={enrollment?.academicYear ?? "—"} />
            </div>
          </div>
        </div>

        {/* Footer barcode */}
        <div className="mt-2 flex items-end justify-between gap-2 border-t border-current/15 pt-1.5">
          {design.showBarcode ? <div className="flex h-5 flex-1 items-end gap-px overflow-hidden opacity-90">
            {bars.map((w, i) => (
              <span
                key={i}
                className="bg-current"
                style={{ width: `${w}px`, height: `${10 + (i % 4) * 2}px` }}
              />
            ))}
          </div> : <div className="flex-1" />}
          <p className="shrink-0 font-mono text-[9px] tracking-wider opacity-80">
            {student.registrationNo}
          </p>
        </div>
      </div>
    </article>
  );
}

function IdCardBack({
  school,
  student,
  father,
  logo,
  design,
}: {
  school?: School;
  student: Student;
  father?: { name: string; mobileNo?: string | null };
  logo: string | null;
  design: SchoolDocumentDesign;
}) {
  return (
    <article
      className={`student-id-card-face relative aspect-[85.6/54] w-full max-w-[380px] overflow-hidden border text-slate-800 shadow-[0_18px_40px_-18px_rgba(11,31,51,0.35)] print:max-w-[85.6mm] print:rounded-xl print:shadow-none ${documentRadiusClass(design.shape)}`}
      style={{ background: design.surface, borderColor: design.accent }}
      aria-label="Student ID card back"
    >
      <div
        className="h-3 w-full"
        style={{
          background:
            `repeating-linear-gradient(90deg, ${design.primary} 0 10px, ${design.accent} 10px 20px, ${design.primary} 20px 30px)`,
        }}
      />

      <div className="relative flex h-[calc(100%-0.75rem)] flex-col p-[4.5%] print:p-[3.5mm]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: design.accent }}
            >
              Card holder instructions
            </p>
            <h3 className="mt-0.5 text-sm font-bold" style={{ color: design.primary }}>
              Official Student Pass
            </h3>
          </div>
          {design.showLogo && logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="h-8 w-8 rounded-md border border-slate-200 bg-white object-contain p-0.5 opacity-80"
            />
          ) : null}
        </div>

        <ul className="mt-2 space-y-1 text-[9px] leading-snug text-slate-600 sm:text-[10px]">
          <li>This card remains school property and must be carried on campus.</li>
          <li>Report loss immediately to the school office.</li>
          <li>Unauthorized use or alteration is prohibited.</li>
        </ul>

        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-2 text-[10px]">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
              Emergency
            </p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {father?.name ?? "Guardian"}
            </p>
            <p className="flex items-center gap-1 text-slate-600">
              <FaPhoneAlt size={8} className="text-cyan-700" />
              {student.emergencyPhone ||
                father?.mobileNo ||
                student.contactPhone ||
                "—"}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
              Validity
            </p>
            <p className="mt-0.5 font-semibold text-slate-800">
              Session {student.enrollments?.[0]?.academicYear ?? "—"}
            </p>
            <p className="text-slate-600">
              DOB {formatDate(student.dateOfBirth)}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-medium text-slate-500">
              {school?.address || "School address"}
            </p>
            <p className="truncate text-[9px] text-slate-500">
              {[school?.phone, school?.email].filter(Boolean).join(" · ") ||
                "Contact office"}
            </p>
          </div>
          <div className="shrink-0 text-center">
            <div className="mb-0.5 h-6 w-16 border-b border-slate-400" />
            <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">
              Principal
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  emphasize,
  accent,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  accent?: string;
}) {
  return (
    <p className="flex min-w-0 gap-1.5">
      <span className="shrink-0 opacity-60">{label}</span>
      <span
        className={`min-w-0 truncate ${
          emphasize ? "font-semibold" : "font-medium"
        }`}
        style={emphasize && accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </p>
  );
}
