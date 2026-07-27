"use client";

import { useState } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaLayerGroup,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useGetAllClassesQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
} from "@/redux/features/classes/ClassApi";
import { useGetAllTeachersQuery } from "@/redux/features/teachers/teacherApi";
import type { Section } from "@/redux/features/classes/ClassTypes";

interface EditState {
  section: Section;
  classId: string;
}

export default function SectionsPage() {
  const { data: classes, isLoading, isError } = useGetAllClassesQuery();
  const { data: teachers } = useGetAllTeachersQuery({ designation: "TEACHER" });
  const [createSection, { isLoading: isCreating }] = useCreateSectionMutation();
  const [updateSection, { isLoading: isUpdating }] = useUpdateSectionMutation();
  const [deleteSection, { isLoading: isDeleting }] = useDeleteSectionMutation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    sectionName: "",
    classId: "",
    teacherId: "",
  });

  const [editState, setEditState] = useState<EditState | null>(null);
  const [editForm, setEditForm] = useState({
    sectionName: "",
    teacherId: "",
  });

  // ── ADD ───────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.sectionName.trim()) {
      toast.error("Section name is required");
      return;
    }
    if (!addForm.classId) {
      toast.error("Please select a class");
      return;
    }
    try {
      await createSection({
        sectionName: addForm.sectionName.trim(),
        classId: addForm.classId,
        teacherId: addForm.teacherId || null,
      }).unwrap();
      toast.success("Section created successfully");
      setShowAddModal(false);
      setAddForm({ sectionName: "", classId: "", teacherId: "" });
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to create section"
      );
    }
  };

  // ── EDIT ──────────────────────────────────────────────────────────────────
  const startEdit = (section: Section, classId: string) => {
    setEditState({ section, classId });
    setEditForm({
      sectionName: section.sectionName,
      teacherId: section.teacherId ?? "",
    });
  };

  const handleUpdate = async () => {
    if (!editState) return;
    if (!editForm.sectionName.trim()) {
      toast.error("Section name is required");
      return;
    }
    try {
      await updateSection({
        id: editState.section.id,
        data: {
          sectionName: editForm.sectionName.trim(),
          teacherId: editForm.teacherId || null,
        },
      }).unwrap();
      toast.success("Section updated successfully");
      setEditState(null);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update section"
      );
    }
  };

  // ── DELETE ────────────────────────────────────────────────────────────────
  const handleDelete = async (section: Section, classId: string) => {
    const parent = classes?.find((c) => c.id === classId);
    if (parent && (parent.sections?.length ?? 0) <= 1) {
      toast.error("Cannot delete the last section of a class");
      return;
    }
    const enrollmentCount = section._count?.enrollments ?? 0;
    if (enrollmentCount > 0) {
      toast.error(
        `Cannot delete: ${enrollmentCount} student(s) are enrolled in this section`
      );
      return;
    }
    if (!confirm(`Delete section "${section.sectionName}"?`)) return;
    try {
      await deleteSection(section.id).unwrap();
      toast.success("Section deleted");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete section"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  if (isError || !classes) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500 text-lg">Failed to load data.</p>
      </div>
    );
  }

  const totalSections = classes.reduce(
    (acc, c) => acc + (c.sections?.length ?? 0),
    0
  );

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Sections ({totalSections})
          </h1>
          <p className="text-gray-500 mt-1">Manage class sections and assign teachers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          <FaPlus size={13} /> Add Section
        </button>
      </div>

      {/* Classes with Sections */}
      {classes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FaLayerGroup size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No classes found. Create a class first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Class Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {cls.className.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{cls.className}</p>
                    <p className="text-xs text-gray-500">
                      {cls.sections?.length ?? 0} section(s) · PKR {cls.montlyFee.toLocaleString()}/mo
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAddForm((f) => ({ ...f, classId: cls.id }));
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                >
                  <FaPlus size={10} /> Add Section
                </button>
              </div>

              {/* Sections Grid */}
              <div className="p-6">
                {!cls.sections || cls.sections.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No sections yet. Add one above.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cls.sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="border border-gray-200 rounded-xl p-4 flex items-start justify-between hover:border-blue-300 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                              {sec.sectionName}
                            </span>
                            <p className="font-semibold text-gray-800 text-sm">
                              Section {sec.sectionName}
                            </p>
                          </div>
                          {sec.teacher ? (
                            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                              <p className="font-medium text-gray-700">
                                {sec.teacher.name}
                              </p>
                              <p>{sec.teacher.designation}</p>
                              <p className="text-gray-400">{sec.teacher.employeeCode}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-orange-500 mt-1">
                              No teacher assigned
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {sec._count?.enrollments ?? 0} enrolled
                          </p>
                        </div>

                        <div className="flex flex-col gap-1.5 ml-2">
                          <button
                            onClick={() => startEdit(sec, cls.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 transition"
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(sec, cls.id)}
                            disabled={isDeleting}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Section Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 relative">
            <button
              onClick={() => {
                setShowAddModal(false);
                setAddForm({ sectionName: "", classId: "", teacherId: "" });
              }}
              className="absolute right-5 top-5 text-gray-400 hover:text-red-500 transition"
            >
              <FaTimes size={18} />
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-6">Add Section</h2>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Class *
                </label>
                <select
                  value={addForm.classId}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, classId: e.target.value }))
                  }
                  className="w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none focus:border-black transition"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={addForm.sectionName}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, sectionName: e.target.value }))
                  }
                  placeholder="e.g. A, B, C"
                  className="w-full h-11 border border-gray-300 rounded-xl px-4 text-sm outline-none focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Assign Teacher (optional)
                </label>
                <select
                  value={addForm.teacherId}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, teacherId: e.target.value }))
                  }
                  className="w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none focus:border-black transition"
                >
                  <option value="">-- No Teacher --</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition disabled:opacity-60"
                >
                  <FaPlus size={12} />
                  {isCreating ? "Creating..." : "Add Section"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddForm({ sectionName: "", classId: "", teacherId: "" });
                  }}
                  className="flex-1 border border-gray-300 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Section Modal ── */}
      {editState && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 relative">
            <button
              onClick={() => setEditState(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-red-500 transition"
            >
              <FaTimes size={18} />
            </button>

            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Edit Section {editState.section.sectionName}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={editForm.sectionName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, sectionName: e.target.value }))
                  }
                  className="w-full h-11 border border-gray-300 rounded-xl px-4 text-sm outline-none focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Assign Teacher
                </label>
                <select
                  value={editForm.teacherId}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, teacherId: e.target.value }))
                  }
                  className="w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none focus:border-black transition"
                >
                  <option value="">-- No Teacher --</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition disabled:opacity-60"
                >
                  <FaSave size={13} />
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditState(null)}
                  className="flex-1 border border-gray-300 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
