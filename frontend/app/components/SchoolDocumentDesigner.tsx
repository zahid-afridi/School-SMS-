"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaCheck,
  FaIdCard,
  FaPalette,
  FaSave,
  FaTable,
  FaUserGraduate,
} from "react-icons/fa";
import {
  useGetMySchoolQuery,
  useUpdateSchoolMutation,
} from "@/redux/features/school/schoolApi";
import {
  applyDesignPreset,
  DEFAULT_SCHOOL_DOCUMENT_DESIGN,
  DESIGN_PRESETS,
  documentFontClass,
  documentRadiusClass,
  parseSchoolDocumentDesign,
  type SchoolDocumentDesign,
} from "@/lib/schoolDocumentDesign";
import { resolveUploadUrl } from "@/lib/apiBase";

const colorFields = [
  ["primary", "Primary", "Headers and strong areas"],
  ["accent", "Accent", "Highlights and selected states"],
  ["headerText", "Header text", "Text shown on primary color"],
  ["surface", "Soft surface", "Cards and information areas"],
  ["tableHead", "Table header", "Marks and schedule headings"],
  ["text", "Body text", "Main printed text"],
] as const;

export default function SchoolDocumentDesigner({
  compact = false,
  onChange,
}: {
  compact?: boolean;
  onChange?: (design: SchoolDocumentDesign) => void;
}) {
  const { data: school, isLoading } = useGetMySchoolQuery();
  const [updateSchool, { isLoading: saving }] = useUpdateSchoolMutation();
  const [design, setDesign] = useState<SchoolDocumentDesign>(
    DEFAULT_SCHOOL_DOCUMENT_DESIGN
  );
  const [activePreview, setActivePreview] = useState<
    "id" | "result" | "date"
  >("id");

  useEffect(() => {
    if (!school) return;
    const parsed = parseSchoolDocumentDesign(school.documentDesign);
    // RTK Query hydrates after mount; this synchronizes the editor draft once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesign(parsed);
    onChange?.(parsed);
    // Parent callbacks may be inline; reload only when the school payload changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school]);

  const update = <K extends keyof SchoolDocumentDesign>(
    key: K,
    value: SchoolDocumentDesign[K]
  ) => {
    const next = { ...design, [key]: value, updatedAt: new Date().toISOString() };
    setDesign(next);
    onChange?.(next);
  };

  const handleSave = async () => {
    if (!school) return;
    const form = new FormData();
    form.append("documentDesign", JSON.stringify(design));
    try {
      await updateSchool({ id: school.id, data: form }).unwrap();
      toast.success("School document design saved");
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to save document design"
      );
    }
  };

  const logo = resolveUploadUrl(school?.logoUrl);
  const font = documentFontClass(design.font);
  const activePreset = useMemo(
    () =>
      DESIGN_PRESETS.find(
        (p) =>
          p.design.primary === design.primary &&
          p.design.accent === design.accent &&
          p.design.idCardLayout === design.idCardLayout
      )?.id,
    [design]
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
        Loading design studio…
      </div>
    );
  }

  return (
    <div className={`grid min-w-0 gap-5 ${compact ? "" : "xl:grid-cols-[1fr_0.9fr]"}`}>
      <section className="min-w-0 space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                Brand foundation
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Choose a starting personality
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                A preset is only a starting point. Every detail stays editable.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !school}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <FaSave />
              {saving ? "Saving…" : "Save for school"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {DESIGN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const next = applyDesignPreset(design, preset);
                  setDesign(next);
                  onChange?.(next);
                }}
                className={`relative overflow-hidden rounded-xl border p-3 text-left transition ${
                  activePreset === preset.id
                    ? "border-slate-950 ring-1 ring-slate-950"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <span className="mb-3 flex h-7 overflow-hidden rounded-lg">
                  <span
                    className="flex-1"
                    style={{ background: preset.design.primary }}
                  />
                  <span
                    className="w-10"
                    style={{ background: preset.design.accent }}
                  />
                  <span
                    className="w-8"
                    style={{ background: preset.design.surface }}
                  />
                </span>
                <span className="block text-sm font-bold text-slate-900">
                  {preset.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                  {preset.description}
                </span>
                {activePreset === preset.id ? (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white">
                    <FaCheck size={9} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FaPalette className="text-indigo-600" />
            <div>
              <h2 className="font-bold text-slate-900">Make it yours</h2>
              <p className="text-xs text-slate-500">
                Use your school colors and name this design.
              </p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Design name
            </span>
            <input
              value={design.name}
              onChange={(e) => update("name", e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Our school identity"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {colorFields.map(([key, label, help]) => (
              <label key={key} className="rounded-xl border border-slate-100 p-3">
                <span className="block text-xs font-bold text-slate-700">{label}</span>
                <span className="mb-2 block text-[10px] text-slate-400">{help}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={design[key]}
                    onChange={(e) => update(key, e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <input
                    value={design[key]}
                    onChange={(e) => update(key, e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-xs uppercase outline-none"
                  />
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-bold text-slate-900">Layout character</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">
            Set the visual voice and choose a layout for each document.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Choice
              label="Typography"
              value={design.font}
              options={[
                ["modern", "Modern"],
                ["classic", "Classic"],
                ["friendly", "Friendly"],
              ]}
              onChange={(v) => update("font", v as SchoolDocumentDesign["font"])}
            />
            <Choice
              label="Corners"
              value={design.shape}
              options={[
                ["soft", "Soft"],
                ["square", "Formal"],
                ["pill", "Expressive"],
              ]}
              onChange={(v) =>
                update("shape", v as SchoolDocumentDesign["shape"])
              }
            />
            <Choice
              label="Spacing"
              value={design.density}
              options={[
                ["comfortable", "Comfortable"],
                ["compact", "Compact"],
              ]}
              onChange={(v) =>
                update("density", v as SchoolDocumentDesign["density"])
              }
            />
            <Choice
              label="ID card"
              value={design.idCardLayout}
              options={[
                ["midnight", "Midnight"],
                ["clean", "Clean"],
                ["bold", "Bold"],
              ]}
              onChange={(v) =>
                update("idCardLayout", v as SchoolDocumentDesign["idCardLayout"])
              }
            />
            <Choice
              label="Result card"
              value={design.resultCardLayout}
              options={[
                ["academic", "Academic"],
                ["modern", "Modern"],
                ["minimal", "Minimal"],
                ["certificate", "Certificate (DMC)"],
              ]}
              onChange={(v) =>
                update(
                  "resultCardLayout",
                  v as SchoolDocumentDesign["resultCardLayout"]
                )
              }
            />
            <Choice
              label="Date sheet"
              value={design.dateSheetLayout}
              options={[
                ["formal", "Formal"],
                ["modern", "Modern"],
                ["compact", "Compact"],
              ]}
              onChange={(v) =>
                update(
                  "dateSheetLayout",
                  v as SchoolDocumentDesign["dateSheetLayout"]
                )
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["showLogo", "School logo"],
                ["showStudentPhoto", "Student photo"],
                ["showBarcode", "ID barcode"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => update(key, !design[key])}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                  design[key]
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    design[key] ? "bg-white text-slate-950" : "bg-slate-100"
                  }`}
                >
                  {design[key] ? <FaCheck size={8} /> : null}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!compact ? (
        <aside className="min-w-0">
          <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                Live preview
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                One identity, every document
              </h2>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {(
                [
                  ["id", "ID Card", FaIdCard],
                  ["result", "Result", FaUserGraduate],
                  ["date", "Date Sheet", FaTable],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActivePreview(id)}
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
                    activePreview === id
                      ? "text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                  style={
                    activePreview === id ? { background: design.primary } : undefined
                  }
                >
                  <Icon /> {label}
                </button>
              ))}
            </div>

            <div className={`${font}`}>
              {activePreview === "id" ? (
                <IdPreview design={design} schoolName={school?.name} logo={logo} />
              ) : activePreview === "result" ? (
                <ResultPreview design={design} schoolName={school?.name} logo={logo} />
              ) : (
                <DatePreview design={design} schoolName={school?.name} logo={logo} />
              )}
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
              Preview uses sample data. Your real documents keep their actual
              student, exam, and schedule information.
            </p>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400"
      >
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreviewLogo({
  logo,
  schoolName,
}: {
  logo: string | null;
  schoolName?: string;
}) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-1" />
  ) : (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 font-bold text-slate-700">
      {(schoolName ?? "S").charAt(0)}
    </span>
  );
}

