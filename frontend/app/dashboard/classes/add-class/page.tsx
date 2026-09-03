"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaTrash } from "react-icons/fa";
import toast from "react-hot-toast";
import { useCreateClassMutation } from "@/redux/features/classes/ClassApi";
import { useGetAllTeachersQuery } from "@/redux/features/teachers/teacherApi";
import type { CreateClassRequest } from "@/redux/features/classes/ClassTypes";

interface SectionInput {
  sectionName: string;
  teacherId: string;
}

export default function AddClassPage() {
  const router = useRouter();
  const [createClass, { isLoading }] = useCreateClassMutation();
  const { data: teachers } = useGetAllTeachersQuery({ designation: "TEACHER" });

  const [className, setClassName] = useState("");
  const [montlyFee, setMontlyFee] = useState("");
  const [sections, setSections] = useState<SectionInput[]>([
    { sectionName: "", teacherId: "" },
  ]);

  const addSection = () =>
    setSections((prev) => [...prev, { sectionName: "", teacherId: "" }]);

  const removeSection = (index: number) =>
    setSections((prev) => prev.filter((_, i) => i !== index));

  const updateSection = (
    index: number,
    field: keyof SectionInput,
    value: string
  ) =>
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!className.trim()) {
      toast.error("Class name is required");
      return;
    }
    if (montlyFee === "" || Number.isNaN(Number(montlyFee)) || Number(montlyFee) < 0) {
      toast.error("Enter a valid monthly fee (0 or more)");
      return;
    }

    const validSections = sections.filter((s) => s.sectionName.trim());
    if (validSections.length === 0) {
      toast.error("At least one section is required");
      return;
    }

    const names = validSections.map((s) => s.sectionName.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      toast.error("Section names must be unique");
      return;
    }

    const payload: CreateClassRequest = {
      className: className.trim(),
      montlyFee: Number(montlyFee),
      sections: validSections.map((s) => ({
        sectionName: s.sectionName.trim(),
        teacherId: s.teacherId || null,
      })),
    };

    try {
      await createClass(payload).unwrap();
      toast.success("Class created successfully");
      router.push("/dashboard/classes/all-classes");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to create class"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Class</h1>
            <p className="text-gray-500 text-sm">Fill in the details to create a new class</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6"
        >
          {/* Class Name */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wide text-gray-700 mb-2">
              Class Name *
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Grade 1"
              className="w-full h-12 rounded-xl border border-gray-300 px-4 text-base outline-none focus:border-black transition"
            />
          </div>

          {/* Monthly Fee */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wide text-gray-700 mb-2">
              Monthly Fee (PKR) *
            </label>
            <input
              type="number"
              value={montlyFee}
              onChange={(e) => setMontlyFee(e.target.value)}
              placeholder="e.g. 1500"
              min={0}
              className="w-full h-12 rounded-xl border border-gray-300 px-4 text-base outline-none focus:border-black transition"
            />
          </div>

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                Sections *
              </label>
              <button
                type="button"
                onClick={addSection}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
              >
                <FaPlus size={11} /> Add Section
              </button>
            </div>

            <div className="space-y-3">
              {sections.map((section, index) => (
                <div key={index} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <input
                    type="text"
                    value={section.sectionName}
                    onChange={(e) =>
                      updateSection(index, "sectionName", e.target.value)
                    }
                    placeholder={`Section name (e.g. A)`}
                    className="h-11 w-full flex-1 rounded-xl border border-gray-300 px-4 text-sm outline-none transition focus:border-black"
                  />
                  <select
                    value={section.teacherId}
                    onChange={(e) =>
                      updateSection(index, "teacherId", e.target.value)
                    }
                    className="h-11 w-full flex-1 rounded-xl border border-gray-300 px-3 text-sm outline-none transition focus:border-black"
                  >
                    <option value="">-- No Teacher --</option>
                    {teachers?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.designation})
                      </option>
                    ))}
                  </select>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl border border-red-200 text-red-500 transition hover:bg-red-50 sm:self-start"
                    >
                      <FaTrash size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-11 w-full rounded-xl border border-gray-300 px-6 font-semibold text-gray-700 transition hover:bg-gray-100 sm:w-auto"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-xl bg-black px-8 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isLoading ? "Creating..." : "+ Create Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
