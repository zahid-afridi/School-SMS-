"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCalendarAlt, FaCheck, FaEdit, FaBarcode } from "react-icons/fa";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function StudentsAttendanceSelectPage() {
  const router = useRouter();
  const { data: classes = [], isLoading } = useGetAllClassesQuery();
  const [date, setDate] = useState(todayKey());
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [tab, setTab] = useState<"manual" | "card">("manual");

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Date is required");
      return;
    }
    if (!classId) {
      toast.error("Class is required");
      return;
    }
    const params = new URLSearchParams({ date, classId });
    if (sectionId) params.set("sectionId", sectionId);
    router.push(`/dashboard/attendance/students/mark?${params.toString()}`);
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 mb-6 inline-flex items-center gap-2 text-sm text-slate-600 shadow-sm">
          <FaCalendarAlt className="text-indigo-500" />
          <span className="font-medium text-slate-800">Attendance</span>
          <span className="text-slate-400">›</span>
          <span>Mark or update Student Attendance</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition ${
                tab === "manual"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <FaEdit /> Manual Attendance
            </button>
            <button
              type="button"
              onClick={() =>
                toast("Card scanning will be available soon", { icon: "ℹ️" })
              }
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition ${
                tab === "card"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <FaBarcode /> Card Scanning
            </button>
          </div>

          {tab === "manual" && (
            <form onSubmit={handleSubmit} className="p-6 md:p-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-indigo-700 text-white text-sm font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-lg font-semibold text-slate-800">
                  Select Date & Class
                </h2>
              </div>
              <div className="h-px bg-slate-100 mb-8" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-semibold tracking-wide text-slate-500 mb-2">
                    DATE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wide text-slate-500 mb-2">
                    CLASS <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => {
                      setClassId(e.target.value);
                      setSectionId("");
                    }}
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClass && (selectedClass.sections?.length ?? 0) > 0 && (
                <div className="mb-8 max-w-md">
                  <label className="block text-xs font-semibold tracking-wide text-slate-500 mb-2">
                    SECTION (optional)
                  </label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="">All sections</option>
                    {selectedClass.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.sectionName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-10 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition"
                >
                  <FaCheck /> Submit
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
