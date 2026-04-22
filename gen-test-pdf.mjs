import { jsPDF } from 'jspdf';
import fs from 'fs';

// ------- Inline helpers (mirror of src/lib/pdf/*) -------
function hexToRgb(hex, fb) {
  if (!hex) return fb;
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return fb;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function getContrastFg(bg) {
  const lum = bg[0] * 0.299 + bg[1] * 0.587 + bg[2] * 0.114;
  return lum > 150 ? [0, 0, 0] : [255, 255, 255];
}
function formatCurrency(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getContentBottom(layout) { return layout.pageHeight - 16; }
function addContentPage({ doc, layout, theme }) {
  doc.addPage();
  const accentH = 4;
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, layout.pageWidth, accentH, 'F');
  return accentH + 10;
}
function ensureSpace(args) {
  if (args.y + args.needed > getContentBottom(args.layout)) return addContentPage(args);
  return args.y;
}

function drawHeader({ doc, layout, theme, empresa, venda }) {
  const { pageWidth, margin } = layout;
  const accentH = 4;
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, pageWidth, accentH, 'F');
  const headerTop = accentH;
  const headerH = 36;
  doc.setFillColor(...theme.secondary);
  doc.rect(0, headerTop, pageWidth, headerH, 'F');
  doc.setDrawColor(...theme.borderColor);
  doc.line(margin, headerTop + headerH, pageWidth - margin, headerTop + headerH);

  const textStartX = margin;
  doc.setTextColor(...theme.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(empresa.empresa_nome, textStartX, headerTop + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...theme.muted);
  const compLines = [];
  if (empresa.cnpj_cpf) compLines.push(`CNPJ/CPF: ${empresa.cnpj_cpf}`);
  if (empresa.endereco) compLines.push(empresa.endereco);
  const cl = [];
  if (empresa.telefone) cl.push(empresa.telefone);
  if (empresa.email) cl.push(empresa.email);
  if (cl.length) compLines.push(cl.join('  •  '));
  compLines.slice(0, 3).forEach((l, i) => doc.text(l, textStartX, headerTop + 19 + i * 4));

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

function drawClientSection({ doc, layout, theme, lead, y }) {
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
  const d = [];
  if (lead?.telefone) d.push(lead.telefone);
  if (lead?.email) d.push(lead.email);
  if (lead?.cpf_cnpj) d.push(`CPF/CNPJ: ${lead.cpf_cnpj}`);
  doc.text(d.join('  •  '), margin + 5, y + 19);
  if (lead?.endereco) doc.text(`Endereço: ${lead.endereco}`, margin + 5, y + 25);
  return y + 36;
}

function drawScheduling({ doc, layout, theme, venda, y }) {
  if (!venda.data_agendada && !venda.horario_agendado) return y;
  const { margin, contentWidth } = layout;
  doc.setFillColor(...theme.primary);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const a = [];
  if (venda.data_agendada) a.push(`Data ${new Date(venda.data_agendada + 'T00:00:00').toLocaleDateString('pt-BR')}`);
  if (venda.horario_agendado) a.push(`Horário ${venda.horario_agendado.slice(0, 5)}`);
  doc.text(`AGENDAMENTO  •  ${a.join('   |   ')}`, margin + 5, y + 6.8);
  return y + 14;
}

const ROW_H = 9;
const HEADER_H = 9;
function drawTableHeader(doc, layout, theme, y) {
  const { pageWidth, margin, contentWidth } = layout;
  doc.setFillColor(...theme.secondary);
  doc.rect(margin, y, contentWidth, HEADER_H, 'F');
  const fg = getContrastFg(theme.secondary);
  doc.setTextColor(...fg);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('#', margin + 4, y + 6);
  doc.text('ESTOFADO / SERVIÇO', margin + 14, y + 6);
  doc.text('TIPO', pageWidth - margin - 50, y + 6);
  doc.text('VALOR', pageWidth - margin - 4, y + 6, { align: 'right' });
  return y + HEADER_H;
}

function drawServicesTable({ doc, layout, theme, venda, y }) {
  const { pageWidth, margin, contentWidth } = layout;
  y = drawTableHeader(doc, layout, theme, y);
  venda.servicos.forEach((s, i) => {
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

function drawTotals({ doc, layout, theme, venda, y }) {
  const { pageWidth, margin } = layout;
  const needed = 38 + (venda.desconto > 0 ? 6 : 0);
  y = ensureSpace({ doc, layout, theme, y, needed });
  y += 4;
  doc.setDrawColor(...theme.borderColor);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  const tr = pageWidth - margin - 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...theme.muted);
  doc.text('Subtotal:', tr - 50, y);
  doc.setTextColor(...theme.ink);
  doc.text(formatCurrency(venda.valor_cheio), tr, y, { align: 'right' });
  y += 6;
  if (venda.desconto > 0) {
    doc.setTextColor(...theme.muted);
    doc.text('Desconto:', tr - 50, y);
    doc.setTextColor(239, 68, 68);
    doc.text(`- ${formatCurrency(venda.desconto)}`, tr, y, { align: 'right' });
    y += 6;
  }
  y += 2;
  const bw = 95;
  const bx = pageWidth - margin - bw;
  const bh = 14;
  doc.setFillColor(...theme.primary);
  doc.roundedRect(bx, y, bw, bh, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', bx + 6, y + 9);
  doc.setFontSize(13);
  doc.text(formatCurrency(venda.valor_final), bx + bw - 6, y + 9, { align: 'right' });
  return y + 22;
}

function drawSignatures({ doc, layout, theme, empresa, y }) {
  const { pageWidth, pageHeight, margin, contentWidth } = layout;
  y = ensureSpace({ doc, layout, theme, y, needed: 30 });
  const sigY = Math.max(y + 20, pageHeight - 35);
  doc.setDrawColor(...theme.borderColor);
  const sw = (contentWidth - 20) / 2;
  doc.line(margin, sigY, margin + sw, sigY);
  doc.line(margin + sw + 20, sigY, pageWidth - margin, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...theme.muted);
  doc.text('Assinatura do Cliente', margin + sw / 2, sigY + 5, { align: 'center' });
  doc.text(`Assinatura — ${empresa.empresa_nome}`, margin + sw + 20 + sw / 2, sigY + 5, { align: 'center' });
  return sigY + 8;
}

function drawFooterAllPages({ doc, layout, theme, empresa }) {
  const { pageWidth, pageHeight, margin } = layout;
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const fy = pageHeight - 8;
    doc.setDrawColor(...theme.borderColor);
    doc.line(margin, fy - 4, pageWidth - margin, fy - 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.muted);
    const fl = [empresa.empresa_nome];
    if (empresa.telefone) fl.push(empresa.telefone);
    if (empresa.email) fl.push(empresa.email);
    doc.text(fl.join('  •  '), margin, fy);
    const right = `Emitido em ${new Date().toLocaleDateString('pt-BR')}  •  Página ${p} de ${total}`;
    doc.text(right, pageWidth - margin, fy, { align: 'right' });
  }
}

// ------- Test data -------
const empresa = {
  empresa_nome: 'Higi$Controle Estofados Ltda',
  cnpj_cpf: '12.345.678/0001-99',
  endereco: 'Rua das Flores, 123 — Centro, São Paulo/SP',
  telefone: '(11) 98765-4321',
  email: 'contato@higicontrole.com.br',
  logo_url: null,
  cor_primaria: '#22c55e',
  cor_secundaria: '#0f172a',
};
const lead = {
  nome_lead: 'João da Silva Santos',
  telefone: '(11) 91234-5678',
  email: 'joao.silva@email.com',
  cpf_cnpj: '123.456.789-00',
  endereco: 'Av. Paulista, 1000 — Bela Vista, São Paulo/SP, CEP 01310-100',
};
const tipos = ['higienização', 'impermeabilização', 'higienização e impermeabilização'];
const itens = ['Sofá 3 lugares', 'Sofá retrátil', 'Poltrona', 'Cadeira de jantar', 'Colchão Queen', 'Colchão King', 'Tapete persa 2x3', 'Cabeceira estofada', 'Puff redondo', 'Sofá-cama'];
const servicos = Array.from({ length: 25 }, (_, i) => ({
  estofado: `${itens[i % itens.length]} #${i + 1}`,
  tipo_servico: tipos[i % tipos.length],
  valor: 150 + (i * 37) % 800,
}));
const valor_cheio = servicos.reduce((s, x) => s + x.valor, 0);
const desconto = 250;
const venda = {
  id: 'abcdef1234567890',
  data_venda: '2025-04-22',
  data_agendada: '2025-04-30',
  horario_agendado: '14:30:00',
  valor_cheio,
  desconto,
  valor_final: valor_cheio - desconto,
  servicos,
};

// ------- Build PDF -------
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 15;
const layout = { pageWidth, pageHeight, margin, contentWidth: pageWidth - margin * 2 };
const theme = {
  primary: hexToRgb(empresa.cor_primaria, [34, 197, 94]),
  secondary: hexToRgb(empresa.cor_secundaria, [59, 130, 246]),
  ink: [0, 0, 0],
  muted: [75, 85, 99],
  softBg: [248, 250, 252],
  borderColor: [226, 232, 240],
};

let y = drawHeader({ doc, layout, theme, empresa, venda });
y = drawClientSection({ doc, layout, theme, lead, y });
y = drawScheduling({ doc, layout, theme, venda, y });
y = drawServicesTable({ doc, layout, theme, venda, y });
y = drawTotals({ doc, layout, theme, venda, y });
drawSignatures({ doc, layout, theme, empresa, y });
drawFooterAllPages({ doc, layout, theme, empresa });

const buf = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync('/tmp/test-os.pdf', buf);
console.log('Pages:', doc.getNumberOfPages(), 'Size:', buf.length);
