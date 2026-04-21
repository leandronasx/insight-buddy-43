import type jsPDF from 'jspdf';
import type { VendaComServicos } from '@/hooks/useVendas';
import type { PdfLayout, PdfTheme } from './types';
import { formatCurrency } from '@/lib/date-utils';
import { getContrastFg } from './utils';

interface ServicesArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  venda: VendaComServicos;
  y: number;
}

export function drawServicesTable({ doc, layout, theme, venda, y }: ServicesArgs): number {
  const { pageWidth, margin, contentWidth } = layout;

  doc.setFillColor(...theme.secondary);
  doc.rect(margin, y, contentWidth, 9, 'F');
  const headerFg = getContrastFg(theme.secondary);
  doc.setTextColor(...headerFg);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('#', margin + 4, y + 6);
  doc.text('ESTOFADO / SERVIÇO', margin + 14, y + 6);
  doc.text('TIPO', pageWidth - margin - 50, y + 6);
  doc.text('VALOR', pageWidth - margin - 4, y + 6, { align: 'right' });
  y += 9;

  venda.servicos.forEach((s, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 9, 'F');
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
    y += 9;
  });

  return y;
}
