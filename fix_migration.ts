import fs from 'fs';

let content = fs.readFileSync('supabase/migrations/20260425000001_fix_lembretes_automacoes.sql', 'utf8');

content = content.replace(/AND \(v_hoje - lc.data_contato\) % r.cadencia_envio = 0/g, 'AND r.cadencia_envio > 0 AND (v_hoje - lc.data_contato) % r.cadencia_envio = 0');
content = content.replace(/AND \(v_hoje - lc.data_orcamento\) % r.cadencia_envio = 0/g, 'AND r.cadencia_envio > 0 AND (v_hoje - lc.data_orcamento) % r.cadencia_envio = 0');
content = content.replace(/AND \(v_hoje - lc.data_servico\) % r.cadencia_envio = 0/g, 'AND r.cadencia_envio > 0 AND (v_hoje - lc.data_servico) % r.cadencia_envio = 0');

fs.writeFileSync('supabase/migrations/20260425000001_fix_lembretes_automacoes.sql', content);
