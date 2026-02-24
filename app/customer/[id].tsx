/**
 * Müşteri Detay Ekranı — Tam Özellikli
 * - Tüm alanlar tıklanabilir + modal ile düzenlenebilir
 * - AI Panel: ses kaydı, fotoğraf, belge, not → alan önerisi → onayla → kaydet
 * - Bağlı kartlar
 */
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Modal, Alert, Linking,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';
import { WEB_API } from '../../lib/ai';

// ─── Tipler ───────────────────────────────────────────────────────
type Customer = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  tax_number: string | null;
  tax_office: string | null;
  iban: string | null;
  invoice_address: string | null;
  shipping_address: string | null;
  shipping_info: string | null;
  payment_info: string | null;
};

const STATUS_OPTS = ['active', 'lead', 'passive', 'lost'];
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif', lead: 'Lead', passive: 'Pasif', lost: 'Kayıp',
};
const CARD_STATUS: Record<string, string> = {
  open: 'Açık', in_progress: 'Devam', done: 'Bitti',
};

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Alan Düzenleme Modal'ı ───────────────────────────────────────
function EditFieldModal({ label, value, onSave, onClose, multiline }: {
  label: string; value: string;
  onSave: (v: string) => void;
  onClose: () => void;
  multiline?: boolean;
}) {
  const [val, setVal] = useState(value);
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={editStyles.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={editStyles.sheet}>
        <View style={editStyles.handle} />
        <Text style={editStyles.title}>{label}</Text>
        <TextInput
          style={[editStyles.input, multiline && editStyles.inputMulti]}
          value={val}
          onChangeText={setVal}
          multiline={multiline}
          autoFocus
          placeholder={`${label} girin…`}
          placeholderTextColor={colors.muted}
        />
        <View style={editStyles.btns}>
          <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose}>
            <Text style={editStyles.cancelText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={editStyles.saveBtn} onPress={() => { onSave(val); onClose(); }}>
            <Text style={editStyles.saveText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  handle:       { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:        { fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: 12 },
  input:        { backgroundColor: colors.bg, borderRadius: 12, padding: 14, fontSize: 15, color: colors.dark, borderWidth: 1, borderColor: colors.borderLight },
  inputMulti:   { minHeight: 100, textAlignVertical: 'top' },
  btns:         { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText:   { fontSize: 15, fontWeight: '600', color: colors.muted },
  saveBtn:      { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.dark, alignItems: 'center' },
  saveText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Düzenlenebilir Satır ─────────────────────────────────────────
function EditRow({ label, value, onEdit, mono }: {
  label: string; value: string | null;
  onEdit: () => void; mono?: boolean;
}) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onEdit} activeOpacity={0.7}>
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.right}>
        <Text style={[rowStyles.value, !value && rowStyles.empty, mono && rowStyles.mono]} numberOfLines={2}>
          {value || 'Ekle…'}
        </Text>
        <Text style={rowStyles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 14, color: colors.muted, width: 120, flexShrink: 0 },
  right: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.dark, textAlign: 'right' },
  empty: { color: colors.muted, fontStyle: 'italic', fontWeight: '400' },
  mono:  { fontSize: 13 },
  arrow: { fontSize: 18, color: colors.muted, marginLeft: 4 },
});

