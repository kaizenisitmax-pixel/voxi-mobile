// @ts-nocheck
// Supabase Edge Function: send-reminders
// Her sabah çalışır, bugünün hatırlatıcılarını bulur ve push notification gönderir

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date().toISOString().split('T')[0]
    console.log(`🔔 Hatırlatıcı kontrolü: ${today}`)

    // Bugün veya daha önce olan, gönderilmemiş hatırlatıcılar
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('id, task_id, user_id, workspace_id, remind_at, note, tasks:task_id(title)')
      .lte('remind_at', today)
      .eq('is_done', false)
      .not('user_id', 'is', null)

    if (error) throw error
    if (!reminders?.length) {
      return new Response(JSON.stringify({ success: true, count: 0 }), { headers: corsHeaders })
    }

    let successCount = 0
    for (const reminder of reminders) {
      try {
        // Push token bul
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', reminder.user_id)
          .eq('is_active', true)

        if (tokens?.length) {
          const title = '🔔 Hatırlatıcı'
          const body = reminder.note || `"${reminder.tasks?.title || 'Görev'}" için hatırlatma`

          // Expo Push gönder
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokens.map(t => ({
              to: t.token, sound: 'default', title, body,
              data: { screen: 'task', taskId: reminder.task_id }
            })))
          })

          // Notifications tablosuna kaydet
          await supabase.from('notifications').insert({
            user_id: reminder.user_id,
            workspace_id: reminder.workspace_id,
            type: 'reminder', title, body,
            data: { taskId: reminder.task_id },
            channel: 'push', is_read: false,
            sent_at: new Date().toISOString()
          })
        }

        // is_done = true yap
        await supabase.from('reminders').update({ is_done: true }).eq('id', reminder.id)
        successCount++
      } catch (e) { console.error(reminder.id, e) }
    }

    return new Response(
      JSON.stringify({ success: true, count: successCount, total: reminders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: corsHeaders })
  }
})