function IdPreview({
  design,
  schoolName,
  logo,
}: {
  design: SchoolDocumentDesign;
  schoolName?: string;
  logo: string | null;
}) {
  const radius = documentRadiusClass(design.shape);
  const clean = design.idCardLayout === "clean";
  return (
    <div
      className={`relative mx-auto aspect-[85.6/54] w-full max-w-[430px] overflow-hidden border shadow-lg ${radius}`}
      style={{
        background: clean ? "#ffffff" : design.primary,
        color: clean ? design.text : design.headerText,
        borderColor: design.accent,
      }}
    >
      <div className="h-2" style={{ background: design.accent }} />
      <div className="p-4">
        <div className="flex items-center gap-2 border-b border-current/15 pb-2">
          {design.showLogo ? <PreviewLogo logo={logo} schoolName={schoolName} /> : null}
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-60">
              Student identity card
            </p>
            <p className="truncate text-sm font-bold">
              {schoolName ?? "Your School"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          {design.showStudentPhoto ? (
            <div
              className="h-20 w-16 shrink-0 rounded-lg border-2 bg-slate-200"
              style={{ borderColor: design.accent }}
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg font-bold">Ayesha Khan</p>
            <p className="text-[10px] opacity-70">Father · Imran Khan</p>
            <p className="text-[10px] opacity-70">Class · 8-A</p>
            <p className="text-[10px] font-bold" style={{ color: design.accent }}>
              REG-2026-0142
            </p>
          </div>
        </div>
        {design.showBarcode ? (
          <div className="mt-3 flex h-5 items-end gap-px">
            {Array.from({ length: 35 }, (_, i) => (
              <span
                key={i}
                className="w-px bg-current opacity-70"
                style={{ height: `${8 + (i % 4) * 3}px` }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultPreview({
  design,
  schoolName,
  logo,
}: {
  design: SchoolDocumentDesign;
  schoolName?: string;
  logo: string | null;
}) {
  const radius = documentRadiusClass(design.shape);
  return (
    <div className={`overflow-hidden border bg-white shadow-lg ${radius}`} style={{ color: design.text }}>
      <div className="h-2" style={{ background: design.accent }} />
      <div className="p-4">
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: design.accent }}>
          {design.showLogo ? <PreviewLogo logo={logo} schoolName={schoolName} /> : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold" style={{ color: design.primary }}>
              {schoolName ?? "Your School"}
            </p>
            <p className="text-[9px] uppercase tracking-wider opacity-50">Academic Result Card</p>
          </div>
          {design.showStudentPhoto ? <div className="h-10 w-8 rounded bg-slate-200" /> : null}
        </div>
        <div className="my-3 rounded-lg p-2 text-[10px]" style={{ background: design.surface }}>
          <strong>Ayesha Khan</strong> · Class 8-A · Roll 12
        </div>
        <div className="overflow-hidden rounded-lg border text-[9px]">
          <div
            className="grid grid-cols-3 gap-2 px-2 py-1.5 font-bold"
            style={{ background: design.tableHead, color: design.primary }}
          >
            <span>Subject</span><span>Marks</span><span>Grade</span>
          </div>
          {["English", "Mathematics", "Science"].map((name, i) => (
            <div key={name} className="grid grid-cols-3 gap-2 border-t px-2 py-1.5">
              <span>{name}</span><span>{88 + i}</span><span>A</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DatePreview({
  design,
  schoolName,
  logo,
}: {
  design: SchoolDocumentDesign;
  schoolName?: string;
  logo: string | null;
}) {
  const radius = documentRadiusClass(design.shape);
  return (
    <div className={`overflow-hidden border bg-white shadow-lg ${radius}`} style={{ color: design.text }}>
      <div className="h-2" style={{ background: design.accent }} />
      <div className="p-4">
        <div className="flex items-center gap-2">
          {design.showLogo ? <PreviewLogo logo={logo} schoolName={schoolName} /> : null}
          <div>
            <p className="text-sm font-bold" style={{ color: design.primary }}>
              {schoolName ?? "Your School"}
            </p>
            <p className="text-[9px] uppercase tracking-wider opacity-50">Final Examination Date Sheet</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border text-[9px]">
          <div
            className="grid grid-cols-3 px-2 py-2 font-bold"
            style={{ background: design.tableHead, color: design.primary }}
          >
            <span>Date</span><span>Subject</span><span>Time</span>
          </div>
          {[
            ["12 Mar", "English", "09:00 AM"],
            ["14 Mar", "Mathematics", "09:00 AM"],
            ["16 Mar", "Science", "09:00 AM"],
          ].map((row) => (
            <div key={row[0]} className="grid grid-cols-3 border-t px-2 py-2">
              {row.map((v) => <span key={v}>{v}</span>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
