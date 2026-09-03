"use client";

import PageLoader from "@/app/components/PageLoader";

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

import { resolveUploadUrl } from "@/lib/apiBase";

function resolvePhoto(photo?: string | null): string | null {
  return resolveUploadUrl(photo);
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
        <PageLoader compact label="Loading students" />
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
        <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 shadow-sm sm:mb-6 sm:px-5">
          <FaCalendarAlt className="shrink-0 text-indigo-500" />
          <Link
            href="/dashboard/attendance/students"
            className="font-medium text-slate-800 hover:text-indigo-600"
          >
            Attendance
          </Link>
          <span className="text-slate-400">›</span>
          <span className="min-w-0 break-words">Add / Update Attendance</span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-8">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => router.push("/dashboard/attendance/students")}
                className="mb-2 inline-flex min-h-10 items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"
              >
                <FaArrowLeft size={10} /> Change class/date
              </button>
              <h1 className="break-words text-xl font-bold uppercase tracking-wide text-slate-900 sm:text-2xl">
                {data.class.className}
                {data.section ? ` - ${data.section.sectionName}` : ""}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {formatDisplayDate(data.dateKey)}
              </p>
            </div>
            {data.alreadyTaken && (
              <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
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
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 hover:border-slate-200 min-[400px]:flex-row min-[400px]:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {photo ? (
                        <img
                          src={photo}
                          alt={student.name}
                          className="h-12 w-12 shrink-0 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FaUser />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold capitalize text-slate-800">
                          {student.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {student.registrationNo}
                          {student.parentName ? ` • ${student.parentName}` : ""}
                          {student.rollNo ? ` • Roll ${student.rollNo}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2">
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
              className="inline-flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-indigo-600 px-10 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
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
      className={`h-11 w-11 touch-manipulation rounded-full border text-sm font-bold transition ${
        active
          ? activeClass
          : "border-slate-300 text-slate-400 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );
}
