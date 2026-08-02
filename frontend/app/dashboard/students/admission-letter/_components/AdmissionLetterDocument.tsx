"use client";

import type { Student } from "@/redux/features/students/studentTypes";
import type { School } from "@/redux/features/school/schoolTypes";
import { resolveUploadUrl } from "@/lib/apiBase";

function resolvePhoto(photo?: string | null): string | null {
  return resolveUploadUrl(photo);
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function yesNo(v?: boolean | null) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function genderLabel(g?: string | null) {
  if (!g) return "—";
  if (g === "MALE") return "Male";
  if (g === "FEMALE") return "Female";
  return "Other";
}

function classLabel(student: Student) {
  const e = student.enrollments?.[0];
  if (!e?.class?.className) return "—";
  return e.section?.sectionName
    ? `${e.class.className}-${e.section.sectionName}`
    : e.class.className;
}

function parentOf(student: Student, type: "FATHER" | "MOTHER") {
  return student.parents?.find((p) => p.parent.type === type)?.parent;
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 print:text-[8px]">
        {label}
      </p>
      <p className="mt-0.5 flex items-start gap-1 text-[12px] font-semibold text-slate-900 print:text-[10px]">
        <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden>
          ↳
        </span>
        <span className="min-w-0 break-words">{display}</span>
      </p>
    </div>
  );
}

