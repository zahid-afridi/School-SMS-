"use client";

import PageLoader from "@/app/components/PageLoader";
import StudentIdCard from "@/app/components/StudentIdCard";

import { useEffect, useRef, useState } from "react";
import {
  FaPhone,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaBan,
  FaCamera,
  FaIdCard,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useDeleteStudentMutation,
  useGetStudentByIdQuery,
  useUpdateStudentMutation,
} from "@/redux/features/students/studentApi";
import type { Student } from "@/redux/features/students/studentTypes";

import { resolveUploadUrl } from "@/lib/apiBase";

function resolvePhoto(photo?: string | null): string | null {
  return resolveUploadUrl(photo);
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function StudentModal({
  student,
  onClose,
  initialEditing = false,
}: {
  student: Student;
  onClose: () => void;
  initialEditing?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [showIdCard, setShowIdCard] = useState(false);
  const [removePhoto, setRemovePhoto] = useState(false);

  const { data: fullStudent, isLoading: isLoadingDetails } =
    useGetStudentByIdQuery(student.id);

  const s = fullStudent ?? student;
  const enrollment = s.enrollments?.[0];
  const parents = s.parents ?? [];

  const [form, setForm] = useState({
    registrationNo: s.registrationNo ?? "",
    name: s.name ?? "",
    admissionDate: toDateInput(s.admissionDate),
    contactPhone: s.contactPhone ?? "",
    email: s.email ?? "",
    gender: s.gender ?? "",
    dateOfBirth: toDateInput(s.dateOfBirth),
    bloodGroup: s.bloodGroup ?? "",
    religion: s.religion ?? "",
    nationality: s.nationality ?? "",
    motherTongue: s.motherTongue ?? "",
    familyCode: s.familyCode ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    province: s.province ?? "",
    postalCode: s.postalCode ?? "",
    emergencyPhone: s.emergencyPhone ?? "",
    birthFormId: s.birthFormId ?? "",
    additionalNote: s.additionalNote ?? "",
  });

  const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();
  const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();

  useEffect(() => {
    if (!fullStudent) return;
    setForm({
      registrationNo: fullStudent.registrationNo ?? "",
      name: fullStudent.name ?? "",
      admissionDate: toDateInput(fullStudent.admissionDate),
      contactPhone: fullStudent.contactPhone ?? "",
      email: fullStudent.email ?? "",
      gender: fullStudent.gender ?? "",
      dateOfBirth: toDateInput(fullStudent.dateOfBirth),
      bloodGroup: fullStudent.bloodGroup ?? "",
      religion: fullStudent.religion ?? "",
      nationality: fullStudent.nationality ?? "",
      motherTongue: fullStudent.motherTongue ?? "",
      familyCode: fullStudent.familyCode ?? "",
      address: fullStudent.address ?? "",
      city: fullStudent.city ?? "",
      province: fullStudent.province ?? "",
      postalCode: fullStudent.postalCode ?? "",
      emergencyPhone: fullStudent.emergencyPhone ?? "",
      birthFormId: fullStudent.birthFormId ?? "",
      additionalNote: fullStudent.additionalNote ?? "",
    });
  }, [fullStudent]);

  const displayPhoto = removePhoto
    ? null
    : previewUrl ?? resolvePhoto(s.photoUrl);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhoto(file);
    setRemovePhoto(false);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async () => {
    if (!form.registrationNo.trim() || !form.name.trim() || !form.admissionDate) {
      toast.error("Registration no, name and admission date are required");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== "") formData.append(key, val);
    });
    if (newPhoto) formData.append("photo", newPhoto);
    if (removePhoto) formData.append("removePhoto", "true");

    try {
      await updateStudent({ id: student.id, data: formData }).unwrap();
      toast.success("Student updated successfully");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update student"
      );
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    try {
      await deleteStudent(student.id).unwrap();
      toast.success("Student deleted successfully");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to delete student"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div
        className={`relative max-h-[94dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:max-w-full sm:rounded-2xl sm:p-8 ${
          showIdCard ? "sm:w-[860px]" : "sm:w-[560px]"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="sticky top-0 z-10 ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-xl text-gray-500 shadow-sm backdrop-blur transition hover:text-red-500 print:hidden sm:absolute sm:right-5 sm:top-5 sm:shadow-none"
          aria-label="Close student details"
        >
          <FaTimes />
        </button>

        {showIdCard ? (
          <div className="pt-2 sm:pt-4">
            <h2 className="mb-1 text-center text-xl font-bold text-slate-900 print:hidden sm:text-2xl">
              Student ID Card
            </h2>
            <p className="mb-5 text-center text-sm text-slate-500 print:hidden">
              {s.name} · {s.registrationNo}
            </p>
            {isLoadingDetails && !fullStudent ? (
              <PageLoader compact label="Loading student" />
            ) : (
              <StudentIdCard
                student={s}
                onBack={() => setShowIdCard(false)}
              />
            )}
          </div>
        ) : (
          <>
        <div className="flex justify-center">
          <div
            className={`relative ${isEditing ? "cursor-pointer group" : ""}`}
            onClick={() => isEditing && fileInputRef.current?.click()}
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={s.name}
                className="h-20 w-20 rounded-full border-4 border-blue-500 object-cover sm:h-28 sm:w-28"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://placehold.co/112x112?text=No+Photo";
                }}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600 sm:h-28 sm:w-28 sm:text-5xl">
                {s.name?.charAt(0).toUpperCase() ?? "?"}
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

        <h2 className="mt-3 text-center text-xl font-bold sm:mt-4 sm:text-2xl">{s.name}</h2>
        <p className="text-center text-blue-500 font-medium mb-1">
          {enrollment?.class?.className ?? "No class"}
          {enrollment?.section?.sectionName
            ? ` / ${enrollment.section.sectionName}`
            : ""}
        </p>
        <p className="text-center text-xs text-gray-400 mb-6">
          {s.registrationNo} · {s.status}
        </p>

        {isLoadingDetails && !fullStudent ? (
          <PageLoader compact label="Loading details" />
        ) : !isEditing ? (
          <div className="space-y-4 text-sm text-gray-700">
            <Row
              icon={<FaPhone className="text-blue-400" />}
              label={s.contactPhone || "N/A"}
            />
            <Row
              icon={<FaIdCard className="text-blue-400" />}
              label={s.user?.username || "No login user"}
            />
            <InfoBlock label="Email" value={s.email || s.user?.email} />
            <InfoBlock label="Gender" value={s.gender} />
            <InfoBlock label="Date of Birth" value={toDateInput(s.dateOfBirth)} />
            <InfoBlock label="Admission Date" value={toDateInput(s.admissionDate)} />
            <InfoBlock label="Blood Group" value={s.bloodGroup} />
            <InfoBlock label="Family Code" value={s.familyCode} />
            <InfoBlock label="Address" value={s.address} />
            <InfoBlock
              label="Academic Year"
              value={enrollment?.academicYear}
            />
            <InfoBlock label="Roll No" value={enrollment?.rollNo} />

            {parents.length > 0 && (
              <div className="pt-2 border-t">
                <p className="font-semibold text-gray-800 mb-2">Parents</p>
                {parents.map((link) => (
                  <div key={link.parent.id} className="mb-2 text-sm">
                    <p className="font-medium">
                      {link.parent.name}{" "}
                      <span className="text-gray-400">({link.parent.type})</span>
                    </p>
                    <p className="text-gray-500">
                      {link.parent.mobileNo || "No phone"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-center text-xs text-gray-400 -mt-2 mb-2">
              Click the photo to change it
            </p>
            {s.photoUrl && !removePhoto && (
              <button
                type="button"
                onClick={() => {
                  setRemovePhoto(true);
                  setNewPhoto(null);
                  setPreviewUrl(null);
                }}
                className="w-full text-xs text-red-500 border border-red-200 rounded-lg py-2 hover:bg-red-50"
              >
                Remove current photo
              </button>
            )}
            <Field
              label="Registration No"
              name="registrationNo"
              value={form.registrationNo}
              onChange={handleChange}
            />
            <Field label="Full Name" name="name" value={form.name} onChange={handleChange} />
            <Field
              label="Admission Date"
              name="admissionDate"
              type="date"
              value={form.admissionDate}
              onChange={handleChange}
            />
            <Field
              label="Contact Phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              value={form.email}
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
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
            />
            <Field
              label="Blood Group"
              name="bloodGroup"
              value={form.bloodGroup}
              onChange={handleChange}
            />
            <Field
              label="Religion"
              name="religion"
              value={form.religion}
              onChange={handleChange}
            />
            <Field
              label="Nationality"
              name="nationality"
              value={form.nationality}
              onChange={handleChange}
            />
            <Field
              label="Family Code"
              name="familyCode"
              value={form.familyCode}
              onChange={handleChange}
            />
            <Field
              label="Emergency Phone"
              name="emergencyPhone"
              value={form.emergencyPhone}
              onChange={handleChange}
            />
            <div>
              <label className="block text-gray-500 mb-1">Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:gap-3">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setShowIdCard(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <FaIdCard /> ID Card
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-3 text-white transition hover:bg-neutral-800"
              >
                <FaEdit /> Update
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-3 text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                <FaTrash />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-3 text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                <FaSave />
                {isUpdating ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setNewPhoto(null);
                  setPreviewUrl(null);
                  setRemovePhoto(false);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black py-3 text-white transition hover:bg-neutral-800"
              >
                <FaBan /> Cancel
              </button>
            </>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
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
  if (!value) return null;
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p>{value}</p>
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
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
