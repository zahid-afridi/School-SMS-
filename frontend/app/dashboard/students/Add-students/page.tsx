"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  FaUserGraduate,
  FaUsers,
  FaSearch,
  FaCheckCircle,
  FaTimes,
  FaCamera,
  FaIdCard,
  FaPhone,
  FaPlus,
} from "react-icons/fa";
import {
  useAddStudentMutation,
  useLazySearchParentsQuery,
} from "@/redux/features/students/studentApi";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import type { ParentSearchResult } from "@/redux/features/students/studentTypes";

type ParentMode = "new" | "existing";

const EMPTY_FORM = {
  registrationNo: "",
  name: "",
  admissionDate: "",
  dateOfBirth: "",
  gender: "",
  contactPhone: "",
  email: "",
  bloodGroup: "",
  religion: "",
  nationality: "",
  motherTongue: "",
  familyCode: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  emergencyPhone: "",
  previousSchool: "",
  previousClass: "",
  previousRollNo: "",
  birthFormId: "",
  additionalNote: "",
  classId: "",
  sectionId: "",
  academicYear: "2025-2026",
  rollNo: "",
  feeDiscount: "0",
  fatherName: "",
  fatherMobile: "",
  fatherCnic: "",
  fatherOccupation: "",
  motherName: "",
  motherMobile: "",
  motherCnic: "",
  photo: null as File | null,
};

const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition";

