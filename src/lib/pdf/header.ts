import type jsPDF from 'jspdf';
import type { Empresa } from '@/hooks/useEmpresa';
import type { VendaComServicos } from '@/hooks/useVendas';
import type { PdfLayout, PdfTheme } from './types';
import { loadImage } from './utils';

interface HeaderArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  empresa: Empresa;
  venda: VendaComServicos;
}

export async function drawHeader({ doc, layout, theme, empresa, venda }: HeaderArgs): Promise<number> {
  const { pageWidth, margin } = layout;
  const logo = empresa.logo_url ? await loadImage(empresa.logo_url) : null;

  // Accent bar
  const accentH = 4;
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, pageWidth, accentH, 'F');

  // Header bg
  const headerTop = accentH;
  const headerH = 36;
  doc.setFillColor(...theme.secondary);
  doc.rect(0, headerTop, pageWidth, headerH, 'F');
  doc.setDrawColor(...theme.borderColor);
  doc.line(margin, headerTop + headerH, pageWidth - margin, headerTop + headerH);

  // Logo
  let textStartX = margin;
  if (logo) {
    const maxLogoH = 22;
    const maxLogoW = 40;
    const ratio = logo.w / logo.h;
    let lh = maxLogoH;
    let lw = lh * ratio;
    if (lw > maxLogoW) {
      lw = maxLogoW;
      lh = lw / ratio;
    }
    try {
      doc.addImage(logo.dataUrl, 'PNG', margin, headerTop + (headerH - lh) / 2, lw, lh);
      textStartX = margin + lw + 6;
    } catch {
      // ignore
    }
  }

  // Company info
  doc.setTextColor(...theme.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(empresa.empresa_nome, textStartX, headerTop + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...theme.muted);
  const compLines: string[] = [];
  if (empresa.cnpj_cpf) compLines.push(`CNPJ/CPF: ${empresa.cnpj_cpf}`);
  if (empresa.endereco) compLines.push(empresa.endereco);
  const contactLine: string[] = [];
  if (empresa.telefone) contactLine.push(empresa.telefone);
  if (empresa.email) contactLine.push(empresa.email);
  if (contactLine.length) compLines.push(contactLine.join('  •  '));
  compLines.slice(0, 3).forEach((l, i) => {
    doc.text(l, textStartX, headerTop + 19 + i * 4);
  });

  // OS number + date
  const osNumber = venda.id.slice(0, 8).toUpperCase();
  const dataFormatada = new Date(venda.data_venda + 'T00:00:00').toLocaleDateString('pt-BR');

  doc.setTextColor(...theme.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ORDEM DE SERVIÇO', pageWidth - margin, headerTop + 11, { align: 'right' });

  doc.setFontSize(9);
  doc.text(`Nº ${osNumber}`, pageWidth - margin, headerTop + 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...theme.muted);
  doc.text(`Data: ${dataFormatada}`, pageWidth - margin, headerTop + 23, { align: 'right' });

  return headerTop + headerH + 10;
}

export function getOsNumber(venda: VendaComServicos): string {
  return venda.id.slice(0, 8).toUpperCase();
}
