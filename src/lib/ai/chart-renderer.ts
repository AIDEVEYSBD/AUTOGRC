// ─────────────────────────────────────────────────────────────────────────────
// Server-side chart renderer — pure SVG generation, no DOM required.
// Converts SVG → PNG via sharp for reliable Word / email embedding.
// ─────────────────────────────────────────────────────────────────────────────

export type ChartSpec = {
  chartType: "LineChart" | "BarChart" | "PieChart";
  data: Record<string, number | string>[];
  xKey: string;
  yKeys: string[];
  title?: string;
  colors?: string[];
};

const DEFAULT_COLORS = ["#FFE600", "#2E2E38", "#4CAF50", "#FF5252", "#2196F3", "#FF9800"];
const CHART_W = 500;
const CHART_H = 270;

// ─── SVG generators ───────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function lineChartSvg(spec: ChartSpec): string {
  const { data, xKey, yKeys, title, colors: rawColors } = spec;
  const colors = rawColors?.length ? rawColors : DEFAULT_COLORS;
  const ml = 55, mr = 25, mt = title ? 38 : 18, mb = 48;
  const iW = CHART_W - ml - mr;
  const iH = CHART_H - mt - mb;

  const allVals = yKeys.flatMap(k => data.map(d => Number(d[k] ?? 0)));
  const rawMax = Math.max(...allVals, 1);
  const maxV = rawMax <= 100 ? 100 : Math.ceil(rawMax / 10) * 10;
  const minV = 0;

  const xP = (i: number) => (i / Math.max(data.length - 1, 1)) * iW;
  const yP = (v: number) => iH - ((v - minV) / (maxV - minV)) * iH;

  // Grid
  let grids = "";
  for (let i = 0; i <= 5; i++) {
    const y = (iH / 5) * i;
    const val = Math.round(maxV - (maxV / 5) * i);
    grids += `<line x1="0" y1="${y.toFixed(1)}" x2="${iW}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
    grids += `<text x="-8" y="${(y + 4).toFixed(1)}" font-size="10" fill="#9ca3af" text-anchor="end" font-family="Arial,sans-serif">${val}</text>`;
  }

  // Series lines + dots
  let series = "";
  for (let ki = 0; ki < yKeys.length; ki++) {
    const key = yKeys[ki];
    const color = colors[ki % colors.length];
    const pts = data.map((d, i) => `${xP(i).toFixed(1)},${yP(Number(d[key] ?? 0)).toFixed(1)}`).join(" ");
    series += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    data.forEach((d, i) => {
      const cx = xP(i).toFixed(1);
      const cy = yP(Number(d[key] ?? 0)).toFixed(1);
      series += `<circle cx="${cx}" cy="${cy}" r="4" fill="${color}" stroke="white" stroke-width="1.5"/>`;
    });
  }

  // X labels
  let xLabels = "";
  data.forEach((d, i) => {
    const lbl = escapeXml(String(d[xKey]).slice(0, 10));
    xLabels += `<text x="${xP(i).toFixed(1)}" y="${(iH + 20).toFixed(1)}" font-size="10" fill="#9ca3af" text-anchor="middle" font-family="Arial,sans-serif">${lbl}</text>`;
  });

  // Legend (right side when multiple series)
  let legend = "";
  if (yKeys.length > 1) {
    yKeys.forEach((k, ki) => {
      const lx = ml + iW + 8;
      const ly = mt + ki * 18;
      const color = colors[ki % colors.length];
      legend += `<rect x="${lx}" y="${ly}" width="10" height="10" fill="${color}" rx="2"/>`;
      legend += `<text x="${lx + 14}" y="${ly + 9}" font-size="9" fill="#374151" font-family="Arial,sans-serif">${escapeXml(k)}</text>`;
    });
  }

  const titleEl = title
    ? `<text x="${CHART_W / 2}" y="22" font-size="13" font-weight="bold" fill="#1f2937" text-anchor="middle" font-family="Arial,sans-serif">${escapeXml(title)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}">
  <rect width="${CHART_W}" height="${CHART_H}" fill="white" rx="6"/>
  ${titleEl}
  <g transform="translate(${ml},${mt})">
    ${grids}
    ${series}
    ${xLabels}
    <line x1="0" y1="0" x2="0" y2="${iH}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="0" y1="${iH}" x2="${iW}" y2="${iH}" stroke="#d1d5db" stroke-width="1"/>
  </g>
  ${legend}
</svg>`;
}

function barChartSvg(spec: ChartSpec): string {
  const { data, xKey, yKeys, title, colors: rawColors } = spec;
  const colors = rawColors?.length ? rawColors : DEFAULT_COLORS;
  const ml = 55, mr = 25, mt = title ? 38 : 18, mb = 52;
  const iW = CHART_W - ml - mr;
  const iH = CHART_H - mt - mb;

  const allVals = yKeys.flatMap(k => data.map(d => Number(d[k] ?? 0)));
  const rawMax = Math.max(...allVals, 1);
  const maxV = rawMax <= 100 ? 100 : Math.ceil(rawMax / 10) * 10;

  const groupW = iW / data.length;
  const padding = groupW * 0.18;
  const totalBarW = groupW - padding * 2;
  const barW = Math.min(totalBarW / yKeys.length, 28);
  const yP = (v: number) => iH - (v / maxV) * iH;

  // Grid
  let grids = "";
  for (let i = 0; i <= 4; i++) {
    const y = (iH / 4) * i;
    const val = Math.round(maxV * (1 - i / 4));
    grids += `<line x1="0" y1="${y.toFixed(1)}" x2="${iW}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
    grids += `<text x="-8" y="${(y + 4).toFixed(1)}" font-size="10" fill="#9ca3af" text-anchor="end" font-family="Arial,sans-serif">${val}</text>`;
  }

  let bars = "";
  let xLabels = "";

  data.forEach((d, i) => {
    const groupX = i * groupW + padding;
    yKeys.forEach((key, ki) => {
      const color = colors[ki % colors.length];
      const val = Number(d[key] ?? 0);
      const bh = (val / maxV) * iH;
      const bx = groupX + ki * barW;
      const by = yP(val);
      bars += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW - 2}" height="${bh.toFixed(1)}" fill="${color}" rx="2"/>`;
      // Value label on top if bar is wide enough
      if (barW >= 20) {
        bars += `<text x="${(bx + (barW - 2) / 2).toFixed(1)}" y="${(by - 3).toFixed(1)}" font-size="9" fill="#4b5563" text-anchor="middle" font-family="Arial,sans-serif">${val}</text>`;
      }
    });
    const centerX = groupX + (yKeys.length * barW) / 2;
    const lbl = escapeXml(String(d[xKey]).slice(0, 11));
    xLabels += `<text x="${centerX.toFixed(1)}" y="${(iH + 20).toFixed(1)}" font-size="10" fill="#9ca3af" text-anchor="middle" font-family="Arial,sans-serif">${lbl}</text>`;
  });

  const titleEl = title
    ? `<text x="${CHART_W / 2}" y="22" font-size="13" font-weight="bold" fill="#1f2937" text-anchor="middle" font-family="Arial,sans-serif">${escapeXml(title)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}">
  <rect width="${CHART_W}" height="${CHART_H}" fill="white" rx="6"/>
  ${titleEl}
  <g transform="translate(${ml},${mt})">
    ${grids}
    ${bars}
    ${xLabels}
    <line x1="0" y1="0" x2="0" y2="${iH}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="0" y1="${iH}" x2="${iW}" y2="${iH}" stroke="#d1d5db" stroke-width="1"/>
  </g>
</svg>`;
}

