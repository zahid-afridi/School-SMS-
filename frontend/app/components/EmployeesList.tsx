"use client";

import PageLoader from "@/app/components/PageLoader";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FaBriefcase, FaPhone, FaPlus, FaSearch } from "react-icons/fa";
import { useGetAllTeachersQuery } from "@/redux/features/teachers/teacherApi";
import TeacherModal from "@/app/components/TeacherModal";
import {
  CREATABLE_DESIGNATIONS,
  DESIGNATION_LABELS,
  type EmployeeDesignation,
  type Teacher,
} from "@/redux/features/teachers/teacherTypes";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http")
    ? photo
    : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
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
  const { data: employees, isLoading, isError } = useGetAllTeachersQuery(
    lockedDesignation ? { designation: lockedDesignation } : undefined
  );
  const [selected, setSelected] = useState<Teacher | null>(null);
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

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {title} ({filtered.length})
          </h1>
          <p className="text-gray-500 mt-1">{subtitle}</p>
        </div>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          <FaPlus size={13} /> Add Employee
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, phone, role..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-300 bg-white outline-none focus:border-black"
          />
        </div>
        {showDesignationFilter && !lockedDesignation && (
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="h-11 rounded-xl border border-gray-300 bg-white px-3 outline-none focus:border-black"
          >
            <option value="">All designations</option>
            {CREATABLE_DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {DESIGNATION_LABELS[d]}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">
          {(employees?.length ?? 0) === 0
            ? "No employees yet. Add one to get started."
            : "No employees match your filters."}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((employee) => {
            const photoSrc = resolvePhoto(employee.photoUrl);
            return (
              <div
                key={employee.id}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-center">
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={employee.name || "Employee"}
                      className="w-20 h-20 rounded-full object-cover border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://placehold.co/80x80?text=No+Photo";
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                      {employee.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>

                <div className="text-center mt-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {employee.name}
                  </h2>
                  <p className="text-sm text-blue-500 font-medium mt-1">
                    {designationLabel(employee.designation)}
                  </p>
                  {employee.employeeCode && (
                    <p className="text-xs text-gray-400 mt-1">
                      {employee.employeeCode}
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-gray-400" />
                    <span>{employee.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaBriefcase className="text-gray-400" />
                    <span>
                      {employee.experience != null && employee.experience !== ""
                        ? `${employee.experience} yrs experience`
                        : employee.education || "No education listed"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(employee)}
                  className="w-full mt-6 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-100 transition"
                >
                  View Profile
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <TeacherModal teacher={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
