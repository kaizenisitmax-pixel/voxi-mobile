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
import type { Card } from '../hooks/useCards';

// ─── Bildirim izin yapılandırması ────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Tipler ──────────────────────────────────────────────────────
export type ActionType = 'proposal' | 'reminder' | 'email' | 'whatsapp' | 'sms';

type Props = {
  visible: boolean;
  actionType: ActionType;
  card: Card;
  onClose: () => void;
  onSaved?: () => void;
};

// ─── Tarih chip'leri ──────────────────────────────────────────────
const DATE_CHIPS = [
  { label: 'Bugün', hours: 1 },
  { label: 'Yarın 09:00', hours: 24 },
  { label: '3 Gün Sonra', hours: 72 },
  { label: '1 Hafta', hours: 168 },
];

// ─── Kart bağlamından mesaj şablonu üret ─────────────────────────
function buildContext(card: Card): string {
  const customer = card.customers;
  const parts: string[] = [];
  if (card.title) parts.push(`Konu: ${card.title}`);
  if (card.description) parts.push(card.description);
  if (card.ai_summary) parts.push(`Özet: ${card.ai_summary}`);
  if (customer?.company_name) parts.push(`Firma: ${customer.company_name}`);
  if (customer?.contact_name) parts.push(`İlgili: ${customer.contact_name}`);
  return parts.join('\n');
}

function generateEmail(card: Card): { subject: string; body: string } {
  const customer = card.customers;
  const name = customer?.contact_name || customer?.company_name || 'Sayın İlgili';
  const subject = `${card.title} hakkında`;
  const body = `Sayın ${name},\n\n${card.title} konusunda sizinle paylaşmak istediğim bilgiler için bu e-postayı gönderiyorum.\n\n${card.description ? card.description + '\n\n' : ''}${card.ai_summary ? card.ai_summary + '\n\n' : ''}Konuyu değerlendirip geri dönmenizi rica ederim.\n\nSaygılarımla`;
  return { subject, body };
}

function generateWhatsApp(card: Card): string {
  const customer = card.customers;
  const name = customer?.contact_name ? customer.contact_name.split(' ')[0] : 'Merhaba';
  return `${name}, iyi günler 👋\n\n*${card.title}* konusunda sizi aramak istiyordum.${card.description ? '\n\n' + card.description : ''}\n\nUygun bir vakit var mı?`;
}

function generateSMS(card: Card): string {
  const customer = card.customers;
  const name = customer?.contact_name ? customer.contact_name.split(' ')[0] : '';
  return `${name ? name + ', ' : ''}${card.title} konusunda sizi arayacağım. Uygun bir vakit bildirir misiniz?`;
}

function generateProposal(card: Card): string {
  const customer = card.customers;
  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return `TEKLİF FORMU
─────────────────────────────────

Tarih: ${today}
Konu: ${card.title}

${customer ? `MÜŞTERİ BİLGİLERİ
Firma: ${customer.company_name}
${customer.contact_name ? 'İlgili: ' + customer.contact_name : ''}
${customer.phone ? 'Tel: ' + customer.phone : ''}
${customer.email ? 'E-posta: ' + customer.email : ''}

` : ''}KAPSAM VE TANIM
${card.description || card.title}

${card.ai_summary ? 'PROJE ÖZETİ\n' + card.ai_summary + '\n' : ''}
─────────────────────────────────
Fiyat bilgisi ve detaylı teklifimiz için lütfen iletişime geçiniz.

Bu teklif hazırlanma tarihinden itibaren 30 gün geçerlidir.`;
}

// ─── Bildirim izni al ─────────────────────────────────────────────
async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Lokal bildirim planla ────────────────────────────────────────
async function scheduleReminder(title: string, body: string, date: Date): Promise<string | null> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    Alert.alert(
      'Bildirim İzni',
      'Hatırlatmalar için bildirim iznine ihtiyacımız var. Lütfen Ayarlar > VOXI bölümünden izin verin.',
      [{ text: 'Tamam' }]
    );
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { type: 'reminder' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
  return id;
}

