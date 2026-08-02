/**
 * Print / PDF / Word export helpers for exam documents.
 * PDF for result cards uses jsPDF text drawing (reliable).
 * Other documents use a sanitized HTML snapshot + html2canvas-pro.
 */

import type { ResultCardData } from "@/redux/features/exams/examTypes";
import { resolveUploadUrl } from "@/lib/apiBase";
import type { SchoolDocumentDesign } from "@/lib/schoolDocumentDesign";

export type ExportFormat = "print" | "pdf" | "word";

const UNSUPPORTED_COLOR_FN = /(oklch|oklab|lch|lab|color-mix|color)\s*\(/i;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resolveAssetUrl(path?: string | null): string | null {
  return resolveUploadUrl(path);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [15, 23, 42];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function positionLabel(card: ResultCardData) {
  const { classPosition, classStrength } = card;
  if (!classPosition) return "—";
  return `${classPosition}${ordinal(classPosition)} / ${classStrength ?? "—"}`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function createColorConverter() {
  const ctx = document.createElement("canvas").getContext("2d");
  return (value: string, fallback: string): string => {
    if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") {
      return fallback;
    }
    if (!UNSUPPORTED_COLOR_FN.test(value)) return value;
    if (!ctx) return fallback;
    try {
      ctx.fillStyle = "#000000";
      ctx.fillStyle = value;
      const parsed = String(ctx.fillStyle);
      if (!parsed || UNSUPPORTED_COLOR_FN.test(parsed)) return fallback;
      return parsed;
    } catch {
      return fallback;
    }
  };
}

function replaceUnsupportedColors(
  value: string,
  convert: (color: string, fallback: string) => string,
  fallback: string
): string {
  if (!value || !UNSUPPORTED_COLOR_FN.test(value)) return value;

  let result = "";
  let index = 0;

  while (index < value.length) {
    const remainder = value.slice(index);
    const match = remainder.match(/^(oklch|oklab|lch|lab|color-mix|color)\s*\(/i);

    if (!match) {
      result += value[index];
      index += 1;
      continue;
    }

    const start = index + match[0].length;
    let depth = 1;
    let end = start;
    while (end < value.length && depth > 0) {
      if (value[end] === "(") depth += 1;
      else if (value[end] === ")") depth -= 1;
      end += 1;
    }

    const token = value.slice(index, end);
    result += convert(token, fallback);
    index = end;
  }

  return result;
}

/** Copy live computed colors onto a clone so html2canvas never sees oklch/lab. */
function inlineSafeColors(liveRoot: HTMLElement, cloneRoot: HTMLElement) {
  const convert = createColorConverter();
  const liveNodes = [liveRoot, ...Array.from(liveRoot.querySelectorAll("*"))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll("*"))];
  const count = Math.min(liveNodes.length, cloneNodes.length);

  for (let i = 0; i < count; i += 1) {
    const live = liveNodes[i];
    const clone = cloneNodes[i];
    if (!(live instanceof HTMLElement) || !(clone instanceof HTMLElement)) {
      continue;
    }

    const computed = window.getComputedStyle(live);
    const color = convert(computed.color, "#0f172a");
    const bg = convert(computed.backgroundColor, "transparent");

    clone.style.color = color;
    if (bg && bg !== "rgba(0, 0, 0, 0)") {
      clone.style.backgroundColor = bg;
    }

    clone.style.borderTopColor = convert(computed.borderTopColor, "#cbd5e1");
    clone.style.borderRightColor = convert(computed.borderRightColor, "#cbd5e1");
    clone.style.borderBottomColor = convert(
      computed.borderBottomColor,
      "#cbd5e1"
    );
    clone.style.borderLeftColor = convert(computed.borderLeftColor, "#cbd5e1");
    clone.style.outlineColor = convert(computed.outlineColor, "transparent");

    if (
      computed.backgroundImage &&
      computed.backgroundImage !== "none" &&
      UNSUPPORTED_COLOR_FN.test(computed.backgroundImage)
    ) {
      clone.style.backgroundImage = "none";
      clone.style.backgroundColor = convert(computed.backgroundColor, "#0f172a");
    }

    if (computed.boxShadow && UNSUPPORTED_COLOR_FN.test(computed.boxShadow)) {
      clone.style.boxShadow = "none";
    }

    // Avoid layout collapse in the clone
    clone.style.visibility = "visible";
    clone.style.opacity = "1";
  }
}

export function printDocument(elementId?: string) {
  if (elementId && !document.getElementById(elementId)) {
    throw new Error("Document preview not found");
  }
  window.print();
}

async function renderCanvas(element: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas-pro");

  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    foreignObjectRendering: false,
    onclone: (_clonedDoc, clonedElement) => {
      const cloneRoot = clonedElement as HTMLElement;
      inlineSafeColors(element, cloneRoot);
      cloneRoot
        .querySelectorAll("[data-export-ignore]")
        .forEach((node) => node.remove());
    },
  });
}

