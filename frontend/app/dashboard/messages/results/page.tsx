"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import { useSendResultWhatsAppMutation } from "@/redux/features/messages/messageApi";

export default function ResultMessagePage() {
  const { data: classes = [] } = useGetAllClassesQuery();
  const [classId, setClassId] = useState("");
  const { data: studentsData } = useGetAllStudentsQuery({
    status: "ACTIVE",
    ...(classId ? { classId } : {}),
    limit: 500,
  });
  const students = studentsData?.students ?? [];

  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [send, { isLoading }] = useSendResultWhatsAppMutation();

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

  const previewName =
    students.find((s) => s.id === studentId)?.name || "{{studentName}}";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error("Select a student");
      return;
    }
    try {
      await send({
        studentId,
        phone: phone.trim() || undefined,
      }).unwrap();
      toast.success("Result notice sent");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to send notice"
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
            Result Notice
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Inform parents that an exam result has been published
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Class
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setStudentId("");
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Student *
              </label>
              <select
                value={studentId}
                onChange={(e) => onStudentChange(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3"
                required
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.registrationNo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone (optional override)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Uses parent WhatsApp / mobile if empty"
              className="w-full h-11 rounded-xl border border-slate-200 px-3"
            />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Preview
            </p>
            Dear Parent, the exam result for {previewName} has been published.
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {isLoading ? "Sending…" : "Send Result Notice"}
          </button>
        </form>
      </div>
    </div>
  );
}
