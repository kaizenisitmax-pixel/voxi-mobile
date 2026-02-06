import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// ============ TİP TANIMLARI ============

interface AIResponse {
  message: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read: number;
  };
  model?: string;
}

interface VoiceResponse {
  action: 'create_task' | 'update_task' | 'complete_task' | 'query_tasks' | 'add_customer' | 'research' | 'chat';
  confidence: number;
  data: Record<string, any>;
  response: string;
  usage?: any;
}

interface VisionResponse {
  result: Record<string, any> | string;
  raw: string;
  usage?: any;
}

interface WorkspaceContext {
  team_members?: string[];
  recent_tasks?: { id: string; title: string }[];
}

// ============ YARDIMCI FONKSİYONLAR ============

/**
 * Görseli base64'e çevir (tüm URI tiplerini destekler)
 */
async function imageToBase64(uri: string): Promise<string> {
  try {
    // URI'yi normalize et
    let processedUri = uri;
    
    // ph:// veya asset-library:// URI'lerini file:// formatına çevir
    if (uri.startsWith('ph://') || uri.startsWith('asset')) {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      return manipulated.base64 || '';
    }
    
    // file:// URI ise direkt oku
    if (uri.startsWith('file://')) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      return base64;
    }
    
    // Diğer URI'ler için ImageManipulator kullan
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return manipulated.base64 || '';
  } catch (error) {
    console.error('Base64 dönüşüm hatası:', error);
    return '';
  }
}

/**
 * URI'den media type belirle
 */
function getMediaType(uri: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg'; // default
}

// ============ ANA AI FONKSİYONLARI ============

/**
 * Genel AI chat/process - Haiku kullanır (hızlı & ucuz)
 * Prompt caching aktif (Edge Function'da)
 */
export async function processAI(
  message: string, 
  type: 'chat' | 'task_parser' | 'research' = 'chat',
  context?: { role: string; content: string }[]
): Promise<AIResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-process', {
      body: { type, message, context }
    });

    if (error) {
      console.error('AI Process Error:', error);
      return null;
    }

    return data as AIResponse;
  } catch (err) {
    console.error('AI Process Exception:', err);
    return null;
  }
}

/**
 * Sesli komut işleme
 */
export async function processVoiceCommand(
  transcript: string,
  workspaceContext?: WorkspaceContext
): Promise<VoiceResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-voice', {
      body: { 
        transcript, 
        workspace_context: workspaceContext 
      }
    });

    if (error) {
      console.error('Voice Process Error:', error);
      return null;
    }

    return data as VoiceResponse;
  } catch (err) {
    console.error('Voice Process Exception:', err);
    return null;
  }
}

/**
 * Görsel analiz (kartvizit, sipariş, belge)
 */
export async function processVision(
  imageUri: string,
  type: 'business_card' | 'order' | 'document' | 'general' = 'general'
): Promise<VisionResponse | null> {
  try {
    // Resmi base64'e çevir
    const base64 = await imageToBase64(imageUri);
    
    if (!base64) {
      console.error('Base64 dönüşümü başarısız');
      return null;
    }

    // Media type belirle
    const mediaType = getMediaType(imageUri);

    const { data, error } = await supabase.functions.invoke('ai-vision', {
      body: { 
        type, 
        image_base64: base64,
        media_type: mediaType
      }
    });

    if (error) {
      console.error('Vision Process Error:', error);
      return null;
    }

    return data as VisionResponse;
  } catch (err) {
    console.error('Vision Process Exception:', err);
    return null;
  }
}

/**
 * Ses transkripti (Groq Whisper)
 */
export async function transcribeAudio(audioUri: string): Promise<string | null> {
  try {
    // Audio dosyasını base64'e çevir
    const base64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: 'base64',
    });

    // URI'den format çıkar
    const format = audioUri.split('.').pop()?.toLowerCase() || 'm4a';

    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { 
        audio_base64: base64,
        language: 'tr',
        format: format
      }
    });

    if (error) {
      console.error('Transcribe Error:', error);
      return null;
    }

    return data?.text || null;
  } catch (err) {
    console.error('Transcribe Exception:', err);
    return null;
  }
}

/**
 * Günlük bülten al
 */
export async function getDailyBulletin(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('daily-bulletin');

    if (error) {
      console.error('Bulletin Error:', error);
      return null;
    }

    return data?.bulletin || null;
  } catch (err) {
    console.error('Bulletin Exception:', err);
    return null;
  }
}

// ============ UYUMLULUK İÇİN ESKİ FONKSİYONLAR ============

/**
 * @deprecated processAI kullan
 * Eski kod uyumluluğu için
 */
export async function processVoxiChat(
  message: string,
  attachments?: { type: string; uri: string; name: string }[]
): Promise<{ message: string; actions?: any[] } | null> {
  try {
    // Eğer görsel varsa vision kullan
    if (attachments?.length && attachments[0].type === 'image') {
      const visionResult = await processVision(attachments[0].uri, 'general');
      if (visionResult) {
        return { 
          message: typeof visionResult.result === 'string' 
            ? visionResult.result 
            : JSON.stringify(visionResult.result),
          actions: []
        };
      }
      return null;
    }

    // Normal chat (Edge Function'a yönlendir)
    const result = await processAI(message, 'chat');
    if (result) {
      return { message: result.message, actions: [] };
    }
    
    return null;
  } catch (err) {
    console.error('processVoxiChat error:', err);
    return null;
  }
}

