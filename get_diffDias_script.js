import { readFileSync } from 'fs';

const isMatchScript = `
function diffDias(a, b) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateDiffByLead(lead, tipo, vendas) {
  if (!lead) return -1;
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  if (tipo === 'follow_up_pre_orcamento' && lead.data_contato) {
    const d = new Date(lead.data_contato);
    return Math.round((hoje.getTime() - d.getTime()) / 86400000);
  }
  if (tipo === 'follow_up_pos_orcamento' && lead.data_orcamento) {
    const d = new Date(lead.data_orcamento);
    return Math.round((hoje.getTime() - d.getTime()) / 86400000);
  }

  // mock for vendas
  return -1;
}
console.log('Script loaded.');
`;
console.log(isMatchScript);
