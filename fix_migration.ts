import fs from 'fs';

// Nome do arquivo corrigido conforme sua imagem
const filePath = 'supabase/migrations/20260425000000_novo_schema_completo.sql';
let content = fs.readFileSync(filePath, 'utf8');

// TROCA A LÓGICA DE MÓDULO (%) PELA LÓGICA DE IGUALDADE (=)
// Isso garante que (Hoje - Data) seja exatamente igual à cadência definida.
content = content.replace(
    /AND \(v_hoje - lc\.data_contato\) % r\.cadencia_envio = 0/g, 
    'AND (v_hoje - lc.data_contato) = r.cadencia_envio'
);

content = content.replace(
    /AND \(v_hoje - lc\.data_orcamento\) % r\.cadencia_envio = 0/g, 
    'AND (v_hoje - lc.data_orcamento) = r.cadencia_envio'
);

content = content.replace(
    /AND \(v_hoje - lc\.data_servico\) % r\.cadencia_envio = 0/g, 
    'AND (v_hoje - lc.data_servico) = r.cadencia_envio'
);

// Salva no mesmo arquivo para aplicar a migração corretamente
fs.writeFileSync(filePath, content);

console.log('✅ Lógica de disparo único aplicada com sucesso!');