async function canvasToPdfPages(
  pdf: InstanceType<typeof import("jspdf").jsPDF>,
  canvas: HTMLCanvasElement,
  startNewPage: boolean
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  if (startNewPage) pdf.addPage();

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }
}

/** Reliable PDF for result cards — drawn with jsPDF (no html2canvas text loss). */
export async function exportResultCardsToPdf(
  cards: ResultCardData[],
  filename: string,
  design?: SchoolDocumentDesign
) {
  if (!cards.length) throw new Error("No result card to export");

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < cards.length; i += 1) {
    if (i > 0) pdf.addPage();
    await drawResultCardPage(pdf, cards[i], design);
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

async function drawResultCardPage(
  pdf: InstanceType<typeof import("jspdf").jsPDF>,
  card: ResultCardData,
  design?: SchoolDocumentDesign
) {
  const { school, exam, student, summary, lines } = card;
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ink = design?.text ?? "#0f172a";
  const muted = "#64748b";
  const line = "#cbd5e1";
  const primary = hexToRgb(design?.primary ?? "#0f172a");
  const tableHead = hexToRgb(design?.tableHead ?? "#f1f5f9");

  // Top accent bar
  pdf.setFillColor(...primary);
  pdf.rect(0, 0, pageW, 4, "F");
  y = 10;

  // Logo + school header + photo
  const logoUrl =
    design?.showLogo === false ? null : resolveAssetUrl(school?.logoUrl);
  const photoUrl =
    design?.showStudentPhoto === false
      ? null
      : resolveAssetUrl(student.photoUrl);
  const [logoImg, photoImg] = await Promise.all([
    logoUrl ? loadImage(logoUrl) : Promise.resolve(null),
    photoUrl ? loadImage(photoUrl) : Promise.resolve(null),
  ]);

  const boxSize = 22;
  if (logoImg) {
    try {
      pdf.addImage(logoImg, "JPEG", margin, y, boxSize, boxSize);
    } catch {
      // ignore corrupt image
    }
  } else {
    pdf.setDrawColor(line);
    pdf.roundedRect(margin, y, boxSize, boxSize, 2, 2, "S");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(ink);
    pdf.text((school?.name ?? "S").charAt(0), margin + boxSize / 2, y + 13, {
      align: "center",
    });
  }

  const photoW = 18;
  const photoH = 22;
  const photoX = pageW - margin - photoW;
  if (photoImg) {
    try {
      pdf.addImage(photoImg, "JPEG", photoX, y, photoW, photoH);
    } catch {
      // ignore
    }
  } else {
    pdf.setDrawColor(line);
    pdf.roundedRect(photoX, y, photoW, photoH, 1, 1, "S");
  }

  const headerX = margin + boxSize + 6;
  const headerW = photoX - headerX - 4;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(ink);
  pdf.text(school?.name ?? "School Name", headerX, y + 7, {
    maxWidth: headerW,
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(muted);
  if (school?.address) {
    pdf.text(school.address, headerX, y + 12, { maxWidth: headerW });
  }
  const contact = [school?.phone, school?.email].filter(Boolean).join(" · ");
  if (contact) {
    pdf.text(contact, headerX, y + 17, { maxWidth: headerW });
  }

  y += boxSize + 6;
  pdf.setDrawColor(ink);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(muted);
  pdf.text("ACADEMIC RESULT CARD", pageW / 2, y, { align: "center" });
  y += 6;
  pdf.setFontSize(14);
  pdf.setTextColor(ink);
  pdf.text(exam.name, pageW / 2, y, { align: "center" });
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(muted);
  pdf.text(
    `Session ${exam.academicYear ?? student.academicYear ?? "—"} · ${formatDate(exam.startDate)}${
      exam.endDate ? ` — ${formatDate(exam.endDate)}` : ""
    }`,
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 8;

  // Student Particulars box
  const particulars = [
    ["Name", student.name],
    ["Father Name", student.fatherName ?? "—"],
    ["Roll No", student.rollNo ?? "—"],
    ["Class", student.className || "—"],
    ["Section", student.sectionName ?? "—"],
    ["Percentage", `${summary.overallPercent}%`],
    ["Grade", summary.grade],
    ["Class Position", positionLabel(card)],
  ] as const;

  const boxTop = y;
  const rowH = 7;
  const rows = Math.ceil(particulars.length / 2);
  const boxH = 8 + rows * rowH + 4;

  pdf.setDrawColor(line);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, boxTop, contentW, boxH, 2, 2, "S");

  pdf.setFillColor(...primary);
  pdf.rect(margin, boxTop, contentW, 7, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor("#ffffff");
  pdf.text("STUDENT PARTICULARS", margin + 3, boxTop + 4.8);

  const py = boxTop + 12;
  const colW = contentW / 2;
  particulars.forEach(([label, value], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + 3 + col * colW;
    const yy = py + row * rowH;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(muted);
    pdf.text(`${label}:`, x, yy);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(ink);
    pdf.text(String(value), x + 28, yy, { maxWidth: colW - 32 });
  });

  y = boxTop + boxH + 6;

  // Marks table
  const tableTop = y;
  pdf.setFillColor(...primary);
  pdf.rect(margin, tableTop, contentW, 7, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor("#ffffff");
  pdf.text("SUBJECT-WISE MARKS", margin + 3, tableTop + 4.8);
  y = tableTop + 7;

  const cols = [
    { key: "#", w: 8 },
    { key: "Subject", w: 52 },
    { key: "Max", w: 14 },
    { key: "Pass", w: 14 },
    { key: "Obt.", w: 16 },
    { key: "%", w: 14 },
    { key: "Grade", w: 14 },
    { key: "Status", w: contentW - 8 - 52 - 14 - 14 - 16 - 14 - 14 },
  ];

  // Header row
  pdf.setFillColor(...tableHead);
  pdf.rect(margin, y, contentW, 7, "F");
  pdf.setDrawColor(line);
  pdf.rect(margin, y, contentW, 7, "S");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(ink);
  let cx = margin;
  cols.forEach((c) => {
    const align = ["Max", "Pass", "Obt.", "%"].includes(c.key)
      ? "right"
      : "left";
    const tx = align === "right" ? cx + c.w - 2 : cx + 2;
    pdf.text(c.key, tx, y + 4.6, { align: align === "right" ? "right" : "left" });
    cx += c.w;
  });
  y += 7;

  const drawRow = (
    cells: string[],
    opts?: { bold?: boolean; fill?: [number, number, number] }
  ) => {
    const h = 7;
    if (y + h > pdf.internal.pageSize.getHeight() - 28) {
      pdf.addPage();
      y = margin;
    }
    if (opts?.fill) {
      pdf.setFillColor(...opts.fill);
      pdf.rect(margin, y, contentW, h, "F");
    }
    pdf.setDrawColor(line);
    pdf.rect(margin, y, contentW, h, "S");
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(ink);

    let x = margin;
    cells.forEach((cell, idx) => {
      const c = cols[idx];
      const align = [2, 3, 4, 5].includes(idx) ? "right" : "left";
      const tx = align === "right" ? x + c.w - 2 : x + 2;
      pdf.text(String(cell ?? "—"), tx, y + 4.6, {
        align: align === "right" ? "right" : "left",
        maxWidth: c.w - 3,
      });
      x += c.w;
    });
    y += h;
  };

  if (lines.length === 0) {
    drawRow(["", "No subjects scheduled", "", "", "", "", "", ""]);
  } else {
    lines.forEach((line, idx) => {
      drawRow([
        String(idx + 1),
        line.subjectName + (line.subjectCode ? ` (${line.subjectCode})` : ""),
        String(line.maxMarks),
        String(line.passMarks),
        line.isAbsent ? "Absent" : String(line.obtainedMarks ?? "—"),
        line.percent != null ? String(line.percent) : "—",
        line.grade ?? "—",
        line.status,
      ]);
    });
  }

  drawRow(
    [
      "",
      "Total",
      String(summary.totalMax),
      "",
      String(summary.totalObtained),
      String(summary.overallPercent),
      summary.grade,
      summary.overallStatus,
    ],
    { bold: true, fill: [248, 250, 252] }
  );

  // Signatures
  y = Math.max(y + 18, pdf.internal.pageSize.getHeight() - 30);
  pdf.setDrawColor(100);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(ink);

  const sigW = contentW / 3;
  ["Class Teacher", "Controller Exams", "Principal"].forEach((label, idx) => {
    const x = margin + idx * sigW + 8;
    pdf.line(x, y, x + sigW - 16, y);
    pdf.text(label, x + (sigW - 16) / 2, y + 5, { align: "center" });
  });

  if (card.issuedAt) {
    pdf.setFontSize(7);
    pdf.setTextColor(muted);
    pdf.text(
      `Issued on ${formatDate(card.issuedAt)} · Computer-generated result card`,
      pageW / 2,
      pdf.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }
}

/** Clean HTML for Word / generic exports — hex colors only. */
export function buildResultCardHtml(card: ResultCardData): string {
  const { school, exam, student, summary, lines } = card;
  const logo = resolveAssetUrl(school?.logoUrl);
  const photo = resolveAssetUrl(student.photoUrl);

  const rows = lines
    .map(
      (line, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(line.subjectName)}</strong>${
          line.subjectCode
            ? ` <span style="color:#94a3b8">(${escapeHtml(line.subjectCode)})</span>`
            : ""
        }</td>
        <td style="text-align:right">${line.maxMarks}</td>
        <td style="text-align:right">${line.passMarks}</td>
        <td style="text-align:right"><strong>${
          line.isAbsent ? "Absent" : (line.obtainedMarks ?? "—")
        }</strong></td>
        <td style="text-align:right">${line.percent ?? "—"}</td>
        <td><strong>${escapeHtml(line.grade ?? "—")}</strong></td>
        <td>${escapeHtml(line.status)}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#fff">
    <div style="height:6px;background:#0f172a"></div>
    <div style="padding:20px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr>
          <td style="width:80px;vertical-align:top">
            ${
              logo
                ? `<img src="${escapeHtml(logo)}" width="72" height="72" style="object-fit:contain;border:1px solid #e2e8f0;border-radius:8px" />`
                : `<div style="width:72px;height:72px;border:1px solid #e2e8f0;border-radius:8px;text-align:center;line-height:72px;font-size:24px;font-weight:bold;color:#94a3b8">${escapeHtml(
                    (school?.name ?? "S").charAt(0)
                  )}</div>`
            }
          </td>
          <td style="text-align:center;padding:0 12px">
            <div style="font-size:22px;font-weight:700">${escapeHtml(
              school?.name ?? "School Name"
            )}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">${escapeHtml(
              school?.address ?? ""
            )}</div>
            <div style="font-size:11px;color:#94a3b8">${escapeHtml(
              [school?.phone, school?.email].filter(Boolean).join(" · ")
            )}</div>
          </td>
          <td style="width:70px;vertical-align:top;text-align:right">
            ${
              photo
                ? `<img src="${escapeHtml(photo)}" width="64" height="80" style="object-fit:cover;border:1px solid #cbd5e1;border-radius:6px" />`
                : `<div style="width:64px;height:80px;border:1px solid #cbd5e1;border-radius:6px;text-align:center;line-height:80px;font-weight:bold;color:#94a3b8">${escapeHtml(
                    student.name.charAt(0)
                  )}</div>`
            }
          </td>
        </tr>
      </table>

      <div style="text-align:center;margin:12px 0 18px">
        <div style="font-size:11px;letter-spacing:2px;color:#64748b;font-weight:700;text-transform:uppercase">Academic Result Card</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px">${escapeHtml(
          exam.name
        )}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">
          Session ${escapeHtml(
            String(exam.academicYear ?? student.academicYear ?? "—")
          )}
          · ${escapeHtml(formatDate(exam.startDate))}
          ${exam.endDate ? ` — ${escapeHtml(formatDate(exam.endDate))}` : ""}
        </div>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;margin-bottom:16px">
        <div style="background:#0f172a;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Student Particulars</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="padding:8px 12px;width:50%"><span style="color:#64748b">Name:</span> <strong>${escapeHtml(
              student.name
            )}</strong></td>
            <td style="padding:8px 12px"><span style="color:#64748b">Father Name:</span> <strong>${escapeHtml(
              student.fatherName ?? "—"
            )}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 12px"><span style="color:#64748b">Roll No:</span> <strong>${escapeHtml(
              student.rollNo ?? "—"
            )}</strong></td>
            <td style="padding:8px 12px"><span style="color:#64748b">Class:</span> <strong>${escapeHtml(
              student.className || "—"
            )}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 12px"><span style="color:#64748b">Section:</span> <strong>${escapeHtml(
              student.sectionName ?? "—"
            )}</strong></td>
            <td style="padding:8px 12px"><span style="color:#64748b">Percentage:</span> <strong>${
              summary.overallPercent
            }%</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 12px"><span style="color:#64748b">Grade:</span> <strong>${escapeHtml(
              summary.grade
            )}</strong></td>
            <td style="padding:8px 12px"><span style="color:#64748b">Class Position:</span> <strong>${escapeHtml(
              positionLabel(card)
            )}</strong></td>
          </tr>
        </table>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:10px;overflow:hidden">
        <div style="background:#0f172a;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Subject-wise Marks</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f1f5f9;text-align:left">
              <th style="padding:8px;border-bottom:1px solid #e2e8f0">#</th>
              <th style="padding:8px;border-bottom:1px solid #e2e8f0">Subject</th>
              <th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">Max</th>
              <th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">Pass</th>
              <th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">Obtained</th>
              <th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">%</th>
              <th style="padding:8px;border-bottom:1px solid #e2e8f0">Grade</th>
              <th style="padding:8px;border-bottom:1px solid #e2e8f0">Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows ||
              `<tr><td colspan="8" style="padding:16px;text-align:center;color:#94a3b8">No subjects scheduled</td></tr>`
            }
            <tr style="background:#f8fafc;font-weight:700;border-top:2px solid #0f172a">
              <td style="padding:8px" colspan="2">Total</td>
              <td style="padding:8px;text-align:right">${summary.totalMax}</td>
              <td style="padding:8px"></td>
              <td style="padding:8px;text-align:right">${summary.totalObtained}</td>
              <td style="padding:8px;text-align:right">${summary.overallPercent}</td>
              <td style="padding:8px">${escapeHtml(summary.grade)}</td>
              <td style="padding:8px">${escapeHtml(summary.overallStatus)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table style="width:100%;margin-top:40px;text-align:center;font-size:12px;color:#475569">
        <tr>
          <td style="width:33%;border-top:1px solid #94a3b8;padding-top:8px">Class Teacher</td>
          <td style="width:33%;border-top:1px solid #94a3b8;padding-top:8px">Controller Exams</td>
          <td style="width:33%;border-top:1px solid #94a3b8;padding-top:8px">Principal</td>
        </tr>
      </table>
    </div>
  </div>`;
}

export function exportResultCardsToWord(
  cards: ResultCardData[],
  filename: string
) {
  const body = cards.map((card) => buildResultCardHtml(card)).join(
    '<br style="page-break-after:always" />'
  );

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(filename)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #e2e8f0; }
  </style>
</head>
<body>${body}</body>
</html>`;

  downloadBlob(
    new Blob(["\ufeff", html], { type: "application/msword" }),
    filename.endsWith(".doc") ? filename : `${filename}.doc`
  );
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const documents = Array.from(
    element.querySelectorAll<HTMLElement>(
      ".result-card-document, .date-sheet-document, .student-id-card-face, .admission-letter-document"
    )
  );
  const targets = documents.length > 0 ? documents : [element];

  for (let i = 0; i < targets.length; i += 1) {
    const canvas = await renderCanvas(targets[i]);
    await canvasToPdfPages(pdf, canvas, i > 0);
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function exportElementToWord(element: HTMLElement, filename: string) {
  const clone = element.cloneNode(true) as HTMLElement;
  const convert = createColorConverter();

  clone
    .querySelectorAll(".print\\:hidden, [data-export-ignore]")
    .forEach((node) => node.remove());

  const sources = [element, ...Array.from(element.querySelectorAll("*"))];
  const targets = [clone, ...Array.from(clone.querySelectorAll("*"))];

  if (sources.length === targets.length) {
    sources.forEach((source, index) => {
      const target = targets[index];
      if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) {
        return;
      }
      const computed = window.getComputedStyle(source);
      const color = convert(computed.color, "#0f172a");
      const bg = convert(computed.backgroundColor, "#ffffff");
      target.setAttribute(
        "style",
        [
          `color:${color}`,
          bg && bg !== "rgba(0, 0, 0, 0)" ? `background-color:${bg}` : "",
          `font-size:${computed.fontSize}`,
          `font-weight:${computed.fontWeight}`,
          `text-align:${computed.textAlign}`,
          `padding:${computed.padding}`,
        ]
          .filter(Boolean)
          .join(";")
      );
    });
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${escapeHtml(filename)}</title>
<style>
@page { size: A4; margin: 12mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #0f172a; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
img { max-width: 90px; height: auto; }
</style></head>
<body>${clone.innerHTML}</body></html>`;

  downloadBlob(
    new Blob(["\ufeff", html], { type: "application/msword" }),
    filename.endsWith(".doc") ? filename : `${filename}.doc`
  );

  void replaceUnsupportedColors;
}

export async function exportDocument(
  format: ExportFormat,
  options: {
    elementId: string;
    filename: string;
    resultCards?: ResultCardData[];
    design?: SchoolDocumentDesign;
  }
) {
  if (format === "print") {
    printDocument(options.elementId);
    return;
  }

  if (options.resultCards && options.resultCards.length > 0) {
    if (format === "pdf") {
      await exportResultCardsToPdf(
        options.resultCards,
        options.filename,
        options.design
      );
      return;
    }
    exportResultCardsToWord(options.resultCards, options.filename);
    return;
  }

  const element = document.getElementById(options.elementId);
  if (!element) {
    throw new Error("Document preview not found. Generate the document first.");
  }

  if (format === "pdf") {
    await exportElementToPdf(element, options.filename);
    return;
  }

  exportElementToWord(element, options.filename);
}
