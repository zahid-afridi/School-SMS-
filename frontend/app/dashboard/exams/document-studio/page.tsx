"use client";

import Link from "next/link";
import {
  FaClipboardList,
  FaFileAlt,
  FaPalette,
  FaPrint,
  FaUserGraduate,
} from "react-icons/fa";
import { BUILTIN_TEMPLATES } from "@/lib/documentStyles";
import { ExamBreadcrumb } from "../_components/ExamUI";
import DocumentStyleCustomizer from "../_components/DocumentStyleCustomizer";
import ExamTemplatePicker from "../_components/ExamTemplatePicker";
import { useState } from "react";
import type { ExamDocumentTemplate } from "@/lib/documentStyles";

const quickLinks = [
  {
    href: "/dashboard/exams/result-card",
    title: "Result Card",
    desc: "Generate, style, print, PDF & Word",
    icon: <FaUserGraduate className="text-blue-600" />,
  },
  {
    href: "/dashboard/exams/date-sheet",
    title: "Date Sheet",
    desc: "Exam schedule with templates & export",
    icon: <FaClipboardList className="text-blue-600" />,
  },
  {
    href: "/dashboard/exams/result-sheet",
    title: "Result Sheet",
    desc: "Class-wise marks table for printing",
    icon: <FaFileAlt className="text-blue-600" />,
  },
  {
    href: "/dashboard/exams/award-list",
    title: "Award List",
    desc: "Blank / filled mark entry sheets",
    icon: <FaPrint className="text-blue-600" />,
  },
];

export default function DocumentStudioPage() {
  const [previewTemplate, setPreviewTemplate] =
    useState<ExamDocumentTemplate>("classic");

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto max-w-6xl">
        <ExamBreadcrumb current="Document Studio" />

        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <FaPalette className="text-blue-600" />
            <span>Exams</span>
            <span>/</span>
            <span className="font-medium text-slate-800">Document Studio</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Document Studio
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Pick ready-made templates or build your own colors for result cards,
            date sheets, and other printable school documents. Export as Print,
            PDF, or Word from each document page.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                {link.icon}
              </div>
              <h3 className="font-semibold text-slate-900">{link.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{link.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ExamTemplatePicker
            value={previewTemplate}
            onChange={setPreviewTemplate}
            title="Built-in templates (8 + Custom)"
          />
          <p className="mt-4 text-xs text-slate-500">
            {BUILTIN_TEMPLATES.length} built-in looks:{" "}
            {BUILTIN_TEMPLATES.map((t) => t.name).join(", ")}. Select{" "}
            <strong>Custom</strong> on Result Card or Date Sheet to apply your
            saved style.
          </p>
        </div>

        <DocumentStyleCustomizer />
      </div>
    </div>
  );
}
