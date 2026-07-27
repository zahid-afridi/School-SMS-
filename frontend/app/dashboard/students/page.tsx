"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaRedo,
  FaSearch,
  FaUserGraduate,
} from "react-icons/fa";
import {
  useDeleteStudentMutation,
  useGetAllStudentsQuery,
} from "@/redux/features/students/studentApi";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import type { Student } from "@/redux/features/students/studentTypes";
import StudentModal from "@/app/components/StudentModal";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http")
    ? photo
    : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-slate-500 p-6">Loading students…</p>}>
      <StudentsPageInner />
    </Suspense>
  );
}

function StudentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search")?.trim() ?? "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editMode, setEditMode] = useState(false);

  const { data: classes = [] } = useGetAllClassesQuery();
  const [deleteStudent] = useDeleteStudentMutation();

  const queryParams = useMemo(
    () => ({
      limit: 100,
      ...(search ? { search } : {}),
      ...(classId ? { classId } : {}),
      ...(sectionId ? { sectionId } : {}),
      ...(status ? { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" } : {}),
    }),
    [search, classId, sectionId, status]
  );

  const { data, isLoading, isError, isFetching, refetch } =
    useGetAllStudentsQuery(queryParams);

  const students = data?.students ?? [];

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId]
  );

  useEffect(() => {
    const q = searchParams.get("search")?.trim() ?? "";
    setSearchInput(q);
    setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openEdit = (student: Student) => {
    setEditMode(true);
    setSelectedStudent(student);
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    try {
      await deleteStudent(student.id).unwrap();
      toast.success("Student deleted successfully");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete student"
      );
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setClassId("");
    setSectionId("");
    setStatus("");
  };

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <FaUserGraduate className="text-blue-600" />
            <span>Students</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">All Students</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            All Students ({data?.pagination.total ?? students.length})
          </h1>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <FaRedo className={isFetching ? "animate-spin" : ""} />
          Reload
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <div className="xl:col-span-2">
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              SEARCH STUDENT
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type student name or reg number..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              FILTER BY CLASS
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="">-- Select a class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              FILTER BY SECTION
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!selectedClass}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">-- All sections --</option>
              {selectedClass?.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sectionName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Clear filters
          </button>
          <Link
            href="/dashboard/students/Add-students"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
          >
            <FaPlus /> Add Student
          </Link>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-slate-500 text-center py-16">Loading students...</p>
      ) : isError ? (
        <p className="text-red-500 text-center py-16">Failed to load students.</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {students.map((student) => {
            const photoSrc = resolvePhoto(student.photoUrl);
            const enrollment = student.enrollments?.[0];
            const classLabel = enrollment?.class?.className ?? "Unassigned";
            const sectionLabel = enrollment?.section?.sectionName
              ? ` / ${enrollment.section.sectionName}`
              : "";

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200 px-3 pt-4 pb-3 shadow-sm hover:shadow-md transition flex flex-col items-center"
              >
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={student.name}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://placehold.co/56x56?text=No+Photo";
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold">
                    {student.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}

                <h2 className="mt-2 text-sm font-semibold text-slate-800 text-center line-clamp-1 w-full">
                  {student.name}
                </h2>
                <p className="text-[11px] text-blue-600 font-medium text-center line-clamp-1 w-full">
                  {classLabel}
                  {sectionLabel}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 text-center line-clamp-1 w-full">
                  {student.registrationNo}
                </p>

                <div className="mt-3 flex items-center justify-center gap-2 w-full">
                  <IconBtn
                    title="View"
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                    onClick={() => router.push(`/dashboard/students/${student.id}`)}
                  >
                    <FaEye />
                  </IconBtn>
                  <IconBtn
                    title="Edit"
                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    onClick={() => openEdit(student)}
                  >
                    <FaEdit />
                  </IconBtn>
                  <IconBtn
                    title="Delete"
                    className="bg-red-50 text-red-600 hover:bg-red-100"
                    onClick={() => handleDelete(student)}
                  >
                    <FaTrash />
                  </IconBtn>
                </div>
              </div>
            );
          })}

          {/* Add new card */}
          <Link
            href="/dashboard/students/Add-students"
            className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 px-3 py-6 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50/40 transition min-h-[170px]"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-sm">
              <FaPlus />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">
              Add New Student
            </p>
          </Link>
        </div>
      )}

      {!isLoading && !isError && students.length === 0 && (
        <p className="text-center text-slate-500 mt-6">
          No students match your filters.
        </p>
      )}

      {selectedStudent && (
        <StudentModal
          student={selectedStudent}
          initialEditing={editMode}
          onClose={() => {
            setSelectedStudent(null);
            setEditMode(false);
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className: string;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition ${className}`}
    >
      {children}
    </button>
  );
}
