"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import { useSendAnnouncementWhatsAppMutation } from "@/redux/features/messages/messageApi";

export default function AnnouncementMessagePage() {
  const { data: classes = [] } = useGetAllClassesQuery();
  const [classId, setClassId] = useState("");
  const { data: studentsData } = useGetAllStudentsQuery({
    status: "ACTIVE",
    ...(classId ? { classId } : {}),
    limit: 500,
  });
  const students = studentsData?.students ?? [];

  const [mode, setMode] = useState<"single" | "class">("single");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [send, { isLoading }] = useSendAnnouncementWhatsAppMutation();

  const allSelected = useMemo(
    () => students.length > 0 && selectedIds.length === students.length,
    [students, selectedIds]
  );

  const onStudentChange = (id: string) => {
    setStudentId(id);
    const student = students.find((s) => s.id === id);
    const parentPhone =
      student?.parents?.[0]?.parent?.whatsappNo ||
      student?.parents?.[0]?.parent?.mobileNo ||
      student?.contactPhone ||
      "";
    setPhone(parentPhone || "");
  };

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.trim()) {
      toast.error("Announcement text is required");
      return;
    }

    try {
      if (mode === "class") {
        if (selectedIds.length === 0) {
          toast.error("Select at least one student");
          return;
        }
        const result = await send({
          announcement: announcement.trim(),
          studentIds: selectedIds,
        }).unwrap();
        toast.success(`Sent ${result.sent}, failed ${result.failed}`);
      } else {
        if (!studentId && !phone.trim()) {
          toast.error("Select a student or enter a phone number");
          return;
        }
        const result = await send({
          announcement: announcement.trim(),
          studentId: studentId || undefined,
          phone: phone.trim() || undefined,
        }).unwrap();
        toast.success(`Sent ${result.sent} announcement(s)`);
      }
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to send announcement"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/messages" className="text-sm text-sky-700 hover:underline">
            ← Messages
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            School Announcement
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Broadcast a custom announcement to one or many parents
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                mode === "single"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              Single recipient
            </button>
            <button
              type="button"
              onClick={() => setMode("class")}
              className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                mode === "class"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              Multiple students
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Class filter
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setStudentId("");
                setSelectedIds([]);
                setPhone("");
              }}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {mode === "single" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Student
                </label>
                <select
                  value={studentId}
                  onChange={(e) => onStudentChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3"
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.registrationNo})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03335789091"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3"
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
              <div className="sticky top-0 bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Students ({selectedIds.length} selected)
                </span>
                <button
                  type="button"
                  className="text-xs text-sky-700 font-semibold"
                  onClick={() =>
                    setSelectedIds(
                      allSelected ? [] : students.map((s) => s.id)
                    )
                  }
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              </div>
              <ul className="divide-y divide-slate-100">
                {students.map((s) => (
                  <li key={s.id}>
                    <label className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                      />
                      <span className="min-w-0 truncate">
                        {s.name}{" "}
                        <span className="text-slate-400">
                          ({s.registrationNo})
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Announcement *
            </label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              rows={5}
              required
              placeholder="Write the announcement text…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-60"
          >
            {isLoading ? "Sending…" : "Send Announcement"}
          </button>
        </form>
      </div>
    </div>
  );
}
