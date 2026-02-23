import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import PDFDocument from "pdfkit";
import { chartSpecToPng, type ChartSpec } from "@/lib/ai/chart-renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportMessage = {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
};

type ExportPayload = {
  title?: string;
  messages: ExportMessage[];
  chartSpecs?: ChartSpec[];
  chartData?: Record<string, unknown>[];
  format?: "docx" | "pdf" | "md" | "txt";
  reportOnly?: boolean;
};

// ─── Markdown stripper ────────────────────────────────────────────────────────

function stripMarkdown(line: string): string {
  return line
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
}

// ─── Markdown export ──────────────────────────────────────────────────────────

function buildMarkdown(title: string, messages: ExportMessage[], reportOnly: boolean): string {
  const filtered = reportOnly ? messages.filter(m => m.sender === "bot") : messages;
  const timestamp = new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const parts: string[] = [
    `# ${title}`,
    `*Generated: ${timestamp}*`,
    "",
    "---",
    "",
  ];

  for (const msg of filtered) {
    if (msg.sender === "user") {
      parts.push(`**You:** ${msg.text}`, "");
    } else {
      parts.push("**AutoGRC Assistant:**", "", msg.text, "", "---", "");
    }
  }

  return parts.join("\n");
}

// ─── Plain text export ────────────────────────────────────────────────────────

function buildPlainText(title: string, messages: ExportMessage[], reportOnly: boolean): string {
  const filtered = reportOnly ? messages.filter(m => m.sender === "bot") : messages;
  const timestamp = new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const parts: string[] = [
    title.toUpperCase(),
    `Generated: ${timestamp}`,
    "=".repeat(60),
    "",
  ];

  for (const msg of filtered) {
    if (msg.sender === "user") {
      parts.push(`YOU:`, msg.text, "");
    } else {
      const lines = msg.text.split("\n").map(l => stripMarkdown(l)).filter(Boolean);
      parts.push("AUTOGRC ASSISTANT:", ...lines, "", "-".repeat(40), "");
    }
  }

  return parts.join("\n");
}

// ─── PDF export ───────────────────────────────────────────────────────────────

async function buildPDF(title: string, messages: ExportMessage[], reportOnly: boolean): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const merged = Buffer.concat(chunks);
      const ab = new ArrayBuffer(merged.length);
      new Uint8Array(ab).set(merged);
      resolve(ab);
    });
    doc.on("error", reject);

    const DARK = "#2E2E38";
    const YELLOW = "#FFE600";
    const GRAY = "#666666";
    const filtered = reportOnly ? messages.filter(m => m.sender === "bot") : messages;
    const timestamp = new Date().toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    // Title
    doc.fontSize(22).fillColor(DARK).font("Helvetica-Bold").text(title, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(GRAY).font("Helvetica").text(`Generated: ${timestamp}`, { align: "center" });
    doc.moveDown(0.5);

    // Yellow rule
    doc.save().moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).lineWidth(2).strokeColor(YELLOW).stroke().restore();
    doc.moveDown(1);

    for (const msg of filtered) {
      if (msg.sender === "user") {
        doc.fontSize(10).fillColor(GRAY).font("Helvetica-Bold").text("YOU:", { continued: false });
        doc.fontSize(11).fillColor(DARK).font("Helvetica").text(msg.text, { indent: 10 });
        doc.moveDown(0.8);
      } else {
        doc.fontSize(10).fillColor("#1F5C99").font("Helvetica-Bold").text("AUTOGRC ASSISTANT:", { continued: false });
        doc.moveDown(0.2);

        const lines = msg.text.split("\n");
        for (const raw of lines) {
          if (!raw.trim()) { doc.moveDown(0.3); continue; }
          const isHeading = /^#{1,3}\s/.test(raw);
          const isBullet = /^\s*[-*+•]\s/.test(raw);
          const clean = stripMarkdown(raw);
          if (!clean) continue;

          if (isHeading) {
            doc.fontSize(12).fillColor(DARK).font("Helvetica-Bold").text(clean, { indent: 0 });
          } else if (isBullet) {
            doc.fontSize(11).fillColor("#333333").font("Helvetica").text(`• ${clean.replace(/^•\s*/, "")}`, { indent: 20 });
          } else {
            doc.fontSize(11).fillColor("#333333").font("Helvetica").text(clean, { indent: 0 });
          }
        }

        doc.moveDown(0.5);
        // Subtle divider between bot messages
        doc.save().moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).lineWidth(0.5).strokeColor("#CCCCCC").stroke().restore();
        doc.moveDown(0.7);
      }

      // New page if close to bottom
      if (doc.y > doc.page.height - 100) doc.addPage();
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(9).fillColor(GRAY).font("Helvetica-Oblique")
      .text("Generated by AutoGRC AI Analytics Assistant  |  Confidential", { align: "center" });

    doc.end();
  });
}

// ─── DOCX export ──────────────────────────────────────────────────────────────

