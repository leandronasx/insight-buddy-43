/**
 * Edge Function: gerar-lembretes
 *
 * Calcula para HOJE quantos leads de cada empresa precisam de mensagem
 * por tipo de cadência e grava em lembretes_automacoes.
 *
 * Pode ser chamada:
 *  - Manualmente pelo frontend ao abrir o sistema (via supabase.functions.invoke)
 *  - Por um cron diário via Supabase Cron Jobs (pg_cron)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIPO_LABELS: Record<string, string> = {
  follow_up_pre_orcamento: "Follow-up Pré-orçamento",
  follow_up_pos_orcamento: "Follow-up Pós-orçamento",
  lembrete_agendamento:    "Lembrete de Agendamento",
  pos_venda:               "Pós-venda",
};

const SITUACAO_TIPOS: Record<string, string[]> = {
  "Agendado":         ["lembrete_agendamento"],
  "Fechado":          ["pos_venda"],
  "Reabordar":        ["follow_up_pre_orcamento", "follow_up_pos_orcamento"],
  "Interesse Futuro": ["follow_up_pre_orcamento", "follow_up_pos_orcamento"],
};

function diffDias(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    let empresaIdFiltro: string | null = null;

    // Se chamado pelo frontend (com token), filtra só a empresa do usuário
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        const { data: emp } = await admin
          .from("empresas")
          .select("id")
          .eq("id_usuario", user.id)
          .maybeSingle();
        if (emp) empresaIdFiltro = emp.id;
      }
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = toDateStr(hoje);

    // Busca todas as empresas (ou só a do usuário)
    let empresasQuery = admin.from("empresas").select("id, nome_empresa");
    if (empresaIdFiltro) empresasQuery = empresasQuery.eq("id", empresaIdFiltro);
    const { data: empresas } = await empresasQuery;
    if (!empresas || empresas.length === 0) {
      return new Response(JSON.stringify({ ok: true, gerados: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalGerados = 0;

    for (const empresa of empresas) {
      // Regras de cadência da empresa
      const { data: regras } = await admin
        .from("regras_automacoes")
        .select("tipo_lembrete, cadencia_envio, template_mensagem")
        .eq("id_empresa", empresa.id);

      if (!regras || regras.length === 0) continue;

      // Leads da empresa com situações relevantes
      const { data: leads } = await admin
        .from("leads")
        .select("id, nome, situacao_do_cliente, data_contato, data_orcamento")
        .eq("id_empresa", empresa.id)
        .not("situacao_do_cliente", "in", '("Sem Interesse")');

      if (!leads || leads.length === 0) continue;

      const leadIds = leads.map((l: any) => l.id);

      // Vendas com data_servico
      const { data: vendas } = await admin
        .from("vendas")
        .select("id_leads, data_servico")
        .in("id_leads", leadIds)
        .not("data_servico", "is", null)
        .order("data_servico", { ascending: false });

      const dataServicoPorLead: Record<string, string> = {};
      (vendas ?? []).forEach((v: any) => {
        if (!dataServicoPorLead[v.id_leads]) {
          dataServicoPorLead[v.id_leads] = v.data_servico;
        }
      });

      // Conta por tipo quantos leads precisam de mensagem hoje
      const contagemPorTipo: Record<string, { count: number; dataServico?: string }> = {};

      for (const lead of leads as any[]) {
        const situacao   = lead.situacao_do_cliente ?? "";
        const tiposLead  = SITUACAO_TIPOS[situacao] ?? [];

        for (const tipo of tiposLead) {
          const regra = regras.find((r: any) => r.tipo_lembrete === tipo);
          if (!regra) continue;

          let elegivel = false;
          let dataServico: string | undefined;

          if (tipo === "follow_up_pre_orcamento" && lead.data_contato) {
            const ref = new Date(lead.data_contato); ref.setHours(0,0,0,0);
            const dias = diffDias(ref, hoje);
            if (dias > 0 && dias % regra.cadencia_envio === 0) elegivel = true;
          }
          if (tipo === "follow_up_pos_orcamento" && lead.data_orcamento) {
            const ref = new Date(lead.data_orcamento); ref.setHours(0,0,0,0);
            const dias = diffDias(ref, hoje);
            if (dias > 0 && dias % regra.cadencia_envio === 0) elegivel = true;
          }
          if (tipo === "lembrete_agendamento" && dataServicoPorLead[lead.id]) {
            const ref = new Date(dataServicoPorLead[lead.id] + "T00:00:00"); ref.setHours(0,0,0,0);
            const diasAntes = diffDias(hoje, ref);
            if (diasAntes > 0 && diasAntes === regra.cadencia_envio) {
              elegivel = true;
              dataServico = dataServicoPorLead[lead.id];
            }
          }
          if (tipo === "pos_venda" && dataServicoPorLead[lead.id]) {
            const ref = new Date(dataServicoPorLead[lead.id] + "T00:00:00"); ref.setHours(0,0,0,0);
            const dias = diffDias(ref, hoje);
            if (dias > 0 && dias % regra.cadencia_envio === 0) elegivel = true;
          }

          if (elegivel) {
            if (!contagemPorTipo[tipo]) contagemPorTipo[tipo] = { count: 0 };
            contagemPorTipo[tipo].count++;
            if (dataServico) contagemPorTipo[tipo].dataServico = dataServico;
          }
        }
      }

      // Grava um lembrete por tipo (upsert — não duplica se já existir)
      for (const [tipo, { count, dataServico }] of Object.entries(contagemPorTipo)) {
        if (count === 0) continue;

        const label = TIPO_LABELS[tipo] ?? tipo;
        let mensagem = `${count} lead${count > 1 ? "s" : ""} de ${label} para mandar mensagem hoje. Não deixe esperando!`;
        if (tipo === "lembrete_agendamento" && dataServico) {
          const ds = new Date(dataServico + "T00:00:00").toLocaleDateString("pt-BR");
          mensagem = `${count} lead${count > 1 ? "s" : ""} de ${label} para hoje. Serviço${count > 1 ? "s" : ""} agendado${count > 1 ? "s" : ""} para ${ds}. Não deixe esquecer!`;
        }

        await admin.from("lembretes_automacoes").upsert({
          id_empresa:    empresa.id,
          tipo_lembrete: tipo,
          data_execucao: hojeStr,
          disparado:     false,
          mensagem,
          data_servico:  dataServico ?? null,
        }, {
          onConflict: "id_empresa,tipo_lembrete,data_execucao",
          ignoreDuplicates: false,
        });

        totalGerados++;
      }
    }

    return new Response(JSON.stringify({ ok: true, gerados: totalGerados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("gerar-lembretes error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});