// ─── AI Güncelleme Paneli ─────────────────────────────────────────
function AIUpdatePanel({ entityId, entityType, entityName, onApply }: {
  entityId: string; entityType: 'customer' | 'stakeholder';
  entityName: string; onApply: (fields: Record<string, string>) => void;
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
  const [result, setResult] = useState<{ analysis: string; fields: Record<string, string>; suggested_note: string } | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const callAPI = async (type: string, fileUri?: string, fileType?: string, text?: string) => {
    setState('processing');
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Oturum yok');

      const body: Record<string, string> = { type, entityType, entityName };
      if (text) body.text = text;

      if (fileUri && (type === 'voice' || type === 'photo' || type === 'document')) {
        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' as any });
        body.fileBase64 = base64;
        body.fileType   = fileType || 'image/jpeg';
      }

      const res = await fetch(`${WEB_API}/api/entity-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult({ analysis: data.analysis, fields: data.fields || {}, suggested_note: data.suggested_note || '' });
      setState('result');
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'İşlem başarısız');
      setState('idle');
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setState('recording');
      setRecordSecs(0);
      timerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
    } catch {
      Alert.alert('Hata', 'Mikrofon izni gerekli');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setState('processing');
    if (uri) await callAPI('voice', uri, 'audio/m4a');
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      await callAPI('photo', res.assets[0].uri, res.assets[0].mimeType || 'image/jpeg');
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ base64: false, quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      await callAPI('photo', res.assets[0].uri, res.assets[0].mimeType || 'image/jpeg');
    }
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
    if (!res.canceled && res.assets[0]) {
      await callAPI('document', res.assets[0].uri, res.assets[0].mimeType || 'application/pdf');
    }
  };

  const applyResult = () => {
    if (!result?.fields) return;
    onApply(result.fields);
    setResult(null);
    setState('idle');
  };

  const fmtSecs = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (state === 'recording') {
    return (
      <View style={aiStyles.recordingRow}>
        <View style={aiStyles.recordDot} />
        <Text style={aiStyles.recordTime}>{fmtSecs(recordSecs)}</Text>
        <Text style={aiStyles.recordHint}>Konuşun…</Text>
        <TouchableOpacity style={aiStyles.stopBtn} onPress={stopRecording}>
          <Text style={aiStyles.stopText}>■ Bitir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'processing') {
    return (
      <View style={aiStyles.processingRow}>
        <ActivityIndicator size="small" color={colors.dark} />
        <Text style={aiStyles.processingText}>Claude analiz ediyor…</Text>
      </View>
    );
  }

  if (state === 'result' && result) {
    const fieldEntries = Object.entries(result.fields).filter(([_, v]) => v && String(v).trim());
    return (
      <View style={aiStyles.resultCard}>
        <View style={aiStyles.resultHeader}>
          <Text style={aiStyles.resultTitle}>🤖 AI Tespiti</Text>
          <TouchableOpacity onPress={() => { setResult(null); setState('idle'); }}>
            <Text style={aiStyles.dismiss}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={aiStyles.resultAnalysis}>{result.analysis}</Text>
        {fieldEntries.length > 0 && (
          <View style={aiStyles.fieldsList}>
            {fieldEntries.map(([k, v]) => (
              <View key={k} style={aiStyles.fieldItem}>
                <Text style={aiStyles.fieldKey}>{k}</Text>
                <Text style={aiStyles.fieldVal} numberOfLines={2}>{String(v)}</Text>
              </View>
            ))}
          </View>
        )}
        {result.suggested_note ? (
          <Text style={aiStyles.note}>💬 "{result.suggested_note}"</Text>
        ) : null}
        <View style={aiStyles.resultBtns}>
          <TouchableOpacity style={aiStyles.applyBtn} onPress={applyResult}>
            <Text style={aiStyles.applyText}>✓ Karta Uygula</Text>
          </TouchableOpacity>
          <TouchableOpacity style={aiStyles.skipBtn} onPress={() => { setResult(null); setState('idle'); }}>
            <Text style={aiStyles.skipText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // idle
  return (
    <View style={aiStyles.panel}>
      <Text style={aiStyles.panelTitle}>🤖 AI ile Güncelle</Text>
      <View style={aiStyles.btnRow}>
        <TouchableOpacity style={aiStyles.aiBtn} onPress={startRecording}>
          <Text style={aiStyles.aiBtnIcon}>🎤</Text>
          <Text style={aiStyles.aiBtnLabel}>Ses Kaydı</Text>
        </TouchableOpacity>
        <TouchableOpacity style={aiStyles.aiBtn} onPress={pickPhoto}>
          <Text style={aiStyles.aiBtnIcon}>📸</Text>
          <Text style={aiStyles.aiBtnLabel}>Fotoğraf</Text>
        </TouchableOpacity>
        <TouchableOpacity style={aiStyles.aiBtn} onPress={pickFromGallery}>
          <Text style={aiStyles.aiBtnIcon}>🖼️</Text>
          <Text style={aiStyles.aiBtnLabel}>Galeri</Text>
        </TouchableOpacity>
        <TouchableOpacity style={aiStyles.aiBtn} onPress={pickDocument}>
          <Text style={aiStyles.aiBtnIcon}>📎</Text>
          <Text style={aiStyles.aiBtnLabel}>Belge</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const aiStyles = StyleSheet.create({
  panel:          { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  panelTitle:     { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
  btnRow:         { flexDirection: 'row', gap: 8 },
  aiBtn:          { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  aiBtnIcon:      { fontSize: 22 },
  aiBtnLabel:     { fontSize: 11, fontWeight: '600', color: colors.text },

  recordingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  recordDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recordTime:     { fontSize: 18, fontWeight: '800', color: colors.dark, fontVariant: ['tabular-nums'] },
  recordHint:     { flex: 1, fontSize: 13, color: colors.muted },
  stopBtn:        { backgroundColor: colors.dark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  stopText:       { fontSize: 13, fontWeight: '700', color: '#fff' },

  processingRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  processingText: { fontSize: 14, color: colors.text },

  resultCard:     { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  resultHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTitle:    { fontSize: 14, fontWeight: '700', color: colors.dark },
  dismiss:        { fontSize: 18, color: colors.muted, padding: 4 },
  resultAnalysis: { fontSize: 13, color: colors.text, lineHeight: 18 },
  fieldsList:     { backgroundColor: colors.bg, borderRadius: 10, padding: 10, gap: 6 },
  fieldItem:      { flexDirection: 'row', gap: 8 },
  fieldKey:       { fontSize: 12, color: colors.muted, width: 110, flexShrink: 0 },
  fieldVal:       { flex: 1, fontSize: 12, fontWeight: '700', color: colors.dark },
  note:           { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  resultBtns:     { flexDirection: 'row', gap: 8 },
  applyBtn:       { flex: 1, backgroundColor: colors.dark, borderRadius: 12, padding: 13, alignItems: 'center' },
  applyText:      { fontSize: 14, fontWeight: '700', color: '#fff' },
  skipBtn:        { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  skipText:       { fontSize: 14, fontWeight: '600', color: colors.muted },
});

// ─── ANA EKRAN ────────────────────────────────────────────────────
export default function CustomerDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();

  const [customer, setCustomer]     = useState<Customer | null>(null);
  const [relatedCards, setRelated]  = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  // Edit modal
  const [editField, setEditField]   = useState<{ key: keyof Customer; label: string; multiline?: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    const [custRes, cardsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('cards')
        .select('id, title, status, priority, last_message_at, customers:customer_id(company_name)')
        .eq('customer_id', id).order('last_message_at', { ascending: false }).limit(15),
    ]);
    if (custRes.data) setCustomer(custRes.data as Customer);
    setRelated(cardsRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveField = async (key: keyof Customer, value: string) => {
    setSaving(true);
    await supabase.from('customers').update({ [key]: value || null }).eq('id', id);
    setCustomer(c => c ? { ...c, [key]: value || null } : c);
    setSaving(false);
  };

  const applyAIFields = async (fields: Record<string, string>) => {
    if (!customer || Object.keys(fields).length === 0) return;
    setSaving(true);
    const update: Record<string, string | null> = {};
    Object.entries(fields).forEach(([k, v]) => { if (v?.trim()) update[k] = v.trim(); });
    await supabase.from('customers').update(update).eq('id', id);
    setCustomer(c => c ? { ...c, ...update } : c);
    setSaving(false);
    Alert.alert('✓ Güncellendi', `${Object.keys(update).length} alan başarıyla güncellendi.`);
  };

  const changeStatus = async (status: string) => {
    await supabase.from('customers').update({ status }).eq('id', id);
    setCustomer(c => c ? { ...c, status } : c);
  };

  if (loading || !customer) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Başlık */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Geri</Text>
        </TouchableOpacity>
        {saving && <ActivityIndicator size="small" color={colors.muted} />}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ─── PROFIL HEADER ──────────────────────────────────── */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(customer.company_name)}</Text>
          </View>
          <View style={s.profileInfo}>
            <TouchableOpacity onPress={() => setEditField({ key: 'company_name', label: 'Şirket Adı' })}>
              <Text style={s.companyName}>{customer.company_name}</Text>
            </TouchableOpacity>
            {customer.contact_name ? (
              <TouchableOpacity onPress={() => setEditField({ key: 'contact_name', label: 'Yetkili' })}>
                <Text style={s.contactName}>{customer.contact_name}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditField({ key: 'contact_name', label: 'Yetkili' })}>
                <Text style={s.addField}>+ Yetkili ekle</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Durum seçici */}
          <View style={s.statusRow}>
            {STATUS_OPTS.map(st => (
              <TouchableOpacity
                key={st}
                style={[s.statusChip, customer.status === st && s.statusChipActive]}
                onPress={() => changeStatus(st)}
              >
                <Text style={[s.statusText, customer.status === st && s.statusTextActive]}>
                  {STATUS_LABELS[st]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hızlı aksiyonlar */}
        <View style={s.actionRow}>
          {customer.phone && (
            <TouchableOpacity style={s.actionBtn}
              onPress={() => Linking.openURL(`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`)}>
              <Text style={s.actionIcon}>💬</Text>
              <Text style={s.actionLabel}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {customer.phone && (
            <TouchableOpacity style={[s.actionBtn, s.actionBtnSec]}
              onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
              <Text style={s.actionIcon}>📞</Text>
              <Text style={[s.actionLabel, s.actionLabelSec]}>Ara</Text>
            </TouchableOpacity>
          )}
          {customer.email && (
            <TouchableOpacity style={[s.actionBtn, s.actionBtnSec]}
              onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
              <Text style={s.actionIcon}>📧</Text>
              <Text style={[s.actionLabel, s.actionLabelSec]}>E-posta</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── AI GÜNCELLEMEPANELİ ───────────────────────────── */}
        <View style={s.section}>
          <AIUpdatePanel
            entityId={id}
            entityType="customer"
            entityName={customer.company_name}
            onApply={applyAIFields}
          />
        </View>

        {/* ─── İLETİŞİM BİLGİLERİ ─────────────────────────────── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>İLETİŞİM</Text>
          <EditRow label="Telefon"    value={customer.phone}        onEdit={() => setEditField({ key: 'phone',        label: 'Telefon' })} />
          <EditRow label="E-posta"    value={customer.email}        onEdit={() => setEditField({ key: 'email',        label: 'E-posta' })} />
          <EditRow label="Adres"      value={customer.address}      onEdit={() => setEditField({ key: 'address',      label: 'Adres', multiline: true })} />
        </View>

        {/* ─── FATURA BİLGİLERİ ────────────────────────────────── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>FATURA</Text>
          <EditRow label="Vergi No"       value={customer.tax_number}     onEdit={() => setEditField({ key: 'tax_number',     label: 'Vergi No' })} mono />
          <EditRow label="Vergi Dairesi"  value={customer.tax_office}     onEdit={() => setEditField({ key: 'tax_office',     label: 'Vergi Dairesi' })} />
          <EditRow label="IBAN"           value={customer.iban}           onEdit={() => setEditField({ key: 'iban',           label: 'IBAN' })} mono />
          <EditRow label="Fatura Adresi"  value={customer.invoice_address}onEdit={() => setEditField({ key: 'invoice_address',label: 'Fatura Adresi', multiline: true })} />
        </View>

        {/* ─── KARGO / SEVKİYAT ────────────────────────────────── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>KARGO / SEVKİYAT</Text>
          <EditRow label="Sevk Adresi"   value={customer.shipping_address}onEdit={() => setEditField({ key: 'shipping_address',label: 'Sevk Adresi', multiline: true })} />
          <EditRow label="Kargo Bilgisi" value={customer.shipping_info}   onEdit={() => setEditField({ key: 'shipping_info',   label: 'Kargo Bilgisi' })} />
          <EditRow label="Ödeme Bilgisi" value={customer.payment_info}    onEdit={() => setEditField({ key: 'payment_info',    label: 'Ödeme Bilgisi', multiline: true })} />
        </View>

        {/* ─── NOTLAR ─────────────────────────────────────────── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>NOTLAR</Text>
          <TouchableOpacity
            style={s.notesBox}
            onPress={() => setEditField({ key: 'notes', label: 'Notlar', multiline: true })}
            activeOpacity={0.8}
          >
            <Text style={customer.notes ? s.notesText : s.notesEmpty}>
              {customer.notes || 'Not eklemek için dokunun…'}
            </Text>
            <Text style={s.notesEdit}>Düzenle</Text>
          </TouchableOpacity>
        </View>

        {/* ─── BAĞLI KARTLAR ──────────────────────────────────── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>BAĞLI KARTLAR ({relatedCards.length})</Text>
          {relatedCards.length === 0 ? (
            <Text style={s.emptyText}>Bu müşteriye bağlı kart yok</Text>
          ) : relatedCards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[s.cardRow, card.priority === 'urgent' && s.urgentCard]}
              onPress={() => router.push(`/card/${card.id}`)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle} numberOfLines={1}>{card.title}</Text>
                <Text style={s.cardMeta}>{CARD_STATUS[card.status] || card.status}</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Alan düzenleme modalı */}
      {editField && (
        <EditFieldModal
          label={editField.label}
          value={String(customer[editField.key] || '')}
          onSave={v => saveField(editField.key, v)}
          onClose={() => setEditField(null)}
          multiline={editField.multiline}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText:       { fontSize: 16, color: colors.dark, fontWeight: '600' },
  content:        { paddingBottom: 60, gap: 12 },

  // Profil
  profileCard:    { backgroundColor: colors.card, padding: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar:         { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  profileInfo:    { gap: 4 },
  avatarText:     { fontSize: 22, fontWeight: '900', color: colors.text },
  companyName:    { fontSize: 22, fontWeight: '800', color: colors.dark },
  contactName:    { fontSize: 15, color: colors.muted },
  addField:       { fontSize: 14, color: colors.muted, fontStyle: 'italic' },

  // Durum
  statusRow:      { flexDirection: 'row', gap: 6 },
  statusChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  statusChipActive:{ backgroundColor: colors.dark, borderColor: colors.dark },
  statusText:     { fontSize: 13, fontWeight: '600', color: colors.muted },
  statusTextActive:{ color: '#fff' },

  // Aksiyonlar
  actionRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.dark, borderRadius: 14, paddingVertical: 12 },
  actionBtnSec:   { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionIcon:     { fontSize: 16 },
  actionLabel:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionLabelSec: { color: colors.dark },

  // Bölümler
  section:        { paddingHorizontal: 16 },
  sectionBlock:   { backgroundColor: colors.card, borderRadius: 0, borderTopWidth: 1, borderTopColor: colors.border, overflow: 'hidden' },
  sectionTitle:   { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  // Notlar
  notesBox:       { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 8, minHeight: 80, borderTopWidth: 1, borderTopColor: colors.border },
  notesText:      { flex: 1, fontSize: 14, color: colors.dark, lineHeight: 20 },
  notesEmpty:     { flex: 1, fontSize: 14, color: colors.muted, fontStyle: 'italic' },
  notesEdit:      { fontSize: 12, color: colors.muted },

  // Kartlar
  cardRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  urgentCard:     { borderLeftWidth: 3, borderLeftColor: colors.danger, paddingLeft: 13 },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: colors.dark },
  cardMeta:       { fontSize: 12, color: colors.muted, marginTop: 2 },
  chevron:        { fontSize: 22, color: colors.muted },
  emptyText:      { fontSize: 14, color: colors.muted, paddingHorizontal: 16, paddingVertical: 12 },
});
