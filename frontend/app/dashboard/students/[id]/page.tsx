"use client";

import PageLoader from "@/app/components/PageLoader";

import { useParams, useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaPhone,
  FaEnvelope,
  FaIdCard,
  FaMapMarkerAlt,
  FaUserGraduate,
} from "react-icons/fa";
import { useGetStudentByIdQuery } from "@/redux/features/students/studentApi";

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "http://localhost:5000";

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  return photo.startsWith("http")
    ? photo
    : `${IMAGE_BASE}/${photo.replace(/^\//, "")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value).slice(0, 10);
  }
}

function display(value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { data: student, isLoading, isError } = useGetStudentByIdQuery(id, {
    skip: !id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <PageLoader compact label="Loading student details" />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <p className="text-red-500">Student not found.</p>
        <button
          onClick={() => router.push("/dashboard/students")}
          className="text-blue-600 text-sm hover:underline"
        >
          Back to All Students
        </button>
      </div>
    );
  }

  const photo = resolvePhoto(student.photoUrl);
  const currentEnrollment =
    student.enrollments?.find((e) => e.isCurrent) ?? student.enrollments?.[0];

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/students")}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-2"
            >
              <FaArrowLeft /> Back to All Students
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Student Profile
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Complete record from database
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/fees/ledger/${student.id}`)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
            >
              Fee Ledger
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(`/dashboard/fees/collect?studentId=${student.id}`)
              }
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Collect Fees
            </button>
          </div>
        </div>

        {/* Hero card */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {photo ? (
              <img
                src={photo}
                alt={student.name}
                className="w-28 h-28 rounded-2xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-4xl font-bold">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    student.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : student.status === "SUSPENDED"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {student.status}
                </span>
              </div>
              <p className="text-slate-500 mt-1">{student.registrationNo}</p>
              <p className="text-blue-600 font-medium mt-2">
                {currentEnrollment?.class?.className ?? "Unassigned"}
                {currentEnrollment?.section?.sectionName
                  ? ` / ${currentEnrollment.section.sectionName}`
                  : ""}
                {currentEnrollment?.academicYear
                  ? ` · ${currentEnrollment.academicYear}`
                  : ""}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <FaPhone className="text-slate-400" />
                  {display(student.contactPhone)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FaEnvelope className="text-slate-400" />
                  {display(student.email || student.user?.email)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FaIdCard className="text-slate-400" />
                  {display(student.user?.username)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoCard title="Basic Information" icon={<FaUserGraduate />}>
            <InfoRow label="Registration No" value={student.registrationNo} />
            <InfoRow label="Full Name" value={student.name} />
            <InfoRow label="Admission Date" value={formatDate(student.admissionDate)} />
            <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
            <InfoRow label="Gender" value={student.gender} />
            <InfoRow label="Blood Group" value={student.bloodGroup} />
            <InfoRow label="Religion" value={student.religion} />
            <InfoRow label="Nationality" value={student.nationality} />
            <InfoRow label="Mother Tongue" value={student.motherTongue} />
            <InfoRow label="Caste" value={student.caste} />
            <InfoRow label="B-Form / Birth ID" value={student.birthFormId} />
            <InfoRow label="Identification Mark" value={student.identificationMark} />
            <InfoRow label="Disease" value={student.disease} />
            <InfoRow label="Is Orphan" value={student.isOrphan} />
            <InfoRow label="Is OSC" value={student.isOsc} />
            <InfoRow label="Family Code" value={student.familyCode} />
          </InfoCard>

          <InfoCard title="Contact & Address" icon={<FaMapMarkerAlt />}>
            <InfoRow label="Contact Phone" value={student.contactPhone} />
            <InfoRow label="Emergency Phone" value={student.emergencyPhone} />
            <InfoRow label="Email" value={student.email} />
            <InfoRow label="Address" value={student.address} />
            <InfoRow label="City" value={student.city} />
            <InfoRow label="Province" value={student.province} />
            <InfoRow label="Postal Code" value={student.postalCode} />
            <InfoRow label="Previous School" value={student.previousSchool} />
            <InfoRow label="Previous Class" value={student.previousClass} />
            <InfoRow label="Previous Roll No" value={student.previousRollNo} />
            <InfoRow label="Leaving Date" value={formatDate(student.leavingDate)} />
            <InfoRow label="Leaving Reason" value={student.leavingReason} />
            <InfoRow label="Additional Note" value={student.additionalNote} />
          </InfoCard>
        </div>

        {/* Login user */}
        <InfoCard title="Login Account">
          {student.user ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <InfoRow label="Username" value={student.user.username} />
              <InfoRow label="Email" value={student.user.email} />
              <InfoRow label="Role" value={student.user.role} />
              <InfoRow
                label="Account Active"
                value={student.user.isActive ? "Yes" : "No"}
              />
              <InfoRow
                label="User Created"
                value={formatDate(student.user.createdAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No linked login account.</p>
          )}
        </InfoCard>

        {/* Parents */}
        <InfoCard title="Parents / Guardians">
          {!student.parents?.length ? (
            <p className="text-sm text-slate-500">No parents linked.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student.parents.map((link) => (
                <div
                  key={link.parent.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-slate-800">
                      {link.parent.name}
                    </h3>
                    <span className="text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-1">
                      {link.parent.type}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <InfoRow label="CNIC" value={link.parent.nationalId} />
                    <InfoRow label="Mobile" value={link.parent.mobileNo} />
                    <InfoRow label="WhatsApp" value={link.parent.whatsappNo} />
                    <InfoRow label="Email" value={link.parent.email} />
                    <InfoRow label="Occupation" value={link.parent.occupation} />
                    <InfoRow label="Profession" value={link.parent.profession} />
                    <InfoRow label="Workplace" value={link.parent.workplace} />
                    <InfoRow label="Education" value={link.parent.education} />
                    <InfoRow label="Income" value={link.parent.income} />
                    <InfoRow label="Address" value={link.parent.address} />
                    <InfoRow
                      label="Primary Guardian"
                      value={link.isPrimaryGuardian}
                    />
                    <InfoRow
                      label="Emergency Contact"
                      value={link.isEmergencyContact}
                    />
                    <InfoRow label="Can Pickup" value={link.canPickup} />
                    <InfoRow label="Notes" value={link.notes} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </InfoCard>

        {/* Enrollments */}
        <InfoCard title="Enrollment History">
          {!student.enrollments?.length ? (
            <p className="text-sm text-slate-500">No enrollments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Class</th>
                    <th className="py-2 pr-3 font-semibold">Section</th>
                    <th className="py-2 pr-3 font-semibold">Year</th>
                    <th className="py-2 pr-3 font-semibold">Roll</th>
                    <th className="py-2 pr-3 font-semibold">Fee Disc.</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold">Current</th>
                    <th className="py-2 pr-3 font-semibold">Enrolled</th>
                    <th className="py-2 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.enrollments.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2.5 pr-3 font-medium text-slate-800">
                        {e.class?.className ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3">{e.section?.sectionName ?? "—"}</td>
                      <td className="py-2.5 pr-3">{e.academicYear}</td>
                      <td className="py-2.5 pr-3">{e.rollNo ?? "—"}</td>
                      <td className="py-2.5 pr-3">{e.feeDiscount ?? 0}%</td>
                      <td className="py-2.5 pr-3">
                        <span className="text-xs rounded-full bg-slate-100 px-2 py-1">
                          {e.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">{e.isCurrent ? "Yes" : "No"}</td>
                      <td className="py-2.5 pr-3">{formatDate(e.enrolledAt)}</td>
                      <td className="py-2.5 text-slate-500 max-w-[160px] truncate">
                        {e.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InfoCard>

        <InfoCard title="System Meta">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoRow label="Student ID" value={student.id} />
            <InfoRow label="Created At" value={formatDate(student.createdAt)} />
            <InfoRow label="Updated At" value={formatDate(student.updatedAt)} />
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-blue-600">{icon}</span>}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 text-right break-all">
        {display(value)}
      </span>
    </div>
  );
}
