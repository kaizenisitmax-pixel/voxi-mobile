import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, title, body, data } = await req.json()
    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id, title ve body gerekli' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Push token'ları al
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true)

    if (tokenError || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Push token bulunamadı' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Expo Push API
    const messages = tokens.map((t: any) => ({
      to: t.token, sound: 'default', title, body,
      data: data || {}, priority: 'high', channelId: 'default',
    }))

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    })
    const pushResult = await pushResponse.json()

    // Bildirim kaydı
    await supabase.from('notifications').insert({
      user_id, type: data?.type || 'general', title, body,
      data: data || {}, channel: 'push', is_read: false,
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Push bildirim gönderildi', result: pushResult }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('send-push error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