/**
 * @deprecated processVoiceCommand kullan
 */
export async function processCommand(transcript: string): Promise<any> {
  const result = await processVoiceCommand(transcript);
  return result ? result.data : null;
}

/**
 * @deprecated processVoiceCommand kullan
 */
export async function processVoiceInput(transcript: string): Promise<AIResponse | null> {
  const result = await processVoiceCommand(transcript);
  if (result) {
    return { message: result.response };
  }
  return null;
}

// ============ WORKSPACE CONTEXT ============

/**
 * Workspace context oluştur (voice komutları için)
 */
export async function getWorkspaceContext(workspaceId: string): Promise<WorkspaceContext> {
  try {
    // Ekip üyelerini al
    const { data: members } = await supabase
      .from('workspace_members')
      .select('profiles:user_id(full_name)')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    // Son görevleri al
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      team_members: members?.map((m: any) => m.profiles?.full_name).filter(Boolean) || [],
      recent_tasks: tasks || []
    };
  } catch (err) {
    console.error('Context fetch error:', err);
    return {};
  }
}

// ============ ESKİ FONKSİYONLAR (Backward Compatibility) ============

/**
 * @deprecated Artık Edge Function kullanılıyor
 * Eski saveTask, completeTask, updateTask fonksiyonları
 * action-engine.ts üzerinden çalışıyor
 */
export async function saveTask(command: any): Promise<boolean> {
  console.warn('saveTask deprecated - action-engine kullanın');
  return false;
}

export async function completeTask(taskTitleHint: string): Promise<boolean> {
  console.warn('completeTask deprecated - action-engine kullanın');
  return false;
}

export async function updateTask(taskTitleHint: string, updates: any): Promise<boolean> {
  console.warn('updateTask deprecated - action-engine kullanın');
  return false;
}

/**
 * Görev özeti (Edge Function'a taşındı)
 */
export async function summarizeTask(messages: any[]): Promise<string> {
  try {
    const conversation = messages
      .filter((m: any) => m.message_type !== 'system')
      .map((m: any) => `${m.sender_name}: ${m.transcript}`)
      .join('\n');
    
    if (!conversation.trim()) {
      return 'Özetlenecek konuşma bulunamadı.';
    }

    const { data, error } = await supabase.functions.invoke('ai-process', {
      body: { 
        type: 'task_summary',
        message: conversation
      }
    });

    if (error) {
      console.error('Summary error:', error);
      return 'Özet oluşturulamadı.';
    }

    return data?.message || 'Özet oluşturulamadı.';
  } catch (err) {
    console.error('Summary exception:', err);
    return 'Özet oluşturulurken bir hata oluştu.';
  }
}

/**
 * Hatırlatma tarih algılama (Lokal - Edge Function'a taşınabilir)
 */
export async function detectReminder(message: string): Promise<{ date: string; note: string } | null> {
  try {
    const today = new Date();
    const text = message.toLowerCase();
    
    // "Yarın" kontrolü
    if (text.includes('yarın')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { 
        date: tomorrow.toISOString().split('T')[0], 
        note: message 
      };
    }
    
    // "Haftaya" / "Gelecek hafta" kontrolü
    if (text.includes('haftaya') || text.includes('gelecek hafta')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return { 
        date: nextWeek.toISOString().split('T')[0], 
        note: message 
      };
    }
    
    // "Bugün" kontrolü
    if (text.includes('bugün')) {
      return { 
        date: today.toISOString().split('T')[0], 
        note: message 
      };
    }
    
    // Tarih formatı: "15 Şubat", "5 mart" vb
    const dateMatch = text.match(/(\d{1,2})\s*(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i);
    if (dateMatch) {
      const months: Record<string, number> = {
        ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5,
        temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11
      };
      const day = parseInt(dateMatch[1]);
      const month = months[dateMatch[2].toLowerCase()];
      let year = today.getFullYear();
      
      const tempDate = new Date(year, month, day);
      if (tempDate < today) {
        year++;
      }
      
      const d = new Date(year, month, day);
      return { 
        date: d.toISOString().split('T')[0], 
        note: message 
      };
    }
    
    // Tarih formatı: "15/02" veya "15.02"
    const slashDateMatch = text.match(/(\d{1,2})[\/\.](\d{1,2})/);
    if (slashDateMatch) {
      const day = parseInt(slashDateMatch[1]);
      const month = parseInt(slashDateMatch[2]) - 1;
      let year = today.getFullYear();
      
      const tempDate = new Date(year, month, day);
      if (tempDate < today) {
        year++;
      }
      
      const d = new Date(year, month, day);
      return { 
        date: d.toISOString().split('T')[0], 
        note: message 
      };
    }
    
    // "X gün sonra" kontrolü
    const daysMatch = text.match(/(\d+)\s*gün\s*(sonra|içinde)/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      return { 
        date: futureDate.toISOString().split('T')[0], 
        note: message 
      };
    }
    
    return null;
  } catch (error) {
    console.error('Tarih algılama hatası:', error);
    return null;
  }
}

// ============ DEFAULT EXPORT ============

export default {
  processAI,
  processVoiceCommand,
  processVision,
  transcribeAudio,
  getDailyBulletin,
  processVoxiChat,
  processCommand,
  processVoiceInput,
  getWorkspaceContext,
  summarizeTask,
  detectReminder,
};