function QrBlock({ label, data }: { label: string; data: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=4&data=${encodeURIComponent(data)}`;
  return (
    <div className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        width={72}
        height={72}
        className="h-[72px] w-[72px] rounded border border-slate-200 bg-white print:h-[18mm] print:w-[18mm]"
        crossOrigin="anonymous"
      />
      <p className="text-center text-[8px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </p>
    </div>
  );
}

export default function AdmissionLetterDocument({
  student,
  school,
}: {
  student: Student;
  school?: School;
}) {
  const enrollment = student.enrollments?.[0];
  const father = parentOf(student, "FATHER");
  const mother = parentOf(student, "MOTHER");
  const photo = resolvePhoto(student.photoUrl);
  const logo = resolvePhoto(school?.logoUrl);
  const contactLine = [school?.phone, school?.website, school?.email]
    .filter(Boolean)
    .join("  |  ");
  const portalUrl =
    school?.website?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "https://school.local");
  const username = student.user?.username ?? "—";

  return (
    <article
      className="admission-letter-document mx-auto w-full max-w-[210mm] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none"
      id="admission-letter-document"
    >
      <div className="px-6 py-6 sm:px-8 sm:py-7 print:px-[12mm] print:py-[8mm]">
        {/* Header */}
        <header className="text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 print:h-16 print:w-16">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={school?.name ?? "School"}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-xl font-bold text-indigo-700">
                  {(school?.name ?? "S").charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0 text-left">
              <h1 className="text-xl font-bold tracking-tight text-indigo-800 sm:text-2xl print:text-2xl">
                {school?.name ?? "School Name"}
              </h1>
              {school?.address ? (
                <p className="mt-0.5 text-xs text-slate-500">{school.address}</p>
              ) : (
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Official Admission Document
                </p>
              )}
            </div>
          </div>
          {contactLine ? (
            <p className="mt-2 text-[11px] text-slate-500">{contactLine}</p>
          ) : null}
          <h2 className="mt-4 text-2xl font-bold text-indigo-700 print:text-[22px]">
            Admission Letter
          </h2>
          <div className="mt-3 h-px w-full bg-slate-300" />
        </header>

        {/* Profile + key fields */}
        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[112px_1fr] print:grid-cols-[28mm_1fr]">
          <div className="mx-auto h-28 w-28 overflow-hidden rounded-lg border border-slate-300 bg-slate-100 sm:mx-0 sm:h-[112px] sm:w-[112px] print:h-[28mm] print:w-[28mm]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={student.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[480px]:grid-cols-2 md:grid-cols-3 print:grid-cols-3">
            <Field label="Serial No" value={student.id.slice(0, 8).toUpperCase()} />
            <Field label="Date of Birth" value={formatDate(student.dateOfBirth)} />
            <Field
              label="Date of Admission"
              value={formatDate(student.admissionDate)}
            />
            <Field label="Registration No" value={student.registrationNo} />
            <Field
              label="Student Birth Form ID / NIC"
              value={student.birthFormId}
            />
            <Field
              label="Discount In Fee"
              value={`${enrollment?.feeDiscount ?? 0}%`}
            />
            <Field label="Student Name" value={student.name} />
            <Field label="Gender" value={genderLabel(student.gender)} />
            <Field label="Username" value={username} />
            <Field label="Class" value={classLabel(student)} />
            <Field label="Religion" value={student.religion} />
            <Field
              label="Password"
              value="Issued at admission (secure)"
            />
          </div>
        </section>

        <div className="mt-5 h-px w-full bg-slate-300" />

        {/* Particulars */}
        <section className="mt-4 space-y-4">
          <Field label="Address" value={student.address} />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 print:grid-cols-3">
            <div className="space-y-2.5">
              <Field label="Identification Mark" value={student.identificationMark} />
              <Field label="Blood Group" value={student.bloodGroup} />
              <Field label="Disease / Allergy" value={student.disease} />
              <Field label="Caste" value={student.caste} />
              <Field label="Orphan" value={yesNo(student.isOrphan)} />
              <Field label="OSC" value={yesNo(student.isOsc)} />
              <Field label="Previous School" value={student.previousSchool} />
              <Field label="Previous Class" value={student.previousClass} />
              <Field label="Previous Roll No" value={student.previousRollNo} />
              <Field label="Additional Notes" value={student.additionalNote} />
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                Father&apos;s Details
              </p>
              <Field label="Father Name" value={father?.name} />
              <Field label="National ID" value={father?.nationalId} />
              <Field label="Education" value={father?.education} />
              <Field label="Mobile" value={father?.mobileNo} />
              <Field label="Occupation" value={father?.occupation} />
              <Field label="Profession" value={father?.profession} />
              <Field
                label="Income"
                value={
                  father?.income != null
                    ? Number(father.income).toLocaleString()
                    : "—"
                }
              />
              <Field label="Family Code" value={student.familyCode} />
              <Field label="Nationality" value={student.nationality} />
              <Field label="Mother Tongue" value={student.motherTongue} />
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                Mother&apos;s Details
              </p>
              <Field label="Mother Name" value={mother?.name} />
              <Field label="National ID" value={mother?.nationalId} />
              <Field label="Education" value={mother?.education} />
              <Field label="Mobile" value={mother?.mobileNo} />
              <Field label="Occupation" value={mother?.occupation} />
              <Field label="Profession" value={mother?.profession} />
              <Field
                label="Income"
                value={
                  mother?.income != null
                    ? Number(mother.income).toLocaleString()
                    : "—"
                }
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 print:bg-white">
                <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-600">
                  Scan QR code to access portal
                </p>
                <div className="flex flex-wrap items-start justify-center gap-2">
                  <QrBlock label="Web Portal" data={portalUrl} />
                  <QrBlock
                    label="Android App"
                    data={`${portalUrl}?platform=android`}
                  />
                  <QrBlock
                    label="iOS App"
                    data={`${portalUrl}?platform=ios`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 h-px w-full bg-slate-300" />

        {/* Rules */}
        <section className="mt-4">
          <h3 className="text-base font-bold text-indigo-700">
            Rules And Regulations:
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-700 print:text-[10px]">
            Welcome to {school?.name ?? "our school"}. As a member of our school
            community, you are expected to uphold our standards of behaviour,
            attendance, and dress. Please read and follow the rules below
            carefully throughout your stay at the institute.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-slate-700 print:text-[10px]">
            <li>Attend school regularly and arrive on time for all classes.</li>
            <li>Wear the prescribed uniform and maintain a neat appearance.</li>
            <li>Respect teachers, staff, fellow students, and school property.</li>
            <li>Complete assigned work honestly and submit it on time.</li>
            <li>Follow all safety instructions and classroom discipline.</li>
            <li>
              Inform the office promptly of any change in contact or address
              details.
            </li>
          </ul>
        </section>

        {/* Signatures */}
        <footer className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 print:mt-12 print:grid-cols-2">
          <div>
            <div className="mb-1 h-px w-full max-w-[240px] bg-slate-500" />
            <p className="text-[11px] font-medium text-slate-700">
              Signature of Authority
            </p>
          </div>
          <div className="sm:text-right">
            <div className="mb-1 ml-auto h-px w-full max-w-[240px] bg-slate-500 sm:ml-auto" />
            <p className="text-[11px] font-medium text-slate-700">
              Institute Stamp
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}
