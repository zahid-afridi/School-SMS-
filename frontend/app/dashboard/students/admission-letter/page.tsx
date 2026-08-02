"use client";

import PageLoader from "@/app/components/PageLoader";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaFileAlt,
  FaFilePdf,
  FaIdCard,
  FaLock,
  FaPrint,
  FaSearch,
  FaUser,
  FaUserGraduate,
} from "react-icons/fa";
import { HiDesktopComputer } from "react-icons/hi";
import {
  useGetAllStudentsQuery,
  useGetStudentByIdQuery,
} from "@/redux/features/students/studentApi";
import { useGetMySchoolQuery } from "@/redux/features/school/schoolApi";
import type { Student } from "@/redux/features/students/studentTypes";
import { exportDocument } from "@/lib/documentExport";
import { resolveUploadUrl } from "@/lib/apiBase";
import AdmissionLetterDocument from "./_components/AdmissionLetterDocument";

function resolvePhoto(photo?: string | null): string | null {
  return resolveUploadUrl(photo);
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function classLabel(student: Student) {
  const e = student.enrollments?.[0];
  if (!e?.class?.className) return "—";
  return e.section?.sectionName
    ? `${e.class.className}-${e.section.sectionName}`
    : e.class.className;
}

const PRINT_AREA_ID = "admission-letter-print-area";

export default function AdmissionLetterPage() {
  const [query, setQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLetter, setShowLetter] = useState(false);
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);

  const { data: school } = useGetMySchoolQuery();

  const {
    data: listData,
    isFetching: searching,
    isError: searchError,
  } = useGetAllStudentsQuery(
    { search: appliedSearch, limit: 20, page: 1 },
    { skip: !appliedSearch }
  );

  const {
    data: selectedStudent,
    isFetching: loadingStudent,
    isError: studentError,
  } = useGetStudentByIdQuery(selectedId!, { skip: !selectedId });

  const results = listData?.students ?? [];

  useEffect(() => {
    const styleId = "admission-letter-print-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        body * { visibility: hidden !important; }
        #${PRINT_AREA_ID}, #${PRINT_AREA_ID} * {
          visibility: visible !important;
        }
        #${PRINT_AREA_ID} {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .admission-letter-document {
          break-inside: avoid;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const runSearch = () => {
    const q = query.trim();
    if (!q) {
      toast.error("Enter a student name or registration number");
      return;
    }
    setSelectedId(null);
    setShowLetter(false);
    setAppliedSearch(q);
  };

  const pickStudent = (student: Student) => {
    setSelectedId(student.id);
    setShowLetter(false);
  };

  const waitForPrintArea = async (tries = 20) => {
    for (let i = 0; i < tries; i += 1) {
      if (document.getElementById(PRINT_AREA_ID)) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error("Admission letter preview not ready. Open Preview first.");
  };

  const runExport = async (format: "print" | "pdf") => {
    if (!selectedStudent) {
      toast.error("Select a student first");
      return;
    }
    setShowLetter(true);
    setBusy(format);
    try {
      await waitForPrintArea();
      await exportDocument(format, {
        elementId: PRINT_AREA_ID,
        filename: `admission-letter-${selectedStudent.registrationNo}`,
      });
      if (format === "pdf") toast.success("PDF downloaded");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to export letter"
      );
    } finally {
      setBusy(null);
    }
  };

  const photo = resolvePhoto(selectedStudent?.photoUrl);
  const statusLabel = useMemo(() => {
    if (!selectedStudent) return "";
    const s = selectedStudent.status;
    return s.charAt(0) + s.slice(1).toLowerCase();
  }, [selectedStudent]);

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex min-w-0 items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:mb-6 sm:items-center sm:px-4 print:hidden">
        <FaUserGraduate className="mt-0.5 shrink-0 text-indigo-600" size={16} />
        <p className="min-w-0 break-words text-sm">
          <Link
            href="/dashboard/students"
            className="font-medium text-slate-700 hover:text-indigo-600"
          >
            Students
          </Link>
          <span className="mx-1.5 text-slate-300">›</span>
          <span className="font-semibold text-indigo-700">Admission Letter</span>
        </p>
      </div>

      {/* Search panel */}
      <div className="mx-auto mb-6 max-w-2xl print:hidden">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center shadow-sm sm:px-10 sm:py-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <FaFileAlt size={20} />
          </div>
          <h1 className="text-xl font-bold text-indigo-800 sm:text-2xl">
            Generate Admission Letter
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Search for a student by name or registration number to generate
            their admission letter.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="Search student by name or registration..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <button
              type="button"
              onClick={runSearch}
              disabled={searching}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <FaArrowRight size={12} />
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
      </div>

      {/* Search results */}
      {appliedSearch && !selectedId ? (
        <div className="mx-auto mb-6 max-w-2xl print:hidden">
          {searching ? (
            <PageLoader compact label="Searching students" />
          ) : searchError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-600">
              Failed to search students. Try again.
            </p>
          ) : results.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              No students found for &ldquo;{appliedSearch}&rdquo;
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Select a student ({results.length})
              </p>
              <ul className="divide-y divide-slate-100">
                {results.map((s) => {
                  const p = resolvePhoto(s.photoUrl);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => pickStudent(s)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-indigo-50/60"
                      >
                        {p ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p}
                            alt=""
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">
                            {s.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {s.registrationNo}
                            {s.enrollments?.[0]?.class?.className
                              ? ` · ${classLabel(s)}`
                              : ""}
                          </p>
                        </div>
                        <FaArrowRight className="shrink-0 text-slate-300" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {/* Selected student summary + actions */}
      {selectedId ? (
        <div className="mb-6 print:hidden">
          {loadingStudent || !selectedStudent ? (
            <PageLoader compact label="Loading student" />
          ) : studentError ? (
            <p className="text-center text-rose-500">
              Failed to load student details.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 min-[480px]:flex-row min-[480px]:items-start">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={selectedStudent.name}
                      className="mx-auto h-20 w-20 rounded-full border-2 border-indigo-200 object-cover min-[480px]:mx-0"
                    />
                  ) : (
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700 min-[480px]:mx-0">
                      {selectedStudent.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-center min-[480px]:text-left">
                    <h2 className="break-words text-xl font-bold text-indigo-900 sm:text-2xl">
                      {selectedStudent.name}
                    </h2>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 min-[420px]:grid-cols-2">
                      <Meta
                        icon={<FaIdCard className="text-indigo-500" />}
                        label="Reg"
                        value={selectedStudent.registrationNo}
                      />
                      <Meta
                        icon={<HiDesktopComputer className="text-indigo-500" />}
                        label="Class"
                        value={classLabel(selectedStudent)}
                      />
                      <Meta
                        icon={<FaCalendarAlt className="text-indigo-500" />}
                        label="DOA"
                        value={formatDate(selectedStudent.admissionDate)}
                      />
                      <Meta
                        icon={
                          <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        }
                        label="Status"
                        value={statusLabel}
                      />
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                        <FaUser className="text-slate-400" />
                        Username:{" "}
                        <strong className="font-mono">
                          {selectedStudent.user?.username ?? "—"}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                        <FaLock className="text-slate-400" />
                        Password: issued at admission
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setShowLetter(false);
                  }}
                  className="mt-4 text-xs font-medium text-indigo-600 hover:underline"
                >
                  ← Search another student
                </button>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-w-[240px]">
                <button
                  type="button"
                  onClick={() => void runExport("print")}
                  disabled={busy !== null}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  <FaPrint />
                  {busy === "print" ? "Printing…" : "Print Admission Letter"}
                </button>
                <button
                  type="button"
                  onClick={() => void runExport("pdf")}
                  disabled={busy !== null}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <FaFilePdf className="text-rose-500" />
                  {busy === "pdf" ? "Saving…" : "Get PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLetter((v) => !v)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <FaFileAlt />
                  {showLetter ? "Hide preview" : "Preview letter"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Printable letter */}
      {showLetter && selectedStudent ? (
        <div id={PRINT_AREA_ID} className="mb-8">
          <AdmissionLetterDocument
            student={selectedStudent}
            school={school}
          />
        </div>
      ) : null}
    </div>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="min-w-0 break-words">
        <span className="text-slate-400">{label}: </span>
        <span className="font-medium text-slate-800">{value}</span>
      </p>
    </div>
  );
}
