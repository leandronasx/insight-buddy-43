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

    // Delega o cálculo para a Stored Procedure no banco de dados
    const { error } = await admin.rpc("gerar_lembretes_automacoes", {
      p_id_empresa: empresaIdFiltro || null,
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("gerar-lembretes error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});