'use client';
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Animated, Clipboard,
  Alert, ActivityIndicator, Linking,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from '../lib/colors';
import { supabase } from '../lib/supabase';
import { logActivity, logStatusChange } from '../lib/activity';
import type { Card } from '../hooks/useCards';

// ─── Bildirim yapılandırması ──────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true,
    shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true,
  }),
});

// ─── Tipler ──────────────────────────────────────────────────────
export type ActionType =
  | 'reminder'
  | 'email'
  | 'whatsapp'
  | 'sms'
  | 'job_done'
  | 'payment'
  | 'issue'
  | 'appointment'
  | 'checkin';

type Props = {
  visible: boolean;
  actionType: ActionType;
  card: Card;
  actorName: string;
  onClose: () => void;
  onCardUpdated?: () => void;
};

// ─── Tarih chip'leri ──────────────────────────────────────────────
const DATE_CHIPS = [
  { label: 'Bugün', hours: 1 },
  { label: 'Yarın 09:00', hours: 24 },
  { label: '3 Gün Sonra', hours: 72 },
  { label: '1 Hafta', hours: 168 },
];

// ─── Mesaj şablonları ─────────────────────────────────────────────
function generateWhatsApp(card: Card): string {
  const customer = card.customers;
  const name = customer?.contact_name ? customer.contact_name.split(' ')[0] : 'Merhaba';
  return `${name}, iyi günler 👋\n\n*${card.title}* konusunda sizi aramak istiyordum.${card.description ? '\n\n' + card.description : ''}\n\nUygun bir vakit var mı?`;
}

function generateEmail(card: Card): { subject: string; body: string } {
  const customer = card.customers;
  const name = customer?.contact_name || customer?.company_name || 'Sayın İlgili';
  return {
    subject: `${card.title} hakkında`,
    body: `Sayın ${name},\n\n${card.title} konusunda sizinle paylaşmak istediğim bilgiler için bu e-postayı gönderiyorum.\n\n${card.description ? card.description + '\n\n' : ''}${card.ai_summary ? card.ai_summary + '\n\n' : ''}Konuyu değerlendirip geri dönmenizi rica ederim.\n\nSaygılarımla`,
  };
}

function generateSMS(card: Card): string {
  const customer = card.customers;
  const name = customer?.contact_name ? customer.contact_name.split(' ')[0] : '';
  return `${name ? name + ', ' : ''}${card.title} konusunda sizi arayacağım. Uygun bir vakit bildirir misiniz?`;
}

// ─── Bildirim izni + planlama ─────────────────────────────────────
async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleReminder(title: string, body: string, date: Date): Promise<string | null> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    Alert.alert('Bildirim İzni', 'Hatırlatmalar için bildirim iznine ihtiyacımız var.');
    return null;
  }
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// ─── VOXI ile mesaj iyileştir ─────────────────────────────────────
async function enhanceWithVoxi(prompt: string): Promise<string | null> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return null;
    const res = await fetch('https://voxi-web-production.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        teamId: 'current', workspaceId: 'current',
      }),
    });
    const data = await res.json();
    return data.message || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
