/**
 * Renders a DOM subtree to a multi-page A4 PDF (client-side).
 */

function sanitizeFileBase(name: string): string {
  const trimmed = name.trim() || 'summary';
  return trimmed.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'summary';
}

/**
 * @param element Root node to capture (should be visible in layout).
 * @param baseFileName Filename without extension; sanitized before save.
 */
export async function downloadSummaryAsPdf(element: HTMLElement, baseFileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: -window.scrollY,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeightTotal = (canvas.height * imgWidth) / canvas.width;

  if (imgHeightTotal <= pageHeight + 0.5) {
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeightTotal);
    pdf.save(`${sanitizeFileBase(baseFileName)}.pdf`);
    return;
  }

  const pxPerPage = (canvas.width * pageHeight) / imgWidth;
  let y = 0;
  let first = true;

  while (y < canvas.height) {
    const sliceH = Math.min(Math.ceil(pxPerPage), canvas.height - y);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d context unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    const img = pageCanvas.toDataURL('image/png', 1.0);
    const sliceMm = (sliceH * imgWidth) / canvas.width;

    if (!first) pdf.addPage();
    pdf.addImage(img, 'PNG', 0, 0, imgWidth, sliceMm);
    first = false;
    y += sliceH;
  }

  pdf.save(`${sanitizeFileBase(baseFileName)}.pdf`);
}