export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [parentMode, setParentMode] = useState<ParentMode>("new");
  const [parentSearch, setParentSearch] = useState("");
  const [cnicSearch, setCnicSearch] = useState("");
  const [selectedParents, setSelectedParents] = useState<ParentSearchResult[]>(
    []
  );
  const [primaryParentId, setPrimaryParentId] = useState<string>("");

  const [addStudent, { isLoading }] = useAddStudentMutation();
  const { data: classes = [], isLoading: classesLoading } =
    useGetAllClassesQuery();
  const [searchParents, { data: searchResults = [], isFetching: isSearching }] =
    useLazySearchParentsQuery();

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === form.classId) ?? null,
    [classes, form.classId]
  );

  useEffect(() => {
    const term = parentSearch.trim();
    const cnic = cnicSearch.trim();
    if (parentMode !== "existing") return;
    if (term.length < 2 && cnic.length < 4) return;

    const timer = setTimeout(() => {
      searchParents({
        ...(term.length >= 2 ? { search: term } : {}),
        ...(cnic.length >= 4 ? { nationalId: cnic } : {}),
        limit: 20,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [parentSearch, cnicSearch, parentMode, searchParents]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "classId") return { ...prev, classId: value, sectionId: "" };
      return { ...prev, [name]: value };
    });
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, photo: file }));
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const toggleParent = (parent: ParentSearchResult) => {
    setSelectedParents((prev) => {
      const exists = prev.some((p) => p.id === parent.id);
      if (exists) {
        const next = prev.filter((p) => p.id !== parent.id);
        if (primaryParentId === parent.id) {
          setPrimaryParentId(next[0]?.id ?? "");
        }
        return next;
      }
      if (prev.length === 0) setPrimaryParentId(parent.id);
      return [...prev, parent];
    });
  };

  const validate = (): string | null => {
    if (!form.registrationNo.trim()) return "Registration number is required";
    if (!form.name.trim()) return "Student name is required";
    if (!form.admissionDate) return "Admission date is required";
    if (!form.classId) return "Class is required";
    if (!form.academicYear.trim()) return "Academic year is required";

    if (parentMode === "new") {
      if (!form.fatherName.trim() && !form.motherName.trim()) {
        return "Add at least one parent (father or mother)";
      }
    } else if (selectedParents.length === 0) {
      return "Select at least one existing parent";
    }

    return null;
  };

  const resetAll = () => {
    setForm(EMPTY_FORM);
    setPhotoPreview(null);
    setSelectedParents([]);
    setPrimaryParentId("");
    setParentSearch("");
    setCnicSearch("");
    setParentMode("new");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const formData = new FormData();
    formData.append("registrationNo", form.registrationNo.trim());
    formData.append("name", form.name.trim());
    formData.append("admissionDate", form.admissionDate);
    formData.append("classId", form.classId);
    formData.append("academicYear", form.academicYear.trim());

    if (parentMode === "existing") {
      formData.append("existing", "true");
      formData.append(
        "parentIds",
        JSON.stringify(selectedParents.map((p) => p.id))
      );
      if (primaryParentId) formData.append("primaryParentId", primaryParentId);
    } else {
      const parents = [];
      if (form.fatherName.trim()) {
        parents.push({
          name: form.fatherName.trim(),
          type: "FATHER",
          mobileNo: form.fatherMobile || undefined,
          nationalId: form.fatherCnic || undefined,
          occupation: form.fatherOccupation || undefined,
          isPrimaryGuardian: true,
          isEmergencyContact: true,
        });
      }
      if (form.motherName.trim()) {
        parents.push({
          name: form.motherName.trim(),
          type: "MOTHER",
          mobileNo: form.motherMobile || undefined,
          nationalId: form.motherCnic || undefined,
          isPrimaryGuardian: !form.fatherName.trim(),
          isEmergencyContact: !form.fatherName.trim(),
        });
      }
      formData.append("existing", "false");
      formData.append("parents", JSON.stringify(parents));
    }

    const optionalFields: Array<[string, string]> = [
      ["sectionId", form.sectionId],
      ["rollNo", form.rollNo],
      ["feeDiscount", form.feeDiscount || "0"],
      ["contactPhone", form.contactPhone],
      ["email", form.email],
      ["dateOfBirth", form.dateOfBirth],
      ["gender", form.gender],
      ["bloodGroup", form.bloodGroup],
      ["religion", form.religion],
      ["nationality", form.nationality],
      ["motherTongue", form.motherTongue],
      ["familyCode", form.familyCode],
      ["address", form.address],
      ["city", form.city],
      ["province", form.province],
      ["postalCode", form.postalCode],
      ["emergencyPhone", form.emergencyPhone],
      ["previousSchool", form.previousSchool],
      ["previousClass", form.previousClass],
      ["previousRollNo", form.previousRollNo],
      ["birthFormId", form.birthFormId],
      ["additionalNote", form.additionalNote],
    ];

    optionalFields.forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    if (form.photo) formData.append("photo", form.photo);

    try {
      const res = await addStudent(formData).unwrap();
      const creds = res.data.credentials;
      toast.success(
        `${res.message}. Login: ${creds.username} / ${creds.password}`
      );
      resetAll();
      router.push("/dashboard/students");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to add student"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5 sm:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 text-blue-700 px-3 py-1 text-xs font-semibold mb-3">
            <FaUserGraduate />
            New Admission
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            Student Registration
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Create a student profile, assign class/section, and link new or
            existing parents by CNIC, name, or mobile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student + photo */}
          <Section
            title="Student Information"
            subtitle="Basic identity and contact details"
            icon={<FaUserGraduate className="text-blue-600" />}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
              <div className="flex flex-col items-center">
                <label className="relative group cursor-pointer">
                  <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-slate-400 p-3">
                        <FaCamera className="mx-auto text-2xl mb-2" />
                        <p className="text-xs">Upload photo</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImage}
                  />
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, photo: null }));
                      setPhotoPreview(null);
                    }}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field
                  label="Registration No *"
                  name="registrationNo"
                  value={form.registrationNo}
                  onChange={handleChange}
                  placeholder="REG-001"
                />
                <Field
                  label="Full Name *"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Student name"
                />
                <Field
                  label="Admission Date *"
                  name="admissionDate"
                  type="date"
                  value={form.admissionDate}
                  onChange={handleChange}
                />
                <Field
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                />
                <Select
                  label="Gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  options={[
                    { value: "", label: "Select Gender" },
                    { value: "MALE", label: "Male" },
                    { value: "FEMALE", label: "Female" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
                <Field
                  label="Contact Phone"
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={handleChange}
                  placeholder="+92 300 1234567"
                />
                <Field
                  label="Email (login if provided)"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="student@gmail.com"
                />
                <Select
                  label="Blood Group"
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={handleChange}
                  options={[
                    { value: "", label: "Select" },
                    ...["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                      (g) => ({ value: g, label: g })
                    ),
                  ]}
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
                  label="Mother Tongue"
                  name="motherTongue"
                  value={form.motherTongue}
                  onChange={handleChange}
                />
                <Field
                  label="Family Code"
                  name="familyCode"
                  value={form.familyCode}
                  onChange={handleChange}
                  placeholder="Shared sibling code"
                />
                <Field
                  label="B-Form / Birth ID"
                  name="birthFormId"
                  value={form.birthFormId}
                  onChange={handleChange}
                />
                <Field
                  label="Emergency Phone"
                  name="emergencyPhone"
                  value={form.emergencyPhone}
                  onChange={handleChange}
                />
                <div className="md:col-span-2 xl:col-span-3">
                  <label className="block mb-2 text-sm font-medium text-slate-700">
                    Address
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    value={form.address}
                    onChange={handleChange}
                    className={`${inputClass} resize-none`}
                    placeholder="Home address"
                  />
                </div>
                <Field label="City" name="city" value={form.city} onChange={handleChange} />
                <Field
                  label="Province"
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                />
                <Field
                  label="Postal Code"
                  name="postalCode"
                  value={form.postalCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </Section>

          {/* Enrollment */}
          <Section
            title="Enrollment"
            subtitle="Assign class, section and academic year"
            icon={<FaPlus className="text-blue-600" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Select
                label="Class *"
                name="classId"
                value={form.classId}
                onChange={handleChange}
                disabled={classesLoading}
                options={[
                  { value: "", label: "Select Class" },
                  ...classes.map((c) => ({
                    value: c.id,
                    label: c.className,
                  })),
                ]}
              />
              <Select
                label="Section"
                name="sectionId"
                value={form.sectionId}
                onChange={handleChange}
                disabled={!selectedClass}
                options={[
                  { value: "", label: "Select Section" },
                  ...(selectedClass?.sections.map((s) => ({
                    value: s.id,
                    label: s.sectionName,
                  })) ?? []),
                ]}
              />
              <Field
                label="Academic Year *"
                name="academicYear"
                value={form.academicYear}
                onChange={handleChange}
                placeholder="2025-2026"
              />
              <Field
                label="Roll No"
                name="rollNo"
                value={form.rollNo}
                onChange={handleChange}
              />
              <Field
                label="Fee Discount (%)"
                name="feeDiscount"
                type="number"
                value={form.feeDiscount}
                onChange={handleChange}
              />
              <Field
                label="Previous School"
                name="previousSchool"
                value={form.previousSchool}
                onChange={handleChange}
              />
              <Field
                label="Previous Class"
                name="previousClass"
                value={form.previousClass}
                onChange={handleChange}
              />
              <Field
                label="Previous Roll No"
                name="previousRollNo"
                value={form.previousRollNo}
                onChange={handleChange}
              />
            </div>
          </Section>

          {/* Parents */}
          <Section
            title="Parent / Guardian"
            subtitle="Create new parents or link existing ones by CNIC, name, or mobile"
            icon={<FaUsers className="text-blue-600" />}
          >
            <div className="flex flex-wrap gap-2 mb-5">
              <ModeButton
                active={parentMode === "new"}
                onClick={() => setParentMode("new")}
                label="Add New Parents"
              />
              <ModeButton
                active={parentMode === "existing"}
                onClick={() => setParentMode("existing")}
                label="Link Existing Parents"
              />
            </div>

            {parentMode === "new" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <h3 className="font-semibold text-slate-800">Father</h3>
                  <Field
                    label="Father Name *"
                    name="fatherName"
                    value={form.fatherName}
                    onChange={handleChange}
                  />
                  <Field
                    label="Mobile"
                    name="fatherMobile"
                    value={form.fatherMobile}
                    onChange={handleChange}
                  />
                  <Field
                    label="CNIC"
                    name="fatherCnic"
                    value={form.fatherCnic}
                    onChange={handleChange}
                    placeholder="xxxxx-xxxxxxx-x"
                  />
                  <Field
                    label="Occupation"
                    name="fatherOccupation"
                    value={form.fatherOccupation}
                    onChange={handleChange}
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <h3 className="font-semibold text-slate-800">Mother</h3>
                  <Field
                    label="Mother Name"
                    name="motherName"
                    value={form.motherName}
                    onChange={handleChange}
                  />
                  <Field
                    label="Mobile"
                    name="motherMobile"
                    value={form.motherMobile}
                    onChange={handleChange}
                  />
                  <Field
                    label="CNIC"
                    name="motherCnic"
                    value={form.motherCnic}
                    onChange={handleChange}
                    placeholder="xxxxx-xxxxxxx-x"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      placeholder="Search by name or mobile..."
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                  <div className="relative">
                    <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={cnicSearch}
                      onChange={(e) => setCnicSearch(e.target.value)}
                      placeholder="Search exact CNIC..."
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>

                {selectedParents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedParents.map((parent) => (
                      <span
                        key={parent.id}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-3 py-1.5 text-xs font-medium"
                      >
                        {parent.name}
                        {primaryParentId === parent.id && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleParent(parent)}
                          className="hover:text-red-200"
                        >
                          <FaTimes />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {isSearching ? (
                    <p className="p-4 text-sm text-slate-500">Searching...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      Type a name, mobile, or CNIC to find existing parents.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {searchResults.map((parent) => {
                        const selected = selectedParents.some(
                          (p) => p.id === parent.id
                        );
                        const linkedNames =
                          parent.students
                            ?.map((s) => s.student.name)
                            .join(", ") || "No linked students";

                        return (
                          <li
                            key={parent.id}
                            className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                              selected ? "bg-blue-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-slate-800">
                                {parent.name}{" "}
                                <span className="text-xs font-medium text-slate-400">
                                  ({parent.type})
                                </span>
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <FaIdCard /> {parent.nationalId || "No CNIC"}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <FaPhone /> {parent.mobileNo || "No mobile"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                Linked: {linkedNames}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {selected && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryParentId(parent.id)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border ${
                                    primaryParentId === parent.id
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : "border-slate-200 text-slate-600 hover:bg-white"
                                  }`}
                                >
                                  {primaryParentId === parent.id
                                    ? "Primary"
                                    : "Make Primary"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleParent(parent)}
                                className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium ${
                                  selected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-900 text-white hover:bg-slate-700"
                                }`}
                              >
                                {selected ? (
                                  <>
                                    <FaCheckCircle /> Selected
                                  </>
                                ) : (
                                  "Select"
                                )}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </Section>

          <Section title="Additional Note" subtitle="Optional remarks">
            <textarea
              name="additionalNote"
              rows={3}
              value={form.additionalNote}
              onChange={handleChange}
              className={`${inputClass} resize-none`}
              placeholder="Any extra notes about this student..."
            />
          </Section>

          <div className="sticky bottom-2 z-10 flex flex-col-reverse justify-end gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xl backdrop-blur sm:bottom-4 sm:flex-row sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <button
              type="button"
              onClick={resetAll}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="min-h-11 w-full rounded-xl bg-blue-600 px-8 py-3 font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
            >
              {isLoading ? "Saving..." : "Save Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${inputClass} disabled:bg-slate-100`}
      >
        {options.map((opt) => (
          <option key={`${opt.value}-${opt.label}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
