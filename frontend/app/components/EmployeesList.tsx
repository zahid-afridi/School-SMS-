"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaRedo,
  FaUserTie,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useDeleteTeacherMutation,
  useGetAllTeachersQuery,
} from "@/redux/features/teachers/teacherApi";
import TeacherModal from "@/app/components/TeacherModal";
import {
  CREATABLE_DESIGNATIONS,
  DESIGNATION_LABELS,
  type EmployeeDesignation,
  type Teacher,
} from "@/redux/features/teachers/teacherTypes";

import { resolveUploadUrl } from "@/lib/apiBase";

function resolvePhoto(photo?: string | null): string | null {
  return resolveUploadUrl(photo);
}

function designationLabel(value?: string) {
  if (!value) return "—";
  return DESIGNATION_LABELS[value as EmployeeDesignation] ?? value;
}

type EmployeesListProps = {
  title: string;
  subtitle: string;
  /** If set, only this designation is loaded from API */
  lockedDesignation?: EmployeeDesignation;
  showDesignationFilter?: boolean;
  /** Hide school principal from All Employees (they manage the app) */
  hidePrincipal?: boolean;
};

export default function EmployeesList({
  title,
  subtitle,
  lockedDesignation,
  showDesignationFilter = true,
  hidePrincipal = true,
}: EmployeesListProps) {
  const {
    data: employees,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetAllTeachersQuery(
    lockedDesignation ? { designation: lockedDesignation } : undefined
  );
  const [deleteTeacher] = useDeleteTeacherMutation();
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");

  const filtered = useMemo(() => {
    let list = employees ?? [];
    if (hidePrincipal && !lockedDesignation) {
      list = list.filter((e) => e.designation !== "PRINCIPAL");
    }
    if (designationFilter) {
      list = list.filter((e) => e.designation === designationFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeCode ?? "").toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q) ||
        (e.education ?? "").toLowerCase().includes(q) ||
        designationLabel(e.designation).toLowerCase().includes(q)
    );
  }, [
    employees,
    search,
    designationFilter,
    hidePrincipal,
    lockedDesignation,
  ]);

  const openView = (employee: Teacher) => {
    setEditMode(false);
    setSelected(employee);
  };

  const openEdit = (employee: Teacher) => {
    setEditMode(true);
    setSelected(employee);
  };

  const handleDelete = async (employee: Teacher) => {
    if (!confirm(`Delete ${employee.name}? This cannot be undone.`)) return;
    try {
      await deleteTeacher(employee.id).unwrap();
      toast.success("Employee deleted successfully");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete employee"
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDesignationFilter("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading employees" />
      </div>
    );
  }

  if (isError || !employees) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-lg text-red-500">Failed to load employees.</p>
      </div>
    );
  }

  const addLabel = lockedDesignation
    ? `Add New ${DESIGNATION_LABELS[lockedDesignation]}`
    : "Add New Employee";

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <FaUserTie className="text-blue-600" />
            <span>Employees</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">{title}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {title} ({filtered.length})
          </h1>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
        >
          <FaRedo className={isFetching ? "animate-spin" : ""} />
          Reload
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:mb-6 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
          <div className="xl:col-span-2">
            <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
              SEARCH EMPLOYEE
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type name, code, phone, or role..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          {showDesignationFilter && !lockedDesignation ? (
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                FILTER BY DESIGNATION
              </label>
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="">All designations</option>
                {CREATABLE_DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>
                    {DESIGNATION_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
            href="/dashboard/employees"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:w-auto"
          >
            <FaPlus /> Add Employee
          </Link>
        </div>
      </div>

      {/* Cards grid — same layout as students */}
      {filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-10">
          {(employees?.length ?? 0) === 0
            ? "No employees yet. Add one to get started."
            : "No employees match your filters."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((employee) => {
            const photoSrc = resolvePhoto(employee.photoUrl);
            return (
              <div
                key={employee.id}
                className="bg-white rounded-2xl border border-slate-200 px-3 pt-4 pb-3 shadow-sm hover:shadow-md transition flex flex-col items-center"
              >
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc}
                    alt={employee.name || "Employee"}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://placehold.co/56x56?text=No+Photo";
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold">
                    {employee.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}

                <h2 className="mt-2 text-sm font-semibold text-slate-800 text-center line-clamp-1 w-full">
                  {employee.name}
                </h2>
                <p className="text-[11px] text-blue-600 font-medium text-center line-clamp-1 w-full">
                  {designationLabel(employee.designation)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 text-center line-clamp-1 w-full">
                  {employee.employeeCode || employee.phone || "—"}
                </p>

                <div className="mt-3 flex items-center justify-center gap-2 w-full">
                  <IconBtn
                    title="View"
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                    onClick={() => openView(employee)}
                  >
                    <FaEye />
                  </IconBtn>
                  <IconBtn
                    title="Edit"
                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    onClick={() => openEdit(employee)}
                  >
                    <FaEdit />
                  </IconBtn>
                  <IconBtn
                    title="Delete"
                    className="bg-red-50 text-red-600 hover:bg-red-100"
                    onClick={() => handleDelete(employee)}
                  >
                    <FaTrash />
                  </IconBtn>
                </div>
              </div>
            );
          })}

          {/* Add new card */}
          <Link
            href="/dashboard/employees"
            className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 px-3 py-6 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50/40 transition min-h-[170px]"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-sm">
              <FaPlus />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">{addLabel}</p>
          </Link>
        </div>
      )}

      {selected && (
        <TeacherModal
          teacher={selected}
          initialEditing={editMode}
          onClose={() => {
            setSelected(null);
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
