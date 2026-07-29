"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaPalette, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import {
  createCustomStyle,
  deleteCustomStyle,
  getActiveCustomStyleId,
  loadCustomStyles,
  setActiveCustomStyleId,
  upsertCustomStyle,
  type DocumentCustomStyle,
} from "@/lib/documentStyles";

export default function DocumentStyleCustomizer({
  onActiveChange,
  compact = false,
}: {
  onActiveChange?: (style: DocumentCustomStyle | null) => void;
  compact?: boolean;
}) {
  const [styles, setStyles] = useState<DocumentCustomStyle[]>([]);
  const [draft, setDraft] = useState<DocumentCustomStyle>(() =>
    createCustomStyle()
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const list = loadCustomStyles();
    setStyles(list);
    const active = getActiveCustomStyleId() ?? list[0]?.id ?? null;
    setActiveId(active);
    if (active) {
      const found = list.find((s) => s.id === active);
      if (found) {
        setDraft(found);
        onActiveChange?.(found);
      }
    } else {
      onActiveChange?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectStyle = (style: DocumentCustomStyle) => {
    setDraft(style);
    setActiveId(style.id);
    setActiveCustomStyleId(style.id);
    onActiveChange?.(style);
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error("Give your style a name");
      return;
    }
    const next = upsertCustomStyle({ ...draft, name: draft.name.trim() });
    setStyles(next);
    setActiveId(draft.id);
    setActiveCustomStyleId(draft.id);
    onActiveChange?.(draft);
    toast.success("Custom style saved");
  };

  const handleNew = () => {
    const fresh = createCustomStyle({ name: `Style ${styles.length + 1}` });
    setDraft(fresh);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this custom style?")) return;
    const next = deleteCustomStyle(id);
    setStyles(next);
    if (draft.id === id) {
      const fallback = next[0] ?? createCustomStyle();
      setDraft(fallback);
      setActiveId(next[0]?.id ?? null);
      onActiveChange?.(next[0] ?? null);
    }
    toast.success("Style deleted");
  };

  return (
    <div
      className={`print:hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Custom style
          </p>
          <h3 className="mt-0.5 flex items-center gap-2 font-semibold text-slate-900">
            <FaPalette className="text-blue-600" />
            Design your own card look
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Colors apply to result cards, date sheets, and other exam documents
            when you pick the Custom template.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FaPlus /> New
        </button>
      </div>

      {styles.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {styles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => selectStyle(style)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                activeId === style.id
                  ? "border-black bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full border border-white/40"
                style={{ background: style.primary }}
              />
              {style.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-500">
            STYLE NAME
          </label>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="e.g. Blue Board Result"
          />
        </div>

        {(
          [
            ["primary", "Primary / headers"],
            ["accent", "Accent"],
            ["headerText", "Header text"],
            ["surface", "Surface / badges"],
            ["tableHead", "Table header"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-500">
              {label.toUpperCase()}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft[key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: e.target.value }))
                }
                className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              />
              <input
                value={draft[key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: e.target.value }))
                }
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Live preview strip */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="h-2" style={{ background: draft.primary }} />
        <div
          className="flex items-center justify-between px-4 py-3 text-sm font-semibold"
          style={{ background: draft.primary, color: draft.headerText }}
        >
          <span>{draft.name || "Preview"}</span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
            style={{ background: draft.accent, color: draft.headerText }}
          >
            Preview
          </span>
        </div>
        <div
          className="grid grid-cols-3 gap-2 p-3 text-[10px] font-semibold"
          style={{ background: draft.surface }}
        >
          <div
            className="rounded-lg px-2 py-2 text-center"
            style={{ background: draft.tableHead, color: draft.primary }}
          >
            Subject
          </div>
          <div
            className="rounded-lg px-2 py-2 text-center"
            style={{ background: draft.tableHead, color: draft.primary }}
          >
            Marks
          </div>
          <div
            className="rounded-lg px-2 py-2 text-center"
            style={{ background: draft.accent, color: draft.headerText }}
          >
            Grade
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <FaSave /> Save style
        </button>
        {styles.some((s) => s.id === draft.id) && (
          <button
            type="button"
            onClick={() => handleDelete(draft.id)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            <FaTrash /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
