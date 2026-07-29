"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  FaBriefcase,
  FaCamera,
  FaGraduationCap,
  FaUserTie,
} from "react-icons/fa";

import { useRegisterTeacherMutation } from "@/redux/features/teachers/teacherApi";
import {
  CREATABLE_DESIGNATIONS,
  DESIGNATION_LABELS,
} from "@/redux/features/teachers/teacherTypes";

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const RELIGIONS = [
  "Islam",
  "Christianity",
  "Hinduism",
  "Sikhism",
  "Buddhism",
  "Other",
];

const EMPTY_FORM = {
  fullName: "",
  fatherName: "",
  gender: "",
  dob: "",
  bloodGroup: "",
  cnic: "",
  phone: "",
  nationality: "Pakistani",
  religion: "",
  address: "",
  designation: "TEACHER",
  salary: "",
  experience: "",
  joiningDate: "",
  qualification: "",
  university: "",
  passingYear: "",
  certifications: "",
  photo: null as File | null,
};

const inputClass =
  "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition";

export default function EmployeeForm() {
  const [teacher, setTeacher] = useState(EMPTY_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [registerTeacher, { isLoading }] = useRegisterTeacherMutation();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setTeacher((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setTeacher((prev) => ({
        ...prev,
        photo: null,
      }));

      setPhotoPreview(null);
      return;
    }

    setTeacher((prev) => ({
      ...prev,
      photo: file,
    }));

    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setTeacher((prev) => ({
      ...prev,
      photo: null,
    }));

    setPhotoPreview(null);
  };

  const validateForm = (): string | null => {
    if (!teacher.fullName.trim()) {
      return "Full name is required";
    }

    if (!teacher.designation) {
      return "Designation is required";
    }

    if (!teacher.salary) {
      return "Salary is required";
    }

    if (Number(teacher.salary) < 0) {
      return "Salary cannot be negative";
    }

    if (!teacher.joiningDate) {
      return "Joining date is required";
    }

    if (
      teacher.gender &&
      !["MALE", "FEMALE", "OTHER"].includes(teacher.gender)
    ) {
      return "Invalid gender";
    }

    return null;
  };

  const handleSubmitTeacher = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const error = validateForm();

    if (error) {
      toast.error(error);
      return;
    }

    const formData = new FormData();

    formData.append("name", teacher.fullName.trim());
    formData.append(
      "fatherOrHusbandName",
      teacher.fatherName.trim()
    );
    formData.append("designation", teacher.designation);
    formData.append("joiningDate", teacher.joiningDate);
    formData.append("salary", teacher.salary);
    formData.append("phone", teacher.phone.trim());

    if (teacher.gender) {
      formData.append("gender", teacher.gender);
    }

    formData.append("experience", teacher.experience);
    formData.append("nationalId", teacher.cnic.trim());
    formData.append("religion", teacher.religion.trim());
    formData.append("education", teacher.qualification.trim());
    formData.append("bloodGroup", teacher.bloodGroup.trim());

    if (teacher.dob) {
      formData.append("dateOfBirth", teacher.dob);
    }

    formData.append("address", teacher.address.trim());

    if (teacher.photo) {
      formData.append("photo", teacher.photo);
    }

    try {
      const res = await registerTeacher(formData).unwrap();

      const credentials = res.data?.credentials;

      if (credentials) {
        toast.success(
          `${res.message}. Login: ${credentials.username} / ${credentials.password}`
        );
      } else {
        toast.success(res.message || "Employee registered successfully");
      }

      setTeacher(EMPTY_FORM);
      setPhotoPreview(null);
    } catch (err: unknown) {
      const errorMessage =
        (
          err as {
            data?: {
              message?: string;
            };
          }
        )?.data?.message ?? "Something went wrong";

      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 text-blue-700 px-3 py-1 text-xs font-semibold mb-3">
            <FaUserTie />
            Staff Onboarding
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Employee Registration
          </h1>

          <p className="text-slate-500 mt-2 max-w-2xl">
            Add teachers, accountants, librarians, and other staff.
            Choose a designation below — school owner/principal is
            already set at signup.
          </p>
        </div>

        <form
          className="space-y-6"
          onSubmit={handleSubmitTeacher}
        >
          {/* Personal Information */}
          <Section
            title="Personal Information"
            subtitle="Identity, contact, and basic profile details"
            icon={<FaUserTie className="text-blue-600" />}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
              {/* Photo */}
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
                        <p className="text-xs">
                          Upload photo
                        </p>
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
                    onClick={clearPhoto}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>

              {/* Personal Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field
                  label="Full Name *"
                  name="fullName"
                  value={teacher.fullName}
                  onChange={handleChange}
                  placeholder="Employee full name"
                />

                <Field
                  label="Father / Husband Name"
                  name="fatherName"
                  value={teacher.fatherName}
                  onChange={handleChange}
                  placeholder="Father or husband name"
                />

                <Select
                  label="Gender"
                  name="gender"
                  value={teacher.gender}
                  onChange={handleChange}
                  options={[
                    {
                      value: "",
                      label: "Select Gender",
                    },
                    {
                      value: "MALE",
                      label: "Male",
                    },
                    {
                      value: "FEMALE",
                      label: "Female",
                    },
                    {
                      value: "OTHER",
                      label: "Other",
                    },
                  ]}
                />

                <Field
                  label="Date of Birth"
                  name="dob"
                  type="date"
                  value={teacher.dob}
                  onChange={handleChange}
                />

                <Select
                  label="Blood Group"
                  name="bloodGroup"
                  value={teacher.bloodGroup}
                  onChange={handleChange}
                  options={[
                    {
                      value: "",
                      label: "Select Blood Group",
                    },
                    ...BLOOD_GROUPS.map((group) => ({
                      value: group,
                      label: group,
                    })),
                  ]}
                />

                <Field
                  label="CNIC / National ID"
                  name="cnic"
                  value={teacher.cnic}
                  onChange={handleChange}
                  placeholder="xxxxx-xxxxxxx-x"
                />

                <Field
                  label="Phone"
                  name="phone"
                  value={teacher.phone}
                  onChange={handleChange}
                  placeholder="+92 300 1234567"
                />

                <Field
                  label="Nationality"
                  name="nationality"
                  value={teacher.nationality}
                  onChange={handleChange}
                  placeholder="Pakistani"
                />

                <Select
                  label="Religion"
                  name="religion"
                  value={teacher.religion}
                  onChange={handleChange}
                  options={[
                    {
                      value: "",
                      label: "Select Religion",
                    },
                    ...RELIGIONS.map((religion) => ({
                      value: religion,
                      label: religion,
                    })),
                  ]}
                />

                <div className="md:col-span-2 xl:col-span-3">
                  <label className="block mb-2 text-sm font-medium text-slate-700">
                    Address
                  </label>

                  <textarea
                    name="address"
                    rows={2}
                    value={teacher.address}
                    onChange={handleChange}
                    className={`${inputClass} resize-none`}
                    placeholder="Home address"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Employment Details */}
          <Section
            title="Employment Details"
            subtitle="Role, salary, and joining information"
            icon={<FaBriefcase className="text-blue-600" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Select
                label="Designation *"
                name="designation"
                value={teacher.designation}
                onChange={handleChange}
                options={CREATABLE_DESIGNATIONS.map((designation) => ({
                  value: designation,
                  label: DESIGNATION_LABELS[designation],
                }))}
              />

              <Field
                label="Salary (PKR) *"
                name="salary"
                type="number"
                value={teacher.salary}
                onChange={handleChange}
                placeholder="e.g. 45000"
              />

              <Field
                label="Experience (years)"
                name="experience"
                type="number"
                value={teacher.experience}
                onChange={handleChange}
                placeholder="e.g. 5"
              />

              <Field
                label="Joining Date *"
                name="joiningDate"
                type="date"
                value={teacher.joiningDate}
                onChange={handleChange}
              />
            </div>
          </Section>

          {/* Education */}
          <Section
            title="Education"
            subtitle="Qualification and academic background"
            icon={
              <FaGraduationCap className="text-blue-600" />
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Field
                label="Qualification"
                name="qualification"
                value={teacher.qualification}
                onChange={handleChange}
                placeholder="e.g. B.Ed, M.A"
              />

              <Field
                label="University"
                name="university"
                value={teacher.university}
                onChange={handleChange}
                placeholder="University name"
              />

              <Field
                label="Passing Year"
                name="passingYear"
                type="number"
                value={teacher.passingYear}
                onChange={handleChange}
                placeholder="e.g. 2020"
              />

              <Field
                label="Certifications"
                name="certifications"
                value={teacher.certifications}
                onChange={handleChange}
                placeholder="Any extra certifications"
              />
            </div>
          </Section>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setTeacher(EMPTY_FORM);
                setPhotoPreview(null);
              }}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-white transition"
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? "Saving..." : "Save Employee"}
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
    <section className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8">
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            {icon}
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {title}
          </h2>

          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
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
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  options: {
    value: string;
    label: string;
  }[];
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
        className={inputClass}
      >
        {options.map((option) => (
          <option
            key={`${option.value}-${option.label}`}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}