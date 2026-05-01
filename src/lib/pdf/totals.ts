import type jsPDF from 'jspdf';
import type { VendaComItens } from '@/hooks/useVendas';
import type { PdfLayout, PdfTheme } from './types';
import { formatCurrency } from '@/lib/date-utils';
import { ensureSpace } from './pagination';

interface TotalsArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  venda: VendaComItens;
  y: number;
}

export function drawTotals({ doc, layout, theme, venda, y }: TotalsArgs): number {
  const { pageWidth, margin } = layout;

  // Reserve space for: divider + subtotal + (optional discount) + total badge (~38mm)
  const hasDiscount = venda.bonus_total > 0;
  const needed = 38 + (hasDiscount ? 6 : 0);
  y = ensureSpace({ doc, layout, theme, y, needed });

  y += 4;
  doc.setDrawColor(...theme.borderColor);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const totalsRight = pageWidth - margin - 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...theme.muted);
  doc.text('Subtotal:', totalsRight - 50, y);
  doc.setTextColor(...theme.ink);
  doc.text(formatCurrency(venda.valor_total), totalsRight, y, { align: 'right' });
  y += 6;

  if (hasDiscount) {
    doc.setTextColor(...theme.muted);
    doc.text('Desconto:', totalsRight - 50, y);
    doc.setTextColor(239, 68, 68);
    doc.text(`- ${formatCurrency(venda.bonus_total)}`, totalsRight, y, { align: 'right' });
    y += 6;
  }

  // Total badge
  y += 2;
  const badgeW = 95;
  const badgeX = pageWidth - margin - badgeW;
  const badgeH = 14;
  doc.setFillColor(...theme.primary);
  doc.roundedRect(badgeX, y, badgeW, badgeH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', badgeX + 6, y + 9);
  doc.setFontSize(13);
  doc.text(formatCurrency(venda.valor_final), badgeX + badgeW - 6, y + 9, { align: 'right' });
  return y + 22;
}
