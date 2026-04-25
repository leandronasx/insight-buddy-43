import type jsPDF from 'jspdf';
import type { PdfLayout, PdfTheme } from './types';

/**
 * Bottom Y limit for content (above footer area).
 * Footer occupies last ~12mm of the page.
 */
export function getContentBottom(layout: PdfLayout): number {
  return layout.pageHeight - 16;
}

interface NewPageArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
}

/**
 * Adds a new page with the same accent bar at the top.
 * Returns the starting Y for content on the new page.
 */
export function addContentPage({ doc, layout, theme }: NewPageArgs): number {
  doc.addPage();
  const accentH = 4;
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, layout.pageWidth, accentH, 'F');
  return accentH + 10;
}

/**
 * Ensures there is at least `needed` mm of vertical space remaining.
 * Adds a new page if not, returning the new Y.
 */
export function ensureSpace(
  args: NewPageArgs & { y: number; needed: number }
): number {
  if (args.y + args.needed > getContentBottom(args.layout)) {
    return addContentPage(args);
  }
  return args.y;
}
