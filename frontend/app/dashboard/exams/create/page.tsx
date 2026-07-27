"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { FaSave, FaClipboardList } from "react-icons/fa";
import {
  useCreateExamMutation,
  useDeleteExamMutation,
  useGetExamsQuery,
} from "@/redux/features/exams/examApi";
import {
  ExamBreadcrumb,
  ExamStepTitle,
  examInputClass,
  formatExamDate,
} from "../_components/ExamUI";

export default function CreateExamPage() {
  const { data: exams = [], isLoading } = useGetExamsQuery();
  const [createExam, { isLoading: saving }] = useCreateExamMutation();
  const [deleteExam, { isLoading: deleting }] = useDeleteExamMutation();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate) {
      toast.error("Exam name and start date are required");
      return;
    }
    try {
      const res = await createExam({
        name: name.trim(),
        startDate,
        endDate: endDate || undefined,
      }).unwrap();
      toast.success(res.message || "Exam created");
      setName("");
      setStartDate("");
      setEndDate("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to create exam"
      );
    }
  };

  const handleDelete = async (id: string, examName: string) => {
    if (!window.confirm(`Delete exam "${examName}"? This removes schedule and marks.`)) {
      return;
    }
    try {
      await deleteExam(id).unwrap();
      toast.success("Exam deleted");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto">
        <ExamBreadcrumb current="Create New Exam" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
          >
            <ExamStepTitle step={1} title="Add New Exam" />
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                  EXAMINATION NAME
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. First Term Exams 2026"
                  className={examInputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                  START DATE
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={examInputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                  END DATE
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={examInputClass}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-xl bg-black text-white font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <FaSave />
                {saving ? "Saving..." : "Save Exam"}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <ExamStepTitle step={2} title="Existing Exams" />
            {isLoading ? (
              <p className="text-slate-400 text-center py-16">Loading...</p>
            ) : exams.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FaClipboardList className="mx-auto text-4xl mb-3 opacity-40" />
                <p className="font-semibold text-slate-600">No Exams Yet</p>
                <p className="text-sm mt-1">Exams you create will appear here.</p>
              </div>
            ) : (
              <ul className="space-y-3 max-h-[28rem] overflow-y-auto">
                {exams.map((exam) => (
                  <li
                    key={exam.id}
                    className="rounded-xl border border-slate-100 p-4 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{exam.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatExamDate(exam.startDate)}
                        {exam.endDate
                          ? ` → ${formatExamDate(exam.endDate)}`
                          : ""}
                      </p>
                      <p className="text-xs text-violet-700 mt-1 font-medium">
                        {exam.status} · {exam._count?.subjects ?? 0} subjects
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => handleDelete(exam.id, exam.name)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
