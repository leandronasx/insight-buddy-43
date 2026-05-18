import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Valida token do chamador
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se é admin via user_roles
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      empresa_id,
      nome_empresa,
      nome_dono,
      telefone,
      data_inicio,
      data_termino,
      usuario_status, // ← novo: 'ativo' | 'inativo'
    } = await req.json();

    if (!empresa_id) {
      return new Response(JSON.stringify({ error: "empresa_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Atualiza campos da empresa ────────────────────────────────────────
    const empresaUpdate: Record<string, unknown> = {};
    if (nome_empresa !== undefined) empresaUpdate.nome_empresa = nome_empresa;
    if (nome_dono    !== undefined) empresaUpdate.nome_dono    = nome_dono    || null;
    if (telefone     !== undefined) empresaUpdate.telefone     = telefone     || null;
    if (data_inicio  !== undefined) empresaUpdate.data_inicio  = data_inicio  || null;
    if (data_termino !== undefined) empresaUpdate.data_termino = data_termino || null;

    if (Object.keys(empresaUpdate).length > 0) {
      const { error: empresaErr } = await adminClient
        .from("empresas")
        .update(empresaUpdate)
        .eq("id", empresa_id);

      if (empresaErr) {
        return new Response(JSON.stringify({ error: empresaErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── 2. Atualiza status do usuário (se enviado) ───────────────────────────
    if (usuario_status !== undefined) {
      const statusValido = ['ativo', 'inativo', 'suspenso'];
      if (!statusValido.includes(usuario_status)) {
        return new Response(JSON.stringify({ error: `Status inválido: ${usuario_status}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Busca id_usuario da empresa
      const { data: empresa } = await adminClient
        .from("empresas")
        .select("id_usuario")
        .eq("id", empresa_id)
        .single();

      if (empresa?.id_usuario) {
        const { error: usuarioErr } = await adminClient
          .from("usuarios")
          .update({ status: usuario_status })
          .eq("id", empresa.id_usuario);

        if (usuarioErr) {
          console.error("Erro ao atualizar status do usuário:", usuarioErr.message);
          // Não falha a request toda por isso — loga e segue
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unhandled error in update-empresa-status:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});