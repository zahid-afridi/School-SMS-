"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { FaFilePdf, FaFileWord, FaPrint } from "react-icons/fa";
import { exportDocument, type ExportFormat } from "@/lib/documentExport";
import type { ResultCardData } from "@/redux/features/exams/examTypes";
import type { SchoolDocumentDesign } from "@/lib/schoolDocumentDesign";

export default function DocumentExportBar({
  elementId,
  filename,
  disabled,
  label = "Export & print",
  resultCards,
  design,
}: {
  elementId: string;
  filename: string;
  disabled?: boolean;
  label?: string;
  /** When set, PDF/Word use a reliable jsPDF / HTML builder (not a screenshot). */
  resultCards?: ResultCardData[];
  design?: SchoolDocumentDesign;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const run = async (format: ExportFormat) => {
    if (disabled) {
      toast.error("Generate the document first");
      return;
    }
    setBusy(format);
    try {
      await exportDocument(format, {
        elementId,
        filename,
        resultCards,
        design,
      });
      if (format === "pdf") toast.success("PDF downloaded");
      if (format === "word") toast.success("Word file downloaded");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Export failed. Try again."
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="print:hidden flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Output
        </p>
        <h3 className="mt-0.5 font-semibold text-slate-900">{label}</h3>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap">
        <button
          type="button"
          disabled={!!busy || disabled}
          onClick={() => run("print")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <FaPrint />
          {busy === "print" ? "Opening…" : "Print"}
        </button>
        <button
          type="button"
          disabled={!!busy || disabled}
          onClick={() => run("pdf")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        >
          <FaFilePdf />
          {busy === "pdf" ? "Saving PDF…" : "Download PDF"}
        </button>
        <button
          type="button"
          disabled={!!busy || disabled}
          onClick={() => run("word")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <FaFileWord />
          {busy === "word" ? "Saving Word…" : "Download Word"}
        </button>
      </div>
    </div>
  );
}
