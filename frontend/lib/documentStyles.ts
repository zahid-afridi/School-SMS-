/**
 * Shared document template + custom style system for result cards,
 * date sheets, award lists, and other printable school documents.
 */

import type { CSSProperties } from "react";

export type BuiltInDocumentTemplate =
  | "classic"
  | "modern"
  | "royal"
  | "minimal"
  | "ocean"
  | "crimson"
  | "academic"
  | "forest";

export type ExamDocumentTemplate = BuiltInDocumentTemplate | "custom";

export type DocumentCustomStyle = {
  id: string;
  name: string;
  primary: string;
  accent: string;
  headerText: string;
  surface: string;
  tableHead: string;
  createdAt: string;
};

export type ResolvedDocumentTheme = {
  name: string;
  shell: string;
  topBar: string;
  headerBorder: string;
  eyebrow: string;
  title: string;
  section: string;
  tableHead: string;
  stat: string;
  accentLine: string;
  badge: string;
  rowAccent: string;
  footer: string;
  /** Inline CSS vars for custom / print-safe colors */
  cssVars?: Record<string, string>;
  isCustom?: boolean;
};

export const BUILTIN_TEMPLATES: Array<{
  id: BuiltInDocumentTemplate;
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
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blue professional look",
    colors: ["bg-blue-900", "bg-cyan-400", "bg-blue-50"],
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Bold red formal accent",
    colors: ["bg-red-900", "bg-rose-400", "bg-rose-50"],
  },
  {
    id: "academic",
    name: "Academic",
    description: "University-style navy board",
    colors: ["bg-indigo-950", "bg-indigo-400", "bg-indigo-50"],
  },
  {
    id: "forest",
    name: "Forest",
    description: "Calm green campus feel",
    colors: ["bg-green-900", "bg-lime-500", "bg-green-50"],
  },
];

export const BUILTIN_THEMES: Record<
  BuiltInDocumentTemplate,
  ResolvedDocumentTheme
> = {
  classic: {
    name: "Classic",
    shell: "border-slate-300",
    topBar: "bg-slate-900",
    headerBorder: "border-slate-900",
    eyebrow: "text-slate-500",
    title: "text-slate-900",
    section: "bg-slate-900 text-white",
    tableHead: "bg-slate-100 text-slate-700",
    stat: "border-slate-200 bg-slate-50",
    accentLine: "bg-slate-900",
    badge: "border-slate-300 bg-slate-50 text-slate-700",
    rowAccent: "bg-slate-100 text-slate-800",
    footer: "border-slate-300",
  },
  modern: {
    name: "Modern",
    shell: "border-slate-200",
    topBar: "bg-gradient-to-r from-black via-slate-900 to-sky-600",
    headerBorder: "border-sky-500",
    eyebrow: "text-sky-600",
    title: "text-black",
    section: "bg-black text-white",
    tableHead: "bg-sky-50 text-slate-800",
    stat: "border-sky-200 bg-sky-50/60",
    accentLine: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-800",
    rowAccent: "bg-sky-50 text-sky-900",
    footer: "border-sky-300",
  },
  royal: {
    name: "Royal",
    shell: "border-emerald-800",
    topBar: "bg-gradient-to-r from-emerald-950 via-emerald-800 to-amber-500",
    headerBorder: "border-amber-500",
    eyebrow: "text-amber-700",
    title: "text-emerald-950",
    section: "bg-emerald-900 text-amber-50",
    tableHead: "bg-amber-50 text-emerald-950",
    stat: "border-amber-300 bg-amber-50",
    accentLine: "bg-amber-500",
    badge: "border-amber-300 bg-amber-50 text-emerald-900",
    rowAccent: "bg-amber-50 text-emerald-950",
    footer: "border-amber-400",
  },
  minimal: {
    name: "Minimal",
    shell: "border-zinc-400",
    topBar: "bg-zinc-800",
    headerBorder: "border-zinc-400",
    eyebrow: "text-zinc-500",
    title: "text-zinc-900",
    section: "bg-zinc-100 text-zinc-900 border-y border-zinc-300",
    tableHead: "bg-white text-zinc-700 border-b-2 border-zinc-700",
    stat: "border-zinc-300 bg-white",
    accentLine: "bg-zinc-500",
    badge: "border-zinc-300 bg-white text-zinc-700",
    rowAccent: "bg-zinc-100 text-zinc-800",
    footer: "border-zinc-400",
  },
  ocean: {
    name: "Ocean",
    shell: "border-blue-300",
    topBar: "bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-500",
    headerBorder: "border-cyan-500",
    eyebrow: "text-cyan-700",
    title: "text-blue-950",
    section: "bg-blue-900 text-white",
    tableHead: "bg-cyan-50 text-blue-950",
    stat: "border-cyan-200 bg-cyan-50/70",
    accentLine: "bg-cyan-500",
    badge: "border-cyan-200 bg-cyan-50 text-blue-900",
    rowAccent: "bg-blue-50 text-blue-900",
    footer: "border-cyan-400",
  },
  crimson: {
    name: "Crimson",
    shell: "border-red-800",
    topBar: "bg-gradient-to-r from-red-950 via-red-800 to-rose-400",
    headerBorder: "border-rose-500",
    eyebrow: "text-rose-700",
    title: "text-red-950",
    section: "bg-red-900 text-rose-50",
    tableHead: "bg-rose-50 text-red-950",
    stat: "border-rose-200 bg-rose-50",
    accentLine: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-red-900",
    rowAccent: "bg-rose-50 text-red-950",
    footer: "border-rose-400",
  },
  academic: {
    name: "Academic",
    shell: "border-indigo-800",
    topBar: "bg-gradient-to-r from-indigo-950 via-indigo-800 to-violet-500",
    headerBorder: "border-indigo-500",
    eyebrow: "text-indigo-600",
    title: "text-indigo-950",
    section: "bg-indigo-950 text-white",
    tableHead: "bg-indigo-50 text-indigo-950",
    stat: "border-indigo-200 bg-indigo-50",
    accentLine: "bg-indigo-500",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-900",
    rowAccent: "bg-indigo-50 text-indigo-950",
    footer: "border-indigo-400",
  },
  forest: {
    name: "Forest",
    shell: "border-green-800",
    topBar: "bg-gradient-to-r from-green-950 via-green-800 to-lime-500",
    headerBorder: "border-lime-500",
    eyebrow: "text-green-700",
    title: "text-green-950",
    section: "bg-green-900 text-lime-50",
    tableHead: "bg-lime-50 text-green-950",
    stat: "border-lime-300 bg-lime-50",
    accentLine: "bg-lime-500",
    badge: "border-lime-300 bg-lime-50 text-green-900",
    rowAccent: "bg-green-50 text-green-950",
    footer: "border-lime-500",
  },
};

