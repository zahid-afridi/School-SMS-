"use client";

import { useMemo, useState } from "react";
import { FaLock, FaSearch, FaTimes, FaUserGraduate, FaUserTie, FaUsers } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery, useSearchParentsQuery } from "@/redux/features/students/studentApi";
import { useGetAllTeachersQuery } from "@/redux/features/teachers/teacherApi";
import type { MessageRecipient, MessageRecipientRole } from "@/redux/features/messages/messageTypes";

type Props = {
  value: MessageRecipient | null;
  onChange: (recipient: MessageRecipient | null) => void;
  /** Allow free phone entry when no profile recipient is selected */
  allowOther?: boolean;
  multi?: boolean;
  selectedIds?: string[];
  onToggleMulti?: (recipient: MessageRecipient) => void;
};

function resolveStudentPhone(student: {
  contactPhone?: string | null;
  emergencyPhone?: string | null;
  parents?: Array<{
    parent?: { whatsappNo?: string | null; mobileNo?: string | null; name?: string | null };
  }>;
}) {
  const parent = student.parents?.[0]?.parent;
  return {
    phone:
      parent?.whatsappNo?.trim() ||
      parent?.mobileNo?.trim() ||
      student.contactPhone?.trim() ||
      student.emergencyPhone?.trim() ||
      "",
    parentName: parent?.name?.trim() || null,
  };
}

const ROLE_TABS: Array<{ id: MessageRecipientRole; label: string; icon: React.ReactNode }> = [
  { id: "student", label: "Student", icon: <FaUserGraduate size={12} /> },
  { id: "parent", label: "Parent", icon: <FaUsers size={12} /> },
  { id: "teacher", label: "Teacher", icon: <FaUserTie size={12} /> },
  { id: "other", label: "Other", icon: <FaSearch size={12} /> },
];

export default function RecipientPicker({
  value,
  onChange,
  allowOther = true,
  multi = false,
  selectedIds = [],
  onToggleMulti,
}: Props) {
  const [role, setRole] = useState<MessageRecipientRole>("student");
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [otherPhone, setOtherPhone] = useState("");

  const { data: classes = [] } = useGetAllClassesQuery();
  const { data: studentsData, isFetching: loadingStudents } = useGetAllStudentsQuery(
    {
      status: "ACTIVE",
      classId: classId || undefined,
      search: search || undefined,
      limit: 40,
    },
    { skip: role !== "student" && role !== "parent" }
  );
  const { data: parents = [], isFetching: loadingParents } = useSearchParentsQuery(
    { search: search.trim() || undefined, limit: 40 },
    { skip: role !== "parent" || !search.trim() }
  );
  const { data: teachers = [], isFetching: loadingTeachers } = useGetAllTeachersQuery(
    { designation: "TEACHER", search: search || undefined },
    { skip: role !== "teacher" }
  );

  const students = studentsData?.students ?? [];

  const studentOptions = useMemo(() => {
    return students.map((s) => {
      const resolved = resolveStudentPhone(s);
      return {
        role: "student" as const,
        id: s.id,
        label: s.name,
        subtitle: [s.registrationNo, s.enrollments?.[0]?.class?.className]
          .filter(Boolean)
          .join(" · "),
        phone: resolved.phone,
        studentId: s.id,
        studentName: s.name,
        parentName: resolved.parentName ?? undefined,
      } satisfies MessageRecipient;
    });
  }, [students]);

  const parentOptions = useMemo(() => {
    // Prefer parent search when typing; otherwise show from student list as parent destinations
    if (search.trim() && parents.length > 0) {
      return parents.map((p) => {
        const linked = p.students?.[0]?.student;
        return {
          role: "parent" as const,
          id: p.id,
          label: p.name,
          subtitle: linked
            ? `Parent of ${linked.name}`
            : p.mobileNo || p.whatsappNo || undefined,
          phone: p.whatsappNo?.trim() || p.mobileNo?.trim() || "",
          studentId: linked?.id,
          studentName: linked?.name,
          parentName: p.name,
        } satisfies MessageRecipient;
      });
    }
    return studentOptions
      .filter((s) => s.phone)
      .map((s) => ({
        ...s,
        role: "parent" as const,
        id: `parent-of-${s.id}`,
        label: s.parentName || `Parent of ${s.label}`,
        subtitle: `Student: ${s.label}`,
      }));
  }, [parents, search, studentOptions]);

  const teacherOptions = useMemo(() => {
    return teachers.map((t) => ({
      role: "teacher" as const,
      id: t.id,
      label: t.name,
      subtitle: [t.designation, t.employeeCode].filter(Boolean).join(" · "),
      phone: t.phone?.trim() || "",
      employeeId: t.id,
      employeeName: t.name,
    })) satisfies MessageRecipient[];
  }, [teachers]);

  const options =
    role === "student"
      ? studentOptions
      : role === "parent"
        ? parentOptions
        : role === "teacher"
          ? teacherOptions
          : [];

  const loading =
    (role === "student" && loadingStudents) ||
    (role === "parent" && (loadingParents || loadingStudents)) ||
    (role === "teacher" && loadingTeachers);

  const selectOne = (r: MessageRecipient) => {
    if (!r.phone) return;
    if (multi && onToggleMulti) {
      onToggleMulti(r);
      return;
    }
    onChange(r);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.filter((t) => allowOther || t.id !== "other").map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setRole(tab.id);
              setSearch("");
              if (tab.id === "other") onChange(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              role === tab.id
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {value && role !== "other" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{value.label}</p>
            {value.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{value.subtitle}</p>
            )}
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-mono text-slate-700">
              <FaLock size={11} className="text-slate-400" />
              {value.phone}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Phone locked from profile</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-slate-400 hover:text-rose-600"
            title="Clear"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {role === "other" ? (
        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-500 mb-1.5">
            Phone number
          </label>
          <input
            value={otherPhone}
            onChange={(e) => {
              const phone = e.target.value;
              setOtherPhone(phone);
              const cleaned = phone.trim();
              onChange(
                cleaned
                  ? {
                      role: "other",
                      id: "other",
                      label: "Manual number",
                      phone: cleaned,
                    }
                  : null
              );
            }}
            placeholder="e.g. 03001234567"
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(role === "student" || role === "parent") && (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white outline-none focus:border-sky-500"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            )}
            <div className="relative sm:col-span-1">
              <FaSearch
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  role === "teacher"
                    ? "Search teacher name…"
                    : role === "parent"
                      ? "Search parent name / phone…"
                      : "Search name / reg no…"
                }
                className="w-full h-11 rounded-xl border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
            {loading ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">Searching…</p>
            ) : options.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">No recipients found</p>
            ) : (
              options.map((opt) => {
                const selected =
                  multi
                    ? selectedIds.includes(opt.studentId || opt.employeeId || opt.id)
                    : value?.id === opt.id;
                const disabled = !opt.phone;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectOne(opt)}
                    className={`w-full text-left px-4 py-3 transition ${
                      selected ? "bg-sky-50" : "hover:bg-slate-50"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {opt.label}
                        </p>
                        {opt.subtitle && (
                          <p className="text-xs text-slate-500 truncate">{opt.subtitle}</p>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-500 shrink-0">
                        {opt.phone || "No phone"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
