// @ts-nocheck
// Supabase Edge Function: ai-voice
// AI Voice Command Processing
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';

serve(async (req: Request) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcript, workspace_context, mode, context } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript gerekli' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
          } 
        }
      );
    }

    // ========================================
    // MASTER REGISTER MODE (VOXI)
    // ========================================
    if (context === 'master_register') {
      const masterRegisterPrompt = `Sen bir usta-müşteri eşleştirme asistanısın (VOXI platformu). 
Kullanıcı sesli komutla usta olarak kaydolmak istiyor.

GÖREV:
Sesli komuttan şu bilgileri çıkar:
1. İsim (varsa)
2. Uzmanlık alanları (birden fazla olabilir)
3. Hizmet bölgeleri (şehir/ilçe)
4. Deneyim yılı (varsa)
5. Kısa bio

ÇIKARIMLARI JSON OLARAK VER:
{
  "intent": "master_register",
  "data": {
    "name": "İsim (varsa null)",
    "specialties": ["Yerden Isıtma", "Tadilat"],
    "service_areas": ["Balıkesir", "Bursa"],
    "experience_years": 10,
    "bio": "Kısa özet cümle"
  },
  "response": "Harika! Yerden ısıtma ve tadilat ustası olarak kaydınızı tamamlıyorum. Balıkesir ve Bursa'dan gelen talepleri görebileceksiniz."
}

SES KOMUTU: "${transcript}"

SADECE JSON DÖNDÜR, BAŞKA AÇIKLAMA YAPMA.`;

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: masterRegisterPrompt,
          }],
        }),
      });

      if (!anthropicResponse.ok) {
        throw new Error('Claude API isteği başarısız');
      }

      const result = await anthropicResponse.json();
      const aiText = result.content[0].text;

      // Parse JSON
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI yanıtı parse edilemedi');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return new Response(
        JSON.stringify(parsed),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
          } 
        }
      );
    }

    // Workspace context
    const teamMembers = workspace_context?.team_members || [];
    const recentTasks = workspace_context?.recent_tasks || [];
    const customers = workspace_context?.customers || [];
    const templates = workspace_context?.templates || [];
    const currentUser = workspace_context?.current_user || 'Kullanıcı';
    const today = workspace_context?.today || new Date().toISOString().split('T')[0];

    // ========================================
    // MODE SEÇİMİ: "analyze" veya "smart_card"
    // ========================================
    const analysisMode = mode === 'analyze';

    // ========================================
    // VOICE ANALYSIS PROMPT (Sesten Göreve Akış)
    // ========================================
    const voiceAnalysisPrompt = `Sen VOXI sesli asistanısın. Kullanıcı iş ortamında sesli komut veriyor.

KULLANICI: ${currentUser}
BUGÜN: ${today}

EKİP ÜYELERİ:
${teamMembers.length > 0 ? teamMembers.map((m: string, i: number) => `- ${m}`).join('\n') : '- Henüz ekip yok'}

MÜŞTERİLER:
${customers.length > 0 ? customers.map((c: string) => `- ${c}`).join('\n') : '- Henüz müşteri yok'}

GÖREVİN:
1. Sesli komutu analiz et
2. İsimleri ekip/müşteri listesiyle EŞLEŞTIR (fuzzy matching)
3. Eşleşme belirsizse needs_clarification: true yap ve seçenekler sun
4. Görev bilgilerini çıkar (başlık, atanan, tarih, öncelik)
5. Yapılacak işlem önerileri oluştur
6. Türkçe, samimi, kısa cevap ver

EŞLEŞTIRME KURALLARI:
- "Cihat" → "Cihat Yılmaz" (net eşleşme, high confidence)
- "Ciğatay" → muhtemelen "Cihat" ama belirsiz → medium confidence, sor
- "Şükrü Bey" → "Şükrü Bey Tarım" müşterisi (net eşleşme)
- "Ali" → 2 Ali varsa belirsiz → sor; tek Ali → net eşleşme
- Tanınmayan isim → low confidence, sor (ekip mi, müşteri mi, yeni mi?)

ZAMAN/TARİH:
- "yarın" → ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- "bugün" → ${today}
- "gelecek hafta" → ${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}
- "saat 8" → due_time: "08:00"

ÖNCELİK:
- "acil", "hemen", "şimdi" → urgent
- "önemli" → high
- Yoksa → normal

GÖREV TÜRÜ:
- "teklif", "fiyat" → quote
- "sipariş", "order" → order
- "müşteri", "lead" → lead
- "fatura" → invoice
- "servis", "arıza" → after_sales
- Yoksa → internal

CEVABINI SADECE JSON OLARAK VER:
{
  "confidence": "high" | "medium" | "low",
  "message": "Kullanıcıya Türkçe mesaj (samimi, kısa)",
  "needs_clarification": false | true,
  "clarification_options": [
    { "label": "Seçenek metni", "action": "fix_name" | "new_customer" | "manual_input", "value": "düzeltilmiş değer" }
  ],
  "task": {
    "title": "Görev başlığı",
    "description": "Detaylı açıklama",
    "assigned_to_name": "İsim veya null",
    "customer_name": "Müşteri adı veya null",
    "due_date": "YYYY-MM-DD veya null",
    "due_time": "HH:MM veya null",
    "priority": "urgent" | "high" | "normal" | "low",
    "task_type": "internal" | "lead" | "quote" | "order" | "invoice" | "after_sales",
    "suggested_actions": ["İşlem 1", "İşlem 2"]
  }
}`;

    // ========================================
    // SMART CARD PROMPT (Mevcut)
    // ========================================
    const smartCardPrompt = `Sen VOXI, Türkçe saha ekibi asistanısın. Sesli komutları analiz edip Smart Card JSON formatında döndürürsün.

═══ BAĞLAM ═══
Ekip üyeleri: ${teamMembers.length > 0 ? teamMembers.join(', ') : 'Henüz eklenmedi'}
Son görevler: ${recentTasks.length > 0 ? recentTasks.map((t: any) => `${t.title}${t.assigned_to ? ' ('+t.assigned_to+')' : ''}${t.status ? ' ['+t.status+']' : ''}`).join(', ') : 'Yok'}
Müşteriler: ${customers.length > 0 ? customers.map((c: any) => c.name).join(', ') : 'Henüz yok'}
Şablonlar: ${templates.length > 0 ? templates.map((t: any) => t.name).join(', ') : 'Henüz yok'}
Bugünün tarihi: ${new Date().toISOString().split('T')[0]}

═══ INTENT TİPLERİ ═══
1. create_task      → Yeni görev oluştur
2. update_task      → Mevcut görevi güncelle (durum, atama, tarih vb.)
3. complete_task    → Görevi tamamla (kısa yol)
4. create_customer  → Yeni müşteri oluştur
5. update_customer  → Mevcut müşteriyi güncelle
6. create_order     → Yeni sipariş oluştur
7. log_note         → Not/aktivite kaydı
8. ask_question     → Soru sor (DB'den bilgi iste)
9. ask_status       → Durum sorgula (kişi/görev/proje)
10. start_template  → Şablondan görev zinciri başlat
11. report          → Rapor iste (özet, sayı, istatistik)

Eğer hiçbirine uymuyorsa → intent: "chat" (sohbet)
Eğer anlayamıyorsan → intent: "unknown" (tekrar sor)

═══ ÇIKARIM KURALLARI ═══
- Kişi adı geçiyorsa ve ekip üyesi listesinde varsa → assigned_to
- Kişi adı geçiyorsa ve müşteri listesinde varsa → customer
- Yeni bir isim + "müşteri/firma/bey/hanım" → create_customer
- "acil/hemen/bugün bitmeli" → priority: "urgent"
- "yarın" → due_date: yarının tarihi
- "bitti/tamamlandı/hallettim" → update_task veya complete_task
- "ne durumda/nerede/ne yapıyor" → ask_status
- "kaç tane/bu hafta/bu ay" → report
- Fiyat/tutar belirtilmediyse → inferred_notes'a ekle: "Fiyat bilgisi belirtilmedi"
- Tarih belirtilmediyse → due_date: null (TAHMİN ETME)
- Kime atanacağı belirtilmediyse → follow_up_questions'a ekle

═══ VOXI v3 — GÖREV TÜRÜ (task_type) ═══
Görev oluştururken CRM/ERP akışını belirle:
- "ilk görüşme/ön görüşme/temas/potansiyel müşteri" → task_type: "lead"
- "teklif hazırla/fiyat ver/teklifim var" → task_type: "quote"
- "sipariş/order/satın alma" → task_type: "order"
- "fatura/ödeme/tahsilat" → task_type: "invoice"
- "servis/montaj/kurulum/arıza/bakım" → task_type: "after_sales"
- "toplantı/eğitim/iç iş/ofis" → task_type: "internal"
Eğer belirtilmediyse → task_type: "internal" (varsayılan)

═══ GÜNCELLEME ZEKASI ═══
"Montaj bitti" gibi komutlarda:
- Son görevlerden eşleşeni bul (title içinde anahtar kelime)
- Tek eşleşme → direkt güncelle
- Birden fazla → follow_up_questions ile sor: "Hangi montaj? Şükrü Bey'inki mi, Ahmet Bey'inki mi?"
- Eşleşme yok → follow_up_questions ile sor: "Hangi görevi tamamlamak istiyorsun?"

═══ ÇOKLU AKSİYON ═══
Tek komutta birden fazla aksiyon varsa:
"Ahmet Kaya müşteri ekle, sera montajı Cihat'a ver"
→ actions dizisi döndür (aşağıdaki formatta)

═══ JSON FORMAT ═══
Her zaman aşağıdaki formatta düz JSON döndür. Markdown KULLANMA.

TEK AKSİYON:
{
  "intent": "create_task",
  "confidence": 0.95,
  "card_type": "task",
  "data": {
    "title": "Sera montajı",
    "task_type": "after_sales",
    "assigned_to": "Cihat",
    "customer": "Şükrü Bey",
    "priority": "urgent",
    "scope": "montaj",
    "due_date": null,
    "location": null,
    "description": null
  },
  "field_notes": {
    "due_date": "Bitiş tarihi belirtilmedi",
    "location": "Konum belirtilmedi"
  },
  "inferred_notes": [],
  "follow_up_questions": [],
  "response": "Cihat'a acil sera montajı görevi oluşturdum. Şükrü Bey için."
}

ÇOKLU AKSİYON:
{
  "intent": "multi_action",
  "confidence": 0.90,
  "actions": [
    {
      "intent": "create_customer",
      "card_type": "customer",
      "data": {"name": "Ahmet Kaya", "city": "Antalya"},
      "field_notes": {"phone": "Telefon belirtilmedi"}
    },
    {
      "intent": "create_task",
      "card_type": "task",
      "data": {"title": "Sera montajı", "assigned_to": "Cihat", "customer": "Ahmet Kaya"},
      "field_notes": {}
    }
  ],
  "response": "Ahmet Kaya müşteri olarak eklendi. Cihat'a sera montajı görevi oluşturuldu."
}

EKSİK BİLGİ VARSA:
{
  "intent": "create_task",
  "confidence": 0.70,
  "card_type": "task",
  "data": {
    "title": "Montaj görevi",
    "priority": "normal"
  },
  "field_notes": {},
  "inferred_notes": [],
  "follow_up_questions": [
    {"field": "assigned_to", "question": "Bu görevi kime atayayım?", "options": [${teamMembers.map((m: string) => `"${m}"`).join(', ')}]},
    {"field": "customer", "question": "Hangi müşteri için?"}
  ],
  "response": "Montaj görevi oluşturacağım. Kime atamamı istersin?"
}

SORU / DURUM SORGUSU:
{
  "intent": "ask_status",
  "confidence": 0.90,
  "card_type": null,
  "data": {
    "query_type": "person_tasks",
    "target": "Cihat"
  },
  "response": "Cihat'ın açık görevlerine bakıyorum."
}

RAPOR:
{
  "intent": "report",
  "confidence": 0.85,
  "card_type": null,
  "data": {
    "report_type": "weekly_summary",
    "period": "this_week"
  },
  "response": "Bu haftanın görev özetini hazırlıyorum."
}

═══ KART DATA ALANLARI ═══

create_task:
  title (zorunlu), assigned_to, customer, priority (low/normal/urgent),
  due_date (YYYY-MM-DD veya null), scope (montaj/servis/teslimat/bakim/diger),
  location, description

create_customer:
  name (zorunlu), phone, city, address, source (referans/web/telefon/fuar),
  notes, contact_person

create_order:
  title (zorunlu), customer (zorunlu), items, total_amount, currency (TRY),
  delivery_date, payment_type (pesin/taksit/havale), notes

log_note:
  content (zorunlu), context_type (customer/task/general),
  context_name (müşteri veya görev adı), category (meeting/visit/note/decision/call)

update_task:
  task_identifier (başlık/anahtar kelime), updates (değişen alanlar: status, priority, assigned_to, due_date vb.)

complete_task:
  task_identifier (başlık/anahtar kelime)

start_template:
  template_name (şablon adı), customer, assigned_to

═══ KRİTİK KURALLAR ═══
1. Sadece söylenenden çıkarım yap — UYDURMAK YASAK
2. Yanıt KISA ol (max 2 cümle)
3. Samimi ama profesyonel Türkçe
4. Teknik terim KULLANMA
5. JSON dışında hiçbir şey döndürme (açıklama, markdown YOK)
6. Bilgi verilmemişse null yaz, tahmin ETME
7. field_notes'a sadece önemli eksik bilgileri yaz

Şimdi analiz et:`;

    // Hangi prompt kullanılacak
    const systemPrompt = analysisMode ? voiceAnalysisPrompt : smartCardPrompt;

    // ========================================
    // CLAUDE API ÇAĞRISI
    // ========================================
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: analysisMode ? 1024 : 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: transcript,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const textContent = result.content[0]?.text || '';

    // ========================================
    // JSON PARSE
    // ========================================
    let parsed;
    try {
      // Markdown wrapping temizle
      let cleaned = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Bazen AI JSON'dan önce/sonra metin ekler — ilk { ve son } arasını al
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      parsed = JSON.parse(cleaned);
    } catch {
      // JSON parse edilemezse chat fallback
      parsed = {
        intent: 'chat',
        confidence: 0.5,
        card_type: null,
        data: {},
        field_notes: {},
        inferred_notes: [],
        follow_up_questions: [],
        response: textContent.replace(/[*#_`]/g, '').trim(),
      };
    }

    // ========================================
    // RESPONSE NORMALİZASYON
    // ========================================
    // Eksik alanları varsayılan değerlerle doldur
    const normalized = {
      intent: parsed.intent || 'chat',
      confidence: parsed.confidence || 0.5,
      card_type: parsed.card_type || null,
      data: parsed.data || {},
      field_notes: parsed.field_notes || {},
      inferred_notes: parsed.inferred_notes || [],
      follow_up_questions: parsed.follow_up_questions || [],
      actions: parsed.actions || null,
      response: parsed.response || 'Anlayamadım, tekrar söyler misin?',
      usage: result.usage,
    };

    // Response'daki markdown karakterlerini temizle
    normalized.response = normalized.response.replace(/[*#_`]/g, '').trim();

    return new Response(
      JSON.stringify(normalized),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('AI Voice Error:', error);
    return new Response(
      JSON.stringify({
        intent: 'error',
        confidence: 0,
        card_type: null,
        data: {},
        field_notes: {},
        inferred_notes: [],
        follow_up_questions: [],
        response: 'Bir hata oluştu, tekrar deneyin.',
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
