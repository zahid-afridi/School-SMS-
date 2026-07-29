"use client";

import { ButtonLoader } from "@/app/components/PageLoader";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useGetAllClassesQuery } from "@/redux/features/classes/ClassApi";
import { useGetMySchoolQuery } from "@/redux/features/school/schoolApi";
import {
  useGetExamsQuery,
  useLazyGetDateSheetQuery,
} from "@/redux/features/exams/examApi";
import type { DateSheetData } from "@/redux/features/exams/examTypes";
import type { DocumentCustomStyle } from "@/lib/documentStyles";
import { ExamBreadcrumb, examInputClass } from "../_components/ExamUI";
import DateSheetDocument from "../_components/DateSheetDocument";
import ExamTemplatePicker, {
  type ExamDocumentTemplate,
} from "../_components/ExamTemplatePicker";
import DocumentExportBar from "../_components/DocumentExportBar";
import DocumentStyleCustomizer from "../_components/DocumentStyleCustomizer";

export default function DateSheetPage() {
  const { data: exams = [] } = useGetExamsQuery();
  const { data: classes = [] } = useGetAllClassesQuery();
  const { data: school } = useGetMySchoolQuery();
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [data, setData] = useState<DateSheetData | null>(null);
  const [template, setTemplate] =
    useState<ExamDocumentTemplate>("classic");
  const [customStyle, setCustomStyle] = useState<DocumentCustomStyle | null>(
    null
  );
  const [load, { isFetching }] = useLazyGetDateSheetQuery();

  useEffect(() => {
    const styleId = "date-sheet-print-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        body * { visibility: hidden !important; }
        #date-sheet-print-area, #date-sheet-print-area * {
          visibility: visible !important;
        }
        #date-sheet-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #date-sheet-print-area thead {
          display: table-header-group;
        }
        #date-sheet-print-area tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const handleLoad = async () => {
    if (!examId) {
      toast.error("Select an exam");
      return;
    }
    try {
      const res = await load({
        examId,
        classId: classId || undefined,
      }).unwrap();
      setData(res);
    } catch (err: unknown) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to load date sheet"
      );
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="max-w-6xl mx-auto">
        <ExamBreadcrumb current="Date Sheet" />
        <div className="mb-6 print:hidden">
          <h1 className="text-3xl font-bold text-slate-900">Date Sheet</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a professional examination schedule and choose your design
          </p>
        </div>

        <div className="mb-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
          <ExamTemplatePicker
            value={template}
            onChange={setTemplate}
            title="Choose date sheet template"
          />

          {template === "custom" && (
            <DocumentStyleCustomizer onActiveChange={setCustomStyle} compact />
          )}

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                EXAM
              </label>
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className={examInputClass}
              >
                <option value="">Select exam</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                CLASS (optional)
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={examInputClass}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleLoad}
                disabled={isFetching}
                className="h-11 w-full rounded-xl bg-black px-5 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isFetching ? (
                  <ButtonLoader label="Loading date sheet" />
                ) : (
                  "View Date Sheet"
                )}
              </button>
            </div>
          </div>
        </div>

        {data && (
          <>
            <div className="mb-4">
              <DocumentExportBar
                elementId="date-sheet-print-area"
                filename={`date-sheet-${data.exam.name.replace(/\s+/g, "-")}`}
                label="Print, PDF, or Word"
              />
            </div>
            <div id="date-sheet-print-area">
              <DateSheetDocument
                data={data}
                school={school}
                template={template}
                customStyle={customStyle}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
