"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaArrowRight, FaCheckSquare, FaSquare, FaUserGraduate } from "react-icons/fa";
import {
  useBulkPromoteStudentsMutation,
  useGetAllStudentsQuery,
} from "@/redux/features/students/studentApi";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http")
    ? photo
    : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
}

export default function Page() {
  const [fromClassId, setFromClassId] = useState("");
  const [fromSectionId, setFromSectionId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [toSectionId, setToSectionId] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [feeDiscount, setFeeDiscount] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: classes = [] } = useGetAllClassesQuery();
  const { data, isLoading, isFetching } = useGetAllStudentsQuery(
    {
      limit: 100,
      status: "ACTIVE",
      ...(fromClassId ? { classId: fromClassId } : {}),
      ...(fromSectionId ? { sectionId: fromSectionId } : {}),
    },
    { skip: !fromClassId }
  );
  const [bulkPromote, { isLoading: isPromoting }] =
    useBulkPromoteStudentsMutation();

  const students = data?.students ?? [];
  const fromClass = useMemo(
    () => classes.find((c) => c.id === fromClassId) ?? null,
    [classes, fromClassId]
  );
  const toClass = useMemo(
    () => classes.find((c) => c.id === toClassId) ?? null,
    [classes, toClassId]
  );

  const allSelected =
    students.length > 0 && selectedIds.length === students.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(students.map((s) => s.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePromote = async () => {
    if (!fromClassId) return toast.error("Select current class");
    if (!toClassId) return toast.error("Select target class");
    if (!academicYear.trim()) return toast.error("Academic year is required");
    if (selectedIds.length === 0) return toast.error("Select at least one student");

    try {
      const res = await bulkPromote({
        studentIds: selectedIds,
        classId: toClassId,
        sectionId: toSectionId || undefined,
        academicYear: academicYear.trim(),
        feeDiscount: Number(feeDiscount) || 0,
        remarks: remarks || undefined,
      }).unwrap();

      const { promotedCount, failedCount, failed } = res.data;
      if (promotedCount > 0) {
        toast.success(`${promotedCount} student(s) promoted successfully`);
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} failed: ${failed
            .slice(0, 2)
            .map((f) => `${f.name} (${f.reason})`)
            .join(", ")}`
        );
      }

      setSelectedIds([]);
      setRemarks("");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Promotion failed"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-medium mb-2">
          <FaUserGraduate /> Promote Student
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Promote Students
        </h1>
        <p className="text-slate-500 mt-1">
          Select students from a class and move them to the next class / year.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        {/* Source students */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Select Students</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">
                FROM CLASS *
              </label>
              <select
                value={fromClassId}
                onChange={(e) => {
                  setFromClassId(e.target.value);
                  setFromSectionId("");
                  setSelectedIds([]);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              >
                <option value="">-- Select class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                FROM SECTION
              </label>
              <select
                value={fromSectionId}
                onChange={(e) => {
                  setFromSectionId(e.target.value);
                  setSelectedIds([]);
                }}
                disabled={!fromClass}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-60"
              >
                <option value="">All sections</option>
                {fromClass?.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!fromClassId ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              Choose a class to load students.
            </p>
          ) : isLoading || isFetching ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              Loading students...
            </p>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              No active students found in this class.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleAll}
                className="mb-3 inline-flex items-center gap-2 text-sm text-blue-600 font-medium"
              >
                {allSelected ? <FaCheckSquare /> : <FaSquare />}
                {allSelected ? "Unselect all" : "Select all"} ({students.length})
              </button>

              <ul className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto rounded-xl border border-slate-100">
                {students.map((student) => {
                  const selected = selectedIds.includes(student.id);
                  const enrollment = student.enrollments?.[0];
                  const photo = resolvePhoto(student.photoUrl);

                  return (
                    <li
                      key={student.id}
                      onClick={() => toggleOne(student.id)}
                      className={`flex items-center gap-3 p-3 cursor-pointer ${
                        selected ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-blue-600">
                        {selected ? <FaCheckSquare /> : <FaSquare className="text-slate-300" />}
                      </span>
                      {photo ? (
                        <img
                          src={photo}
                          alt={student.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {student.registrationNo}
                          {enrollment?.rollNo ? ` · Roll ${enrollment.rollNo}` : ""}
                          {enrollment?.section?.sectionName
                            ? ` · Sec ${enrollment.section.sectionName}`
                            : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Target */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 h-fit">
          <h2 className="font-semibold text-slate-900 mb-4">Promotion Target</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">
                TO CLASS *
              </label>
              <select
                value={toClassId}
                onChange={(e) => {
                  setToClassId(e.target.value);
                  setToSectionId("");
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              >
                <option value="">-- Select target class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">
                TO SECTION
              </label>
              <select
                value={toSectionId}
                onChange={(e) => setToSectionId(e.target.value)}
                disabled={!toClass}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm disabled:opacity-60"
              >
                <option value="">Optional</option>
                {toClass?.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sectionName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">
                NEW ACADEMIC YEAR *
              </label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">
                FEE DISCOUNT (%)
              </label>
              <input
                type="number"
                value={feeDiscount}
                onChange={(e) => setFeeDiscount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">
                REMARKS
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm resize-none"
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800 mb-2">Summary</p>
            <p className="flex items-center gap-2 flex-wrap">
              <span>{fromClass?.className || "From class"}</span>
              <FaArrowRight className="text-slate-400" />
              <span>{toClass?.className || "To class"}</span>
            </p>
            <p className="mt-1">{selectedIds.length} student(s) selected</p>
            <p className="mt-1">Year: {academicYear || "—"}</p>
          </div>

          <button
            type="button"
            onClick={handlePromote}
            disabled={isPromoting}
            className="mt-5 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 font-medium disabled:opacity-60"
          >
            {isPromoting
              ? "Promoting..."
              : `Promote ${selectedIds.length || ""} Student(s)`}
          </button>
        </section>
      </div>
    </div>
  );
}
