"use client";

import PageLoader from "@/app/components/PageLoader";

import { useState, useRef, useEffect } from "react";
import { FaCog, FaCamera, FaSyncAlt, FaTrash, FaGlobe, FaPhone, FaEnvelope, FaMapMarkerAlt, FaSchool, FaCheckCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { useGetMySchoolQuery, useUpdateSchoolMutation, useDeleteSchoolMutation } from "@/redux/features/settings/SettingApi";

import { resolveUploadUrl } from "@/lib/apiBase";

function resolveUrl(url?: string | null) {
  return resolveUploadUrl(url);
}

export default function SettingsPage() {
  const { data: school, isLoading, isError } = useGetMySchoolQuery();
  const [updateSchool, { isLoading: isUpdating }] = useUpdateSchoolMutation();
  const [deleteSchool, { isLoading: isDeleting }] = useDeleteSchoolMutation();

  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", email: "", website: "", address: "" });

  useEffect(() => {
    if (school) {
      setForm({
        name: school.name ?? "",
        phone: school.phone ?? "",
        email: school.email ?? "",
        website: school.website ?? "",
        address: school.address ?? "",
      });
    }
  }, [school]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    if (!form.name.trim()) { toast.error("School name is required"); return; }

    const fd = new FormData();
    fd.append("name", form.name.trim());
    if (form.phone.trim()) fd.append("phone", form.phone.trim());
    if (form.email.trim()) fd.append("email", form.email.trim());
    if (form.website.trim()) fd.append("website", form.website.trim());
    if (form.address.trim()) fd.append("address", form.address.trim());
    if (logoFile) fd.append("logo", logoFile);
    if (coverFile) fd.append("cover", coverFile);

    try {
      await updateSchool({ id: school.id, formData: fd }).unwrap();
      toast.success("School profile updated successfully");
      setLogoFile(null);
      setCoverFile(null);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message ?? "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!school?.id) return;
    try {
      await deleteSchool(school.id).unwrap();
      toast.success("School deleted");
      setShowDeleteModal(false);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message ?? "Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <PageLoader compact label="Loading settings" />
      </div>
    );
  }

  if (isError || !school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-lg">Failed to load school data.</p>
      </div>
    );
  }

  const logoSrc = logoPreview ?? resolveUrl(school.logoUrl);
  const coverSrc = coverPreview ?? resolveUrl(school.coverUrl);

  return (
    <div className="w-full min-w-0">
      {/* Breadcrumb */}
      <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2 text-sm text-gray-500 sm:mb-6">
        <FaCog size={13} className="shrink-0" />
        <span>General Settings</span>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-800">School Profile</span>
      </div>

      <form onSubmit={handleUpdate} className="mx-auto max-w-5xl space-y-6">

        {/* Cover + Logo card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div
            className="group relative h-36 cursor-pointer bg-gradient-to-r from-slate-700 to-slate-900 sm:h-44"
            onClick={() => coverRef.current?.click()}
          >
            {coverSrc ? (
              <img src={coverSrc} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-sm text-white/30">Click to upload cover image</p>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
              <FaCamera size={16} /> Change Cover
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>

          <div className="px-4 pb-5 sm:px-8 sm:pb-6">
            <div className="-mt-10 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
              <div
                className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md"
                onClick={() => logoRef.current?.click()}
              >
                {logoSrc ? (
                  <img src={logoSrc} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                    <FaSchool className="text-gray-400" size={28} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <FaCamera className="text-white" size={14} />
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <h2 className="break-words text-lg font-bold text-gray-900 sm:text-xl">{school.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${school.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                    <span className="text-xs text-gray-500">{school.isActive ? "Active" : "Inactive"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                    <FaCheckCircle className="text-emerald-400" size={12} />
                    <span className="font-mono">{school.id.slice(0, 8)}...</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-8">
          <h3 className="mb-6 flex items-center gap-2 text-base font-bold text-gray-800">
            <FaCog size={14} className="text-gray-400" /> School Information
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="School Name" name="name" value={form.name} onChange={handleChange}
              icon={<FaSchool size={13} className="text-gray-400" />} placeholder="e.g. Sunrise Academy" required />
            <Field label="Phone Number" name="phone" value={form.phone} onChange={handleChange}
              icon={<FaPhone size={13} className="text-gray-400" />} placeholder="+92 300 0000000" />
            <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange}
              icon={<FaEnvelope size={13} className="text-gray-400" />} placeholder="school@example.com" />
            <Field label="Website" name="website" value={form.website} onChange={handleChange}
              icon={<FaGlobe size={13} className="text-gray-400" />} placeholder="https://school.com" />
            <div className="md:col-span-2">
              <Field label="Address" name="address" value={form.address} onChange={handleChange}
                icon={<FaMapMarkerAlt size={13} className="text-gray-400" />} placeholder="123 School Street, City" />
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Logo (JPG/PNG, max 500KB) and Cover (JPG/PNG, max 2MB) — click the images above to change them.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 sm:w-auto"
          >
            <FaTrash size={13} /> Delete School
          </button>

          <button
            type="submit"
            disabled={isUpdating}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <FaSyncAlt size={13} className={isUpdating ? "animate-spin" : ""} />
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <FaTrash className="text-red-500" size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete School?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete{" "}
              <span className="font-semibold text-gray-800">{school.name}</span>{" "}
              and all related data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-black hover:bg-neutral-800 text-white py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-black hover:bg-neutral-800 text-white py-2.5 rounded-xl font-semibold text-sm transition"
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

function Field({
  label, name, value, onChange, icon, placeholder, type = "text", required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-11 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition bg-gray-50 focus:bg-white ${icon ? "pl-9 pr-4" : "px-4"}`}
        />
      </div>
    </div>
  );
}
