// supabase/functions/analyze-design/index.ts
// VOXI - Claude Vision ile Tasarım Analizi
// Görselden malzeme, ölçü, finish çıkarır

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Kategori bazlı Claude Vision prompt'ları
const ANALYSIS_PROMPTS: Record<string, string> = {
  decoration: `Bu iç mekan tasarım görselini analiz et. Aşağıdaki bilgileri JSON formatında çıkar:

Her bir malzeme/öğe için:
- item_type: "material" | "dimension" | "finish" | "color" | "fixture" | "note"  
- category: "zemin" | "duvar" | "tavan" | "mobilya" | "aydınlatma" | "diğer"
- label: Malzemenin/öğenin Türkçe adı (örn: "Meşe Parke", "Saten Boya")
- description: Kısa açıklama
- quantity: Tahmini miktar (sayı, null olabilir)
- unit: Birim ("m²" | "m" | "adet" | "set")
- ai_confidence: Güven skoru (0.0-1.0)

Şunlara dikkat et:
- Zemin malzemesi (parke, seramik, halı, mermer vb.)
- Duvar kaplaması (boya rengi, duvar kağıdı, taş kaplama vb.)
- Tavan detayı (asma tavan, kartonpiyer, boya vb.)
- Mobilyalar (koltuk, masa, dolap, raf vb.)
- Aydınlatma (avize, spot, şerit LED, aplik vb.)
- Genel renk paleti
- Perde/tekstil
- Dekoratif öğeler

Sadece JSON döndür, başka hiçbir şey yazma.`,

  construction: `Bu yapı/mimari tasarım görselini analiz et. Aşağıdaki bilgileri JSON formatında çıkar:

Her bir yapısal öğe için:
- item_type: "material" | "dimension" | "finish" | "fixture" | "note"
- category: "taşıyıcı" | "kaplama" | "çatı" | "havalandırma" | "iklimlendirme" | "diğer"
- label: Öğenin Türkçe adı (örn: "Alüminyum Profil 40x80", "Temperli Cam 4mm")
- description: Kısa açıklama
- quantity: Tahmini miktar (null olabilir)
- unit: Birim ("m²" | "m" | "adet" | "kg" | "ton")
- ai_confidence: Güven skoru (0.0-1.0)

Şunlara dikkat et:
- Taşıyıcı sistem (çelik profil, alüminyum, beton vb.)
- Kaplama malzemesi (cam, polikarbon, sandviç panel, trapez sac vb.)
- Çatı tipi ve malzemesi
- Zemin/temel detayı
- Kapı/pencere sistemleri
- Havalandırma elemanları
- Yağmur olukları ve drenaj

Sera/greenhouse görseli ise özellikle:
- Alüminyum profil tipleri ve boyutları
- Cam/polikarbon tipi ve kalınlığı
- Havalandırma sistemi (çatı penceresi, yan havalandırma)
- Isıtma/soğutma elemanları
- Gölgeleme sistemi

Sadece JSON döndür, başka hiçbir şey yazma.`,

  hvac: `Bu iklimlendirme/HVAC sistemi görselini analiz et. Aşağıdaki bilgileri JSON formatında çıkar:

Her bir sistem öğesi için:
- item_type: "material" | "dimension" | "fixture" | "note"
- category: "ısıtma" | "soğutma" | "havalandırma" | "yalıtım" | "kontrol" | "diğer"
- label: Öğenin Türkçe adı
- description: Kısa açıklama
- quantity: Tahmini miktar (null olabilir)
- unit: Birim
- ai_confidence: Güven skoru (0.0-1.0)

Sadece JSON döndür, başka hiçbir şey yazma.`
}

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
    const { design_id, image_url, category, style } = await req.json()

    if (!design_id || !image_url) {
      return new Response(JSON.stringify({ error: 'design_id ve image_url gerekli' }), { status: 400 })
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

    // Kategori bazlı prompt seç
    const analysisPrompt = ANALYSIS_PROMPTS[category] || ANALYSIS_PROMPTS.decoration

    // Stil context ekle
    const styleContext = style ? `\n\nBu tasarımın stili: ${style}. Bu stile özgü malzemelere özellikle dikkat et.` : ''

    console.log(`🔍 Analyzing design ${design_id} | Category: ${category} | Style: ${style}`)

    // Claude Vision API çağrısı
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: image_url,
                },
              },
              {
                type: 'text',
                text: analysisPrompt + styleContext + '\n\nJSON formatı:\n{"items": [...], "summary": "Kısa özet"}',
              },
            ],
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('❌ Claude API Error:', errorText)
      throw new Error(`Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const analysisText = claudeData.content[0]?.text || '{}'

    // JSON parse (Claude bazen markdown code block içinde döndürebilir)
    let analysis
    try {
      const cleanJson = analysisText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      analysis = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError)
      analysis = { items: [], summary: 'Analiz yapılamadı' }
    }

    // Specification oluştur
    const { data: spec, error: specError } = await supabase
      .from('specifications')
      .insert({
        design_id,
        user_id: user.id,
        title: `${style || category} Tasarım Şartnamesi`,
        category,
        service_type: null, // Frontend'den gelecek
        style,
        ai_analysis: analysis,
        status: 'draft',
      })
      .select()
      .single()

    if (specError) {
      console.error('❌ Specification Insert Error:', specError)
      throw specError
    }

    // Item'ları ekle
    if (analysis.items && analysis.items.length > 0) {
      const items = analysis.items.map((item: any, index: number) => ({
        specification_id: spec.id,
        item_type: item.item_type || 'note',
        category: item.category || 'diğer',
        label: item.label || 'Bilinmeyen öğe',
        description: item.description || null,
        quantity: item.quantity || null,
        unit: item.unit || null,
        ai_confidence: item.ai_confidence || 0.5,
        user_approved: false,
        source: 'ai_generated',
        sort_order: index,
      }))

      const { error: itemsError } = await supabase
        .from('specification_items')
        .insert(items)

      if (itemsError) {
        console.error('❌ Items Insert Error:', itemsError)
        // Spec'i sil, geri al
        await supabase.from('specifications').delete().eq('id', spec.id)
        throw itemsError
      }
    }

    console.log(`✅ Specification created: ${spec.id} with ${analysis.items?.length || 0} items`)

    return new Response(
      JSON.stringify({
        specification_id: spec.id,
        item_count: analysis.items?.length || 0,
        summary: analysis.summary || null,
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