function pieChartSvg(spec: ChartSpec): string {
  const { data, xKey, yKeys, title, colors: rawColors } = spec;
  const colors = rawColors?.length ? rawColors : DEFAULT_COLORS;

  const legX = CHART_W * 0.58;
  const cx = CHART_W * 0.3;
  const cy = CHART_H / 2 + (title ? 8 : 0);
  const r = Math.min(cx * 0.72, (CHART_H - (title ? 50 : 30)) / 2);

  const slices = data.map(d => ({
    name: String(d[xKey]),
    value: Number(d[yKeys[0]] ?? 0),
  }));
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;

  let paths = "";
  let legend = "";
  let angle = -Math.PI / 2;

  slices.forEach((slice, i) => {
    const pct = slice.value / total;
    const startA = angle;
    const endA = angle + pct * 2 * Math.PI;
    angle = endA;

    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    const large = pct > 0.5 ? 1 : 0;
    const color = colors[i % colors.length];

    paths += `<path d="M${cx.toFixed(1)},${cy.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${color}" stroke="white" stroke-width="2"/>`;

    // Legend
    const ly = (title ? 36 : 20) + i * 22;
    const name = escapeXml(slice.name.slice(0, 18));
    legend += `<rect x="${legX}" y="${ly}" width="12" height="12" fill="${color}" rx="2"/>`;
    legend += `<text x="${legX + 17}" y="${ly + 10}" font-size="11" fill="#374151" font-family="Arial,sans-serif">${name}: ${Math.round(pct * 100)}%</text>`;
  });

  const titleEl = title
    ? `<text x="${CHART_W / 2}" y="22" font-size="13" font-weight="bold" fill="#1f2937" text-anchor="middle" font-family="Arial,sans-serif">${escapeXml(title)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}">
  <rect width="${CHART_W}" height="${CHART_H}" fill="white" rx="6"/>
  ${titleEl}
  ${paths}
  ${legend}
</svg>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateChartSvg(spec: ChartSpec): string {
  switch (spec.chartType) {
    case "LineChart": return lineChartSvg(spec);
    case "BarChart": return barChartSvg(spec);
    case "PieChart": return pieChartSvg(spec);
    default: return "";
  }
}

/**
 * Converts a chart spec to a PNG Buffer using sharp.
 * Returns null if sharp is unavailable or the spec has no data.
 */
export async function chartSpecToPng(spec: ChartSpec): Promise<Buffer | null> {
  if (!spec.data?.length) return null;
  try {
    const sharp = (await import("sharp")).default;
    const svg = generateChartSvg(spec);
    if (!svg) return null;
    return await sharp(Buffer.from(svg, "utf-8"))
      .png({ quality: 95 })
      .toBuffer();
  } catch {
    return null;
  }
}
