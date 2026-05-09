import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Using Service Role to bypass RLS when fetching subscriptions
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { user_id, title, body, icon, badge, data } = await req.json();

    if (!user_id || !title || !body) {
      throw new Error("Missing required parameters: user_id, title, or body");
    }

    // Configure Web Push with VAPID keys
    // Keys should be added to Supabase project secrets:
    // supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:your-email@example.com"
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@higicontrole.com';

    if (!vapidPublic || !vapidPrivate) {
      throw new Error("VAPID keys are not configured in edge function secrets");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // Fetch user subscriptions
    const { data: subscriptions, error } = await adminClient
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No active subscriptions found for this user." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/android-chrome-192x192.png',
      badge: badge || '/favicon-32x32.png',
      data: data || {},
    });

    const sendPromises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      return webpush.sendNotification(pushSubscription, payload).catch((err: any) => {
        console.error("Error sending push to endpoint", sub.endpoint, err);
        // Optional: Implement cleanup of expired/invalid subscriptions here (e.g. status code 410)
        if (err && err.statusCode === 410 || err.statusCode === 404) {
             console.log("Removing dead subscription:", sub.endpoint);
             return adminClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      });
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("Error sending web push:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
