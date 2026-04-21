import type jsPDF from 'jspdf';
import type { Empresa } from '@/hooks/useEmpresa';
import type { PdfLayout, PdfTheme } from './types';

interface SignaturesArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  empresa: Empresa;
  y: number;
}

export function drawSignatures({ doc, layout, theme, empresa, y }: SignaturesArgs): void {
  const { pageWidth, pageHeight, margin, contentWidth } = layout;
  const sigY = Math.max(y + 20, pageHeight - 35);
  doc.setDrawColor(...theme.borderColor);
  const sigWidth = (contentWidth - 20) / 2;
  doc.line(margin, sigY, margin + sigWidth, sigY);
  doc.line(margin + sigWidth + 20, sigY, pageWidth - margin, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...theme.muted);
  doc.text('Assinatura do Cliente', margin + sigWidth / 2, sigY + 5, { align: 'center' });
  doc.text(`Assinatura — ${empresa.empresa_nome}`, margin + sigWidth + 20 + sigWidth / 2, sigY + 5, { align: 'center' });
}

export function drawFooter({ doc, layout, theme, empresa }: Omit<SignaturesArgs, 'y'>): void {
  const { pageWidth, pageHeight, margin } = layout;
  const footerY = pageHeight - 8;
  doc.setDrawColor(...theme.borderColor);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFontSize(7);
  doc.setTextColor(...theme.muted);
  const footerLeft: string[] = [empresa.empresa_nome];
  if (empresa.telefone) footerLeft.push(empresa.telefone);
  if (empresa.email) footerLeft.push(empresa.email);
  doc.text(footerLeft.join('  •  '), margin, footerY);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, footerY, { align: 'right' });
}
