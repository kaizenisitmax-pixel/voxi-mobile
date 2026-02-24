/**
 * Aktivite Logger
 *
 * Kart sohbetine sistem mesajı gönderir.
 * Her eylem (durum değişikliği, dosya yükleme, ödeme, randevu vb.)
 * sohbet akışında görünür hale gelir — tüm ekip anlık görür.
 */

import { supabase } from './supabase';

export type ActivityType =
  | 'status_change'    // Durum değişti
  | 'priority_change'  // Öncelik değişti
  | 'member_added'     // Ekibe üye eklendi
  | 'member_removed'   // Ekipten üye çıkarıldı
  | 'file_uploaded'    // Dosya/fotoğraf yüklendi
  | 'voice_added'      // Ses kaydı eklendi
  | 'note_added'       // Not eklendi
  | 'reminder_set'     // Hatırlatma kuruldu
  | 'payment'          // Ödeme kaydı
  | 'job_done'         // İş tamamlandı
  | 'issue'            // Sorun bildirildi
  | 'appointment'      // Randevu ayarlandı
  | 'checkin'          // Yerindeyim
  | 'email_sent'       // E-posta gönderildi
  | 'whatsapp_sent'    // WhatsApp gönderildi
  | 'sms_sent'         // SMS gönderildi
  | 'custom';          // Özel

export type ActivityPayload = {
  cardId: string;
  actorName: string;       // "Volkan Şimşirkaya"
  type: ActivityType;
  text: string;            // "ödeme alındı kaydetti" → UI: "💰 Volkan ödeme alındı kaydetti"
  emoji?: string;          // Varsa emoji override
  meta?: Record<string, any>;
};

const ACTIVITY_EMOJIS: Record<ActivityType, string> = {
  status_change:   '🔄',
  priority_change: '⚡',
  member_added:    '👤',
  member_removed:  '👋',
  file_uploaded:   '📎',
  voice_added:     '🎤',
  note_added:      '📝',
  reminder_set:    '⏰',
  payment:         '💰',
  job_done:        '✅',
  issue:           '🚨',
  appointment:     '📅',
  checkin:         '📍',
  email_sent:      '📧',
  whatsapp_sent:   '💬',
  sms_sent:        '📱',
  custom:          '•',
};

/**
 * Kart sohbetine aktivite sistem mesajı ekler.
 * Tüm ekip üyeleri anlık görür (realtime subscription).
 */
export async function logActivity(payload: ActivityPayload): Promise<void> {
  const emoji = payload.emoji ?? ACTIVITY_EMOJIS[payload.type];
  const content = `${emoji} ${payload.actorName} ${payload.text}`;

  try {
    await supabase.from('card_messages').insert({
      card_id: payload.cardId,
      user_id: null,           // sistem mesajı — user_id yok
      content,
      message_type: 'activity',
      metadata: {
        activity_type: payload.type,
        actor: payload.actorName,
        ...(payload.meta || {}),
      },
    });
  } catch (err) {
    // Aktivite logu kritik değil, sessizce geç
    console.warn('[activity] log failed:', err);
  }
}

/**
 * Durum değişikliği için özel log.
 * Örnek: "🔄 Mehmet durumu Devam Ediyor → Tamamlandı olarak güncelledi"
 */
export async function logStatusChange(
  cardId: string,
  actorName: string,
  from: string,
  to: string
): Promise<void> {
  const durum: Record<string, string> = {
    open: 'Açık', in_progress: 'Devam Ediyor',
    done: 'Tamamlandı', cancelled: 'İptal',
  };
  await logActivity({
    cardId,
    actorName,
    type: 'status_change',
    text: `durumu ${durum[from] || from} → ${durum[to] || to} olarak güncelledi`,
    meta: { from, to },
  });
}

/**
 * Dosya/fotoğraf yükleme logu.
 * Örnek: "📎 Ali 3 fotoğraf yükledi"
 */
export async function logFileUpload(
  cardId: string,
  actorName: string,
  fileName: string,
  fileType: string
): Promise<void> {
  const isPhoto = fileType.startsWith('image');
  const isAudio = fileType.startsWith('audio');
  const label = isPhoto ? 'fotoğraf ekledi' : isAudio ? 'ses kaydı ekledi' : `"${fileName}" belgesini ekledi`;

  await logActivity({
    cardId,
    actorName,
    type: isAudio ? 'voice_added' : 'file_uploaded',
    text: label,
    meta: { fileName, fileType },
  });
}

/**
 * Not ekleme logu.
 */
export async function logNoteAdded(
  cardId: string,
  actorName: string,
  notePreview: string
): Promise<void> {
  const preview = notePreview.length > 60 ? notePreview.slice(0, 60) + '...' : notePreview;
  await logActivity({
    cardId,
    actorName,
    type: 'note_added',
    text: `not ekledi: "${preview}"`,
    meta: { preview },
  });
}

/**
 * Üye ekleme/çıkarma logu.
 */
export async function logMemberChange(
  cardId: string,
  actorName: string,
  memberName: string,
  action: 'added' | 'removed'
): Promise<void> {
  await logActivity({
    cardId,
    actorName,
    type: action === 'added' ? 'member_added' : 'member_removed',
    text: action === 'added'
      ? `${memberName} ekibe ekledi`
      : `${memberName} ekipten çıkardı`,
    meta: { memberName, action },
  });
}
