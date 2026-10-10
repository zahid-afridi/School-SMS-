"use client";

import PageLoader from "@/app/components/PageLoader";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaSearch,
  FaMoneyBillWave,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSlidersH,
  FaLayerGroup,
  FaTimes,
  FaLock,
} from "react-icons/fa";
import {
  useGetFeeStructureQuery,
  useSaveFeeStructureMutation,
  useGetFeeParticularsQuery,
  useCreateFeeParticularMutation,
  useUpdateFeeParticularMutation,
  useDeleteFeeParticularMutation,
} from "@/redux/features/fees/feeApi";
import type {
  FeeScope,
  FeeParticularItem,
} from "@/redux/features/fees/feeTypes";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetAllStudentsQuery } from "@/redux/features/students/studentApi";

const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

export default function FeesStructureSettingsPage() {
  const [activeTab, setActiveTab] = useState<"amounts" | "heads">("amounts");

  // Tab 1: Amount assignment state
  const [scope, setScope] = useState<FeeScope>("ALL_STUDENTS");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  // Tab 2: Particulars Management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeParticularItem | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("50");

  const { data: classes = [] } = useGetAllClassesQuery();
  const { data: particularsList = [], isLoading: loadingParticulars } =
    useGetFeeParticularsQuery();
  const [createParticular, { isLoading: isCreating }] =
    useCreateFeeParticularMutation();
  const [updateParticular, { isLoading: isUpdating }] =
    useUpdateFeeParticularMutation();
  const [deleteParticular, { isLoading: isDeleting }] =
    useDeleteFeeParticularMutation();

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
      toast.success(res.message || "Fee structure saved successfully");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to save fee structure"
      );
    }
  };

  const handleCreateParticular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      toast.error("Label is required");
      return;
    }
    try {
      await createParticular({
        label: formLabel.trim(),
        key: formKey.trim() || undefined,
        sortOrder: Number(formSortOrder) || 50,
      }).unwrap();
      toast.success("Fee head created successfully");
      setShowAddModal(false);
      setFormLabel("");
      setFormKey("");
      setFormSortOrder("50");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to create fee head"
      );
    }
  };

  const handleUpdateParticular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateParticular({
        id: editingItem.id,
        label: formLabel.trim() || editingItem.label,
        sortOrder: Number(formSortOrder) || editingItem.sortOrder,
        isActive: editingItem.isActive,
      }).unwrap();
      toast.success("Fee head updated");
      setEditingItem(null);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update fee head"
      );
    }
  };

  const handleToggleActive = async (item: FeeParticularItem) => {
    try {
      await updateParticular({
        id: item.id,
        isActive: !item.isActive,
      }).unwrap();
      toast.success(
        `${item.label} is now ${!item.isActive ? "Active" : "Inactive"}`
      );
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to toggle status"
      );
    }
  };

  const handleDeleteParticular = async (item: FeeParticularItem) => {
    if (item.isSystem) {
      toast.error("System particulars cannot be deleted");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete "${item.label}"? If it has been used in existing invoices, it cannot be deleted.`
      )
    ) {
      return;
    }
    try {
      await deleteParticular(item.id).unwrap();
      toast.success("Fee particular deleted");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Cannot delete fee particular"
      );
    }
  };

  const students = studentsData?.students ?? [];
  const selectedStudent =
    students.find((s) => s.id === studentId) || data?.student || null;

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-semibold mb-2">
            <FaMoneyBillWave /> Fee Configuration & Rules
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Fee Structure Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure fee particulars (Tuition, Admission, Exam, Transport, Custom
            Charges) and set default amounts by class or individual student.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("amounts")}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition ${
              activeTab === "amounts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FaSlidersH /> Set Particular Amounts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("heads")}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-xs sm:text-sm border-b-2 transition ${
              activeTab === "heads"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FaLayerGroup /> Manage Fee Heads / Types
          </button>
        </div>

        {/* TAB 1: Set Amounts */}
        {activeTab === "amounts" && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Assign Particular Amounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Amounts assigned here are added to generated monthly invoices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Target Scope *
                </label>
                <select
                  value={scope}
                  onChange={(e) => handleScopeChange(e.target.value as FeeScope)}
                  className={inputClass}
                >
                  <option value="ALL_STUDENTS">All Students (School Default)</option>
                  <option value="CLASS">Specific Class</option>
                  <option value="STUDENT">Specific Student (Custom Override)</option>
                </select>
              </div>

              {scope === "CLASS" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Select Class *
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Select a class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className} (Base Tuition: PKR {c.montlyFee.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === "STUDENT" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Search Student *
                  </label>
                  <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Type student name or admission #"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                  {studentSearch.trim() && students.length > 0 && (
                    <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-lg">
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
                            className={`w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50 ${
                              studentId === student.id ? "bg-blue-50" : ""
                            }`}
                          >
                            <span className="font-semibold text-slate-800">
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
                    <p className="mt-2 text-xs text-emerald-600 font-semibold">
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
              <div className="py-16 text-center text-slate-400 text-xs">
                {scope === "CLASS"
                  ? "Select a class above to load fee particulars."
                  : "Search a student above to load fee particulars."}
              </div>
            ) : isLoading || isFetching ? (
              <div className="py-16 flex justify-center">
                <PageLoader compact label="Loading fee particulars" />
              </div>
            ) : isError || !data ? (
              <p className="py-16 text-center text-rose-500 text-xs">
                Failed to load fee particulars.
              </p>
            ) : (
              <div className="space-y-4">
                {data.class && (
                  <p className="text-xs text-slate-500">
                    Class:{" "}
                    <strong className="text-slate-800">
                      {data.class.className}
                    </strong>
                    {" · "}Base Tuition Fee: PKR {data.class.montlyFee.toLocaleString()}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.items.map((item) => (
                    <div
                      key={item.particularId}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          {item.label}
                        </label>
                        {!item.isEditable && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                            Auto Class Fee
                          </span>
                        )}
                      </div>

                      {item.isEditable ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                            PKR
                          </span>
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
                            className="w-full h-10 pl-11 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="h-10 px-3 rounded-lg bg-slate-100 border border-slate-200 flex items-center text-xs font-semibold text-slate-600">
                          PKR{" "}
                          {(typeof item.displayValue === "number"
                            ? item.displayValue
                            : item.amount > 0
                            ? item.amount
                            : 0
                          ).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!queryArgs || isSaving || !data}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60 transition shadow-xs"
                  >
                    <FaCheck size={11} />
                    {isSaving ? "Saving..." : "Save Amounts"}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Manage Fee Heads */}
        {activeTab === "heads" && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Fee Heads & Categories
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define fee types such as Tuition, Examination, Transport, Admission,
                  and other custom school charges.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormLabel("");
                  setFormKey("");
                  setFormSortOrder("50");
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-xs self-start sm:self-auto"
              >
                <FaPlus size={11} /> Add New Fee Head
              </button>
            </div>

            {loadingParticulars ? (
              <div className="py-12 flex justify-center">
                <PageLoader compact label="Loading fee heads" />
              </div>
            ) : particularsList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No fee particulars found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Label</th>
                      <th className="py-3 px-3">Key / Code</th>
                      <th className="py-3 px-3 text-center">Type</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {particularsList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.label}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {item.key}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.isSystem ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              <FaLock size={9} /> System Head
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                              Custom Head
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                              item.isActive
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {item.isActive ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setFormLabel(item.label);
                                setFormSortOrder(String(item.sortOrder));
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                              title="Edit label"
                            >
                              <FaEdit size={11} />
                            </button>
                            {!item.isSystem && (
                              <button
                                type="button"
                                onClick={() => handleDeleteParticular(item)}
                                disabled={isDeleting}
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                                title="Delete fee head"
                              >
                                <FaTrash size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Modal: Create Fee Particular */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <FaPlus className="text-blue-600" /> Create Fee Head
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateParticular} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Label (e.g. Examination Fee, Sports, Transport) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="e.g. Examination Fee (امتحانی فیس)"
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Key / Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="e.g. EXAM_FEE (leave blank to auto-generate)"
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 font-mono uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
                  >
                    {isCreating ? "Creating..." : "Create Fee Head"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Fee Particular */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <FaEdit className="text-blue-600" /> Edit Fee Head
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleUpdateParticular} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
