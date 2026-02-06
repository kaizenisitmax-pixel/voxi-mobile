import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, message } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'phone ve message gerekli' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const usercode = Deno.env.get('NETGSM_USERCODE')!
    const password = Deno.env.get('NETGSM_PASSWORD')!
    const msgheader = Deno.env.get('NETGSM_HEADER')!

    // Telefon formatı: 905XXXXXXXXX
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '9' + formattedPhone
    } else if (!formattedPhone.startsWith('90')) {
      formattedPhone = '90' + formattedPhone
    }

    const params = new URLSearchParams({
      usercode,
      password,
      gsmno: formattedPhone,
      message,
      msgheader,
    })

    const response = await fetch(
      `https://api.netgsm.com.tr/sms/send/get?${params.toString()}`
    )
    const result = await response.text()

    // Netgsm başarı kodları: 00, 01, 02
    const success = result.startsWith('00') || result.startsWith('01') || result.startsWith('02')

    if (!success) {
      console.error('Netgsm hata:', result)
      return new Response(
        JSON.stringify({ success: false, error: 'SMS gönderilemedi', netgsm_code: result }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'SMS gönderildi' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('send-sms error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
