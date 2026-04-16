import jsPDF from 'jspdf';
import type { VendaComServicos } from '@/hooks/useVendas';
import { formatCurrency } from '@/lib/date-utils';

interface OrdemServicoData {
  venda: VendaComServicos;
  empresaNome: string;
  leadNome: string;
  leadTelefone?: string;
}

export function gerarOrdemServicoPDF({ venda, empresaNome, leadNome, leadTelefone }: OrdemServicoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ─── Header ───
  doc.setFillColor(15, 23, 42); // dark bg
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(34, 197, 94); // green accent
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO', margin, 18);

  doc.setTextColor(148, 163, 184); // muted
  doc.setFontSize(10);
  doc.text(empresaNome, margin, 28);

  // OS number & date
  const osNumber = venda.id.slice(0, 8).toUpperCase();
  const dataFormatada = new Date(venda.data_venda + 'T00:00:00').toLocaleDateString('pt-BR');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`OS #${osNumber}`, pageWidth - margin, 18, { align: 'right' });
  doc.text(`Data: ${dataFormatada}`, pageWidth - margin, 28, { align: 'right' });

  y = 50;

  // ─── Client info ───
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DADOS DO CLIENTE', margin + 6, y + 8);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(leadNome, margin + 6, y + 18);

  if (leadTelefone) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(leadTelefone, margin + 6, y + 24);
  }

  y += 36;

  // ─── Table header ───
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('#', margin + 4, y + 7);
  doc.text('ESTOFADO / SERVIÇO', margin + 14, y + 7);
  doc.text('VALOR', pageWidth - margin - 4, y + 7, { align: 'right' });
  y += 10;

  // ─── Table rows ───
  venda.servicos.forEach((s, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 10, 'F');
    }

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(String(i + 1), margin + 4, y + 7);
    doc.text(s.estofado || 'Serviço sem descrição', margin + 14, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(s.valor), pageWidth - margin - 4, y + 7, { align: 'right' });
    y += 10;
  });

  // ─── Totals ───
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const totalsX = pageWidth - margin - 4;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsX - 50, y);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(venda.valor_cheio), totalsX, y, { align: 'right' });
  y += 7;

  // Desconto
  if (venda.desconto > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('Desconto:', totalsX - 50, y);
    doc.setTextColor(239, 68, 68); // red
    doc.text(`- ${formatCurrency(venda.desconto)}`, totalsX, y, { align: 'right' });
    y += 7;
  }

  // Valor Final
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(pageWidth - margin - 80, y - 1, 80, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', pageWidth - margin - 76, y + 8);
  doc.text(formatCurrency(venda.valor_final), totalsX, y + 8, { align: 'right' });

  y += 28;

  // ─── Signature lines ───
  doc.setDrawColor(203, 213, 225);
  const sigWidth = (contentWidth - 20) / 2;

  doc.line(margin, y, margin + sigWidth, y);
  doc.line(margin + sigWidth + 20, y, pageWidth - margin, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Assinatura do Cliente', margin + sigWidth / 2, y + 5, { align: 'center' });
  doc.text('Assinatura do Prestador', margin + sigWidth + 20 + sigWidth / 2, y + 5, { align: 'center' });

  // ─── Footer ───
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Gerado por Higi$Controle — ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY, { align: 'center' });

  // Save
  doc.save(`OS_${osNumber}_${leadNome.replace(/\s+/g, '_')}.pdf`);
}
