"use client";

import { useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaRedo, FaSearch, FaUserGraduate } from "react-icons/fa";
import { useGetPromotionsQuery } from "@/redux/features/students/studentApi";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http")
    ? photo
    : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function Page() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [fromClassId, setFromClassId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [page, setPage] = useState(1);

  const { data: classes = [] } = useGetAllClassesQuery();

  const queryParams = useMemo(
    () => ({
      page,
      limit: 20,
      ...(search ? { search } : {}),
      ...(academicYear ? { academicYear } : {}),
      ...(fromClassId ? { fromClassId } : {}),
      ...(toClassId ? { toClassId } : {}),
    }),
    [page, search, academicYear, fromClassId, toClassId]
  );

  const { data, isLoading, isError, isFetching, refetch } =
    useGetPromotionsQuery(queryParams);

  const promotions = data?.promotions ?? [];
  const pagination = data?.pagination;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-medium mb-2">
            <FaUserGraduate /> Manage Promotion
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Manage Student Promotion
          </h1>
          <p className="text-slate-500 mt-1">
            View promotion history across classes and academic years.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <FaRedo className={isFetching ? "animate-spin" : ""} />
          Reload
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              SEARCH
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Student name or reg no..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              ACADEMIC YEAR (TO)
            </label>
            <input
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setPage(1);
              }}
              placeholder="2026-2027"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              FROM CLASS
            </label>
            <select
              value={fromClassId}
              onChange={(e) => {
                setFromClassId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="">All</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              TO CLASS
            </label>
            <select
              value={toClassId}
              onChange={(e) => {
                setToClassId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="">All</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">Loading promotions...</p>
        ) : isError ? (
          <p className="p-8 text-center text-red-500">Failed to load promotions.</p>
        ) : promotions.length === 0 ? (
          <p className="p-8 text-center text-slate-500">
            No promotion records found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">From</th>
                  <th className="px-4 py-3 font-semibold"></th>
                  <th className="px-4 py-3 font-semibold">To</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map((row) => {
                  const photo = resolvePhoto(row.student.photoUrl);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {photo ? (
                            <img
                              src={photo}
                              alt={row.student.name}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                              {row.student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-800">
                              {row.student.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {row.student.registrationNo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">
                          {row.from?.class?.className ?? "—"}
                          {row.from?.section?.sectionName
                            ? ` / ${row.from.section.sectionName}`
                            : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          {row.from?.academicYear ?? "—"}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-slate-400">
                        <FaArrowRight />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-blue-700">
                          {row.to.class?.className ?? "—"}
                          {row.to.section?.sectionName
                            ? ` / ${row.to.section.sectionName}`
                            : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          {row.to.academicYear}
                          {row.to.rollNo ? ` · Roll ${row.to.rollNo}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(row.promotedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">
                        {row.remarks || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <p className="text-slate-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
              records
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.previousPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!pagination.nextPage}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
