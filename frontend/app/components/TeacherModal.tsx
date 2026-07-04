"use client";

import { useState, useRef } from "react";
import {
  useDeleteTeacherMutation,
  useUpdateTeacherMutation,
  useGetTeacherByIdQuery,
} from "@/redux/features/teachers/teacherApi";
import {
  FaPhone,
  FaBriefcase,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaBan,
  FaCamera,
} from "react-icons/fa";
import toast from "react-hot-toast";
import type { Teacher } from "@/redux/features/teachers/teacherTypes";

const IMAGE_BASE = "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http") ? photo : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
}

export default function TeacherModal({
  teacher,
  onClose,
}: {
  teacher: Teacher;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // fetch full details on open
  const { data: fullTeacher, isLoading: isLoadingDetails } =
    useGetTeacherByIdQuery(teacher.id);

  const t = fullTeacher ?? teacher;

  const [form, setForm] = useState({
    name: t.name ?? "",
    fatherOrHusbandName: t.fatherOrHusbandName ?? "",
    designation: t.designation ?? "",
    phone: t.phone ?? "",
    gender: t.gender ?? "",
    experience: t.experience ?? "",
    nationalId: t.nationalId ?? "",
    religion: t.religion ?? "",
    education: t.education ?? "",
    bloodGroup: t.bloodGroup ?? "",
    dateOfBirth: t.dateOfBirth ?? "",
    address: t.address ?? "",
    salary: String(t.salary ?? ""),
    joiningDate: t.joiningDate ?? "",
  });

  const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();

  const teacherId = teacher.id;
  const displayPhoto = previewUrl ?? resolvePhoto(t.photoUrl);

  // sync form when full data arrives
  const [formSynced, setFormSynced] = useState(false);
  if (fullTeacher && !formSynced) {
    setForm({
      name: fullTeacher.name ?? "",
      fatherOrHusbandName: fullTeacher.fatherOrHusbandName ?? "",
      designation: fullTeacher.designation ?? "",
      phone: fullTeacher.phone ?? "",
      gender: fullTeacher.gender ?? "",
      experience: fullTeacher.experience ?? "",
      nationalId: fullTeacher.nationalId ?? "",
      religion: fullTeacher.religion ?? "",
      education: fullTeacher.education ?? "",
      bloodGroup: fullTeacher.bloodGroup ?? "",
      dateOfBirth: fullTeacher.dateOfBirth ?? "",
      address: fullTeacher.address ?? "",
      salary: String(fullTeacher.salary ?? ""),
      joiningDate: fullTeacher.joiningDate ?? "",
    });
    setFormSynced(true);
  }

  // ── PHOTO PICK ────────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ── FORM CHANGE ───────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── UPDATE ────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!teacherId) { toast.error("Teacher ID not found"); return; }
    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== "") formData.append(key, val);
    });
    if (newPhoto) formData.append("photo", newPhoto);
    try {
      await updateTeacher({ id: teacherId, data: formData }).unwrap();
      toast.success("Teacher updated successfully");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update teacher"
      );
    }
  };

  // ── DELETE ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!teacherId) { toast.error("Teacher ID not found"); return; }
    if (!confirm(`Delete ${t.name}? This cannot be undone.`)) return;
    try {
      await deleteTeacher(teacherId).unwrap();
      toast.success("Teacher deleted successfully");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete teacher"
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-[520px] max-w-full shadow-2xl relative p-8 max-h-[90vh] overflow-y-auto">

        {/* Close */}
        <button onClick={onClose} className="absolute right-5 top-5 text-xl text-gray-400 hover:text-red-500 transition">
          <FaTimes />
        </button>

        {/* Photo */}
        <div className="flex justify-center">
          <div
            className={`relative ${isEditing ? "cursor-pointer group" : ""}`}
            onClick={() => isEditing && fileInputRef.current?.click()}
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={t.name ?? "Teacher"}
                className="w-28 h-28 rounded-full object-cover border-4 border-blue-500"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://placehold.co/112x112?text=No+Photo";
                }}
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-blue-100 flex justify-center items-center text-5xl font-bold text-blue-600">
                {t.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <FaCamera className="text-white text-2xl" />
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        <h2 className="text-center text-2xl font-bold mt-4">{t.name}</h2>
        <p className="text-center text-blue-500 font-medium mb-6">{t.designation}</p>

        {isLoadingDetails && !fullTeacher ? (
          <p className="text-center text-gray-400 text-sm py-4">Loading details...</p>
        ) : !isEditing ? (
          /* ── VIEW MODE ── */
          <div className="space-y-4 text-sm text-gray-700">
            <Row icon={<FaPhone className="text-blue-400" />} label={t.phone || "N/A"} />
            <Row icon={<FaBriefcase className="text-blue-400" />} label={`${t.experience || 0} Years Experience`} />
            <InfoBlock label="Father / Husband" value={t.fatherOrHusbandName} />
            <InfoBlock label="Gender" value={t.gender} />
            <InfoBlock label="National ID" value={t.nationalId} />
            <InfoBlock label="Religion" value={t.religion} />
            <InfoBlock label="Education" value={t.education} />
            <InfoBlock label="Blood Group" value={t.bloodGroup} />
            <InfoBlock label="Date of Birth" value={t.dateOfBirth} />
            <InfoBlock label="Joining Date" value={t.joiningDate} />
            <InfoBlock label="Address" value={t.address} />
          </div>
        ) : (
          /* ── EDIT MODE ── */
          <div className="space-y-3 text-sm">
            <p className="text-center text-xs text-gray-400 -mt-2 mb-2">Click the photo to change it</p>
            <Field label="Full Name" name="name" value={form.name} onChange={handleChange} />
            <Field label="Father / Husband Name" name="fatherOrHusbandName" value={form.fatherOrHusbandName} onChange={handleChange} />
            <Field label="Designation" name="designation" value={form.designation} onChange={handleChange} />
            <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />
            <div>
              <label className="block text-gray-500 mb-1">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <Field label="Experience (years)" name="experience" value={form.experience} onChange={handleChange} />
            <Field label="National ID" name="nationalId" value={form.nationalId} onChange={handleChange} />
            <Field label="Religion" name="religion" value={form.religion} onChange={handleChange} />
            <Field label="Education" name="education" value={form.education} onChange={handleChange} />
            <Field label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} />
            <Field label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
            <Field label="Address" name="address" value={form.address} onChange={handleChange} />
            <Field label="Salary" name="salary" type="number" value={form.salary} onChange={handleChange} />
            <Field label="Joining Date" name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition">
                <FaEdit /> Update
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed">
                <FaTrash />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleUpdate} disabled={isUpdating}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed">
                <FaSave />
                {isUpdating ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setIsEditing(false); setPreviewUrl(null); setNewPhoto(null); }} disabled={isUpdating}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition">
                <FaBan /> Cancel
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-500">{value || "N/A"}</p>
    </div>
  );
}

function Field({
  label, name, value, onChange, type = "text",
}: {
  label: string;
  name: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-gray-500 mb-1">{label}</label>
      <input type={type} name={name} value={value ?? ""} onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
    </div>
  );
}
