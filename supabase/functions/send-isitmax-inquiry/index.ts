// supabase/functions/send-isitmax-inquiry/index.ts
// EvimAI - Yapı Kategorisi: ISITMAX'a İletişim Formu
// Supabase'e kayıt + email bildirimi

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ISITMAX email ayarları
// Resend, SendGrid veya SMTP kullanılabilir
// Şimdilik Resend örneği:
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const ISITMAX_EMAIL = Deno.env.get('ISITMAX_EMAIL') || 'info@isitmax.com'
const ISITMAX_CC = Deno.env.get('ISITMAX_CC') || '' // Volkan'ın emaili

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const {
      specification_id,
      contact_name,
      contact_phone,
      contact_email,
      project_location,
      project_area_m2,
      message,
    } = await req.json()

    if (!specification_id || !contact_name || !contact_phone) {
      return new Response(
        JSON.stringify({ error: 'specification_id, contact_name ve contact_phone gerekli' }),
        { status: 400 }
      )
    }

    // Auth kontrolü
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // User doğrula
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    // Şartname + Tasarım bilgilerini çek
    const { data: spec, error: specError } = await supabase
      .from('specifications')
      .select(`
        *,
        designs (
          id,
          original_image_url,
          ai_image_url,
          category,
          style,
          service_type
        )
      `)
      .eq('id', specification_id)
      .single()

    if (specError || !spec) {
      return new Response(JSON.stringify({ error: 'Şartname bulunamadı' }), { status: 404 })
    }

    // Şartname kalemlerini çek
    const { data: items } = await supabase
      .from('specification_items')
      .select('*')
      .eq('specification_id', specification_id)
      .order('sort_order')

    // ISITMAX Inquiries tablosuna kaydet
    const { data: inquiry, error: inquiryError } = await supabase
      .from('isitmax_inquiries')
      .insert({
        specification_id,
        user_id: user.id,
        contact_name,
        contact_phone,
        contact_email: contact_email || null,
        project_location: project_location || null,
        project_area_m2: project_area_m2 || null,
        message: message || null,
        email_sent: false,
        status: 'pending',
      })
      .select()
      .single()

    if (inquiryError) {
      console.error('❌ Inquiry Insert Error:', inquiryError)
      throw inquiryError
    }

    // Email gönder
    let emailSent = false

    if (RESEND_API_KEY) {
      try {
        // Malzeme listesini HTML tablosuna çevir
        const itemsHtml = items && items.length > 0
          ? `
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr style="background:#1E293B; color:white;">
                <th style="padding:8px; text-align:left;">Kalem</th>
                <th style="padding:8px; text-align:left;">Tür</th>
                <th style="padding:8px; text-align:left;">Kategori</th>
                <th style="padding:8px; text-align:right;">Miktar</th>
              </tr>
              ${items.map((item: any, i: number) => `
                <tr style="background:${i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'};">
                  <td style="padding:8px; border-bottom:1px solid #E2E8F0;"><strong>${item.label}</strong>${item.description ? `<br><small style="color:#64748B;">${item.description}</small>` : ''}</td>
                  <td style="padding:8px; border-bottom:1px solid #E2E8F0;">${item.item_type}</td>
                  <td style="padding:8px; border-bottom:1px solid #E2E8F0;">${item.category || '-'}</td>
                  <td style="padding:8px; border-bottom:1px solid #E2E8F0; text-align:right;">${item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}</td>
                </tr>
              `).join('')}
            </table>
          `
          : '<p><em>Henüz malzeme kalemi eklenmemiş.</em></p>'

        const emailHtml = `
          <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
            <div style="background:#1E293B; color:white; padding:24px; text-align:center;">
              <h1 style="margin:0; font-size:24px;">EvimAI - Yeni Yapı Talebi</h1>
              <p style="margin:8px 0 0; opacity:0.8;">Hayal Et · Gör · Yaptır</p>
            </div>
            
            <div style="padding:24px;">
              <h2 style="color:#2563EB; margin-top:0;">İletişim Bilgileri</h2>
              <table style="width:100%;">
                <tr><td style="padding:4px 0; color:#64748B;">Ad Soyad:</td><td style="padding:4px 0;"><strong>${contact_name}</strong></td></tr>
                <tr><td style="padding:4px 0; color:#64748B;">Telefon:</td><td style="padding:4px 0;"><strong>${contact_phone}</strong></td></tr>
                ${contact_email ? `<tr><td style="padding:4px 0; color:#64748B;">E-posta:</td><td style="padding:4px 0;">${contact_email}</td></tr>` : ''}
                ${project_location ? `<tr><td style="padding:4px 0; color:#64748B;">Konum:</td><td style="padding:4px 0;">${project_location}</td></tr>` : ''}
                ${project_area_m2 ? `<tr><td style="padding:4px 0; color:#64748B;">Alan:</td><td style="padding:4px 0;">${project_area_m2} m²</td></tr>` : ''}
              </table>

              <h2 style="color:#2563EB;">Proje Detayları</h2>
              <table style="width:100%;">
                <tr><td style="padding:4px 0; color:#64748B;">Kategori:</td><td style="padding:4px 0;">${spec.category}</td></tr>
                <tr><td style="padding:4px 0; color:#64748B;">Stil:</td><td style="padding:4px 0;">${spec.style || '-'}</td></tr>
                <tr><td style="padding:4px 0; color:#64748B;">Şartname:</td><td style="padding:4px 0;">${spec.title || '-'}</td></tr>
              </table>

              ${message ? `<h2 style="color:#2563EB;">Müşteri Mesajı</h2><p style="background:#F1F5F9; padding:12px; border-radius:8px;">${message}</p>` : ''}

              <h2 style="color:#2563EB;">AI Analiz - Malzeme Listesi</h2>
              ${itemsHtml}

              ${spec.designs?.ai_image_url ? `
                <h2 style="color:#2563EB;">Tasarım Görseli</h2>
                <img src="${spec.designs.ai_image_url}" style="max-width:100%; border-radius:8px; border:1px solid #E2E8F0;" alt="AI Tasarım" />
              ` : ''}

              ${spec.designs?.original_image_url ? `
                <h2 style="color:#2563EB;">Orijinal Görsel</h2>
                <img src="${spec.designs.original_image_url}" style="max-width:100%; border-radius:8px; border:1px solid #E2E8F0;" alt="Orijinal" />
              ` : ''}
            </div>

            <div style="background:#F1F5F9; padding:16px; text-align:center; color:#64748B; font-size:12px;">
              <p>Bu talep EvimAI uygulaması üzerinden otomatik oluşturulmuştur.</p>
              <p>Talep ID: ${inquiry.id}</p>
            </div>
          </div>
        `

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'EvimAI <noreply@evim.ai>',
            to: [ISITMAX_EMAIL],
            cc: ISITMAX_CC ? [ISITMAX_CC] : [],
            subject: `[EvimAI] Yeni Yapı Talebi - ${contact_name} - ${spec.style || spec.category}`,
            html: emailHtml,
          }),
        })

        if (emailResponse.ok) {
          emailSent = true
          // Email gönderildi bilgisini güncelle
          await supabase
            .from('isitmax_inquiries')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', inquiry.id)
        } else {
          const emailError = await emailResponse.text()
          console.error('❌ Email Error:', emailError)
        }
      } catch (emailError) {
        console.error('❌ Email Send Error:', emailError)
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY not set, skipping email')
    }

    // Specification durumunu güncelle
    await supabase
      .from('specifications')
      .update({ status: 'sent' })
      .eq('id', specification_id)

    console.log(`✅ ISITMAX inquiry created: ${inquiry.id} | Email sent: ${emailSent}`)

    return new Response(
      JSON.stringify({
        inquiry_id: inquiry.id,
        email_sent: emailSent,
        status: 'pending',
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})
