// Uygulama genelinde kullanılan sabit değerler ve çevirileri
// Veritabanında İngilizce saklanır, UI'da Türkçe gösterilir

// ─── KART DURUMU ───────────────────────────────────────────────
export type KartDurumu = 'open' | 'in_progress' | 'done' | 'cancelled';

export const KART_DURUMU_ETIKET: Record<KartDurumu, string> = {
  open: 'Açık',
  in_progress: 'Devam Ediyor',
  done: 'Tamamlandı',
  cancelled: 'İptal',
};

export const KART_DURUMU_RENK: Record<KartDurumu, string> = {
  open: '#8E8E93',
  in_progress: '#1A1A1A',
  done: '#8E8E93',
  cancelled: '#C7C7CC',
};

// ─── ÖNCELİK ────────────────────────────────────────────────────
export type Oncelik = 'urgent' | 'high' | 'normal' | 'low';

export const ONCELIK_ETIKET: Record<Oncelik, string> = {
  urgent: 'Acil',
  high: 'Yüksek',
  normal: 'Normal',
  low: 'Düşük',
};

export const ONCELIK_RENK: Record<Oncelik, string | null> = {
  urgent: '#FF3B30',   // kırmızı nokta
  high: '#8E8E93',     // gri nokta
  normal: null,
  low: null,
};

export const ONCELIK_SIRALAMA: Record<Oncelik, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ─── ROL ────────────────────────────────────────────────────────
export type Rol = 'owner' | 'admin' | 'manager' | 'member';

export const ROL_ETIKET: Record<Rol, string> = {
  owner: 'Sahip',
  admin: 'Yönetici',
  manager: 'Müdür',
  member: 'Üye',
};

// ─── KAYNAK TİPİ ─────────────────────────────────────────────────
export type KaynakTipi = 'voice' | 'photo' | 'text' | 'document' | 'manual';

export const KAYNAK_ETIKET: Record<KaynakTipi, string> = {
  voice: 'Ses Kaydı',
  photo: 'Fotoğraf',
  text: 'Not',
  document: 'Belge',
  manual: 'Manuel',
};

// ─── MÜŞTERİ DURUMU ─────────────────────────────────────────────
export type MusteriDurumu = 'active' | 'lead' | 'passive' | 'lost';

export const MUSTERI_DURUMU_ETIKET: Record<MusteriDurumu, string> = {
  active: 'Aktif',
  lead: 'Aday',
  passive: 'Pasif',
  lost: 'Kayıp',
};

// ─── SIRALAMA HELPERS ────────────────────────────────────────────

/**
 * Kartları önce açık/kapandı durumuna, sonra önceliğe, sonra okunmamış mesaja,
 * son olarak son mesaj tarihine göre sıralar.
 *
 * Sıralama mantığı:
 * 1. Tamamlanmış kartlar en alta
 * 2. Açık kartlar içinde:
 *    a. Acil (urgent) → en üste
 *    b. Okunmamış mesajı olanlar → acilden sonra
 *    c. Devam edenler → sonra
 *    d. Açık olanlar → sonra
 *    e. Son mesaj tarihi (DESC) → son kriter
 */
import type { Card } from '../hooks/useCards';

export function siralaKartlar(kartlar: Card[]): { acikKartlar: Card[]; tamamlananKartlar: Card[] } {
  const tamamlananKartlar = kartlar.filter(k => k.status === 'done');
  const acikKartlar = kartlar
    .filter(k => k.status !== 'done' && k.status !== 'cancelled')
    .sort((a, b) => {
      // 1. Öncelik sıralaması
      const aSkor = ONCELIK_SIRALAMA[a.priority as Oncelik] ?? 2;
      const bSkor = ONCELIK_SIRALAMA[b.priority as Oncelik] ?? 2;

      // Aynı öncelikliyse okunmamış mesaj sayısına bak
      if (aSkor !== bSkor) return aSkor - bSkor;

      // 2. Okunmamış mesaj — olanlar önce
      if ((b.unread_count || 0) !== (a.unread_count || 0)) {
        return (b.unread_count || 0) - (a.unread_count || 0);
      }

      // 3. Durum sıralaması: in_progress > open
      const durumSkor = { in_progress: 0, open: 1 };
      const aDurum = durumSkor[a.status as keyof typeof durumSkor] ?? 1;
      const bDurum = durumSkor[b.status as keyof typeof durumSkor] ?? 1;
      if (aDurum !== bDurum) return aDurum - bDurum;

      // 4. Son mesaj tarihi (yeni → eski)
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

  return { acikKartlar, tamamlananKartlar };
}
