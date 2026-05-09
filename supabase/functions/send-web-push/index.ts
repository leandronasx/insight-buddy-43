import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.6';

// Edge Function unificada — dois modos:
//
// MODO MANUAL (chamado pelo frontend):
//   POST { user_id, title, body, icon?, badge?, data? }
//
// MODO CRON (chamado pelo pg_cron todo dia às 8h):
//   POST { cron: true }
//   → gera lembretes v5 para todas as empresas e dispara push para todos os usuários

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@higicontrole.com';

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const body = await req.json();

  // ─── MODO CRON ────────────────────────────────────────────────────────────
  if (body.cron === true) {
    return await modoCron(admin);
  }

  // ─── MODO MANUAL ──────────────────────────────────────────────────────────
  return await modoManual(admin, body);
});

// ─── Helpers de envio ─────────────────────────────────────────────────────────

async function enviarPushParaUsuario(
  admin: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  body: string,
  extra?: { icon?: string; badge?: string; data?: Record<string, unknown> }
): Promise<{ enviados: number; erros: number }> {
  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return { enviados: 0, erros: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    icon:  extra?.icon  || '/android-chrome-192x192.png',
    badge: extra?.badge || '/favicon-32x32.png',
    data:  extra?.data  || {},
  });

  let enviados = 0;
  let erros = 0;

  for (const sub of subscriptions) {
    try {
      await (webpush as unknown as {
        sendNotification: (sub: unknown, payload: string) => Promise<unknown>
      }).sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      enviados++;
    } catch (err: unknown) {
      const e = err as { statusCode?: number };
      console.error(`Erro push para ${sub.endpoint}:`, err);
      // Remover subscriptions expiradas
      if (e.statusCode === 410 || e.statusCode === 404) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        console.log(`Subscription expirada removida: ${sub.endpoint}`);
      }
      erros++;
    }
  }

  return { enviados, erros };
}

// ─── Modo Manual ──────────────────────────────────────────────────────────────

async function modoManual(
  admin: ReturnType<typeof createClient>,
  body: Record<string, unknown>
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const { user_id, title, body: msgBody, icon, badge, data } = body as {
      user_id?: string; title?: string; body?: string;
      icon?: string; badge?: string; data?: Record<string, unknown>;
    };

    if (!user_id || !title || !msgBody) {
      throw new Error('Missing required parameters: user_id, title, or body');
    }

    const { enviados } = await enviarPushParaUsuario(admin, user_id, title, msgBody, { icon, badge, data });

    if (enviados === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found for this user.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: enviados }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('Erro modo manual:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Modo Cron ────────────────────────────────────────────────────────────────

async function modoCron(admin: ReturnType<typeof createClient>): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  console.log(`[cron] Rodando para ${hojeStr}`);

  const results = { empresas: 0, pushEnviados: 0, erros: 0 };

  try {
    // Buscar todos os usuários que têm subscriptions ativas
    const { data: subscriptions, error: subError } = await admin
      .from('push_subscriptions')
      .select('user_id');

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', ...results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = [...new Set(subscriptions.map((s: { user_id: string }) => s.user_id))];

    for (const userId of userIds) {
      try {
        // Buscar empresa vinculada ao usuário
        const { data: empresa } = await admin
          .from('empresas')
          .select('id')
          .eq('id_usuario', userId)
          .single();

        if (!empresa) continue;

        // Gerar lembretes do dia (idempotente)
        await admin.rpc('gerar_lembretes_automacoes_v5', {
          p_id_empresa: empresa.id,
          p_hoje: hojeStr,
        });

        // Verificar se há lembretes não disparados
        const { data: lembretes } = await admin
          .from('lembretes_automacoes')
          .select('id')
          .eq('id_empresa', empresa.id)
          .eq('data_execucao', hojeStr)
          .eq('disparado', false);

        if (!lembretes || lembretes.length === 0) continue;

        results.empresas++;

        const total = lembretes.length;
        const pushBody = `Você tem ${total} lembrete${total > 1 ? 's' : ''} de cadência para hoje. Não deixe os clientes esperando!`;

        const { enviados, erros } = await enviarPushParaUsuario(
          admin,
          userId,
          'Higi$Controle — Clientes Esperando! 📬',
          pushBody,
          { data: { url: '/whatsapp' } }
        );

        results.pushEnviados += enviados;
        results.erros += erros;

        console.log(`[cron] Empresa ${empresa.id}: ${enviados} push(es) enviados`);
      } catch (userErr) {
        console.error(`[cron] Erro ao processar user ${userId}:`, userErr);
        results.erros++;
      }
    }

    console.log('[cron] Concluído:', results);

    return new Response(
      JSON.stringify({ success: true, hojeStr, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('[cron] Erro geral:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}