// ─────────────────────────────────────────────────────────────────
//  ANA MODAL BİLEŞENİ
// ─────────────────────────────────────────────────────────────────
export default function ActionModal({ visible, actionType, card, onClose, onSaved }: Props) {
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600, duration: 250, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const renderContent = () => {
    switch (actionType) {
      case 'reminder': return <ReminderScreen card={card} onClose={onClose} onSaved={onSaved} />;
      case 'email':    return <EmailScreen card={card} onClose={onClose} />;
      case 'whatsapp': return <WhatsAppScreen card={card} onClose={onClose} />;
      case 'sms':      return <SMSScreen card={card} onClose={onClose} />;
      case 'proposal': return <ProposalScreen card={card} onClose={onClose} />;
      default:         return null;
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
//  1. HATIRLATMA EKRANI
// ─────────────────────────────────────────────────────────────────
function ReminderScreen({ card, onClose, onSaved }: { card: Card; onClose: () => void; onSaved?: () => void }) {
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [note, setNote] = useState(card.title);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getTargetDate = (hours: number): Date => {
    const d = new Date();
    if (hours === 24) {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hours);
    }
    return d;
  };

  const handleSave = async () => {
    if (selectedChip === null) {
      Alert.alert('Tarih Seçin', 'Hatırlatma zamanını seçin.');
      return;
    }
    setSaving(true);
    const chip = DATE_CHIPS[selectedChip];
    const targetDate = getTargetDate(chip.hours);

    const notifId = await scheduleReminder(
      `⏰ ${note}`,
      `Kart: ${card.title}${card.customers?.company_name ? ' · ' + card.customers.company_name : ''}`,
      targetDate
    );

    if (notifId) {
      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 1800);
    }
    setSaving(false);
  };

  const selectedDate = selectedChip !== null
    ? getTargetDate(DATE_CHIPS[selectedChip].hours)
    : null;

  if (saved) {
    return (
      <View style={styles.successScreen}>
        <Text style={styles.successEmoji}>⏰</Text>
        <Text style={styles.successTitle}>Hatırlatma Kuruldu!</Text>
        <Text style={styles.successSub}>
          {selectedDate?.toLocaleString('tr-TR', {
            weekday: 'long', day: 'numeric', month: 'long',
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>⏰ Hatırlatma Kur</Text>

      {/* Kart özeti */}
      <View style={styles.contextCard}>
        <Text style={styles.contextCardTitle} numberOfLines={2}>{card.title}</Text>
        {card.customers?.company_name && (
          <Text style={styles.contextCardSub}>{card.customers.company_name}</Text>
        )}
      </View>

      <Text style={styles.fieldLabel}>NE ZAMAN?</Text>
      <View style={styles.chipRow}>
        {DATE_CHIPS.map((chip, i) => {
          const d = getTargetDate(chip.hours);
          const timeStr = d.toLocaleString('tr-TR', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
          });
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dateChip, selectedChip === i && styles.dateChipSelected]}
              onPress={() => setSelectedChip(i)}
            >
              <Text style={[styles.dateChipLabel, selectedChip === i && styles.dateChipLabelSelected]}>
                {chip.label}
              </Text>
              <Text style={[styles.dateChipSub, selectedChip === i && styles.dateChipSubSelected]}>
                {timeStr}
              </Text>
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

      {selectedChip !== null && (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>
            📲 "{note}" için{' '}
            <Text style={{ fontWeight: '700' }}>
              {selectedDate?.toLocaleString('tr-TR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            {' '}bildirim gelecek
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.sendBtn, saving && styles.sendBtnDisabled, selectedChip === null && styles.sendBtnDisabled]}
        onPress={handleSave}
        disabled={saving || selectedChip === null}
      >
        {saving
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.sendBtnText}>⏰ Hatırlatmayı Kur</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  2. E-POSTA EKRANI
// ─────────────────────────────────────────────────────────────────
function EmailScreen({ card, onClose }: { card: Card; onClose: () => void }) {
  const customer = card.customers;
  const initial = generateEmail(card);
  const [to, setTo] = useState(customer?.email || '');
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhanceWithVoxi = async () => {
    setEnhancing(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const WEB_API = 'https://voxi-web-production.vercel.app';
      const res = await fetch(`${WEB_API}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Aşağıdaki e-postayı daha profesyonel ve ikna edici hale getir. Sadece e-posta metnini döndür, açıklama ekleme.\n\nKonu: ${subject}\n\n${body}`,
          }],
          teamId: 'current',
          workspaceId: 'current',
        }),
      });
      const data = await res.json();
      if (data.message) setBody(data.message);
    } catch {
      Alert.alert('Hata', 'VOXI şu an bağlanamıyor, metni kendiniz düzenleyebilirsiniz.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleSend = () => {
    if (!to) {
      Alert.alert('E-posta Adresi', 'Lütfen alıcı e-posta adresini girin.');
      return;
    }
    const mailUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailUrl);
    onClose();
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>📧 E-posta Gönder</Text>
        <TouchableOpacity
          style={[styles.enhanceBtn, enhancing && styles.enhanceBtnLoading]}
          onPress={handleEnhanceWithVoxi}
          disabled={enhancing}
        >
          {enhancing
            ? <ActivityIndicator size="small" color={colors.dark} />
            : <Text style={styles.enhanceBtnText}>✨ VOXI ile İyileştir</Text>
          }
        </TouchableOpacity>
      </View>

      {customer && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientInitials}>
              {customer.company_name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.recipientName}>{customer.company_name}</Text>
            {customer.contact_name && (
              <Text style={styles.recipientContact}>{customer.contact_name}</Text>
            )}
          </View>
        </View>
      )}

      <Text style={styles.fieldLabel}>ALICI</Text>
      <TextInput
        style={styles.textInputSingle}
        value={to}
        onChangeText={setTo}
        placeholder="ornek@firma.com"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>KONU</Text>
      <TextInput
        style={styles.textInputSingle}
        value={subject}
        onChangeText={setSubject}
        placeholder="E-posta konusu..."
        placeholderTextColor={colors.muted}
      />

      <Text style={styles.fieldLabel}>İÇERİK</Text>
      <TextInput
        style={[styles.textInput, { minHeight: 180 }]}
        value={body}
        onChangeText={setBody}
        placeholder="E-posta içeriği..."
        placeholderTextColor={colors.muted}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
        <Text style={styles.sendBtnText}>📧 E-posta Uygulamasını Aç</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  3. WHATSAPP EKRANI
// ─────────────────────────────────────────────────────────────────
function WhatsAppScreen({ card, onClose }: { card: Card; onClose: () => void }) {
  const customer = card.customers;
  const [phone, setPhone] = useState(customer?.phone?.replace(/\s/g, '') || '');
  const [message, setMessage] = useState(generateWhatsApp(card));
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhanceWithVoxi = async () => {
    setEnhancing(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const WEB_API = 'https://voxi-web-production.vercel.app';
      const res = await fetch(`${WEB_API}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Bu WhatsApp mesajını daha samimi ve etkili hale getir. Kısa tut, emoji kullan, sadece mesaj metnini döndür.\n\n${message}`,
          }],
          teamId: 'current',
          workspaceId: 'current',
        }),
      });
      const data = await res.json();
      if (data.message) setMessage(data.message);
    } catch {
      Alert.alert('Hata', 'VOXI şu an bağlanamıyor.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleSend = () => {
    const cleanPhone = phone.replace(/\s|\+|-/g, '');
    if (!cleanPhone) {
      Alert.alert('Telefon Numarası', 'Lütfen telefon numarasını girin.');
      return;
    }
    const intlPhone = cleanPhone.startsWith('0') ? '90' + cleanPhone.slice(1) : cleanPhone;
    const url = `whatsapp://send?phone=${intlPhone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(canOpen => {
      if (canOpen) {
        Linking.openURL(url);
        onClose();
      } else {
        Alert.alert('WhatsApp Bulunamadı', 'Cihazınızda WhatsApp yüklü değil.');
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>💬 WhatsApp Gönder</Text>
        <TouchableOpacity
          style={[styles.enhanceBtn, enhancing && styles.enhanceBtnLoading]}
          onPress={handleEnhanceWithVoxi}
          disabled={enhancing}
        >
          {enhancing
            ? <ActivityIndicator size="small" color={colors.dark} />
            : <Text style={styles.enhanceBtnText}>✨ VOXI ile İyileştir</Text>
          }
        </TouchableOpacity>
      </View>

      {customer && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientInitials}>
              {customer.company_name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.recipientName}>{customer.company_name}</Text>
            {customer.contact_name && (
              <Text style={styles.recipientContact}>{customer.contact_name}</Text>
            )}
          </View>
        </View>
      )}

      <Text style={styles.fieldLabel}>TELEFON NUMARASI</Text>
      <TextInput
        style={styles.textInputSingle}
        value={phone}
        onChangeText={setPhone}
        placeholder="0532 111 22 33"
        placeholderTextColor={colors.muted}
        keyboardType="phone-pad"
      />

      <Text style={styles.fieldLabel}>MESAJ</Text>
      <TextInput
        style={[styles.textInput, { minHeight: 160 }]}
        value={message}
        onChangeText={setMessage}
        placeholder="WhatsApp mesajı..."
        placeholderTextColor={colors.muted}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.charCount}>
        <Text style={styles.charCountText}>{message.length} karakter</Text>
      </View>

      <TouchableOpacity style={[styles.sendBtn, styles.sendBtnWhatsApp]} onPress={handleSend}>
        <Text style={styles.sendBtnText}>💬 WhatsApp'ta Aç</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
//  4. SMS EKRANI
// ─────────────────────────────────────────────────────────────────
function SMSScreen({ card, onClose }: { card: Card; onClose: () => void }) {
  const customer = card.customers;
  const [phone, setPhone] = useState(customer?.phone || '');
  const [message, setMessage] = useState(generateSMS(card));

  const handleSend = () => {
    if (!phone) {
      Alert.alert('Telefon Numarası', 'Lütfen telefon numarasını girin.');
      return;
    }
    const url = Platform.OS === 'ios'
      ? `sms:${phone}&body=${encodeURIComponent(message)}`
      : `sms:${phone}?body=${encodeURIComponent(message)}`;
    Linking.openURL(url);
    onClose();
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>📱 SMS Gönder</Text>

      {customer && (
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientInitials}>
              {customer.company_name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.recipientName}>{customer.company_name}</Text>
            {customer.contact_name && (
              <Text style={styles.recipientContact}>{customer.contact_name}</Text>
            )}
          </View>
        </View>
      )}

      <Text style={styles.fieldLabel}>TELEFON NUMARASI</Text>
      <TextInput
        style={styles.textInputSingle}
        value={phone}
        onChangeText={setPhone}
        placeholder="0532 111 22 33"
        placeholderTextColor={colors.muted}
        keyboardType="phone-pad"
      />

      <Text style={styles.fieldLabel}>MESAJ</Text>
      <TextInput
        style={[styles.textInput, { minHeight: 120 }]}
        value={message}
        onChangeText={setMessage}
        placeholder="SMS içeriği..."
        placeholderTextColor={colors.muted}
        multiline
        textAlignVertical="top"
      />

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

// ─────────────────────────────────────────────────────────────────
//  5. TEKLİF EKRANI
// ─────────────────────────────────────────────────────────────────
function ProposalScreen({ card, onClose }: { card: Card; onClose: () => void }) {
  const [proposal, setProposal] = useState(generateProposal(card));
  const [enhancing, setEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEnhanceWithVoxi = async () => {
    setEnhancing(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const WEB_API = 'https://voxi-web-production.vercel.app';
      const context = buildContext(card);
      const res = await fetch(`${WEB_API}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Aşağıdaki kart bilgilerini kullanarak profesyonel bir iş teklifi hazırla. Türkçe, resmi dil kullan. Fiyat alanını boş bırak (müşteriye göre doldurulsun). Sadece teklif metnini döndür.\n\nKART BİLGİLERİ:\n${context}`,
          }],
          teamId: 'current',
          workspaceId: 'current',
        }),
      });
      const data = await res.json();
      if (data.message) setProposal(data.message);
    } catch {
      Alert.alert('Hata', 'VOXI şu an bağlanamıyor.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleCopy = () => {
    Clipboard.setString(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const whatsAppUrl = `whatsapp://send?text=${encodeURIComponent(proposal)}`;
    Linking.canOpenURL(whatsAppUrl).then(can => {
      if (can) Linking.openURL(whatsAppUrl);
      else {
        Clipboard.setString(proposal);
        Alert.alert('Kopyalandı', 'Teklif panoya kopyalandı. İstediğiniz uygulamaya yapıştırabilirsiniz.');
      }
    });
  };

  return (
    <View style={styles.proposalContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>📋 Teklif Oluştur</Text>
        <TouchableOpacity
          style={[styles.enhanceBtn, enhancing && styles.enhanceBtnLoading]}
          onPress={handleEnhanceWithVoxi}
          disabled={enhancing}
        >
          {enhancing
            ? <ActivityIndicator size="small" color={colors.dark} />
            : <Text style={styles.enhanceBtnText}>✨ VOXI ile Geliştir</Text>
          }
        </TouchableOpacity>
      </View>

      {enhancing && (
        <View style={styles.enhancingBanner}>
          <Text style={styles.enhancingText}>VOXI teklifi hazırlıyor...</Text>
        </View>
      )}

      <ScrollView style={styles.proposalScroll} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.proposalInput}
          value={proposal}
          onChangeText={setProposal}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </ScrollView>

      <View style={styles.proposalActions}>
        <TouchableOpacity style={styles.proposalActionBtn} onPress={handleCopy}>
          <Text style={styles.proposalActionIcon}>{copied ? '✅' : '📋'}</Text>
          <Text style={styles.proposalActionLabel}>{copied ? 'Kopyalandı!' : 'Kopyala'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.proposalActionBtn, styles.proposalActionBtnPrimary]} onPress={handleShare}>
          <Text style={styles.proposalActionIcon}>💬</Text>
          <Text style={[styles.proposalActionLabel, { color: '#FFF' }]}>WhatsApp'a Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.disabled, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },

  // ─ Ortak ─
  screenContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 12 },
  screenHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  screenTitle: { fontSize: 20, fontWeight: '800', color: colors.dark },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.muted,
    letterSpacing: 0.8, marginTop: 4,
  },
  textInput: {
    backgroundColor: colors.bg, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.dark, lineHeight: 22,
  },
  textInputSingle: {
    backgroundColor: colors.bg, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 14, height: 48,
    fontSize: 15, color: colors.dark,
  },
  sendBtn: {
    backgroundColor: colors.dark, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  sendBtnWhatsApp: { backgroundColor: '#1A1A1A' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  enhanceBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  enhanceBtnLoading: { opacity: 0.6 },
  enhanceBtnText: { fontSize: 12, fontWeight: '700', color: colors.dark },
  charCount: { alignItems: 'flex-end' },
  charCountText: { fontSize: 12, color: colors.muted },

  // ─ Alıcı kartı ─
  recipientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bg, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  recipientAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center',
  },
  recipientInitials: { fontSize: 13, fontWeight: '700', color: colors.text },
  recipientName: { fontSize: 15, fontWeight: '600', color: colors.dark },
  recipientContact: { fontSize: 13, color: colors.muted, marginTop: 1 },

  // ─ Bağlam kartı ─
  contextCard: {
    backgroundColor: colors.bg, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  contextCardTitle: { fontSize: 15, fontWeight: '600', color: colors.dark },
  contextCardSub: { fontSize: 13, color: colors.muted, marginTop: 3 },

  // ─ Hatırlatma ─
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    flex: 1, minWidth: '45%', backgroundColor: colors.bg,
    borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: colors.border,
  },
  dateChipSelected: { borderColor: colors.dark, backgroundColor: colors.dark },
  dateChipLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
  dateChipLabelSelected: { color: '#FFF' },
  dateChipSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  dateChipSubSelected: { color: 'rgba(255,255,255,0.7)' },
  previewBanner: {
    backgroundColor: '#F0EDE8', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  previewBannerText: { fontSize: 13, color: colors.text, lineHeight: 18 },

  // ─ Başarı ekranı ─
  successScreen: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20,
  },
  successEmoji: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.dark, marginBottom: 8 },
  successSub: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },

  // ─ Geliştirme banner ─
  enhancingBanner: {
    backgroundColor: '#F5F3EF', paddingHorizontal: 20, paddingVertical: 10,
    marginHorizontal: 20, borderRadius: 10, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  enhancingText: { fontSize: 13, color: colors.muted },

  // ─ Teklif ─
  proposalContainer: { flex: 1, paddingBottom: 20 },
  proposalScroll: { maxHeight: 380, marginHorizontal: 20 },
  proposalInput: {
    fontSize: 13, color: colors.text, lineHeight: 20,
    backgroundColor: colors.bg, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, minHeight: 200,
  },
  proposalActions: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 12,
  },
  proposalActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border,
  },
  proposalActionBtnPrimary: { backgroundColor: colors.dark, borderColor: colors.dark },
  proposalActionIcon: { fontSize: 18 },
  proposalActionLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
});
