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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
 
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
 
    // Valida token do chamador
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
 
    // Verifica permissão admin
    const { data: usuarioData } = await adminClient
      .from("usuarios")
      .select("permissao")
      .eq("id", user.id)
      .maybeSingle();
 
    if (usuarioData?.permissao !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas admins podem criar empresas" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
 
    const body = await req.json();
    const { email, password, nome_empresa, nome_dono, data_inicio, data_termino } = body;
 
    if (!email || !password || !nome_empresa) {
      return new Response(JSON.stringify({ error: "email, password e nome_empresa são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
 
    // 1. Cria usuário no auth
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_empresa },
    });
 
    if (createErr || !newUser?.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Erro ao criar usuário auth" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
 
    const newUserId = newUser.user.id;
 
    // 2. Cria perfil em public.usuarios manualmente
    // (não depende do trigger fn_criar_perfil_usuario que pode não existir)
    const { error: perfilErr } = await adminClient
      .from("usuarios")
      .upsert({
        id: newUserId,
        email: email,
        permissao: "manager",
        status: "ativo",
      }, { onConflict: "id" });
 
    if (perfilErr) {
      console.error("Erro ao criar perfil usuario:", perfilErr.message);
      // Não falha aqui — tenta criar a empresa mesmo assim
    }
 
    // 3. Aguarda um pouco para garantir consistência
    await new Promise(r => setTimeout(r, 300));
 
    // 4. Cria a empresa
    const { error: empresaErr } = await adminClient.from("empresas").insert({
      id_usuario: newUserId,
      nome_empresa,
      nome_dono: nome_dono || null,
      data_inicio: data_inicio || new Date().toISOString().split("T")[0],
      data_termino: data_termino || null,
    });
 
    if (empresaErr) {
      console.error("Erro ao criar empresa:", empresaErr.message);
      // Limpa o usuário criado
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Erro ao criar empresa: " + empresaErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
 
    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
 
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});