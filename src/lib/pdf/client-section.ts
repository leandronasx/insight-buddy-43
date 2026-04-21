import type jsPDF from 'jspdf';
import type { LeadOption, VendaComServicos } from '@/hooks/useVendas';
import type { PdfLayout, PdfTheme } from './types';

interface ClientArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  lead: LeadOption | null;
  y: number;
}

export function drawClientSection({ doc, layout, theme, lead, y }: ClientArgs): number {
  const { margin, contentWidth } = layout;

  doc.setFillColor(...theme.softBg);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.muted);
  doc.text('DADOS DO CLIENTE', margin + 5, y + 6);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.ink);
  doc.text(lead?.nome_lead || 'Cliente não informado', margin + 5, y + 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...theme.muted);
  const clientDetails: string[] = [];
  if (lead?.telefone) clientDetails.push(lead.telefone);
  if (lead?.email) clientDetails.push(lead.email);
  if (lead?.cpf_cnpj) clientDetails.push(`CPF/CNPJ: ${lead.cpf_cnpj}`);
  doc.text(clientDetails.join('  •  '), margin + 5, y + 19);
  if (lead?.endereco) {
    doc.text(`Endereço: ${lead.endereco}`, margin + 5, y + 25);
  }

  return y + 36;
}

interface SchedulingArgs {
  doc: jsPDF;
  layout: PdfLayout;
  theme: PdfTheme;
  venda: VendaComServicos;
  y: number;
}

export function drawScheduling({ doc, layout, theme, venda, y }: SchedulingArgs): number {
  if (!venda.data_agendada && !venda.horario_agendado) return y;

  const { margin, contentWidth } = layout;
  doc.setFillColor(...theme.primary);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const agendaText: string[] = [];
  if (venda.data_agendada) {
    agendaText.push(`Data ${new Date(venda.data_agendada + 'T00:00:00').toLocaleDateString('pt-BR')}`);
  }
  if (venda.horario_agendado) {
    agendaText.push(`Horário ${venda.horario_agendado.slice(0, 5)}`);
  }
  doc.text(`AGENDAMENTO  •  ${agendaText.join('   |   ')}`, margin + 5, y + 6.8);
  return y + 14;
}
