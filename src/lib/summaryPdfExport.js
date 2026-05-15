/**
 * @fileoverview Builds a structured A4 PDF from the F7 summary object (native text layout).
 */

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const C = {
  dark: [22, 25, 22],
  gray: [109, 112, 105],
  coral: [253, 78, 89],
  green: [84, 130, 53],
  amber: [255, 171, 40],
  line: [200, 200, 200],
};

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} v
 * @param {string} [fallback]
 * @returns {string}
 */
function str(v, fallback = '—') {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

/**
 * @param {string} name
 * @returns {string}
 */
function sanitizeFileBase(name) {
  const trimmed = name.trim() || 'summary';
  return trimmed.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'summary';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatTileValue(value) {
  if (value == null) return '—';
  if (typeof value === 'number') return `${value}%`;
  return String(value);
}

/**
 * @param {unknown} delta
 * @returns {string}
 */
function formatDelta(delta) {
  const n = typeof delta === 'number' ? delta : Number(delta);
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}%`;
}

class PdfWriter {
  constructor() {
    /** @type {import('jspdf').jsPDF | null} */
    this.pdf = null;
    this.y = MARGIN;
    this.pageNum = 1;
  }

  /**
   * @param {import('jspdf').jsPDF} pdf
   */
  init(pdf) {
    this.pdf = pdf;
    this.y = MARGIN;
    this.pageNum = 1;
  }

  /**
   * @param {number} need
   */
  ensureSpace(need) {
    if (!this.pdf) return;
    if (this.y + need > PAGE_H - MARGIN) {
      this.pdf.addPage();
      this.pageNum += 1;
      this.y = MARGIN;
    }
  }

  /**
   * @param {[number, number, number]} rgb
   */
  setColor(rgb) {
    if (!this.pdf) return;
    this.pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  /**
   * @param {string} text
   * @param {number} fontSize
   * @param {'normal' | 'bold'} style
   * @param {[number, number, number]} color
   */
  drawLines(text, fontSize, style, color) {
    if (!this.pdf) return;
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont('helvetica', style);
    this.setColor(color);
    const lines = this.pdf.splitTextToSize(text, CONTENT_W);
    const blockH = lines.length * (fontSize * 0.42) + 2;
    this.ensureSpace(blockH);
    this.pdf.text(lines, MARGIN, this.y);
    this.y += blockH;
  }

  /**
   * @param {string} title
   */
  sectionTitle(title) {
    this.ensureSpace(14);
    this.y += 4;
    this.drawLines(title.toUpperCase(), 11, 'bold', C.dark);
    if (!this.pdf) return;
    this.pdf.setDrawColor(...C.line);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 4;
  }

  /**
   * @param {string} text
   */
  body(text) {
    this.drawLines(text, 10, 'normal', C.gray);
    this.y += 1;
  }

  /**
   * @param {string} label
   * @param {string} value
   */
  labelValue(label, value) {
    this.ensureSpace(8);
    if (!this.pdf) return;
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.setColor(C.gray);
    this.pdf.text(label, MARGIN, this.y);
    this.y += 4;
    this.drawLines(value, 11, 'normal', C.dark);
    this.y += 2;
  }

  /**
   * @param {string[]} items
   */
  bullets(items) {
    if (!this.pdf) return;
    for (const item of items) {
      const lines = this.pdf.splitTextToSize(`• ${item}`, CONTENT_W - 4);
      const blockH = lines.length * 4.2 + 1;
      this.ensureSpace(blockH);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.setColor(C.gray);
      this.pdf.text(lines, MARGIN + 2, this.y);
      this.y += blockH;
    }
    this.y += 1;
  }

  /**
   * @param {string[]} headers
   * @param {string[][]} rows
   * @param {number[]} colWidths
   */
  table(headers, rows, colWidths) {
    if (!this.pdf) return;
    const headerH = 8;
    this.ensureSpace(headerH + 2);

    let x = MARGIN;
    this.pdf.setFillColor(253, 248, 244);
    this.pdf.rect(MARGIN, this.y - 4, CONTENT_W, headerH, 'F');
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.setColor(C.gray);
    for (let i = 0; i < headers.length; i += 1) {
      this.pdf.text(headers[i], x + 1, this.y);
      x += colWidths[i];
    }
    this.y += headerH;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    for (const row of rows) {
      const rowH = 7;
      this.ensureSpace(rowH + 2);
      x = MARGIN;
      let maxLines = 1;
      const cellLines = row.map((cell, i) => {
        const lines = this.pdf.splitTextToSize(cell, colWidths[i] - 2);
        maxLines = Math.max(maxLines, lines.length);
        return lines;
      });
      const actualH = Math.max(rowH, maxLines * 4.2 + 2);
      for (let c = 0; c < row.length; c += 1) {
        this.setColor(C.dark);
        this.pdf.text(cellLines[c], x + 1, this.y);
        x += colWidths[c];
      }
      this.y += actualH;
      this.pdf.setDrawColor(...C.line);
      this.pdf.setLineWidth(0.1);
      this.pdf.line(MARGIN, this.y - 1, PAGE_W - MARGIN, this.y - 1);
    }
    this.y += 3;
  }

  /**
   * @param {string} footer
   */
  addFooters(footer) {
    if (!this.pdf) return;
    const total = this.pdf.getNumberOfPages();
    for (let p = 1; p <= total; p += 1) {
      this.pdf.setPage(p);
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'normal');
      this.setColor(C.gray);
      this.pdf.text(footer, MARGIN, PAGE_H - 10);
      this.pdf.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
    }
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} summary Output of aggregateSummary()
 * @param {string} clientName
 * @param {string} baseFileName
 * @returns {Promise<void>}
 */
export async function downloadSummaryReportPdf(summary, clientName, baseFileName) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const w = new PdfWriter();
  w.init(pdf);

  const headline = asObj(summary?.headline);
  const statTiles = Array.isArray(summary?.stat_tiles) ? summary.stat_tiles : [];
  const journey = Array.isArray(summary?.journey) ? summary.journey : [];
  const alloc = asObj(summary?.allocation_summary);
  const vol = asObj(alloc.coverage_by_volume);
  const risk = asObj(summary?.risk_evidence);
  const coverage = asObj(risk.coverage_check);
  const caveats = asObj(summary?.caveats);
  const limitations = Array.isArray(summary?.limitations) ? summary.limitations : [];

  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  w.pdf.setFillColor(253, 248, 244);
  w.pdf.rect(0, 0, PAGE_W, 42, 'F');
  w.pdf.setDrawColor(...C.coral);
  w.pdf.setLineWidth(1.2);
  w.pdf.line(MARGIN, 14, MARGIN, 38);

  w.y = 18;
  w.drawLines('Operating Model Simulator', 9, 'bold', C.gray);
  w.drawLines('Summary Report', 20, 'bold', C.dark);
  w.drawLines(`${clientName} · ${generatedAt}`, 10, 'normal', C.gray);
  if (caveats.illustrative_flag !== false) {
    w.y += 2;
    w.drawLines('ILLUSTRATIVE — values are directional, not commercial terms.', 9, 'normal', C.amber);
  }
  w.y = 48;

  w.sectionTitle('Executive summary');
  w.labelValue('Recommendation', str(headline.recommendation, 'NEEDS REVIEW').replace(/_/g, ' '));
  w.labelValue('Scenario', str(headline.scenario_name));
  w.labelValue('Summary', str(headline.one_line_summary));
  w.labelValue('Transformation pattern', str(headline.pattern_label));

  if (statTiles.length > 0) {
    w.sectionTitle('Key metrics');
    const rows = statTiles.map((tile) => {
      const t = asObj(tile);
      return [
        str(t.label),
        formatTileValue(t.current),
        formatTileValue(t.future),
        t.delta_pct != null ? formatDelta(t.delta_pct) : '—',
      ];
    });
    w.table(['Metric', 'Current', 'Future', 'Change'], rows, [48, 38, 38, 38]);
  }

  if (journey.length > 0) {
    w.sectionTitle('Pipeline journey');
    const jRows = journey.map((node) => {
      const n = asObj(node);
      const status = str(n.status) === 'complete' ? 'Complete' : 'Pending';
      return [str(n.feature), str(n.label), status, str(n.summary)];
    });
    w.table(['Step', 'Feature', 'Status', 'Summary'], jRows, [14, 32, 22, 104]);
  }

  w.sectionTitle('Allocation summary');
  w.body(
    `By task count (${str(alloc.total_tasks, '0')} tasks): ` +
      `${str(alloc.automated_pct)}% automated · ${str(alloc.assisted_pct)}% assisted · ${str(alloc.human_only_pct)}% human-only.`,
  );
  w.body(
    `By volume × time (business impact): ` +
      `${str(vol.automated_pct)}% automated · ${str(vol.assisted_pct)}% assisted · ${str(vol.human_only_pct)}% human-only.`,
  );
  w.body('Volume-weighted reflects business impact; task count reflects breadth of change.');

  w.sectionTitle('Risk & escalation evidence');

  const riskCats = Array.isArray(risk.risk_categories) ? risk.risk_categories : [];
  if (riskCats.length > 0) {
    w.drawLines('Risk categories preserved', 10, 'bold', C.dark);
    w.y += 2;
    const rRows = riskCats.map((row) => {
      const r = asObj(row);
      return [str(r.name), str(r.severity).toUpperCase(), r.kept_human === true ? 'Yes' : 'No'];
    });
    w.table(['Risk', 'Severity', 'Kept human'], rRows, [90, 35, 35]);
  } else {
    w.body('No risk categories captured in intake.');
  }

  const locked = Array.isArray(risk.locked_tasks) ? risk.locked_tasks : [];
  w.y += 2;
  w.drawLines('Locked tasks (regulatory)', 10, 'bold', C.dark);
  w.y += 2;
  if (locked.length > 0) {
    w.bullets(locked.map((name) => `${str(name)} — Locked: regulatory`));
  } else {
    w.body('No regulatory-locked tasks.');
  }

  w.y += 2;
  w.drawLines('Coverage check', 10, 'bold', C.dark);
  w.y += 2;
  const todayVol = Number(coverage.total_volume_handled_by_humans_today) || 0;
  const futureVol = Number(coverage.total_volume_handled_by_humans_future) || 0;
  const todayPct = todayVol > 0 ? 100 : 0;
  const futurePct = todayVol > 0 ? Math.round((futureVol / todayVol) * 100) : 0;
  w.body(`Today: humans handle ${todayPct}% of volume. Future: humans handle ${futurePct}% of volume.`);
  w.body(`Volume reduction: ${str(coverage.reduction_pct, '0')}%`);
  if (coverage.sufficient_safety_review === true) {
    w.drawLines(
      'Safety review coverage maintained — all critical-consequence tasks remain human-only.',
      10,
      'normal',
      C.green,
    );
  } else {
    w.drawLines(
      'Review required — not all critical-consequence tasks remain human-only.',
      10,
      'normal',
      C.coral,
    );
  }
  w.y += 3;

  w.sectionTitle('Caveats & assumptions');
  const extractionWarnings = Array.isArray(caveats.extraction_warnings) ? caveats.extraction_warnings : [];
  const dataGaps = Array.isArray(caveats.data_gaps) ? caveats.data_gaps : [];
  if (extractionWarnings.length > 0) {
    w.drawLines('Extraction warnings', 10, 'bold', C.dark);
    w.y += 2;
    w.bullets(extractionWarnings.map((x) => str(x)));
  }
  if (dataGaps.length > 0) {
    w.drawLines('Data gaps', 10, 'bold', C.dark);
    w.y += 2;
    w.bullets(dataGaps.map((x) => str(x)));
  } else if (extractionWarnings.length === 0) {
    w.body('No additional data gaps flagged.');
  }
  w.body('All financial values are illustrative based on industry assumptions.');

  w.sectionTitle('Limitations of this analysis');
  w.bullets(limitations.map((x) => str(x)));

  w.addFooters(`${clientName} · Operating Model Simulator · ${generatedAt}`);
  pdf.save(`${sanitizeFileBase(baseFileName)}.pdf`);
}
