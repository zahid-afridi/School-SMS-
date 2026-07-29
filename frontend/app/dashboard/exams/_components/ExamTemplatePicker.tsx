"use client";

export type ExamDocumentTemplate =
  | "classic"
  | "modern"
  | "royal"
  | "minimal";

const templates: Array<{
  id: ExamDocumentTemplate;
  name: string;
  description: string;
  colors: [string, string, string];
}> = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional school document",
    colors: ["bg-slate-900", "bg-slate-300", "bg-white"],
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean contemporary layout",
    colors: ["bg-black", "bg-sky-500", "bg-slate-100"],
  },
  {
    id: "royal",
    name: "Royal",
    description: "Premium formal presentation",
    colors: ["bg-emerald-900", "bg-amber-400", "bg-amber-50"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple ink-friendly design",
    colors: ["bg-zinc-800", "bg-zinc-400", "bg-white"],
  },
];

export default function ExamTemplatePicker({
  value,
  onChange,
  title = "Choose document template",
}: {
  value: ExamDocumentTemplate;
  onChange: (template: ExamDocumentTemplate) => void;
  title?: string;
}) {
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
          {templates.length} templates
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {templates.map((template) => {
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
