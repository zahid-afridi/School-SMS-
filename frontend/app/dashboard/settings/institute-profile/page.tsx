"use client";

import PageLoader from "@/app/components/PageLoader";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaBuilding, FaCamera, FaGlobe, FaPhone, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import {
  useGetMySchoolQuery,
  useUpdateSchoolMutation,
} from "@/redux/features/school/schoolApi";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolveUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${IMAGE_BASE}/${url.replace(/^\//, "")}`;
}

const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

export default function Page() {
  const { data: school, isLoading, isError } = useGetMySchoolQuery();
  const [updateSchool, { isLoading: isUpdating }] = useUpdateSchoolMutation();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!school) return;
    setForm({
      name: school.name ?? "",
      address: school.address ?? "",
      phone: school.phone ?? "",
      email: school.email ?? "",
      website: school.website ?? "",
    });
    setLogoPreview(resolveUrl(school.logoUrl));
    setCoverPreview(resolveUrl(school.coverUrl));
  }, [school]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(file ? URL.createObjectURL(file) : resolveUrl(school?.logoUrl));
  };

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (coverPreview && coverPreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverPreview(
      file ? URL.createObjectURL(file) : resolveUrl(school?.coverUrl)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) {
      toast.error("School not found");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Institute name is required");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("address", form.address);
    formData.append("phone", form.phone);
    formData.append("email", form.email);
    formData.append("website", form.website);
    if (logoFile) formData.append("logo", logoFile);
    if (coverFile) formData.append("cover", coverFile);

    try {
      const res = await updateSchool({ id: school.id, data: formData }).unwrap();
      toast.success(res.message || "Institute profile updated");
      setLogoFile(null);
      setCoverFile(null);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to update institute profile"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading institute profile" />
      </div>
    );
  }

  if (isError || !school) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-red-500">Failed to load institute profile.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-medium mb-2">
            <FaBuilding /> General Settings
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Institute Profile
          </h1>
          <p className="text-slate-500 mt-1">
            Update your school name, contact details, logo and cover image.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover + logo */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="relative h-44 md:h-56 bg-slate-200">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                  No cover image
                </div>
              )}
              <label className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow cursor-pointer hover:bg-white">
                <FaCamera /> Change Cover
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCover}
                />
              </label>
            </div>

            <div className="px-6 pb-6 -mt-10 relative">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <label className="relative cursor-pointer group w-fit">
                  <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-100 overflow-hidden shadow">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <FaBuilding size={28} />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <FaCamera className="text-white" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogo}
                  />
                </label>
                <div className="pb-1 flex-1 space-y-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {form.name || school.name || "Institute Logo"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {school.isActive ? "Active institute" : "Inactive institute"}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 w-fit">
                    <FaCamera className="text-slate-500" />
                    {logoPreview ? "Change Logo Image" : "Upload Logo Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogo}
                    />
                  </label>
                  <p className="text-xs text-slate-400">
                    Recommended: square PNG/JPG. This logo appears on result cards and the header.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-5">
            <h3 className="text-lg font-semibold text-slate-900">
              Institute Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Institute Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter school / institute name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Logo Image
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaBuilding className="text-slate-300" size={22} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-2">
                      {logoFile
                        ? `Selected: ${logoFile.name}`
                        : logoPreview
                          ? "Current logo is set. Choose a new file to replace it."
                          : "No logo uploaded yet."}
                    </p>
                    <label className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-slate-800">
                      <FaCamera size={12} />
                      {logoPreview ? "Replace Logo" : "Choose Logo Image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogo}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <FaPhone className="text-slate-400" /> Phone
                  </span>
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="+92 300 0000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <FaEnvelope className="text-slate-400" /> Email
                  </span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Unique school contact email"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Must be unique per school (not shared with another institute)
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <FaGlobe className="text-slate-400" /> Website
                  </span>
                </label>
                <input
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="https://www.school.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <FaMapMarkerAlt className="text-slate-400" /> Address
                  </span>
                </label>
                <textarea
                  name="address"
                  rows={3}
                  value={form.address}
                  onChange={handleChange}
                  className={`${inputClass} resize-none`}
                  placeholder="Full institute address"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!school) return;
                  setForm({
                    name: school.name ?? "",
                    address: school.address ?? "",
                    phone: school.phone ?? "",
                    email: school.email ?? "",
                    website: school.website ?? "",
                  });
                  setLogoFile(null);
                  setCoverFile(null);
                  setLogoPreview(resolveUrl(school.logoUrl));
                  setCoverPreview(resolveUrl(school.coverUrl));
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-medium"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
