"use client";

import {
  RESULT_CARD_FORMATS,
  type ResultCardLayout,
} from "@/lib/schoolDocumentDesign";

export default function ResultCardFormatPicker({
  value,
  onChange,
  title = "Choose result card format",
}: {
  value: ResultCardLayout;
  onChange: (layout: ResultCardLayout) => void;
  title?: string;
}) {
  return (
    <div className="print:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Format
          </p>
          <h3 className="mt-0.5 font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {RESULT_CARD_FORMATS.length} layouts
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {RESULT_CARD_FORMATS.map((format) => {
          const selected = value === format.id;
          return (
            <button
              key={format.id}
              type="button"
              onClick={() => onChange(format.id)}
              aria-pressed={selected}
              className={`rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-black bg-slate-50 shadow-sm ring-1 ring-black"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <FormatThumb id={format.id} selected={selected} />
              <span className="mt-2 block text-sm font-bold text-slate-900">
                {format.name}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                {format.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormatThumb({
  id,
  selected,
}: {
  id: ResultCardLayout;
  selected: boolean;
}) {
  const ring = selected ? "ring-1 ring-slate-400" : "";
  if (id === "certificate") {
    return (
      <span
        className={`block overflow-hidden rounded-lg border border-slate-200 bg-white p-2 ${ring}`}
      >
        <span className="mx-auto mb-1 block h-4 w-4 rounded-full bg-slate-300" />
        <span className="mx-auto mb-2 block h-1.5 w-3/4 rounded bg-slate-800" />
        <span className="mb-1 block h-1 w-full rounded bg-slate-200" />
        <span className="mb-1 block h-1 w-5/6 rounded bg-slate-200" />
        <span className="mt-2 block h-8 rounded border border-slate-300 bg-slate-50" />
      </span>
    );
  }
  if (id === "modern") {
    return (
      <span
        className={`block overflow-hidden rounded-lg border border-slate-200 ${ring}`}
      >
        <span className="block h-5 bg-slate-900" />
        <span className="grid grid-cols-4 gap-1 p-2">
          <span className="h-4 rounded bg-slate-100" />
          <span className="h-4 rounded bg-slate-100" />
          <span className="h-4 rounded bg-slate-100" />
          <span className="h-4 rounded bg-slate-100" />
        </span>
        <span className="mx-2 mb-2 block h-6 rounded bg-slate-100" />
      </span>
    );
  }
  if (id === "minimal") {
    return (
      <span
        className={`block overflow-hidden rounded-lg border border-slate-300 bg-white p-2 ${ring}`}
      >
        <span className="mb-2 block h-2 w-2/3 bg-slate-800" />
        <span className="mb-1 block h-1 w-full bg-slate-200" />
        <span className="mb-1 block h-1 w-full bg-slate-200" />
        <span className="mt-2 block border-y border-slate-800 py-2">
          <span className="block h-1 w-full bg-slate-300" />
        </span>
      </span>
    );
  }
  return (
    <span
      className={`block overflow-hidden rounded-lg border border-slate-200 ${ring}`}
    >
      <span className="block h-1.5 bg-slate-900" />
      <span className="flex items-center gap-2 p-2">
        <span className="h-5 w-5 rounded bg-slate-200" />
        <span className="flex-1 space-y-1">
          <span className="block h-1.5 w-3/4 rounded bg-slate-700" />
          <span className="block h-1 w-1/2 rounded bg-slate-300" />
        </span>
      </span>
      <span className="mx-2 mb-2 block h-7 rounded border border-slate-200 bg-slate-50" />
    </span>
  );
}
