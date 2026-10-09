"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FaSearch,
  FaUserGraduate,
  FaTimes,
  FaPhoneAlt,
  FaUser,
  FaChevronDown,
  FaHistory,
} from "react-icons/fa";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import type { Student } from "@/redux/features/students/studentTypes";
import { resolveUploadUrl } from "@/lib/apiBase";

interface StudentFeePickerProps {
  selectedStudentId?: string;
  onSelectStudent: (student: Student | null) => void;
  showHistoryLink?: boolean;
  className?: string;
}

export default function StudentFeePicker({
  selectedStudentId,
  onSelectStudent,
  showHistoryLink = true,
  className = "",
}: StudentFeePickerProps) {
  const [classFilter, setClassFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: classes = [] } = useGetAllClassesQuery();
  const { data: studentsData, isFetching: loadingStudents } =
    useGetAllStudentsQuery({
      status: "ACTIVE",
      ...(classFilter ? { classId: classFilter } : {}),
      limit: 1000,
    });
  const students = studentsData?.students ?? [];

  // Currently selected student object
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) ?? null;
  }, [selectedStudentId, students]);

  // Filter students based on searchTerm
  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students.slice(0, 50);

    return students.filter((s) => {
      const name = s.name?.toLowerCase() ?? "";
      const regNo = s.registrationNo?.toLowerCase() ?? "";
      const rollNo = s.enrollments?.[0]?.rollNo?.toLowerCase() ?? "";
      const father = s.parents?.[0]?.parent?.name?.toLowerCase() ?? "";
      const phone =
        s.contactPhone?.toLowerCase() ??
        s.parents?.[0]?.parent?.mobileNo?.toLowerCase() ??
        "";
      const className =
        s.enrollments?.[0]?.class?.className?.toLowerCase() ?? "";

      return (
        name.includes(term) ||
        regNo.includes(term) ||
        rollNo.includes(term) ||
        father.includes(term) ||
        phone.includes(term) ||
        className.includes(term)
      );
    });
  }, [students, searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (student: Student) => {
    onSelectStudent(student);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onSelectStudent(null);
    setSearchTerm("");
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* If a student is selected, display rich student profile card */}
      {selectedStudent ? (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-4 shadow-sm transition hover:border-blue-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {/* Photo Avatar */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-blue-100 shadow-sm flex items-center justify-center text-blue-600">
                {selectedStudent.photoUrl ? (
                  <img
                    src={resolveUploadUrl(selectedStudent.photoUrl) ?? ""}
                    alt={selectedStudent.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaUserGraduate size={24} />
                )}
              </div>

              {/* Info */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 leading-tight">
                    {selectedStudent.name}
                  </h3>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                    Reg #{selectedStudent.registrationNo}
                  </span>
                  {selectedStudent.enrollments?.[0]?.rollNo && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Roll #{selectedStudent.enrollments[0].rollNo}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-800">
                    {selectedStudent.enrollments?.[0]?.class?.className ??
                      "No Class"}
                    {selectedStudent.enrollments?.[0]?.section?.sectionName
                      ? ` - ${selectedStudent.enrollments[0].section.sectionName}`
                      : ""}
                  </span>

                  {selectedStudent.parents?.[0]?.parent?.name && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <FaUser size={10} className="text-slate-400" />
                      Father: {selectedStudent.parents[0].parent.name}
                    </span>
                  )}

                  {(selectedStudent.contactPhone ||
                    selectedStudent.parents?.[0]?.parent?.mobileNo) && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <FaPhoneAlt size={10} className="text-slate-400" />
                      {selectedStudent.contactPhone ||
                        selectedStudent.parents?.[0]?.parent?.mobileNo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {showHistoryLink && (
                <Link
                  href={`/dashboard/fees/ledger/${selectedStudent.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition shadow-xs"
                >
                  <FaHistory size={11} /> Fee History
                </Link>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition"
              >
                Change Student
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Search Box & Controls */
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Class filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Filter by Class
              </label>
              <div className="relative">
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setIsOpen(true);
                  }}
                  className="w-full h-11 appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
                <FaChevronDown
                  size={10}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            {/* Search Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Search Student *
              </label>
              <div className="relative">
                <FaSearch
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search by name, roll #, reg #, father name..."
                  value={searchTerm}
                  onFocus={() => setIsOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {loadingStudents ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Loading students...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No students found matching "{searchTerm}".
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    Select a Student ({filteredStudents.length} available)
                  </div>
                  {filteredStudents.map((s) => {
                    const avatarUrl = resolveUploadUrl(s.photoUrl);
                    const classTitle =
                      s.enrollments?.[0]?.class?.className ?? "No class";
                    const sectionTitle =
                      s.enrollments?.[0]?.section?.sectionName;
                    const fatherName = s.parents?.[0]?.parent?.name;
                    const phone =
                      s.contactPhone || s.parents?.[0]?.parent?.mobileNo;

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelect(s)}
                        className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-blue-50/70 focus:bg-blue-50 focus:outline-none group"
                      >
                        {/* Avatar */}
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={s.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FaUserGraduate size={16} />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 truncate group-hover:text-blue-700">
                              {s.name}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                              #{s.registrationNo}
                            </span>
                            {s.enrollments?.[0]?.rollNo && (
                              <span className="text-[11px] text-slate-400">
                                Roll: {s.enrollments[0].rollNo}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 mt-0.5">
                            <span className="font-medium text-blue-600">
                              {classTitle}
                              {sectionTitle ? ` (${sectionTitle})` : ""}
                            </span>
                            {fatherName && (
                              <span>Father: {fatherName}</span>
                            )}
                            {phone && <span>Ph: {phone}</span>}
                          </div>
                        </div>

                        <span className="shrink-0 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition">
                          Select →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
