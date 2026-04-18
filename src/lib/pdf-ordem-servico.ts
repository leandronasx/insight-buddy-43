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

// ── Helpers ──────────────────────────────────────────────────────────────
function hexToRgb(hex: string | null | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex) return fallback;
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return fallback;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function loadImage(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─────────────────────────────────────────────────────────────────────────
export async function gerarOrdemServicoPDF({ venda, empresa, lead }: OrdemServicoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Brand colors (with safe fallbacks)
  const primary = hexToRgb(empresa.cor_primaria, [34, 197, 94]);   // accent / total
  const secondary = hexToRgb(empresa.cor_secundaria, [15, 23, 42]); // header bg
  const muted: [number, number, number] = [100, 116, 139];
  const softBg: [number, number, number] = [241, 245, 249];
  const borderColor: [number, number, number] = [226, 232, 240];

  // Try to load logo
  const logo = empresa.logo_url ? await loadImage(empresa.logo_url) : null;

  // ─── HEADER (company branding strip) ──────────────────────────────────
  const headerH = 38;
  doc.setFillColor(...secondary);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  // Logo (left side, contained)
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
      doc.addImage(logo.dataUrl, 'PNG', margin, (headerH - lh) / 2, lw, lh);
      textStartX = margin + lw + 6;
    } catch {
      // ignore
    }
  }

  // Company name + contacts (next to logo)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(empresa.empresa_nome, textStartX, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const compLines: string[] = [];
  if (empresa.cnpj_cpf) compLines.push(`CNPJ/CPF: ${empresa.cnpj_cpf}`);
  if (empresa.endereco) compLines.push(empresa.endereco);
  const contactLine: string[] = [];
  if (empresa.telefone) contactLine.push(empresa.telefone);
  if (empresa.email) contactLine.push(empresa.email);
  if (contactLine.length) compLines.push(contactLine.join('  •  '));
  compLines.slice(0, 3).forEach((l, i) => {
    doc.text(l, textStartX, 21 + i * 4.2);
  });

  // OS number + date (right side)
  const osNumber = venda.id.slice(0, 8).toUpperCase();
  const dataFormatada = new Date(venda.data_venda + 'T00:00:00').toLocaleDateString('pt-BR');

  doc.setTextColor(...primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ORDEM DE SERVIÇO', pageWidth - margin, 13, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nº ${osNumber}`, pageWidth - margin, 19, { align: 'right' });
  doc.text(`Data: ${dataFormatada}`, pageWidth - margin, 24, { align: 'right' });

  let y = headerH + 8;

  // ─── CLIENT SECTION ───────────────────────────────────────────────────
  doc.setFillColor(...softBg);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...muted);
  doc.text('DADOS DO CLIENTE', margin + 5, y + 6);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondary);
  doc.text(lead?.nome_lead || 'Cliente não informado', margin + 5, y + 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  const clientDetails: string[] = [];
  if (lead?.telefone) clientDetails.push(lead.telefone);
  if (lead?.email) clientDetails.push(lead.email);
  if (lead?.cpf_cnpj) clientDetails.push(`CPF/CNPJ: ${lead.cpf_cnpj}`);
  // Wrap details in 2 lines if needed
  const detailsLine1 = clientDetails.join('  •  ');
  doc.text(detailsLine1, margin + 5, y + 19);
  if (lead?.endereco) {
    doc.text(`Endereço: ${lead.endereco}`, margin + 5, y + 25);
  }

  y += 36;

  // ─── SCHEDULING (if present) ──────────────────────────────────────────
  if (venda.data_agendada || venda.horario_agendado) {
    doc.setFillColor(...primary);
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
    y += 14;
  }

  // ─── SERVICES TABLE ───────────────────────────────────────────────────
  doc.setFillColor(...secondary);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setTextColor(255, 255, 255);
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
    doc.setTextColor(...muted);
    const tipo = (s.tipo_servico || '').toString();
    const tipoTrim = tipo.length > 22 ? tipo.slice(0, 20) + '…' : tipo;
    doc.text(tipoTrim, pageWidth - margin - 50, y + 6);

    doc.setFontSize(9.5);
    doc.setTextColor(...secondary);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(s.valor), pageWidth - margin - 4, y + 6, { align: 'right' });
    y += 9;
  });

  // ─── TOTALS ───────────────────────────────────────────────────────────
  y += 4;
  doc.setDrawColor(...borderColor);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const totalsRight = pageWidth - margin - 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text('Subtotal:', totalsRight - 50, y);
  doc.setTextColor(...secondary);
  doc.text(formatCurrency(venda.valor_cheio), totalsRight, y, { align: 'right' });
  y += 6;

  if (venda.desconto > 0) {
    doc.setTextColor(...muted);
    doc.text('Desconto:', totalsRight - 50, y);
    doc.setTextColor(239, 68, 68);
    doc.text(`- ${formatCurrency(venda.desconto)}`, totalsRight, y, { align: 'right' });
    y += 6;
  }

  // Total badge
  y += 2;
  doc.setFillColor(...primary);
  doc.roundedRect(pageWidth - margin - 85, y, 85, 13, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', pageWidth - margin - 80, y + 8.5);
  doc.setFontSize(13);
  doc.text(formatCurrency(venda.valor_final), totalsRight, y + 8.5, { align: 'right' });
  y += 22;

  // ─── SIGNATURES ───────────────────────────────────────────────────────
  // Pin signatures near bottom of page for consistent layout
  const sigY = Math.max(y + 20, pageHeight - 35);
  doc.setDrawColor(...borderColor);
  const sigWidth = (contentWidth - 20) / 2;
  doc.line(margin, sigY, margin + sigWidth, sigY);
  doc.line(margin + sigWidth + 20, sigY, pageWidth - margin, sigY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text('Assinatura do Cliente', margin + sigWidth / 2, sigY + 5, { align: 'center' });
  doc.text(`Assinatura — ${empresa.empresa_nome}`, margin + sigWidth + 20 + sigWidth / 2, sigY + 5, { align: 'center' });

  // ─── FOOTER ───────────────────────────────────────────────────────────
  const footerY = pageHeight - 8;
  doc.setDrawColor(...borderColor);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  const footerLeft: string[] = [empresa.empresa_nome];
  if (empresa.telefone) footerLeft.push(empresa.telefone);
  if (empresa.email) footerLeft.push(empresa.email);
  doc.text(footerLeft.join('  •  '), margin, footerY);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, footerY, { align: 'right' });

  doc.save(`OS_${osNumber}_${(lead?.nome_lead || 'Cliente').replace(/\s+/g, '_')}.pdf`);
}
