"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaPlus, FaTrash } from "react-icons/fa";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import {
  useAddExamScheduleMutation,
  useCreateSubjectMutation,
  useDeleteExamScheduleMutation,
  useGetExamScheduleQuery,
  useGetExamsQuery,
  useGetSubjectsQuery,
} from "@/redux/features/exams/examApi";
import {
  ExamBreadcrumb,
  ExamStepTitle,
  examInputClass,
  formatExamDate,
} from "../_components/ExamUI";

export default function ExamSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-\[40vh\]">
          <p className="text-slate-500">Loading schedule...</p>
        </div>
      }
    >
      <ScheduleInner />
    </Suspense>
  );
}

function ScheduleInner() {
  const search = useSearchParams();
  const presetExamId = search.get("examId") ?? "";

  const { data: exams = [] } = useGetExamsQuery();
  const { data: classes = [] } = useGetAllClassesQuery();
  const { data: subjects = [], refetch: refetchSubjects } = useGetSubjectsQuery();
  const [examId, setExamId] = useState(presetExamId);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [passMarks, setPassMarks] = useState("33");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    if (presetExamId) setExamId(presetExamId);
  }, [presetExamId]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId]
  );

  const { data: schedule = [], isFetching } = useGetExamScheduleQuery(
    { examId, classId: classId || undefined },
    { skip: !examId }
  );
  const [addSchedule, { isLoading: adding }] = useAddExamScheduleMutation();
  const [deleteSchedule] = useDeleteExamScheduleMutation();
  const [createSubject, { isLoading: creatingSubject }] =
    useCreateSubjectMutation();

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return;
    try {
      const res = await createSubject({ name: newSubject.trim() }).unwrap();
      toast.success(res.message || "Subject added");
      setNewSubject("");
      setSubjectId(res.data.id);
      refetchSubjects();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to add subject"
      );
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId || !classId || !subjectId) {
      toast.error("Select exam, class, and subject");
      return;
    }
    try {
      await addSchedule({
        examId,
        classId,
        subjectId,
        sectionId: sectionId || undefined,
        maxMarks: Number(maxMarks),
        passMarks: Number(passMarks),
        examDate: examDate || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        room: room || undefined,
      }).unwrap();
      toast.success("Added to schedule");
      setExamDate("");
      setStartTime("");
      setEndTime("");
      setRoom("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to add schedule"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto">
        <ExamBreadcrumb current="Exam Schedule" />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Exam Schedule</h1>
        <p className="text-slate-500 mb-6">
          Attach subjects to an exam with date, time, and max marks. Required
          before entering marks.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form
            onSubmit={handleAdd}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <ExamStepTitle step={1} title="Add Paper" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                EXAM *
              </label>
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className={examInputClass}
              >
                <option value="">Select exam</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                CLASS *
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId("");
                }}
                className={examInputClass}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                SECTION (optional)
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className={examInputClass}
              >
                <option value="">All sections</option>
                {selectedClass?.sections?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sectionName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                SUBJECT *
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={examInputClass}
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 mt-2">
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="New subject name"
                  className={examInputClass}
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  disabled={creatingSubject}
                  className="shrink-0 px-3 rounded-xl bg-slate-900 text-white"
                >
                  <FaPlus />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  MAX MARKS
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  className={examInputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  PASS MARKS
                </label>
                <input
                  type="number"
                  min={0}
                  value={passMarks}
                  onChange={(e) => setPassMarks(e.target.value)}
                  className={examInputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                EXAM DATE
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={examInputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  START TIME
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={examInputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  END TIME
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={examInputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                ROOM
              </label>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className={examInputClass}
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {adding ? "Adding..." : "Add to Schedule"}
            </button>
          </form>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <ExamStepTitle step={2} title="Scheduled Papers" />
            {!examId ? (
              <p className="text-slate-400 text-sm">Select an exam to view schedule.</p>
            ) : isFetching ? (
              <p className="text-slate-400 text-sm">Loading...</p>
            ) : schedule.length === 0 ? (
              <p className="text-slate-400 text-sm">No papers scheduled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Marks</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">
                          {row.subject.name}
                        </td>
                        <td className="px-3 py-2">
                          {row.class.className}
                          {row.section ? `-${row.section.sectionName}` : ""}
                        </td>
                        <td className="px-3 py-2">
                          {formatExamDate(row.examDate)}
                        </td>
                        <td className="px-3 py-2">
                          {row.startTime || "—"}
                          {row.endTime ? `–${row.endTime}` : ""}
                        </td>
                        <td className="px-3 py-2">
                          {row.maxMarks} / pass {row.passMarks}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteSchedule(row.id).unwrap();
                                toast.success("Removed");
                              } catch (err: unknown) {
                                toast.error(
                                  (err as { data?: { message?: string } })?.data
                                    ?.message ?? "Failed"
                                );
                              }
                            }}
                            className="text-rose-600"
                          >
                            <FaTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
