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
  chartSpecs?: ChartSpec[];   // one per chart rendered in the conversation
  chartData?: Record<string, unknown>[];
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

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportPayload;
    const { title = "AutoGRC Compliance Analysis Report", messages = [], chartSpecs, chartData } = body;

    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const docChildren: (Paragraph | Table)[] = [];

    // ── Title ─────────────────────────────────────────────────────────────────
    docChildren.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
      })
    );

    // ── Timestamp ─────────────────────────────────────────────────────────────
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Generated: ${timestamp}`, italics: true, color: "666666", size: 20 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // ── Charts section ────────────────────────────────────────────────────────
    if (chartSpecs && chartSpecs.length > 0) {
      docChildren.push(
        new Paragraph({
          text: "Charts & Visualizations",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 200 },
        })
      );

      for (const spec of chartSpecs) {
        const pngBuffer = await chartSpecToPng(spec);

        if (spec.title) {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: spec.title, bold: true, size: 22, color: "2E2E38" })],
              spacing: { before: 200, after: 100 },
            })
          );
        }

        if (pngBuffer) {
          // Embed actual chart image
          docChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: pngBuffer,
                  transformation: { width: 480, height: 258 },
                  type: "png",
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: { after: 240 },
            })
          );
        } else {
          // Fallback: include data as a table
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: "[Chart data — see table below]", italics: true, color: "888888", size: 18 })],
              spacing: { after: 80 },
            })
          );
          if (spec.data.length > 0) {
            const keys = [spec.xKey, ...spec.yKeys];
            const colW = Math.floor(8640 / keys.length);
            const headerRow = new TableRow({
              tableHeader: true,
              children: keys.map(k =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, color: "FFFFFF", size: 18 })] })],
                  shading: { fill: "2E2E38" },
                  width: { size: colW, type: WidthType.DXA },
                  margins: { top: 50, bottom: 50, left: 80, right: 80 },
                })
              ),
            });
            const dataRows = spec.data.slice(0, 20).map((row, ri) =>
              new TableRow({
                children: keys.map(k =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: String(row[k] ?? ""), size: 18 })] })],
                    shading: { fill: ri % 2 === 0 ? "F5F5F5" : "FFFFFF" },
                    width: { size: colW, type: WidthType.DXA },
                    margins: { top: 50, bottom: 50, left: 80, right: 80 },
                  })
                ),
              })
            );
            docChildren.push(new Table({ rows: [headerRow, ...dataRows] }));
            docChildren.push(new Paragraph({ text: "", spacing: { after: 200 } }));
          }
        }
      }
    }

    // ── Conversation / Analysis section ───────────────────────────────────────
    docChildren.push(
      new Paragraph({
        text: "AI Analysis",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 200 },
      })
    );

    for (const msg of messages) {
      if (msg.sender === "user") {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Question: ", bold: true, color: "2E2E38", size: 22 }),
              new TextRun({ text: msg.text, size: 22 }),
            ],
            spacing: { before: 240, after: 80 },
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: "AutoGRC Assistant:", bold: true, color: "1F5C99", size: 22 })],
            spacing: { before: 160, after: 60 },
          })
        );

        const lines = msg.text.split("\n");
        for (const raw of lines) {
          const clean = stripMarkdown(raw);
          if (!clean) continue;

          const isBullet = raw.trim().startsWith("•") || /^\s*[-*+]\s/.test(raw);
          const isHeading = /^#{1,3}\s/.test(raw);

          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: clean, size: 20, bold: isHeading })],
              indent: isBullet ? { left: 360 } : undefined,
              spacing: { after: 40 },
            })
          );
        }
      }
    }

    // ── Supporting data table (optional) ──────────────────────────────────────
    if (chartData && chartData.length > 0) {
      docChildren.push(
        new Paragraph({
          text: "Supporting Data",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      const keys = Object.keys(chartData[0]);
      const colW = Math.floor(8640 / keys.length);

      const headerRow = new TableRow({
        tableHeader: true,
        children: keys.map(k =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, color: "FFFFFF", size: 20 })] })],
            shading: { fill: "2E2E38" },
            width: { size: colW, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
          })
        ),
      });

      const dataRows = chartData.slice(0, 50).map((row, ri) =>
        new TableRow({
          children: keys.map(k =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(row[k] ?? ""), size: 18 })] })],
              shading: { fill: ri % 2 === 0 ? "F5F5F5" : "FFFFFF" },
              width: { size: colW, type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
            })
          ),
        })
      );

      docChildren.push(new Table({ rows: [headerRow, ...dataRows] }));
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Generated by AutoGRC AI Analytics Assistant  |  Confidential",
            italics: true, color: "999999", size: 16,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
      })
    );

    // ── Build document ────────────────────────────────────────────────────────
    const doc = new Document({
      sections: [{ children: docChildren }],
      title,
      creator: "AutoGRC AI Assistant",
    });

    const nodeBuffer = await Packer.toBuffer(doc);
    const buffer = new Uint8Array(nodeBuffer);
    const filename = `autogrc-report-${now.toISOString().slice(0, 10)}.docx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": nodeBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("[ai/export] Error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
