// Client-side PDF export for analysis results (works entirely in the browser).
// Keeps the report workflow usable even when the backend is offline.
import { jsPDF } from "jspdf";
import { downloadBlob, formatNumber, formatPct } from "../api/client.js";

const THEME = { teal: [14, 116, 144], ink: [15, 23, 42], grey: [100, 116, 139] };
const M = 14; // page margin (mm)
const W = 210; // A4 width

function r(g, x, y, w, h, fill, radius = 0) {
  if (radius <= 0) {
    if (fill) { g.setFillColor(fill[0], fill[1], fill[2]); g.rect(x, y, w, h, "F"); }
    else { g.setDrawColor(fill[0], fill[1], fill[2]); g.rect(x, y, w, h, "S"); }
  } else {
    if (fill) { g.setFillColor(fill[0], fill[1], fill[2]); g.roundedRect(x, y, w, h, radius, radius, "F"); }
    else { g.setDrawColor(fill[0], fill[1], fill[2]); g.roundedRect(x, y, w, h, radius, radius, "S"); }
  }
}

export function buildAnalysisPdf(result) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const understanding = result.understanding || {};
  const summary = result.summary || {};
  let y = M;

  // Header band
  r(doc, 0, 0, W, 26, THEME.teal);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  const title = result.label || "OrbitIQ Analysis";
  doc.text(title.slice(0, 70), M, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Generated ${(result.created_at || "").replace("T", " ").slice(0, 16)} UTC  ·  Confidence ${formatPct(result.confidence)}  ·  ${(result.geojson?.features || []).length} features`,
    M, 18
  );
  const sim = result.simulated ?? Boolean(result.metadata?.simulated);
  doc.text(sim ? "⚠ DEMO / simulated data — illustrative only" : "Real catalogue data", M, 23);
  y += 30;

  // Query
  if (understanding.query_text) {
    doc.setTextColor(THEME.grey[0], THEME.grey[1], THEME.grey[2]);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("ORIGINAL QUERY", M, y);
    y += 5;
    doc.setFontSize(11);
    doc.setTextColor(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
    const lines = doc.splitTextToSize(understanding.query_text, W - 2 * M);
    doc.text(lines.slice(0, 3), M, y);
    y += lines.slice(0, 3).length * 5 + 6;
  }

  const heading = (label, color = THEME.teal) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label.toUpperCase(), M, y);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.4);
    doc.line(M, y + 1.5, W - M, y + 1.5);
    y += 7;
  };

  heading("Executive summary");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
  const narr = doc.splitTextToSize(summary.narrative || "Analysis complete.", W - 2 * M);
  doc.text(narr.slice(0, 10), M, y);
  y += Math.min(narr.length, 10) * 4.6 + 5;

  if (summary.highlights?.length) {
    heading("Key findings");
    doc.setFontSize(9.5);
    summary.highlights.slice(0, 6).forEach(h => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
      const hl = doc.splitTextToSize(h, W - 2 * M - 5);
      doc.setFillColor(16, 185, 129);
      doc.circle(M + 1, y - 1, 0.9, "F");
      doc.text(hl.slice(0, 2), M + 4, y);
      y += Math.min(hl.length, 2) * 4.4 + 1.2;
    });
    y += 4;
  }
// Stats table (paginated)
  const stats = Object.entries(result.stats || {})
    .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
    .slice(0, 20);
  if (stats.length) {
    heading("Key statistics");
    const rowH = 7;
    let rowY = y;
    const col1 = 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    r(doc, M, rowY, W - 2 * M, rowH, THEME.teal);
    doc.setTextColor(255, 255, 255);
    doc.text("Metric", M + 3, rowY + 5);
    doc.text("Value", M + col1 + 3, rowY + 5);
    rowY += rowH;
    doc.setFont("helvetica", "normal");
    stats.forEach(([k, v], i) => {
      if (rowY > 275) { doc.addPage(); rowY = M; }
      if (i % 2 === 0) r(doc, M, rowY, W - 2 * M, rowH, [248, 250, 252]);
      doc.setTextColor(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
      const pretty = typeof v === "number"
        ? (String(k).includes("km") ? formatNumber(v, 2) : formatNumber(v))
        : String(v);
      doc.text(k.replace(/_/g, " ").slice(0, 32), M + 3, rowY + 5);
      doc.setFont("helvetica", "bold");
      doc.text(doc.splitTextToSize(pretty, 80).slice(0, 2), M + col1 + 3, rowY + 5);
      doc.setFont("helvetica", "normal");
      rowY += rowH;
    });
    y = rowY + 6;
  }
// Verification
  const checks = result.verification?.checks || [];
  if (checks.length) {
    if (y > 240) { doc.addPage(); y = M; }
    heading("Verification report");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    checks.forEach(c => {
      const color = c.level === "passed" ? [6, 95, 70] : c.level === "warning" ? [146, 64, 14] : [153, 27, 27];
      const split = doc.splitTextToSize(`• ${c.name}: ${c.detail}`, W - 2 * M - 6);
      if (y > 280) { doc.addPage(); y = M; }
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(split.slice(0, 2), M + 2, y);
      y += Math.min(split.length, 2) * 4.4 + 1.5;
    });
  }
// Methodology + meta
  if (y > 255) { doc.addPage(); y = M; }
  heading("Methodology");
  doc.setFontSize(9.5);
  doc.setTextColor(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
  const meth = [
    "1. Natural-language query understanding into structured slots.",
    "2. AI agent selection (SAR / Optical / Temporal / Fusion).",
    "3. Data retrieval through provider adapters.",
    "4. Spatial & temporal feature extraction over the AOI.",
    "5. Geometric, statistical and provenance verification.",
    "6. Deterministic AI summary of computed statistics."
  ];
  meth.forEach(t => {
    doc.text(t, M + 2, y);
    y += 4.8;
  });

  y += 4;
  heading("Analysis metadata");
  doc.setFontSize(9);
  const meta = [
    ["Model", result.metadata?.model],
    ["Satellite", result.metadata?.satellite],
    ["Data type", result.metadata?.data_type],
    ["Resolution", result.metadata?.resolution],
    ["Source", result.metadata?.source],
    ["Location", understanding.location || "—"]
  ].filter(([, v]) => v);
  doc.setTextColor(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}: `, M + 2, y);
    const w1 = doc.getTextWidth(`${k}: `);
    doc.setFont("helvetica", "normal");
    doc.text(String(v).slice(0, 60), M + 2 + w1, y);
    y += 4.6;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(THEME.grey[0], THEME.grey[1], THEME.grey[2]);
    doc.text(`Generated by OrbitIQ · ${(result.created_at || "").slice(0, 10)}`, M, 292);
    doc.text(`Page ${i} / ${pages}`, W - M, 292, { align: "right" });
  }

  const filename = `orbitiq-${result.id ? result.id.slice(0, 8) : "report"}.pdf`;
  downloadBlob(doc.output("blob"), filename);
}