import type { DocumentCustomStyle } from "@/lib/documentStyles";

export type DocumentFont = "modern" | "classic" | "friendly";
export type DocumentDensity = "comfortable" | "compact";
export type DocumentShape = "soft" | "square" | "pill";
export type IdCardLayout = "midnight" | "clean" | "bold";
export type ResultCardLayout =
  | "academic"
  | "modern"
  | "minimal"
  | "certificate";

export const RESULT_CARD_FORMATS: Array<{
  id: ResultCardLayout;
  name: string;
  description: string;
}> = [
  {
    id: "academic",
    name: "Academic",
    description: "School report card with particulars box and full marks table",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean banner header with summary chips and open spacing",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Ink-friendly plain layout for economical printing",
  },
  {
    id: "certificate",
    name: "Certificate (DMC)",
    description:
      "Board-style detailed marks certificate with formal prose and words",
  },
];
export type DateSheetLayout = "formal" | "modern" | "compact";

export type SchoolDocumentDesign = {
  version: 1;
  name: string;
  primary: string;
  accent: string;
  headerText: string;
  surface: string;
  tableHead: string;
  text: string;
  font: DocumentFont;
  density: DocumentDensity;
  shape: DocumentShape;
  idCardLayout: IdCardLayout;
  resultCardLayout: ResultCardLayout;
  dateSheetLayout: DateSheetLayout;
  showLogo: boolean;
  showStudentPhoto: boolean;
  showBarcode: boolean;
  updatedAt: string;
};

export type DesignPreset = {
  id: string;
  label: string;
  description: string;
  design: Pick<
    SchoolDocumentDesign,
    | "primary"
    | "accent"
    | "headerText"
    | "surface"
    | "tableHead"
    | "text"
    | "font"
    | "shape"
    | "idCardLayout"
    | "resultCardLayout"
    | "dateSheetLayout"
  >;
};

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "midnight",
    label: "Midnight Academy",
    description: "Confident navy with a warm gold accent",
    design: {
      primary: "#0b1f33",
      accent: "#f59e0b",
      headerText: "#ffffff",
      surface: "#f8fafc",
      tableHead: "#e2e8f0",
      text: "#0f172a",
      font: "modern",
      shape: "soft",
      idCardLayout: "midnight",
      resultCardLayout: "academic",
      dateSheetLayout: "formal",
    },
  },
  {
    id: "ocean",
    label: "Ocean Modern",
    description: "Fresh blue, open spacing, contemporary feel",
    design: {
      primary: "#0c4a6e",
      accent: "#06b6d4",
      headerText: "#ffffff",
      surface: "#ecfeff",
      tableHead: "#cffafe",
      text: "#082f49",
      font: "modern",
      shape: "soft",
      idCardLayout: "clean",
      resultCardLayout: "modern",
      dateSheetLayout: "modern",
    },
  },
  {
    id: "heritage",
    label: "Heritage",
    description: "Traditional green and gold for formal schools",
    design: {
      primary: "#14532d",
      accent: "#ca8a04",
      headerText: "#ffffff",
      surface: "#f7fee7",
      tableHead: "#ecfccb",
      text: "#052e16",
      font: "classic",
      shape: "square",
      idCardLayout: "bold",
      resultCardLayout: "academic",
      dateSheetLayout: "formal",
    },
  },
  {
    id: "berry",
    label: "Berry Creative",
    description: "Warm, expressive, and friendly",
    design: {
      primary: "#701a75",
      accent: "#f97316",
      headerText: "#ffffff",
      surface: "#fdf4ff",
      tableHead: "#fae8ff",
      text: "#3b0764",
      font: "friendly",
      shape: "pill",
      idCardLayout: "bold",
      resultCardLayout: "modern",
      dateSheetLayout: "modern",
    },
  },
  {
    id: "ink",
    label: "Ink & Paper",
    description: "Minimal, economical and print-friendly",
    design: {
      primary: "#18181b",
      accent: "#71717a",
      headerText: "#ffffff",
      surface: "#fafafa",
      tableHead: "#f4f4f5",
      text: "#18181b",
      font: "classic",
      shape: "square",
      idCardLayout: "clean",
      resultCardLayout: "minimal",
      dateSheetLayout: "compact",
    },
  },
];

export const DEFAULT_SCHOOL_DOCUMENT_DESIGN: SchoolDocumentDesign = {
  version: 1,
  name: "Midnight Academy",
  ...DESIGN_PRESETS[0].design,
  density: "comfortable",
  showLogo: true,
  showStudentPhoto: true,
  showBarcode: true,
  updatedAt: new Date(0).toISOString(),
};

const HEX = /^#[0-9a-f]{6}$/i;

function color(value: unknown, fallback: string) {
  return typeof value === "string" && HEX.test(value) ? value : fallback;
}

export function parseSchoolDocumentDesign(
  value?: string | null
): SchoolDocumentDesign {
  if (!value) return { ...DEFAULT_SCHOOL_DOCUMENT_DESIGN };
  try {
    const raw = JSON.parse(value) as Partial<SchoolDocumentDesign>;
    const base = DEFAULT_SCHOOL_DOCUMENT_DESIGN;
    return {
      ...base,
      ...raw,
      version: 1,
      primary: color(raw.primary, base.primary),
      accent: color(raw.accent, base.accent),
      headerText: color(raw.headerText, base.headerText),
      surface: color(raw.surface, base.surface),
      tableHead: color(raw.tableHead, base.tableHead),
      text: color(raw.text, base.text),
      name:
        typeof raw.name === "string" && raw.name.trim()
          ? raw.name.trim().slice(0, 80)
          : base.name,
    };
  } catch {
    return { ...DEFAULT_SCHOOL_DOCUMENT_DESIGN };
  }
}

export function applyDesignPreset(
  current: SchoolDocumentDesign,
  preset: DesignPreset
): SchoolDocumentDesign {
  return {
    ...current,
    ...preset.design,
    name: preset.label,
    updatedAt: new Date().toISOString(),
  };
}

export function designToCustomStyle(
  design: SchoolDocumentDesign
): DocumentCustomStyle {
  return {
    id: "school-document-design",
    name: design.name,
    primary: design.primary,
    accent: design.accent,
    headerText: design.headerText,
    surface: design.surface,
    tableHead: design.tableHead,
    createdAt: design.updatedAt,
  };
}

export function documentFontClass(font: DocumentFont) {
  if (font === "classic") return "font-serif";
  if (font === "friendly") return "font-sans tracking-[0.01em]";
  return "font-sans";
}

export function documentRadiusClass(shape: DocumentShape) {
  if (shape === "square") return "rounded-sm";
  if (shape === "pill") return "rounded-[1.5rem]";
  return "rounded-2xl";
}
