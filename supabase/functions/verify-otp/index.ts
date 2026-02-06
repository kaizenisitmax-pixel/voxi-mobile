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
    const { phone, code } = await req.json()
    if (!phone || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefon ve kod gerekli' }),
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

    // Son geçerli kodu bul
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Geçerli kod bulunamadı. Yeni kod isteyin.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Max 5 deneme
    if (otpRecord.attempts >= 5) {
      await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Çok fazla deneme. Yeni kod isteyin.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Deneme sayısını artır
    await supabase.from('otp_codes').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id)

    // Kod kontrolü
    if (otpRecord.code !== code) {
      const remaining = 4 - otpRecord.attempts
      return new Response(
        JSON.stringify({ success: false, error: `Kod hatalı. ${remaining} deneme hakkınız kaldı.`, remaining_attempts: remaining }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Başarılı — kodu kullanıldı yap
    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id)

    // Kullanıcıyı bul
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', formattedPhone)
      .limit(1)
      .single()

    let userId = existingProfile?.id

    if (!userId) {
      // Yeni kullanıcı oluştur
      const tempEmail = `${formattedPhone}@voxi.phone`
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: tempEmail,
        phone: formattedPhone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone: formattedPhone },
      })

      if (authError) {
        const { data: existingAuth } = await supabase.auth.admin.listUsers()
        const found = existingAuth?.users?.find(
          (u: any) => u.phone === formattedPhone || u.email === tempEmail
        )
        userId = found?.id
      } else {
        userId = authUser.user.id
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kullanıcı oluşturulamadı' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true, message: 'Doğrulama başarılı',
        user_id: userId, is_new_user: !existingProfile,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('verify-otp error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