//  ANA MODAL
// ─────────────────────────────────────────────────────────────────
export default function ActionModal({ visible, actionType, card, actorName, onClose, onCardUpdated }: Props) {
  const slideAnim = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 700, duration: 220, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const sharedProps = { card, actorName, onClose, onCardUpdated };

  const renderContent = () => {
    switch (actionType) {
      case 'reminder':    return <ReminderScreen {...sharedProps} />;
      case 'email':       return <EmailScreen {...sharedProps} />;
      case 'whatsapp':    return <WhatsAppScreen {...sharedProps} />;
      case 'sms':         return <SMSScreen {...sharedProps} />;
      case 'job_done':    return <JobDoneScreen {...sharedProps} />;
      case 'payment':     return <PaymentScreen {...sharedProps} />;
      case 'issue':       return <IssueScreen {...sharedProps} />;
      case 'appointment': return <AppointmentScreen {...sharedProps} />;
      case 'checkin':     return <CheckinScreen {...sharedProps} />;
      default:            return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {renderContent()}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PAYLAŞILAN BAŞARILI EKRAN
// ─────────────────────────────────────────────────────────────────
function SuccessScreen({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <View style={styles.successScreen}>
      <Text style={styles.successEmoji}>{emoji}</Text>
      <Text style={styles.successTitle}>{title}</Text>
      {sub && <Text style={styles.successSub}>{sub}</Text>}
      <Text style={styles.successHint}>Sohbette görünecek ✓</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
//  1. ✅ İŞ TAMAMLANDI
// ─────────────────────────────────────────────────────────────────
function JobDoneScreen({ card, actorName, onClose, onCardUpdated }: any) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      await supabase.from('cards').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', card.id);
      await logActivity({
        cardId: card.id, actorName, type: 'job_done',
        text: `işi tamamlandı olarak işaretledi${note ? ` — "${note}"` : ''}`,
        meta: { note },
      });
      onCardUpdated?.();
      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi, tekrar dene.');
    } finally { setSaving(false); }
  };

  if (done) return <SuccessScreen emoji="✅" title="İş Tamamlandı!" sub="Ekip bilgilendirildi" />;

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>✅ İş Tamamlandı</Text>
      <View style={styles.contextCard}>
        <Text style={styles.contextCardTitle} numberOfLines={2}>{card.title}</Text>
        {card.customers?.company_name && <Text style={styles.contextCardSub}>{card.customers.company_name}</Text>}
      </View>
      <Text style={styles.fieldLabel}>TAMAMLANMA NOTU (opsiyonel)</Text>
      <TextInput
        style={styles.textInput}
        value={note}
        onChangeText={setNote}
        placeholder="Kısa not — ne yapıldı, ne teslim edildi..."
        placeholderTextColor={colors.muted}
        multiline
      />
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>
          💬 Sohbette ekip üyelerine bildirim gidecek
        </Text>
      </View>
      <TouchableOpacity style={[styles.sendBtn, saving && styles.sendBtnDisabled]} onPress={handle} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendBtnText}>✅ Tamamlandı Olarak İşaretle</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  2. 💰 ÖDEME ALINDI
// ─────────────────────────────────────────────────────────────────
function PaymentScreen({ card, actorName, onClose }: any) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    if (!amount.trim()) {
      Alert.alert('Tutar', 'Lütfen ödeme tutarını girin.');
      return;
    }
    setSaving(true);
    try {
      const amountText = `${amount} TL`;
      await logActivity({
        cardId: card.id, actorName, type: 'payment',
        text: `ödeme alındı kaydetti — ${amountText}${note ? ` · "${note}"` : ''}`,
        meta: { amount, currency: 'TRY', note },
      });
      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  if (done) return <SuccessScreen emoji="💰" title={`${amount} TL Kaydedildi`} sub="Ödeme sohbette görünüyor" />;

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>💰 Ödeme Alındı</Text>
      <View style={styles.contextCard}>
        <Text style={styles.contextCardTitle} numberOfLines={1}>{card.title}</Text>
        {card.customers?.company_name && <Text style={styles.contextCardSub}>{card.customers.company_name}</Text>}
      </View>

      <Text style={styles.fieldLabel}>TUTAR (TL)</Text>
      <TextInput
        style={[styles.textInputSingle, styles.amountInput]}
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
        autoFocus
      />

      <Text style={styles.fieldLabel}>AÇIKLAMA (opsiyonel)</Text>
      <TextInput
        style={styles.textInput}
        value={note}
        onChangeText={setNote}
        placeholder="Ön ödeme, kaparo, bakiye, nakit..."
        placeholderTextColor={colors.muted}
        multiline
      />
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>💬 Sohbette ekip ve yönetici görecek</Text>
      </View>
      <TouchableOpacity style={[styles.sendBtn, saving && styles.sendBtnDisabled]} onPress={handle} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendBtnText}>💰 Ödemeyi Kaydet</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  3. 🚨 SORUN BİLDİR
// ─────────────────────────────────────────────────────────────────
function IssueScreen({ card, actorName, onClose, onCardUpdated }: any) {
  const [description, setDescription] = useState('');
  const [makeUrgent, setMakeUrgent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    if (!description.trim()) {
      Alert.alert('Sorun', 'Lütfen sorunu kısaca açıklayın.');
      return;
    }
    setSaving(true);
    try {
      if (makeUrgent) {
        await supabase.from('cards').update({ priority: 'urgent' }).eq('id', card.id);
      }
      await logActivity({
        cardId: card.id, actorName, type: 'issue',
        text: `sorun bildirdi — "${description}"${makeUrgent ? ' (ACİL olarak işaretlendi)' : ''}`,
        meta: { description, makeUrgent },
      });
      onCardUpdated?.();
      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  if (done) return <SuccessScreen emoji="🚨" title="Sorun Bildirildi" sub="Ekip anlık bilgilendirildi" />;

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>🚨 Sorun Bildir</Text>
      <View style={styles.contextCard}>
        <Text style={styles.contextCardTitle} numberOfLines={1}>{card.title}</Text>
        {card.customers?.company_name && <Text style={styles.contextCardSub}>{card.customers.company_name}</Text>}
      </View>

      <Text style={styles.fieldLabel}>SORUN NE?</Text>
      <TextInput
        style={[styles.textInput, { minHeight: 100 }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Malzeme eksik, müşteri ulaşılamıyor, teknik sorun..."
        placeholderTextColor={colors.muted}
        multiline
        textAlignVertical="top"
        autoFocus
      />

      <TouchableOpacity
        style={[styles.toggleRow, makeUrgent && styles.toggleRowActive]}
        onPress={() => setMakeUrgent(!makeUrgent)}
        activeOpacity={0.7}
      >
        <View style={[styles.radioBtn, makeUrgent && styles.radioBtnActive]}>
          {makeUrgent && <View style={styles.radioDot} />}
        </View>
        <View>
          <Text style={styles.toggleLabel}>Acile yükselt</Text>
          <Text style={styles.toggleSub}>Kart önceliği ⚡ Acil yapılır, ekip uyarılır</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>💬 Sohbette tüm ekibe anlık bildirim gider</Text>
      </View>
      <TouchableOpacity
        style={[styles.sendBtn, styles.sendBtnDanger, saving && styles.sendBtnDisabled]}
        onPress={handle} disabled={saving}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendBtnText}>🚨 Sorunu Bildir</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  4. 📅 RANDEVU AYARLA
// ─────────────────────────────────────────────────────────────────
function AppointmentScreen({ card, actorName, onClose }: any) {
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(!!card.customers?.phone);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const customer = card.customers;

  const getTargetDate = (hours: number): Date => {
    const d = new Date();
    if (hours === 24) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    else { d.setHours(d.getHours() + hours); }
    return d;
  };

  const handle = async () => {
    if (selectedChip === null) { Alert.alert('Tarih', 'Randevu zamanını seçin.'); return; }
    setSaving(true);
    const chip = DATE_CHIPS[selectedChip];
    const targetDate = getTargetDate(chip.hours);
    const dateStr = targetDate.toLocaleString('tr-TR', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });

    try {
      await logActivity({
        cardId: card.id, actorName, type: 'appointment',
        text: `randevu ayarladı — ${dateStr}${note ? ` · "${note}"` : ''}`,
        meta: { date: targetDate.toISOString(), note },
      });

      // WhatsApp onay mesajı gönder
      if (sendWhatsApp && customer?.phone) {
        const name = customer.contact_name ? customer.contact_name.split(' ')[0] : 'Sayın müşterimiz';
        const msg = `${name}, randevunuz ${dateStr} olarak ayarlanmıştır.${note ? '\n\n' + note : ''}\n\nLütfen uygun olup olmadığını bildiriniz. 🗓️`;
        const phone = customer.phone.replace(/\s/g, '').replace(/^0/, '90');
        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
        Linking.canOpenURL(url).then(can => { if (can) Linking.openURL(url); });
      }

      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  if (done) return <SuccessScreen emoji="📅" title="Randevu Ayarlandı" sub="Sohbette kaydedildi" />;

  const selectedDate = selectedChip !== null ? getTargetDate(DATE_CHIPS[selectedChip].hours) : null;

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>📅 Randevu Ayarla</Text>
      {customer && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientInitials}>{customer.company_name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.recipientName}>{customer.company_name}</Text>
            {customer.contact_name && <Text style={styles.recipientContact}>{customer.contact_name}</Text>}
          </View>
        </View>
      )}

      <Text style={styles.fieldLabel}>RANDEVU ZAMANI</Text>
      <View style={styles.chipRow}>
        {DATE_CHIPS.map((chip, i) => {
          const d = getTargetDate(chip.hours);
          const timeStr = d.toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dateChip, selectedChip === i && styles.dateChipSelected]}
              onPress={() => setSelectedChip(i)}
            >
              <Text style={[styles.dateChipLabel, selectedChip === i && styles.dateChipLabelSelected]}>{chip.label}</Text>
              <Text style={[styles.dateChipSub, selectedChip === i && styles.dateChipSubSelected]}>{timeStr}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>NOT (opsiyonel)</Text>
      <TextInput
        style={styles.textInput}
        value={note}
        onChangeText={setNote}
        placeholder="Keşif, montaj, teknik servis..."
        placeholderTextColor={colors.muted}
        multiline
      />

      {customer?.phone && (
        <TouchableOpacity
          style={[styles.toggleRow, sendWhatsApp && styles.toggleRowActive]}
          onPress={() => setSendWhatsApp(!sendWhatsApp)}
          activeOpacity={0.7}
        >
          <View style={[styles.radioBtn, sendWhatsApp && styles.radioBtnActive]}>
            {sendWhatsApp && <View style={styles.radioDot} />}
          </View>
          <View>
            <Text style={styles.toggleLabel}>💬 WhatsApp onayı gönder</Text>
            <Text style={styles.toggleSub}>{customer.contact_name || customer.company_name} · {customer.phone}</Text>
          </View>
        </TouchableOpacity>
      )}

      {selectedDate && (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>
            📅 <Text style={{ fontWeight: '700' }}>
              {selectedDate.toLocaleString('tr-TR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.sendBtn, saving && styles.sendBtnDisabled, selectedChip === null && styles.sendBtnDisabled]}
        onPress={handle} disabled={saving || selectedChip === null}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendBtnText}>📅 Randevuyu Kaydet</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  5. 📍 YERİNDEYİM
// ─────────────────────────────────────────────────────────────────
function CheckinScreen({ card, actorName, onClose }: any) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const customer = card.customers;

  const handle = async () => {
    setSaving(true);
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    try {
      await logActivity({
        cardId: card.id, actorName, type: 'checkin',
        text: `sahaya girdi — ${now}${customer?.company_name ? ' @ ' + customer.company_name : ''}${note ? ` · "${note}"` : ''}`,
        meta: { time: new Date().toISOString(), note, location: customer?.company_name },
      });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally { setSaving(false); }
  };

  if (done) return <SuccessScreen emoji="📍" title="Check-in Yapıldı!" sub={`Ekip saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} gidin bildi`} />;

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>📍 Yerindeyim</Text>
      {customer && (
        <View style={styles.contextCard}>
          <Text style={styles.contextCardTitle}>{customer.company_name}</Text>
          {customer.contact_name && <Text style={styles.contextCardSub}>{customer.contact_name}</Text>}
        </View>
      )}
      <View style={styles.checkinTime}>
        <Text style={styles.checkinTimeText}>
          {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.checkinDate}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>
      <Text style={styles.fieldLabel}>NOT (opsiyonel)</Text>
      <TextInput
        style={styles.textInput}
        value={note}
        onChangeText={setNote}
        placeholder="Keşif başladı, montaj devam ediyor, teslim..."
        placeholderTextColor={colors.muted}
        multiline
      />
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>💬 Ekip sahaya girdiğini anlık görecek</Text>
      </View>
      <TouchableOpacity style={[styles.sendBtn, saving && styles.sendBtnDisabled]} onPress={handle} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendBtnText}>📍 Check-in Yap</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  6. ⏰ HATIRLATMA
// ─────────────────────────────────────────────────────────────────
function ReminderScreen({ card, actorName, onClose, onCardUpdated }: any) {
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [note, setNote] = useState(card.title);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const getTargetDate = (hours: number): Date => {
    const d = new Date();
    if (hours === 24) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    else { d.setHours(d.getHours() + hours); }
    return d;
  };

  const handle = async () => {
    if (selectedChip === null) { Alert.alert('Tarih Seçin', 'Hatırlatma zamanını seçin.'); return; }
    setSaving(true);
    const targetDate = getTargetDate(DATE_CHIPS[selectedChip].hours);
    const notifId = await scheduleReminder(
      `⏰ ${note}`,
      card.customers?.company_name ? `${card.title} · ${card.customers.company_name}` : card.title,
      targetDate
    );
    if (notifId) {
      await logActivity({
        cardId: card.id, actorName, type: 'reminder_set',
        text: `hatırlatma kurdu — "${note}" · ${targetDate.toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
        meta: { date: targetDate.toISOString(), note },
      });
      onCardUpdated?.();
      setDone(true);
      setTimeout(onClose, 2000);
    }
    setSaving(false);
  };

  const selectedDate = selectedChip !== null ? getTargetDate(DATE_CHIPS[selectedChip].hours) : null;
  if (done) return <SuccessScreen emoji="⏰" title="Hatırlatma Kuruldu!" sub={selectedDate?.toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} />;

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>⏰ Hatırlatma Kur</Text>
      <View style={styles.contextCard}>
        <Text style={styles.contextCardTitle} numberOfLines={2}>{card.title}</Text>
        {card.customers?.company_name && <Text style={styles.contextCardSub}>{card.customers.company_name}</Text>}
      </View>
      <Text style={styles.fieldLabel}>NE ZAMAN?</Text>
      <View style={styles.chipRow}>
        {DATE_CHIPS.map((chip, i) => {
          const d = getTargetDate(chip.hours);
          const timeStr = d.toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dateChip, selectedChip === i && styles.dateChipSelected]}
              onPress={() => setSelectedChip(i)}
            >
              <Text style={[styles.dateChipLabel, selectedChip === i && styles.dateChipLabelSelected]}>{chip.label}</Text>
              <Text style={[styles.dateChipSub, selectedChip === i && styles.dateChipSubSelected]}>{timeStr}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.fieldLabel}>HATIRLATMA NOTU</Text>
      <TextInput
        style={styles.textInput}
        value={note}
        onChangeText={setNote}
        placeholder="Hatırlatma başlığı..."
        placeholderTextColor={colors.muted}
        multiline
      />
      {selectedDate && (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>
            📲 <Text style={{ fontWeight: '700' }}>
              {selectedDate.toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </Text>{' '}için bildirim
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.sendBtn, (saving || selectedChip === null) && styles.sendBtnDisabled]}
        onPress={handle} disabled={saving || selectedChip === null}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendBtnText}>⏰ Hatırlatmayı Kur</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  7. 📧 E-POSTA
// ─────────────────────────────────────────────────────────────────
function EmailScreen({ card, actorName, onClose }: any) {
  const customer = card.customers;
  const initial = generateEmail(card);
  const [to, setTo] = useState(customer?.email || '');
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    setEnhancing(true);
    const result = await enhanceWithVoxi(`Bu e-postayı daha profesyonel ve ikna edici hale getir. Sadece e-posta metnini döndür.\n\nKonu: ${subject}\n\n${body}`);
    if (result) setBody(result);
    else Alert.alert('Hata', 'VOXI bağlanamadı, kendiniz düzenleyebilirsiniz.');
    setEnhancing(false);
  };

  const handleSend = async () => {
    if (!to) { Alert.alert('Alıcı', 'E-posta adresi girin.'); return; }
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
    await logActivity({ cardId: card.id, actorName, type: 'email_sent', text: `e-posta gönderdi → ${to}`, meta: { to, subject } });
    onClose();
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>📧 E-posta Gönder</Text>
        <TouchableOpacity style={[styles.enhanceBtn, enhancing && styles.enhanceBtnLoading]} onPress={handleEnhance} disabled={enhancing}>
          {enhancing ? <ActivityIndicator size="small" color={colors.dark} /> : <Text style={styles.enhanceBtnText}>✨ VOXI</Text>}
        </TouchableOpacity>
      </View>
      {customer && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientInitials}>{customer.company_name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View><Text style={styles.recipientName}>{customer.company_name}</Text>
          {customer.contact_name && <Text style={styles.recipientContact}>{customer.contact_name}</Text>}</View>
        </View>
      )}
      <Text style={styles.fieldLabel}>ALICI</Text>
      <TextInput style={styles.textInputSingle} value={to} onChangeText={setTo} placeholder="ornek@firma.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.fieldLabel}>KONU</Text>
      <TextInput style={styles.textInputSingle} value={subject} onChangeText={setSubject} placeholder="Konu..." placeholderTextColor={colors.muted} />
      <Text style={styles.fieldLabel}>İÇERİK</Text>
      <TextInput style={[styles.textInput, { minHeight: 160 }]} value={body} onChangeText={setBody} placeholder="E-posta içeriği..." placeholderTextColor={colors.muted} multiline textAlignVertical="top" />
      <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
        <Text style={styles.sendBtnText}>📧 E-posta Uygulamasını Aç</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  8. 💬 WHATSAPP
// ─────────────────────────────────────────────────────────────────
function WhatsAppScreen({ card, actorName, onClose }: any) {
  const customer = card.customers;
  const [phone, setPhone] = useState(customer?.phone?.replace(/\s/g, '') || '');
  const [message, setMessage] = useState(generateWhatsApp(card));
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    setEnhancing(true);
    const result = await enhanceWithVoxi(`Bu WhatsApp mesajını daha samimi ve kısa tut, emoji kullan, sadece mesaj metnini döndür:\n\n${message}`);
    if (result) setMessage(result);
    setEnhancing(false);
  };

  const handleSend = async () => {
    const clean = phone.replace(/\s|\+|-/g, '');
    if (!clean) { Alert.alert('Numara', 'Telefon numarası girin.'); return; }
    const intl = clean.startsWith('0') ? '90' + clean.slice(1) : clean;
    const url = `whatsapp://send?phone=${intl}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(can => {
      if (can) {
        Linking.openURL(url);
        logActivity({ cardId: card.id, actorName, type: 'whatsapp_sent', text: `WhatsApp mesajı gönderdi → ${phone}`, meta: { phone } });
        onClose();
      } else {
        Alert.alert('WhatsApp Bulunamadı', 'Cihazınızda WhatsApp yüklü değil.');
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>💬 WhatsApp</Text>
        <TouchableOpacity style={[styles.enhanceBtn, enhancing && styles.enhanceBtnLoading]} onPress={handleEnhance} disabled={enhancing}>
          {enhancing ? <ActivityIndicator size="small" color={colors.dark} /> : <Text style={styles.enhanceBtnText}>✨ VOXI</Text>}
        </TouchableOpacity>
      </View>
      {customer && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}><Text style={styles.recipientInitials}>{customer.company_name.slice(0, 2).toUpperCase()}</Text></View>
          <View><Text style={styles.recipientName}>{customer.company_name}</Text>
          {customer.contact_name && <Text style={styles.recipientContact}>{customer.contact_name}</Text>}</View>
        </View>
      )}
      <Text style={styles.fieldLabel}>TELEFON</Text>
      <TextInput style={styles.textInputSingle} value={phone} onChangeText={setPhone} placeholder="0532 111 22 33" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
      <Text style={styles.fieldLabel}>MESAJ</Text>
      <TextInput style={[styles.textInput, { minHeight: 150 }]} value={message} onChangeText={setMessage} placeholder="Mesaj..." placeholderTextColor={colors.muted} multiline textAlignVertical="top" />
      <View style={styles.charCount}><Text style={styles.charCountText}>{message.length} karakter</Text></View>
      <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
        <Text style={styles.sendBtnText}>💬 WhatsApp'ta Aç</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  9. 📱 SMS
// ─────────────────────────────────────────────────────────────────
function SMSScreen({ card, actorName, onClose }: any) {
  const customer = card.customers;
  const [phone, setPhone] = useState(customer?.phone || '');
  const [message, setMessage] = useState(generateSMS(card));

  const handleSend = async () => {
    if (!phone) { Alert.alert('Numara', 'Telefon numarası girin.'); return; }
    const url = Platform.OS === 'ios'
      ? `sms:${phone}&body=${encodeURIComponent(message)}`
      : `sms:${phone}?body=${encodeURIComponent(message)}`;
    Linking.openURL(url);
    await logActivity({ cardId: card.id, actorName, type: 'sms_sent', text: `SMS gönderdi → ${phone}`, meta: { phone } });
    onClose();
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>📱 SMS Gönder</Text>
      {customer && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}><Text style={styles.recipientInitials}>{customer.company_name.slice(0, 2).toUpperCase()}</Text></View>
          <View><Text style={styles.recipientName}>{customer.company_name}</Text>
          {customer.contact_name && <Text style={styles.recipientContact}>{customer.contact_name}</Text>}</View>
        </View>
      )}
      <Text style={styles.fieldLabel}>TELEFON</Text>
      <TextInput style={styles.textInputSingle} value={phone} onChangeText={setPhone} placeholder="0532 111 22 33" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
      <Text style={styles.fieldLabel}>MESAJ</Text>
      <TextInput style={[styles.textInput, { minHeight: 120 }]} value={message} onChangeText={setMessage} placeholder="SMS içeriği..." placeholderTextColor={colors.muted} multiline textAlignVertical="top" />
      <View style={styles.charCount}>
        <Text style={[styles.charCountText, message.length > 160 && { color: '#FF3B30' }]}>
          {message.length} karakter {message.length > 160 ? '(2 SMS)' : '(1 SMS)'}
        </Text>
      </View>
      <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
        <Text style={styles.sendBtnText}>📱 SMS Uygulamasını Aç</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '93%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14, shadowRadius: 24, elevation: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.disabled, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  screenContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, gap: 12 },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: colors.dark },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.8, marginTop: 4 },
  textInput: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.dark, lineHeight: 22 },
  textInputSingle: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 14, height: 48, fontSize: 15, color: colors.dark },
  amountInput: { fontSize: 28, fontWeight: '700', textAlign: 'center', height: 64, letterSpacing: 1 },
  sendBtn: { backgroundColor: colors.dark, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  sendBtnDanger: { backgroundColor: '#FF3B30' },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  enhanceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  enhanceBtnLoading: { opacity: 0.6 },
  enhanceBtnText: { fontSize: 12, fontWeight: '700', color: colors.dark },
  charCount: { alignItems: 'flex-end' },
  charCountText: { fontSize: 12, color: colors.muted },
  recipientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  recipientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  recipientInitials: { fontSize: 13, fontWeight: '700', color: colors.text },
  recipientName: { fontSize: 15, fontWeight: '600', color: colors.dark },
  recipientContact: { fontSize: 13, color: colors.muted, marginTop: 1 },
  contextCard: { backgroundColor: colors.bg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  contextCardTitle: { fontSize: 15, fontWeight: '600', color: colors.dark },
  contextCardSub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: { flex: 1, minWidth: '45%', backgroundColor: colors.bg, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.border },
  dateChipSelected: { borderColor: colors.dark, backgroundColor: colors.dark },
  dateChipLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
  dateChipLabelSelected: { color: '#FFF' },
  dateChipSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  dateChipSubSelected: { color: 'rgba(255,255,255,0.7)' },
  previewBanner: { backgroundColor: '#F0EDE8', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  previewBannerText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  infoBox: { backgroundColor: '#F5F3EF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border },
  infoBoxText: { fontSize: 13, color: colors.text },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.bg, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: colors.border },
  toggleRowActive: { borderColor: colors.dark },
  radioBtn: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioBtnActive: { borderColor: colors.dark },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.dark },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.dark },
  toggleSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  checkinTime: { alignItems: 'center', paddingVertical: 20, backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  checkinTimeText: { fontSize: 48, fontWeight: '800', color: colors.dark },
  checkinDate: { fontSize: 14, color: colors.muted, marginTop: 4 },
  successScreen: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24 },
  successEmoji: { fontSize: 60, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.dark, marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  successHint: { fontSize: 13, color: colors.muted, marginTop: 12, opacity: 0.7 },
});
