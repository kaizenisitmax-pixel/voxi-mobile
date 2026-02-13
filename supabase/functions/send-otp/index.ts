// @ts-nocheck
// Supabase Edge Function: send-otp
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
    const { phone } = await req.json()
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefon numarası gerekli' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Telefon formatı
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) formattedPhone = '9' + formattedPhone
    else if (!formattedPhone.startsWith('90')) formattedPhone = '90' + formattedPhone

    // Rate limit: Son 1 dakika
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    const { data: recentOtp } = await supabase
      .from('otp_codes')
      .select('created_at')
      .eq('phone', formattedPhone)
      .gte('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recentOtp && recentOtp.length > 0) {
      const waitSeconds = Math.ceil(60 - (Date.now() - new Date(recentOtp[0].created_at).getTime()) / 1000)
      return new Response(
        JSON.stringify({ success: false, error: `${waitSeconds} saniye sonra tekrar deneyin`, wait_seconds: waitSeconds }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Eski kodları iptal et
    await supabase.from('otp_codes').update({ is_used: true }).eq('phone', formattedPhone).eq('is_used', false)

    // 6 haneli kod
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('otp_codes').insert({
      phone: formattedPhone, code, expires_at: expiresAt, is_used: false, attempts: 0,
    })

    if (insertError) {
      console.error('OTP kayıt hatası:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Kod oluşturulamadı' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // SMS gönder
    const usercode = Deno.env.get('NETGSM_USERCODE')!
    const password = Deno.env.get('NETGSM_PASSWORD')!
    const msgheader = Deno.env.get('NETGSM_HEADER')!
    const smsMessage = `VOXI dogrulama kodunuz: ${code}. Bu kod 5 dakika gecerlidir.`

    const params = new URLSearchParams({ usercode, password, gsmno: formattedPhone, message: smsMessage, msgheader })
    const smsResponse = await fetch(`https://api.netgsm.com.tr/sms/send/get?${params.toString()}`)
    const smsResult = await smsResponse.text()
    const smsSuccess = smsResult.startsWith('00') || smsResult.startsWith('01') || smsResult.startsWith('02')

    // Log
    await supabase.from('sms_log').insert({
      phone: formattedPhone, message: smsMessage, message_type: 'otp',
      provider: 'netgsm', status: smsSuccess ? 'sent' : 'failed', provider_response: smsResult,
    })

    if (!smsSuccess) {
      console.error('SMS gönderilemedi:', smsResult)
      return new Response(
        JSON.stringify({ success: false, error: 'SMS gönderilemedi' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Doğrulama kodu gönderildi' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('send-otp error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
