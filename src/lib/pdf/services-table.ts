import type jsPDF from 'jspdf';
import type { VendaComItens } from '@/hooks/useVendas';
import type { PdfLayout, PdfTheme } from './types';
import { formatCurrency } from '@/lib/date-utils';
import { getContrastFg } from './utils';
import { ensureSpace, getContentBottom } from './pagination';

interface ServicesArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  venda: VendaComItens;
  y: number;
}

const ROW_H = 9;
const HEADER_H = 9;

function drawTableHeader(doc: jsPDF, layout: PdfLayout, theme: PdfTheme, y: number): number {
  const { pageWidth, margin, contentWidth } = layout;
  doc.setFillColor(...theme.secondary);
  doc.rect(margin, y, contentWidth, HEADER_H, 'F');
  const headerFg = getContrastFg(theme.secondary);
  doc.setTextColor(...headerFg);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('#', margin + 4, y + 6);
  doc.text('ESTOFADO / SERVIÇO', margin + 14, y + 6);
  doc.text('TIPO', pageWidth - margin - 50, y + 6);
  doc.text('VALOR', pageWidth - margin - 4, y + 6, { align: 'right' });
  return y + HEADER_H;
}

export function drawServicesTable({ doc, layout, theme, venda, y }: ServicesArgs): number {
  const { pageWidth, margin, contentWidth } = layout;

  y = drawTableHeader(doc, layout, theme, y);

  venda.itens.forEach((s, i) => {
    // Break to new page if next row + table header (for repeat) won't fit
    if (y + ROW_H > getContentBottom(layout)) {
      y = ensureSpace({ doc, layout, theme, y, needed: ROW_H + HEADER_H });
      y = drawTableHeader(doc, layout, theme, y);
    }

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, ROW_H, 'F');
    }
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(String(i + 1), margin + 4, y + 6);
    const desc = s.estofado || 'Serviço sem descrição';
    const descTrim = desc.length > 38 ? desc.slice(0, 36) + '…' : desc;
    doc.text(descTrim, margin + 14, y + 6);

    doc.setFontSize(8);
    doc.setTextColor(...theme.muted);
    const tipo = (s.tipo_servico || '').toString();
    const tipoTrim = tipo.length > 22 ? tipo.slice(0, 20) + '…' : tipo;
    doc.text(tipoTrim, pageWidth - margin - 50, y + 6);

    doc.setFontSize(9.5);
    doc.setTextColor(...theme.ink);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(s.valor), pageWidth - margin - 4, y + 6, { align: 'right' });
    y += ROW_H;
  });

  return y;
}
