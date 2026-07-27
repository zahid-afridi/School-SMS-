"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaSearch, FaMoneyBillWave } from "react-icons/fa";
import {
  useGetFeeStructureQuery,
  useSaveFeeStructureMutation,
} from "@/redux/features/fees/feeApi";
import type { FeeScope } from "@/redux/features/fees/feeTypes";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";

const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

export default function Page() {
  const [scope, setScope] = useState<FeeScope>("ALL_STUDENTS");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const { data: classes = [] } = useGetAllClassesQuery();
  const { data: studentsData } = useGetAllStudentsQuery(
    {
      search: studentSearch || undefined,
      limit: 20,
      status: "ACTIVE",
    },
    { skip: scope !== "STUDENT" || studentSearch.trim().length < 1 }
  );

  const queryArgs = useMemo(() => {
    if (scope === "CLASS" && !classId) return null;
    if (scope === "STUDENT" && !studentId) return null;
    return {
      scope,
      ...(scope === "CLASS" ? { classId } : {}),
      ...(scope === "STUDENT" ? { studentId } : {}),
    };
  }, [scope, classId, studentId]);

  const { data, isLoading, isFetching, isError } = useGetFeeStructureQuery(
    queryArgs as { scope: FeeScope; classId?: string; studentId?: string },
    { skip: !queryArgs }
  );

  const [saveFeeStructure, { isLoading: isSaving }] =
    useSaveFeeStructureMutation();

  useEffect(() => {
    if (!data?.items) return;
    const next: Record<string, string> = {};
    data.items.forEach((item) => {
      next[item.particularId] = String(item.amount ?? 0);
    });
    setAmounts(next);
  }, [data]);

  const handleScopeChange = (value: FeeScope) => {
    setScope(value);
    setClassId("");
    setStudentId("");
    setStudentSearch("");
    setAmounts({});
  };

  const handleSave = async () => {
    if (!queryArgs || !data) {
      toast.error("Select fee particulars target first");
      return;
    }

    const items = data.items
      .filter((item) => item.isEditable)
      .map((item) => ({
        particularId: item.particularId,
        amount: Number(amounts[item.particularId] ?? 0),
      }));

    try {
      const res = await saveFeeStructure({
        scope,
        ...(scope === "CLASS" ? { classId } : {}),
        ...(scope === "STUDENT" ? { studentId } : {}),
        items,
      }).unwrap();
      toast.success(res.message || "Fee structure saved");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to save fee structure"
      );
    }
  };

  const students = studentsData?.students ?? [];
  const selectedStudent =
    students.find((s) => s.id === studentId) || data?.student || null;

  return (
    <div className="w-full min-w-0">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-medium mb-2">
            <FaMoneyBillWave /> General Settings
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Fees Structure
          </h1>
          <p className="text-slate-500 mt-1">
            Configure fee particulars for all students, a class, or a specific
            student.
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
            <p>
              <strong>Monthly tuition</strong> comes from each class monthly
              fee (auto).
            </p>
            <p>
              <strong>Admission / Registration</strong> are one-time (charged
              only on first invoice).
            </p>
            <p>
              Set <strong>Transport, Books, Uniform, Fine, Others</strong> here —
              they are added to each generated monthly invoice when amount &gt; 0.
            </p>
            <p>
              Student <strong>fee discount %</strong> (from enrollment) reduces
              tuition automatically.
            </p>
          </div>
        </div>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            Change Fee Particulars
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                FEE PARTICULARS FOR *
              </label>
              <select
                value={scope}
                onChange={(e) => handleScopeChange(e.target.value as FeeScope)}
                className={inputClass}
              >
                <option value="ALL_STUDENTS">All Students</option>
                <option value="CLASS">Specific Class</option>
                <option value="STUDENT">Specific Student</option>
              </select>
            </div>

            {scope === "CLASS" && (
              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                  SELECT CLASS *
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- Select a class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "STUDENT" && (
              <div>
                <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                  SEARCH STUDENT *
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student"
                    className={`${inputClass} pl-11`}
                  />
                </div>
                {studentSearch.trim() && students.length > 0 && (
                  <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {students.map((student) => (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentId(student.id);
                            setStudentSearch(
                              `${student.name} (${student.registrationNo})`
                            );
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 ${
                            studentId === student.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <span className="font-medium text-slate-800">
                            {student.name}
                          </span>
                          <span className="text-slate-400 ml-2">
                            {student.registrationNo}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedStudent && studentId && (
                  <p className="mt-2 text-xs text-emerald-600">
                    Selected: {selectedStudent.name} (
                    {"registrationNo" in selectedStudent
                      ? selectedStudent.registrationNo
                      : ""}
                    )
                  </p>
                )}
              </div>
            )}
          </div>

          {!queryArgs ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              {scope === "CLASS"
                ? "Select a class above to load fee particulars."
                : "Search a student above to load fee particulars."}
            </div>
          ) : isLoading || isFetching ? (
            <p className="py-16 text-center text-slate-500">Loading fee particulars...</p>
          ) : isError || !data ? (
            <p className="py-16 text-center text-red-500">
              Failed to load fee particulars.
            </p>
          ) : (
            <div className="space-y-3">
              {data.class && (
                <p className="text-sm text-slate-500 mb-2">
                  Class:{" "}
                  <span className="font-medium text-slate-800">
                    {data.class.className}
                  </span>
                  {" · "}
                  Monthly fee base: {data.class.montlyFee}
                </p>
              )}

              {data.items.map((item) => (
                <div
                  key={item.particularId}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end"
                >
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                      PARTICULAR LABEL
                    </label>
                    <input
                      value={item.label}
                      readOnly
                      className={`${inputClass} bg-slate-50 text-slate-700`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wide text-slate-500 mb-1.5">
                      {item.isEditable ? "AMOUNT" : "AMOUNT"}
                    </label>
                    {item.isEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={amounts[item.particularId] ?? "0"}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [item.particularId]: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    ) : (
                      <input
                        value={
                          typeof item.displayValue === "number"
                            ? String(item.displayValue)
                            : item.amount > 0
                              ? String(item.amount)
                              : String(item.displayValue)
                        }
                        readOnly
                        className={`${inputClass} bg-slate-100 text-slate-500`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={handleSave}
              disabled={!queryArgs || isSaving || !data}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 shadow-sm"
            >
              <FaCheck />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
