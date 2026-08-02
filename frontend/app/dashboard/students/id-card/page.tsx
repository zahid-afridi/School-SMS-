"use client";

import PageLoader from "@/app/components/PageLoader";
import StudentIdCard from "@/app/components/StudentIdCard";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  FaArrowRight,
  FaIdCard,
  FaSearch,
  FaUserGraduate,
} from "react-icons/fa";
import {
  useGetAllStudentsQuery,
  useGetStudentByIdQuery,
} from "@/redux/features/students/studentApi";
import type { Student } from "@/redux/features/students/studentTypes";
import { resolveUploadUrl } from "@/lib/apiBase";

function resolvePhoto(photo?: string | null): string | null {
  return resolveUploadUrl(photo);
}

function classLabel(student: Student) {
  const e = student.enrollments?.[0];
  if (!e?.class?.className) return "—";
  return e.section?.sectionName
    ? `${e.class.className}-${e.section.sectionName}`
    : e.class.className;
}

export default function StudentIdCardPage() {
  const [query, setQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const runSearch = () => {
    const q = query.trim();
    if (!q) {
      toast.error("Enter a student name or registration number");
      return;
    }
    setSelectedId(null);
    setAppliedSearch(q);
  };

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
          <span className="font-semibold text-indigo-700">ID Card</span>
        </p>
      </div>

      {!selectedId ? (
        <>
          <div className="mx-auto mb-6 max-w-2xl print:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center shadow-sm sm:px-10 sm:py-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-black-500">
                <FaIdCard size={20} />
              </div>
              <h1 className="text-xl font-bold text-black-800 sm:text-2xl">
                Generate Student ID Card
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Search for a student by name or registration number to print
                their professional ID card.
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
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-gray-500 disabled:opacity-60"
                >
                  <FaArrowRight size={12} />
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>
            </div>
          </div>

          {appliedSearch ? (
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
                            onClick={() => setSelectedId(s.id)}
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
        </>
      ) : loadingStudent || !selectedStudent ? (
        <PageLoader compact label="Loading student" />
      ) : studentError ? (
        <p className="text-center text-rose-500">Failed to load student.</p>
      ) : (
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-1 text-center text-xl font-bold text-slate-900 print:hidden sm:text-2xl">
            Student ID Card
          </h1>
          <p className="mb-5 text-center text-sm text-slate-500 print:hidden">
            {selectedStudent.name} · {selectedStudent.registrationNo}
          </p>
          <StudentIdCard
            student={selectedStudent}
            onBack={() => setSelectedId(null)}
            backLabel="Search another student"
          />
        </div>
      )}
    </div>
  );
}
