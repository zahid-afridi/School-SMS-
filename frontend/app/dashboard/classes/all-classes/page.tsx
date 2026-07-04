"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FaPlus,
  FaLayerGroup,
  FaMoneyBillWave,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaSave,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useGetAllClassesQuery,
  useUpdateClassMutation,
  useDeleteClassMutation,
} from "@/redux/features/classes/ClassApi";
import { useGetAllTeachersQuery } from "@/redux/features/teachers/teacherApi";
import type { SchoolClass } from "@/redux/features/classes/ClassTypes";

export default function AllClassesPage() {
  const { data: classes, isLoading, isError } = useGetAllClassesQuery();
  const { data: teachers } = useGetAllTeachersQuery();
  const [updateClass, { isLoading: isUpdating }] = useUpdateClassMutation();
  const [deleteClass, { isLoading: isDeleting }] = useDeleteClassMutation();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [editForm, setEditForm] = useState({ className: "", montlyFee: "" });

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const startEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setEditForm({ className: cls.className, montlyFee: String(cls.montlyFee) });
  };

  const handleUpdate = async () => {
    if (!editingClass) return;
    if (!editForm.className.trim()) {
      toast.error("Class name is required");
      return;
    }
    try {
      await updateClass({
        id: editingClass.id,
        data: {
          className: editForm.className.trim(),
          montlyFee: Number(editForm.montlyFee),
        },
      }).unwrap();
      toast.success("Class updated successfully");
      setEditingClass(null);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update class"
      );
    }
  };

  const handleDelete = async (cls: SchoolClass) => {
    if (!confirm(`Delete "${cls.className}"? This cannot be undone.`)) return;
    try {
      await deleteClass(cls.id).unwrap();
      toast.success("Class deleted successfully");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete class"
      );
    }
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return "Unassigned";
    return teachers?.find((t) => t.id === teacherId)?.name ?? "Unknown";
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading classes...</p>
      </div>
    );
  }

  if (isError || !classes) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">Failed to load classes.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            All Classes ({classes.length})
          </h1>
          <p className="text-gray-500 mt-1">View, edit, and manage all classes</p>
        </div>
        <Link
          href="/dashboard/classes/add-class"
          className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          <FaPlus size={13} /> Add Class
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FaLayerGroup size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No classes found. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Class Row */}
              <div className="flex items-center justify-between px-6 py-4">
                <div
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => toggleExpand(cls.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {cls.className.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{cls.className}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <FaMoneyBillWave size={12} /> PKR {cls.montlyFee.toLocaleString()}/mo
                      </span>
                      <span className="flex items-center gap-1">
                        <FaLayerGroup size={12} /> {cls.sections?.length ?? 0} section(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(cls)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 transition"
                  >
                    <FaEdit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(cls)}
                    disabled={isDeleting}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    <FaTrash size={14} />
                  </button>
                  <button
                    onClick={() => toggleExpand(cls.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                  >
                    {expandedId === cls.id ? (
                      <FaChevronUp size={13} />
                    ) : (
                      <FaChevronDown size={13} />
                    )}
                  </button>
                </div>
              </div>

              {/* Sections Expand */}
              {expandedId === cls.id && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                  {cls.sections?.length === 0 ? (
                    <p className="text-sm text-gray-400">No sections yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cls.sections?.map((sec) => (
                        <div
                          key={sec.id}
                          className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              Section {sec.sectionName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {sec.teacher
                                ? sec.teacher.name
                                : getTeacherName(sec.teacherId)}
                            </p>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {sec.sectionName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingClass && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 relative">
            <button
              onClick={() => setEditingClass(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-red-500 transition"
            >
              <FaTimes size={18} />
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-6">Edit Class</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={editForm.className}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, className: e.target.value }))
                  }
                  className="w-full h-11 border border-gray-300 rounded-xl px-4 text-sm outline-none focus:border-black transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Monthly Fee (PKR)
                </label>
                <input
                  type="number"
                  value={editForm.montlyFee}
                  min={0}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, montlyFee: e.target.value }))
                  }
                  className="w-full h-11 border border-gray-300 rounded-xl px-4 text-sm outline-none focus:border-black transition"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition disabled:opacity-60"
              >
                <FaSave size={14} />
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditingClass(null)}
                className="flex-1 border border-gray-300 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