const STORAGE_KEY = "school-sms-document-styles";
const ACTIVE_CUSTOM_KEY = "school-sms-active-custom-style";

export function createCustomStyle(
  partial?: Partial<Omit<DocumentCustomStyle, "id" | "createdAt">>
): DocumentCustomStyle {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: partial?.name?.trim() || "My Style",
    primary: partial?.primary || "#0f172a",
    accent: partial?.accent || "#0ea5e9",
    headerText: partial?.headerText || "#ffffff",
    surface: partial?.surface || "#f8fafc",
    tableHead: partial?.tableHead || "#e2e8f0",
    createdAt: new Date().toISOString(),
  };
}

export function loadCustomStyles(): DocumentCustomStyle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomStyles(styles: DocumentCustomStyle[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
}

export function upsertCustomStyle(style: DocumentCustomStyle) {
  const list = loadCustomStyles();
  const idx = list.findIndex((s) => s.id === style.id);
  if (idx >= 0) list[idx] = style;
  else list.unshift(style);
  saveCustomStyles(list);
  return list;
}

export function deleteCustomStyle(id: string) {
  const list = loadCustomStyles().filter((s) => s.id !== id);
  saveCustomStyles(list);
  const active = getActiveCustomStyleId();
  if (active === id) setActiveCustomStyleId(null);
  return list;
}

export function getActiveCustomStyleId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CUSTOM_KEY);
}

export function setActiveCustomStyleId(id: string | null) {
  if (typeof window === "undefined") return;
  if (!id) localStorage.removeItem(ACTIVE_CUSTOM_KEY);
  else localStorage.setItem(ACTIVE_CUSTOM_KEY, id);
}

export function getActiveCustomStyle(): DocumentCustomStyle | null {
  const id = getActiveCustomStyleId();
  if (!id) {
    const list = loadCustomStyles();
    return list[0] ?? null;
  }
  return loadCustomStyles().find((s) => s.id === id) ?? null;
}

export function resolveTheme(
  template: ExamDocumentTemplate,
  custom?: DocumentCustomStyle | null
): ResolvedDocumentTheme {
  if (template !== "custom") {
    return BUILTIN_THEMES[template];
  }

  const style = custom ?? getActiveCustomStyle() ?? createCustomStyle();
  return {
    name: style.name,
    shell: "border-slate-300",
    topBar: "",
    headerBorder: "",
    eyebrow: "",
    title: "",
    section: "",
    tableHead: "",
    stat: "border-slate-200",
    accentLine: "",
    badge: "border-slate-200",
    rowAccent: "",
    footer: "",
    isCustom: true,
    cssVars: {
      "--doc-primary": style.primary,
      "--doc-accent": style.accent,
      "--doc-header-text": style.headerText,
      "--doc-surface": style.surface,
      "--doc-table-head": style.tableHead,
    },
  };
}

/** Inline style helpers when using a custom theme */
export function customInline(
  theme: ResolvedDocumentTheme,
  part:
    | "topBar"
    | "title"
    | "eyebrow"
    | "section"
    | "tableHead"
    | "accentLine"
    | "headerBorder"
    | "stat"
    | "badge"
    | "rowAccent"
    | "footer"
): CSSProperties | undefined {
  if (!theme.isCustom || !theme.cssVars) return undefined;
  const p = theme.cssVars["--doc-primary"];
  const a = theme.cssVars["--doc-accent"];
  const ht = theme.cssVars["--doc-header-text"];
  const s = theme.cssVars["--doc-surface"];
  const th = theme.cssVars["--doc-table-head"];

  switch (part) {
    case "topBar":
      return { background: p };
    case "title":
      return { color: p };
    case "eyebrow":
      return { color: a };
    case "section":
      return { background: p, color: ht };
    case "tableHead":
      return { background: th, color: p };
    case "accentLine":
      return { background: a };
    case "headerBorder":
      return { borderColor: a };
    case "stat":
      return { background: s, borderColor: a };
    case "badge":
      return { background: s, borderColor: a, color: p };
    case "rowAccent":
      return { background: s, color: p };
    case "footer":
      return { borderColor: a };
    default:
      return undefined;
  }
}
