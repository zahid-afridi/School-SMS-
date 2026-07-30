"use client";

import {
  BUILTIN_TEMPLATES,
  type ExamDocumentTemplate,
} from "@/lib/documentStyles";

export type { ExamDocumentTemplate } from "@/lib/documentStyles";

const templates = [
  ...BUILTIN_TEMPLATES,
  {
    id: "custom" as const,
    name: "Custom",
    description: "Your saved color style",
    colors: ["bg-blue-700", "bg-amber-400", "bg-slate-100"] as [
      string,
      string,
      string,
    ],
  },
];

export default function ExamTemplatePicker({
  value,
  onChange,
  title = "Choose document template",
  showCustom = true,
}: {
  value: ExamDocumentTemplate;
  onChange: (template: ExamDocumentTemplate) => void;
  title?: string;
  showCustom?: boolean;
}) {
  const list = showCustom
    ? templates
    : templates.filter((t) => t.id !== "custom");

  return (
    <div className="print:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Design
          </p>
          <h3 className="mt-0.5 font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {list.length} templates
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((template) => {
          const selected = value === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onChange(template.id)}
              aria-pressed={selected}
              className={`rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-black bg-slate-50 shadow-sm ring-1 ring-black"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <span className="mb-3 block overflow-hidden rounded-lg border border-black/10 bg-white">
                <span className={`block h-2 ${template.colors[0]}`} />
                <span className="flex h-10 items-center gap-2 px-2">
                  <span
                    className={`h-5 w-5 rounded-full ${template.colors[1]}`}
                  />
                  <span className="flex-1 space-y-1">
                    <span
                      className={`block h-1.5 w-3/4 rounded ${template.colors[0]}`}
                    />
                    <span
                      className={`block h-1 w-1/2 rounded ${template.colors[1]}`}
                    />
                  </span>
                </span>
                <span className={`block h-4 ${template.colors[2]}`} />
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {template.name}
                </span>
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    selected
                      ? "border-black bg-black text-white"
                      : "border-slate-300"
                  }`}
                >
                  {selected ? (
                    <span className="material-symbols-outlined text-[11px]">
                      check
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                {template.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
