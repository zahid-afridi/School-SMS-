"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";
import { useSendCustomWhatsAppMutation } from "@/redux/features/messages/messageApi";

export default function SendCustomMessagePage() {
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
  const [message, setMessage] = useState("");
  const [send, { isLoading }] = useSendCustomWhatsAppMutation();

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId]
  );

  const onStudentChange = (id: string) => {
    setStudentId(id);
    const student = students.find((s) => s.id === id);
    const parentPhone =
      student?.parents?.[0]?.parent?.whatsappNo ||
      student?.parents?.[0]?.parent?.mobileNo ||
      student?.contactPhone ||
      "";
    if (parentPhone) setPhone(parentPhone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }
    if (!phone.trim() && !studentId) {
      toast.error("Select a student or enter a phone number");
      return;
    }
    try {
      const result = await send({
        message: message.trim(),
        phone: phone.trim() || undefined,
        studentId: studentId || undefined,
      }).unwrap();
      toast.success(`Message ${result.status.toLowerCase()}`);
      setMessage("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to send message"
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
            Send Custom Message
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Compose and send a WhatsApp message to a parent
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Class (optional)
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setStudentId("");
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
                Student (optional)
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
            <p className="text-xs text-slate-400 mt-1">
              Pakistani numbers are converted automatically (e.g. 0333… → 92333…@c.us).
              {selectedStudent ? ` Selected: ${selectedStudent.name}` : ""}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Type your WhatsApp message…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-60"
          >
            {isLoading ? "Sending…" : "Send WhatsApp"}
          </button>
        </form>
      </div>
    </div>
  );
}
