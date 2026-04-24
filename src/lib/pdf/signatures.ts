import type jsPDF from 'jspdf';
import type { Empresa } from '@/hooks/useEmpresa';
import type { PdfLayout, PdfTheme } from './types';
import { ensureSpace } from './pagination';

interface SignaturesArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  empresa: Empresa;
  y: number;
}

export function drawSignatures({ doc, layout, theme, empresa, y }: SignaturesArgs): number {
  const { pageWidth, pageHeight, margin, contentWidth } = layout;

  // Signatures need ~30mm minimum
  y = ensureSpace({ doc, layout, theme, y, needed: 30 });

  const sigY = Math.max(y + 20, pageHeight - 35);
  doc.setDrawColor(...theme.borderColor);
  const sigWidth = (contentWidth - 20) / 2;
  doc.line(margin, sigY, margin + sigWidth, sigY);
  doc.line(margin + sigWidth + 20, sigY, pageWidth - margin, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...theme.muted);
  doc.text('Assinatura do Cliente', margin + sigWidth / 2, sigY + 5, { align: 'center' });
  doc.text(`Assinatura — ${empresa.nome_empresa}`, margin + sigWidth + 20 + sigWidth / 2, sigY + 5, { align: 'center' });

  return sigY + 8;
}

/**
 * Draws footer on EVERY page (page numbers + company info).
 */
export function drawFooterAllPages({
  doc,
  layout,
  theme,
  empresa,
}: Omit<SignaturesArgs, 'y'>): void {
  const { pageWidth, pageHeight, margin } = layout;
  const total = doc.getNumberOfPages();

  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 8;
    doc.setDrawColor(...theme.borderColor);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.muted);
    const footerLeft: string[] = [empresa.nome_empresa];
    if ((empresa as any).telefone) footerLeft.push((empresa as any).telefone);
    if ((empresa as any).email) footerLeft.push((empresa as any).email);
    doc.text(footerLeft.join('  •  '), margin, footerY);

    const right = `Emitido em ${new Date().toLocaleDateString('pt-BR')}  •  Página ${p} de ${total}`;
    doc.text(right, pageWidth - margin, footerY, { align: 'right' });
  }
}
