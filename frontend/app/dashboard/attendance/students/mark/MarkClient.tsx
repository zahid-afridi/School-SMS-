"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaSync,
  FaUser,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useGetStudentAttendanceSheetQuery,
  useSaveStudentAttendanceSheetMutation,
} from "@/redux/features/attendance/attendanceApi";
import type { AttendanceStatus } from "@/redux/features/attendance/attendanceTypes";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http")
    ? photo
    : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
}

function formatDisplayDate(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MarkStudentAttendancePage() {
  const router = useRouter();
  const search = useSearchParams();
  const date = search.get("date") ?? "";
  const classId = search.get("classId") ?? "";
  const sectionId = search.get("sectionId") ?? undefined;

  const skip = !date || !classId;
  const { data, isLoading, isError, isFetching } =
    useGetStudentAttendanceSheetQuery(
      { date, classId, sectionId },
      { skip }
    );
  const [saveSheet, { isLoading: isSaving }] =
    useSaveStudentAttendanceSheetMutation();

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    if (!data?.students) return;
    const next: Record<string, AttendanceStatus> = {};
    data.students.forEach((s) => {
      next[s.studentId] = s.status;
    });
    setMarks(next);
  }, [data]);

  const counts = useMemo(() => {
    const values = Object.values(marks);
    return {
      present: values.filter((v) => v === "PRESENT").length,
      leave: values.filter((v) => v === "LEAVE").length,
      absent: values.filter((v) => v === "ABSENT").length,
      total: values.length,
    };
  }, [marks]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: AttendanceStatus) => {
    if (!data?.students) return;
    const next: Record<string, AttendanceStatus> = {};
    data.students.forEach((s) => {
      next[s.studentId] = status;
    });
    setMarks(next);
  };

  const handleSave = async () => {
    if (!data) return;
    try {
      await saveSheet({
        date,
        classId,
        sectionId: sectionId || null,
        entries: data.students.map((s) => ({
          studentId: s.studentId,
          status: marks[s.studentId] ?? "PRESENT",
        })),
      }).unwrap();
      toast.success(
        data.alreadyTaken
          ? "Attendance updated successfully"
          : "Attendance saved successfully"
      );
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to save attendance"
      );
    }
  };

  if (skip) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Missing date or class.</p>
          <Link
            href="/dashboard/attendance/students"
            className="text-indigo-600 font-medium underline"
          >
            Go back
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Loading students...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4">
        <div className="text-center">
          <p className="text-rose-500 mb-4">Failed to load attendance sheet.</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/attendance/students")}
            className="text-indigo-600 font-medium underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 mb-6 inline-flex items-center gap-2 text-sm text-slate-600 shadow-sm">
          <FaCalendarAlt className="text-indigo-500" />
          <Link
            href="/dashboard/attendance/students"
            className="font-medium text-slate-800 hover:text-indigo-600"
          >
            Attendance
          </Link>
          <span className="text-slate-400">›</span>
          <span>Add / Update Attendance</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/attendance/students")}
                className="text-xs text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 mb-2"
              >
                <FaArrowLeft size={10} /> Change class/date
              </button>
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                {data.class.className}
                {data.section ? ` - ${data.section.sectionName}` : ""}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {formatDisplayDate(data.dateKey)}
              </p>
            </div>
            {data.alreadyTaken && (
              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                <FaCheck size={10} /> ALREADY TAKEN
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
            <Legend color="bg-emerald-500" label="Present" count={counts.present} />
            <Legend color="bg-amber-400" label="On-leave" count={counts.leave} />
            <Legend color="bg-rose-500" label="Absent" count={counts.absent} />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <QuickBtn label="All Present" onClick={() => markAll("PRESENT")} />
            <QuickBtn label="All Leave" onClick={() => markAll("LEAVE")} />
            <QuickBtn label="All Absent" onClick={() => markAll("ABSENT")} />
          </div>

          {data.students.length === 0 ? (
            <p className="text-center text-slate-400 py-12">
              No active students enrolled in this class/section.
            </p>
          ) : (
            <div className="space-y-3 mb-8">
              {data.students.map((student) => {
                const photo = resolvePhoto(student.photoUrl);
                const status = marks[student.studentId] ?? "PRESENT";
                return (
                  <div
                    key={student.studentId}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white"
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <FaUser />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate capitalize">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {student.registrationNo}
                        {student.parentName ? ` • ${student.parentName}` : ""}
                        {student.rollNo ? ` • Roll ${student.rollNo}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBtn
                        label="P"
                        active={status === "PRESENT"}
                        activeClass="bg-emerald-500 border-emerald-500 text-white"
                        onClick={() => setStatus(student.studentId, "PRESENT")}
                      />
                      <StatusBtn
                        label="L"
                        active={status === "LEAVE"}
                        activeClass="bg-amber-400 border-amber-400 text-white"
                        onClick={() => setStatus(student.studentId, "LEAVE")}
                      />
                      <StatusBtn
                        label="A"
                        active={status === "ABSENT"}
                        activeClass="bg-rose-500 border-rose-500 text-white"
                        onClick={() => setStatus(student.studentId, "ABSENT")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || data.students.length === 0}
              className="inline-flex items-center gap-2 px-10 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition disabled:opacity-60"
            >
              <FaSync className={isSaving ? "animate-spin" : ""} />
              {isSaving
                ? "Saving..."
                : data.alreadyTaken
                  ? "Update Attendance"
                  : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label} ({count})
    </span>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function StatusBtn({
  label,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-10 h-10 rounded-full border text-sm font-bold transition ${
        active
          ? activeClass
          : "border-slate-300 text-slate-400 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );
}
