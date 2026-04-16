import jsPDF from 'jspdf';
import type { VendaComServicos } from '@/hooks/useVendas';
import type { Empresa } from '@/hooks/useEmpresa';
import type { LeadOption } from '@/hooks/useVendas';
import { formatCurrency } from '@/lib/date-utils';

interface OrdemServicoData {
  venda: VendaComServicos;
  empresa: Empresa;
  lead: LeadOption | null;
}

export function gerarOrdemServicoPDF({ venda, empresa, lead }: OrdemServicoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ─── Header ───
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 44, 'F');

  doc.setTextColor(34, 197, 94);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO', margin, 16);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(empresa.empresa_nome, margin, 24);

  if (empresa.cnpj_cpf) {
    doc.text(`CNPJ/CPF: ${empresa.cnpj_cpf}`, margin, 29);
  }
  if (empresa.endereco) {
    doc.text(empresa.endereco, margin, 34);
  }

  const rightInfo: string[] = [];
  if (empresa.telefone) rightInfo.push(empresa.telefone);
  if (empresa.email) rightInfo.push(empresa.email);

  // OS number & date on the right
  const osNumber = venda.id.slice(0, 8).toUpperCase();
  const dataFormatada = new Date(venda.data_venda + 'T00:00:00').toLocaleDateString('pt-BR');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`OS #${osNumber}`, pageWidth - margin, 16, { align: 'right' });
  doc.text(`Data: ${dataFormatada}`, pageWidth - margin, 22, { align: 'right' });

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  rightInfo.forEach((info, i) => {
    doc.text(info, pageWidth - margin, 28 + i * 4, { align: 'right' });
  });

  y = 52;

  // ─── Client info ───
  doc.setFillColor(241, 245, 249);
  const clientBoxHeight = 32;
  doc.roundedRect(margin, y, contentWidth, clientBoxHeight, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DADOS DO CLIENTE', margin + 6, y + 7);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(lead?.nome_lead || 'Cliente não informado', margin + 6, y + 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  let clientY = y + 20;
  const clientDetails: string[] = [];
  if (lead?.telefone) clientDetails.push(lead.telefone);
  if (lead?.email) clientDetails.push(lead.email);
  if (lead?.cpf_cnpj) clientDetails.push(`CPF/CNPJ: ${lead.cpf_cnpj}`);
  if (lead?.endereco) clientDetails.push(lead.endereco);

  doc.text(clientDetails.join('  •  '), margin + 6, clientY);

  y += clientBoxHeight + 6;

  // ─── Scheduling info ───
  if (venda.data_agendada || venda.horario_agendado) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const agendaText: string[] = [];
    if (venda.data_agendada) {
      agendaText.push(`Data: ${new Date(venda.data_agendada + 'T00:00:00').toLocaleDateString('pt-BR')}`);
    }
    if (venda.horario_agendado) {
      agendaText.push(`Horário: ${venda.horario_agendado}`);
    }
    doc.text(`AGENDAMENTO — ${agendaText.join('  |  ')}`, margin + 6, y + 8);
    y += 16;
  }

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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsX - 50, y);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(venda.valor_cheio), totalsX, y, { align: 'right' });
  y += 7;

  if (venda.desconto > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('Desconto:', totalsX - 50, y);
    doc.setTextColor(239, 68, 68);
    doc.text(`- ${formatCurrency(venda.desconto)}`, totalsX, y, { align: 'right' });
    y += 7;
  }

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

  doc.save(`OS_${osNumber}_${(lead?.nome_lead || 'Cliente').replace(/\s+/g, '_')}.pdf`);
}