async function buildDocx(
  title: string,
  messages: ExportMessage[],
  chartSpecs: ChartSpec[] | undefined,
  chartData: Record<string, unknown>[] | undefined,
  reportOnly: boolean
): Promise<ArrayBuffer> {
  const filtered = reportOnly ? messages.filter(m => m.sender === "bot") : messages;
  const now = new Date();
  const timestamp = now.toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const docChildren: (Paragraph | Table)[] = [];

  // Title
  docChildren.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
  docChildren.push(new Paragraph({
    children: [new TextRun({ text: `Generated: ${timestamp}`, italics: true, color: "666666", size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  // Charts section
  if (chartSpecs && chartSpecs.length > 0) {
    docChildren.push(new Paragraph({ text: "Charts & Visualizations", heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 200 } }));
    for (const spec of chartSpecs) {
      const pngBuffer = await chartSpecToPng(spec);
      if (spec.title) {
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: spec.title, bold: true, size: 22, color: "2E2E38" })],
          spacing: { before: 200, after: 100 },
        }));
      }
      if (pngBuffer) {
        docChildren.push(new Paragraph({
          children: [new ImageRun({ data: pngBuffer, transformation: { width: 480, height: 258 }, type: "png" })],
          alignment: AlignmentType.LEFT,
          spacing: { after: 240 },
        }));
      } else if (spec.data.length > 0) {
        const keys = [spec.xKey, ...spec.yKeys];
        const colW = Math.floor(8640 / keys.length);
        const headerRow = new TableRow({ tableHeader: true, children: keys.map(k => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, color: "FFFFFF", size: 18 })] })], shading: { fill: "2E2E38" }, width: { size: colW, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 80, right: 80 } })) });
        const dataRows = spec.data.slice(0, 20).map((row, ri) => new TableRow({ children: keys.map(k => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(row[k] ?? ""), size: 18 })] })], shading: { fill: ri % 2 === 0 ? "F5F5F5" : "FFFFFF" }, width: { size: colW, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 80, right: 80 } })) }));
        docChildren.push(new Table({ rows: [headerRow, ...dataRows] }));
        docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      }
    }
  }

  // AI Analysis section
  docChildren.push(new Paragraph({ text: "AI Analysis", heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 200 } }));
  for (const msg of filtered) {
    if (msg.sender === "user") {
      docChildren.push(new Paragraph({
        children: [new TextRun({ text: "Question: ", bold: true, color: "2E2E38", size: 22 }), new TextRun({ text: msg.text, size: 22 })],
        spacing: { before: 240, after: 80 },
      }));
    } else {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: "AutoGRC Assistant:", bold: true, color: "1F5C99", size: 22 })], spacing: { before: 160, after: 60 } }));
      const lines = msg.text.split("\n");
      for (const raw of lines) {
        const clean = stripMarkdown(raw);
        if (!clean) continue;
        const isBullet = raw.trim().startsWith("•") || /^\s*[-*+]\s/.test(raw);
        const isHeading = /^#{1,3}\s/.test(raw);
        docChildren.push(new Paragraph({ children: [new TextRun({ text: clean, size: 20, bold: isHeading })], indent: isBullet ? { left: 360 } : undefined, spacing: { after: 40 } }));
      }
    }
  }

  // Supporting data table
  if (chartData && chartData.length > 0) {
    docChildren.push(new Paragraph({ text: "Supporting Data", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
    const keys = Object.keys(chartData[0]);
    const colW = Math.floor(8640 / keys.length);
    const headerRow = new TableRow({ tableHeader: true, children: keys.map(k => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, color: "FFFFFF", size: 20 })] })], shading: { fill: "2E2E38" }, width: { size: colW, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 } })) });
    const dataRows = chartData.slice(0, 50).map((row, ri) => new TableRow({ children: keys.map(k => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(row[k] ?? ""), size: 18 })] })], shading: { fill: ri % 2 === 0 ? "F5F5F5" : "FFFFFF" }, width: { size: colW, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } } })) }));
    docChildren.push(new Table({ rows: [headerRow, ...dataRows] }));
  }

  // Footer
  docChildren.push(new Paragraph({
    children: [new TextRun({ text: "Generated by AutoGRC AI Analytics Assistant  |  Confidential", italics: true, color: "999999", size: 16 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 480 },
  }));

  const doc = new Document({ sections: [{ children: docChildren }], title, creator: "AutoGRC AI Assistant" });
  const nodeBuffer = await Packer.toBuffer(doc);
  const ab = new ArrayBuffer(nodeBuffer.length);
  new Uint8Array(ab).set(nodeBuffer);
  return ab;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportPayload;
    const {
      title = "AutoGRC Compliance Analysis Report",
      messages = [],
      chartSpecs,
      chartData,
      format = "docx",
      reportOnly = false,
    } = body;

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "md") {
      const content = buildMarkdown(title, messages, reportOnly);
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="autogrc-report-${dateStr}.md"`,
        },
      });
    }

    if (format === "txt") {
      const content = buildPlainText(title, messages, reportOnly);
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="autogrc-report-${dateStr}.txt"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = await buildPDF(title, messages, reportOnly);
      const blob = new Blob([buffer], { type: "application/pdf" });
      return new NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="autogrc-report-${dateStr}.pdf"`,
          "Content-Length": buffer.byteLength.toString(),
        },
      });
    }

    // Default: docx
    const buffer = await buildDocx(title, messages, chartSpecs, chartData, reportOnly);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="autogrc-report-${dateStr}.docx"`,
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("[ai/export] Error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
