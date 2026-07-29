"use client";

import PageLoader from "@/app/components/PageLoader";

import { useState, useRef, useEffect } from "react";
import {
  useDeleteTeacherMutation,
  useUpdateTeacherMutation,
  useGetTeacherByIdQuery,
} from "@/redux/features/teachers/teacherApi";
import {
  CREATABLE_DESIGNATIONS,
  DESIGNATION_LABELS,
  type EmployeeDesignation,
  type Teacher,
} from "@/redux/features/teachers/teacherTypes";
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

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http")
    ? photo
    : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function designationLabel(value?: string | null): string {
  if (!value) return "N/A";
  return DESIGNATION_LABELS[value as EmployeeDesignation] ?? value;
}

function formFromTeacher(t: Teacher) {
  return {
    name: t.name ?? "",
    fatherOrHusbandName: t.fatherOrHusbandName ?? "",
    designation: t.designation === "PRINCIPAL" ? "PRINCIPAL" : (t.designation || "TEACHER"),
    phone: t.phone ?? "",
    gender: t.gender ?? "",
    experience: String(t.experience ?? ""),
    nationalId: t.nationalId ?? "",
    religion: t.religion ?? "",
    education: t.education ?? "",
    bloodGroup: t.bloodGroup ?? "",
    dateOfBirth: toDateInput(t.dateOfBirth),
    address: t.address ?? "",
    salary: String(t.salary ?? ""),
    joiningDate: toDateInput(t.joiningDate),
  };
}

export default function TeacherModal({
  teacher,
  onClose,
  initialEditing = false,
}: {
  teacher: Teacher;
  onClose: () => void;
  initialEditing?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEditing);

  const { data: fullTeacher, isLoading: isLoadingDetails } =
    useGetTeacherByIdQuery(teacher.id);

  const t = fullTeacher ?? teacher;
  const [form, setForm] = useState(() => formFromTeacher(t));

  useEffect(() => {
    if (fullTeacher) {
      setForm(formFromTeacher(fullTeacher));
    }
  }, [fullTeacher]);

  const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();

  const teacherId = teacher.id;
  const displayPhoto = removePhoto
    ? null
    : previewUrl ?? resolvePhoto(t.photoUrl);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async () => {
    if (!teacherId) {
      toast.error("Teacher ID not found");
      return;
    }
    if (!form.name.trim() || !form.designation || !form.joiningDate || !form.salary) {
      toast.error("Name, designation, joining date, and salary are required");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== "") formData.append(key, val);
    });
    if (newPhoto) formData.append("photo", newPhoto);
    if (removePhoto && !newPhoto) formData.append("removePhoto", "true");

    try {
      await updateTeacher({ id: teacherId, data: formData }).unwrap();
      toast.success("Employee updated successfully");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update employee"
      );
    }
  };

  const handleDelete = async () => {
    if (!teacherId) {
      toast.error("Employee ID not found");
      return;
    }
    if (!confirm(`Delete ${t.name}? This cannot be undone.`)) return;
    try {
      await deleteTeacher(teacherId).unwrap();
      toast.success("Employee deleted successfully");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete employee"
      );
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setPreviewUrl(null);
    setNewPhoto(null);
    setRemovePhoto(false);
    setForm(formFromTeacher(t));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl w-[520px] max-w-full shadow-2xl relative p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-xl text-gray-400 hover:text-red-500 transition"
        >
          <FaTimes />
        </button>

        <div className="flex justify-center">
          <div
            className={`relative ${isEditing ? "cursor-pointer group" : ""}`}
            onClick={() => isEditing && fileInputRef.current?.click()}
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={t.name ?? "Employee"}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {isEditing && (displayPhoto || t.photoUrl) && (
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={() => {
                setRemovePhoto(true);
                setNewPhoto(null);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-xs text-red-500 hover:underline"
            >
              Remove photo
            </button>
          </div>
        )}

        <h2 className="text-center text-2xl font-bold mt-4">{t.name}</h2>
        <p className="text-center text-blue-500 font-medium mb-1">
          {designationLabel(t.designation)}
        </p>
        {t.employeeCode && (
          <p className="text-center text-xs text-gray-400 mb-6">
            {t.employeeCode}
          </p>
        )}

        {isLoadingDetails && !fullTeacher ? (
          <PageLoader compact label="Loading details" />
        ) : !isEditing ? (
          <div className="space-y-4 text-sm text-gray-700">
            <Row
              icon={<FaPhone className="text-blue-400" />}
              label={t.phone || "N/A"}
            />
            <Row
              icon={<FaBriefcase className="text-blue-400" />}
              label={`${t.experience ?? 0} Years Experience`}
            />
            <InfoBlock label="Father / Husband" value={t.fatherOrHusbandName} />
            <InfoBlock label="Gender" value={t.gender} />
            <InfoBlock label="National ID" value={t.nationalId} />
            <InfoBlock label="Religion" value={t.religion} />
            <InfoBlock label="Education" value={t.education} />
            <InfoBlock label="Blood Group" value={t.bloodGroup} />
            <InfoBlock
              label="Date of Birth"
              value={formatDisplayDate(t.dateOfBirth)}
            />
            <InfoBlock
              label="Joining Date"
              value={formatDisplayDate(t.joiningDate)}
            />
            <InfoBlock label="Salary" value={`PKR ${t.salary?.toLocaleString?.() ?? t.salary}`} />
            <InfoBlock label="Address" value={t.address} />
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-center text-xs text-gray-400 -mt-2 mb-2">
              Click the photo to change it
            </p>
            <Field
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
            <Field
              label="Father / Husband Name"
              name="fatherOrHusbandName"
              value={form.fatherOrHusbandName}
              onChange={handleChange}
            />
            <div>
              <label className="block text-gray-500 mb-1">Designation</label>
              {t.designation === "PRINCIPAL" ? (
                <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                  Principal
                </div>
              ) : (
                <select
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {CREATABLE_DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {DESIGNATION_LABELS[d]}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <Field
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
            <div>
              <label className="block text-gray-500 mb-1">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <Field
              label="Experience (years)"
              name="experience"
              value={form.experience}
              onChange={handleChange}
            />
            <Field
              label="National ID"
              name="nationalId"
              value={form.nationalId}
              onChange={handleChange}
            />
            <Field
              label="Religion"
              name="religion"
              value={form.religion}
              onChange={handleChange}
            />
            <Field
              label="Education"
              name="education"
              value={form.education}
              onChange={handleChange}
            />
            <Field
              label="Blood Group"
              name="bloodGroup"
              value={form.bloodGroup}
              onChange={handleChange}
            />
            <Field
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
            />
            <Field
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
            <Field
              label="Salary"
              name="salary"
              type="number"
              value={form.salary}
              onChange={handleChange}
            />
            <Field
              label="Joining Date"
              name="joiningDate"
              type="date"
              value={form.joiningDate}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-black hover:bg-neutral-800 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition"
              >
                <FaEdit /> Update
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-black hover:bg-neutral-800 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FaTrash />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 bg-black hover:bg-neutral-800 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FaSave />
                {isUpdating ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={isUpdating}
                className="flex-1 bg-black hover:bg-neutral-800 text-white py-3 rounded-lg flex justify-center items-center gap-2 transition"
              >
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

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-500">{value || "N/A"}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
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
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
