/**
 * Paydaş Detay Ekranı — Tam Özellikli
 * Müşteri kartıyla aynı AI panel + düzenleme deneyimi
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
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../lib/supabase';
import { colors } from '../../lib/colors';
import { WEB_API } from '../../lib/ai';

// ─── Storage Upload Helper ────────────────────────────────────────
async function uploadFileAndGetSignedUrl(
  fileUri: string,
  fileType: string,
  fileName: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `entity-updates/${Date.now()}-${safeName}`;

    const uploadResult = await FileSystem.uploadAsync(
      `${SUPABASE_URL}/storage/v1/object/smart-create-uploads/${path}`,
      fileUri,
      {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': fileType,
          'x-upsert': 'true',
        },
        uploadType: 0 as FileSystem.FileSystemUploadType,
      },
    );

    if (uploadResult.status >= 400) return null;

    const { data } = await supabase.storage
      .from('smart-create-uploads')
      .createSignedUrl(path, 600);

    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

type Stakeholder = {
  id: string;
  full_name: string;
  title: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  role: string;
  notes: string | null;
  tax_number: string | null;
  tax_office: string | null;
  iban: string | null;
  payment_info: string | null;
  customer?: { id: string; company_name: string } | null;
};

const ROLE_OPTS = [
  { key: 'decision_maker', label: '👑 Karar Verici' },
  { key: 'influencer',     label: '💡 Etkileyici' },
  { key: 'gatekeeper',     label: '🔐 Kapı Tutucu' },
  { key: 'user',           label: '👤 Kullanıcı' },
];
const CARD_STATUS: Record<string, string> = { open: 'Açık', in_progress: 'Devam', done: 'Bitti' };

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Alanları customer/[id].tsx'ten paylaşılan bileşenler ─────────
// (Aynı EditFieldModal, EditRow ve AIUpdatePanel kodu)

function EditFieldModal({ label, value, onSave, onClose, multiline }: {
  label: string; value: string; onSave: (v: string) => void; onClose: () => void; multiline?: boolean;
}) {
  const [val, setVal] = useState(value);
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={em.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={em.sheet}>
        <View style={em.handle} />
        <Text style={em.title}>{label}</Text>
        <TextInput style={[em.input, multiline && em.multi]} value={val} onChangeText={setVal}
          multiline={multiline} autoFocus placeholder={`${label} girin…`} placeholderTextColor={colors.muted} />
        <View style={em.btns}>
          <TouchableOpacity style={em.cancel} onPress={onClose}><Text style={em.cancelT}>İptal</Text></TouchableOpacity>
          <TouchableOpacity style={em.save} onPress={() => { onSave(val); onClose(); }}>
            <Text style={em.saveT}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:   { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  handle:  { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:   { fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: 12 },
  input:   { backgroundColor: colors.bg, borderRadius: 12, padding: 14, fontSize: 15, color: colors.dark, borderWidth: 1, borderColor: colors.borderLight },
  multi:   { minHeight: 100, textAlignVertical: 'top' },
  btns:    { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancel:  { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelT: { fontSize: 15, fontWeight: '600', color: colors.muted },
  save:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.dark, alignItems: 'center' },
  saveT:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});

function EditRow({ label, value, onEdit, mono }: {
  label: string; value: string | null; onEdit: () => void; mono?: boolean;
}) {
  return (
    <TouchableOpacity style={rw.row} onPress={onEdit} activeOpacity={0.7}>
      <Text style={rw.label}>{label}</Text>
      <View style={rw.right}>
        <Text style={[rw.value, !value && rw.empty, mono && rw.mono]} numberOfLines={2}>{value || 'Ekle…'}</Text>
        <Text style={rw.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}
const rw = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 14, color: colors.muted, width: 120, flexShrink: 0 },
  right: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.dark, textAlign: 'right' },
  empty: { color: colors.muted, fontStyle: 'italic', fontWeight: '400' },
  mono:  { fontSize: 13 },
  arrow: { fontSize: 18, color: colors.muted, marginLeft: 4 },
});

function AIUpdatePanel({ entityId, entityType, entityName, onApply }: {
  entityId: string; entityType: 'customer' | 'stakeholder';
  entityName: string; onApply: (fields: Record<string, string>) => void;
}) {
  const [state, setState] = useState<'idle'|'recording'|'processing'|'result'>('idle');
  const [result, setResult] = useState<{ analysis: string; fields: Record<string, string>; suggested_note: string } | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [secs, setSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const callAPI = async (type: string, fileUri?: string, fileType?: string, text?: string) => {
    setState('processing');
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Oturum yok');
      const body: Record<string, string> = { type, entityType, entityName };
      if (text) body.text = text;

      if (fileUri && fileUri !== 'text' && (type === 'voice' || type === 'photo' || type === 'document')) {
        const fileName = `file.${type === 'voice' ? 'm4a' : type === 'photo' ? 'jpg' : 'pdf'}`;
        const resolvedType = fileType || (type === 'voice' ? 'audio/m4a' : type === 'photo' ? 'image/jpeg' : 'application/pdf');

        const signedUrl = await uploadFileAndGetSignedUrl(fileUri, resolvedType, fileName, session.access_token);
        if (signedUrl) {
          body.signedUrl = signedUrl;
          body.fileType  = resolvedType;
        } else {
          const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' as any });
          body.fileBase64 = b64;
          body.fileType   = resolvedType;
        }
      }

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 55_000);

      const res = await fetch(`${WEB_API}/api/entity-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult({ analysis: data.analysis, fields: data.fields || {}, suggested_note: data.suggested_note || '' });
      setState('result');
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'İşlem başarısız');
      setState('idle');
    }
  };

  const startRec = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(rec); setState('recording'); setSecs(0);
    timer.current = setInterval(() => setSecs(s => s + 1), 1000);
  };
  const stopRec = async () => {
    if (!recording) return;
    if (timer.current) clearInterval(timer.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null); setState('processing');
    if (uri) await callAPI('voice', uri, 'audio/m4a');
  };
  const pickPhoto  = async () => { const r = await ImagePicker.launchCameraAsync({ quality: 0.8 }); if (!r.canceled) await callAPI('photo', r.assets[0].uri, r.assets[0].mimeType || 'image/jpeg'); };
  const pickGallery= async () => { const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 }); if (!r.canceled) await callAPI('photo', r.assets[0].uri, r.assets[0].mimeType || 'image/jpeg'); };
  const pickDoc    = async () => { const r = await DocumentPicker.getDocumentAsync({ type: ['image/*','application/pdf'] }); if (!r.canceled) await callAPI('document', r.assets[0].uri, r.assets[0].mimeType || 'application/pdf'); };
  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  if (state === 'recording') return (
    <View style={ai.recRow}>
      <View style={ai.dot} /><Text style={ai.recTime}>{fmt(secs)}</Text><Text style={ai.recHint}>Konuşun…</Text>
      <TouchableOpacity style={ai.stopBtn} onPress={stopRec}><Text style={ai.stopT}>■ Bitir</Text></TouchableOpacity>
    </View>
  );
  if (state === 'processing') return (
    <View style={ai.procRow}><ActivityIndicator size="small" color={colors.dark} /><Text style={ai.procT}>Claude analiz ediyor…</Text></View>
  );
  if (state === 'result' && result) {
    const entries = Object.entries(result.fields || {}).filter(([,v]) => v?.trim());
    return (
      <View style={ai.card}>
        <View style={ai.rHead}><Text style={ai.rTitle}>🤖 AI Tespiti</Text><TouchableOpacity onPress={() => { setResult(null); setState('idle'); }}><Text style={ai.x}>✕</Text></TouchableOpacity></View>
        <Text style={ai.rText}>{result.analysis}</Text>
        {entries.length > 0 && <View style={ai.fields}>{entries.map(([k,v]) => (<View key={k} style={ai.fRow}><Text style={ai.fKey}>{k}</Text><Text style={ai.fVal} numberOfLines={2}>{String(v)}</Text></View>))}</View>}
        {result.suggested_note ? <Text style={ai.note}>💬 "{result.suggested_note}"</Text> : null}
        <View style={ai.rBtns}>
          <TouchableOpacity style={ai.applyBtn} onPress={() => { onApply(result.fields); setResult(null); setState('idle'); }}><Text style={ai.applyT}>✓ Karta Uygula</Text></TouchableOpacity>
          <TouchableOpacity style={ai.skipBtn} onPress={() => { setResult(null); setState('idle'); }}><Text style={ai.skipT}>İptal</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View style={ai.panel}>
      <Text style={ai.panelT}>🤖 AI ile Güncelle</Text>
      <View style={ai.row}>
        {[{ icon: '🎤', label: 'Ses', fn: startRec }, { icon: '📸', label: 'Fotoğraf', fn: pickPhoto }, { icon: '🖼️', label: 'Galeri', fn: pickGallery }, { icon: '📎', label: 'Belge', fn: pickDoc }].map(b => (
          <TouchableOpacity key={b.label} style={ai.btn} onPress={b.fn}>
            <Text style={ai.bIcon}>{b.icon}</Text><Text style={ai.bLabel}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const ai = StyleSheet.create({
  panel: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  panelT:{ fontSize: 13, fontWeight: '700', color: colors.muted },
  row:   { flexDirection: 'row', gap: 8 },
  btn:   { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  bIcon: { fontSize: 22 }, bLabel: { fontSize: 11, fontWeight: '600', color: colors.text },
  recRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  dot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recTime:{ fontSize: 18, fontWeight: '800', color: colors.dark },
  recHint:{ flex: 1, fontSize: 13, color: colors.muted },
  stopBtn:{ backgroundColor: colors.dark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  stopT: { fontSize: 13, fontWeight: '700', color: '#fff' },
  procRow:{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  procT: { fontSize: 14, color: colors.text },
  card:  { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  rHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rTitle:{ fontSize: 14, fontWeight: '700', color: colors.dark },
  x:     { fontSize: 18, color: colors.muted, padding: 4 },
  rText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  fields:{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, gap: 6 },
  fRow:  { flexDirection: 'row', gap: 8 },
  fKey:  { fontSize: 12, color: colors.muted, width: 110, flexShrink: 0 },
  fVal:  { flex: 1, fontSize: 12, fontWeight: '700', color: colors.dark },
  note:  { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  rBtns: { flexDirection: 'row', gap: 8 },
  applyBtn: { flex: 1, backgroundColor: colors.dark, borderRadius: 12, padding: 13, alignItems: 'center' },
  applyT:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  skipBtn:{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  skipT: { fontSize: 14, fontWeight: '600', color: colors.muted },
});

// ─── ANA EKRAN ────────────────────────────────────────────────────
export default function StakeholderDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const [stake, setStake]     = useState<Stakeholder | null>(null);
  const [cards, setCards]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editField, setEditField] = useState<{ key: keyof Stakeholder; label: string; multiline?: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    const stakeRes = await supabase.from('stakeholders')
      .select('*, customers:customer_id(id, company_name)').eq('id', id).single();
    setStake(stakeRes.data as Stakeholder);

    if (stakeRes.data?.customer_id) {
      const { data } = await supabase.from('cards')
        .select('id, title, status, priority, last_message_at')
        .eq('customer_id', stakeRes.data.customer_id)
        .neq('status', 'cancelled').order('last_message_at', { ascending: false }).limit(10);
      setCards(data || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveField = async (key: keyof Stakeholder, value: string) => {
    setSaving(true);
    await supabase.from('stakeholders').update({ [key]: value || null }).eq('id', id);
    setStake(s => s ? { ...s, [key]: value || null } : s);
    setSaving(false);
  };

  const applyAIFields = async (fields: Record<string, string>) => {
    if (!stake || !Object.keys(fields).length) return;
    setSaving(true);
    const clean: Record<string, string | null> = {};
    Object.entries(fields).forEach(([k, v]) => { if (v?.trim()) clean[k] = v.trim(); });
    await supabase.from('stakeholders').update(clean).eq('id', id);
    setStake(s => s ? { ...s, ...clean } : s);
    setSaving(false);
    Alert.alert('✓ Güncellendi', `${Object.keys(clean).length} alan güncellendi.`);
  };

  const changeRole = async (role: string) => {
    await supabase.from('stakeholders').update({ role }).eq('id', id);
    setStake(s => s ? { ...s, role } : s);
  };

  if (loading || !stake) return (
    <SafeAreaView style={s.container}>
      <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Geri</Text></TouchableOpacity>
        {saving && <ActivityIndicator size="small" color={colors.muted} />}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Profil */}
        <View style={s.profileCard}>
          <View style={s.avatar}><Text style={s.avatarT}>{initials(stake.full_name)}</Text></View>
          <View style={{ gap: 4, flex: 1 }}>
            <TouchableOpacity onPress={() => setEditField({ key: 'full_name', label: 'Ad Soyad' })}>
              <Text style={s.name}>{stake.full_name}</Text>
            </TouchableOpacity>
            {stake.title && (
              <TouchableOpacity onPress={() => setEditField({ key: 'title', label: 'Ünvan' })}>
                <Text style={s.title}>{stake.title}</Text>
              </TouchableOpacity>
            )}
            {stake.company_name && <Text style={s.company}>{stake.company_name}</Text>}
            {stake.customer?.company_name && <Text style={s.custLink}>Müşteri: {stake.customer.company_name}</Text>}
          </View>
        </View>

        {/* Rol seçici */}
        <View style={s.roleWrap}>
          <Text style={s.roleLabel}>ROL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.roleRow}>
            {ROLE_OPTS.map(opt => (
              <TouchableOpacity key={opt.key}
                style={[s.roleChip, stake.role === opt.key && s.roleChipActive]}
                onPress={() => changeRole(opt.key)}>
                <Text style={[s.roleChipText, stake.role === opt.key && s.roleChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Hızlı aksiyonlar */}
        <View style={s.actionRow}>
          {stake.phone && <TouchableOpacity style={s.actBtn} onPress={() => Linking.openURL(`https://wa.me/${stake.phone?.replace(/[^0-9]/g,'')}`)}><Text style={s.actIcon}>💬</Text><Text style={s.actLabel}>WhatsApp</Text></TouchableOpacity>}
          {stake.phone && <TouchableOpacity style={[s.actBtn, s.actBtnSec]} onPress={() => Linking.openURL(`tel:${stake.phone}`)}><Text style={s.actIcon}>📞</Text><Text style={[s.actLabel, { color: colors.dark }]}>Ara</Text></TouchableOpacity>}
          {stake.email && <TouchableOpacity style={[s.actBtn, s.actBtnSec]} onPress={() => Linking.openURL(`mailto:${stake.email}`)}><Text style={s.actIcon}>📧</Text><Text style={[s.actLabel, { color: colors.dark }]}>E-posta</Text></TouchableOpacity>}
        </View>

        {/* AI Panel */}
        <View style={{ paddingHorizontal: 16 }}>
          <AIUpdatePanel entityId={id} entityType="stakeholder" entityName={stake.full_name} onApply={applyAIFields} />
        </View>

        {/* İletişim */}
        <View style={s.block}>
          <Text style={s.secTitle}>İLETİŞİM</Text>
          <EditRow label="Ad Soyad"  value={stake.full_name}    onEdit={() => setEditField({ key: 'full_name', label: 'Ad Soyad' })} />
          <EditRow label="Ünvan"     value={stake.title}        onEdit={() => setEditField({ key: 'title',    label: 'Ünvan' })} />
          <EditRow label="Şirket"    value={stake.company_name} onEdit={() => setEditField({ key: 'company_name', label: 'Şirket' })} />
          <EditRow label="Telefon"   value={stake.phone}        onEdit={() => setEditField({ key: 'phone',    label: 'Telefon' })} />
          <EditRow label="E-posta"   value={stake.email}        onEdit={() => setEditField({ key: 'email',    label: 'E-posta' })} />
          <EditRow label="Adres"     value={stake.address}      onEdit={() => setEditField({ key: 'address',  label: 'Adres', multiline: true })} />
        </View>

        {/* Fatura */}
        <View style={s.block}>
          <Text style={s.secTitle}>FATURA / ÖDEME</Text>
          <EditRow label="Vergi No"      value={stake.tax_number}  onEdit={() => setEditField({ key: 'tax_number',  label: 'Vergi No' })} mono />
          <EditRow label="Vergi Dairesi" value={stake.tax_office}  onEdit={() => setEditField({ key: 'tax_office',  label: 'Vergi Dairesi' })} />
          <EditRow label="IBAN"          value={stake.iban}        onEdit={() => setEditField({ key: 'iban',        label: 'IBAN' })} mono />
          <EditRow label="Ödeme Bilgisi" value={stake.payment_info}onEdit={() => setEditField({ key: 'payment_info',label: 'Ödeme Bilgisi', multiline: true })} />
        </View>

        {/* Notlar */}
        <View style={s.block}>
          <Text style={s.secTitle}>NOTLAR</Text>
          <TouchableOpacity style={s.notesBox} onPress={() => setEditField({ key: 'notes', label: 'Notlar', multiline: true })} activeOpacity={0.8}>
            <Text style={stake.notes ? s.notesT : s.notesE}>{stake.notes || 'Not eklemek için dokunun…'}</Text>
            <Text style={s.notesEdit}>Düzenle</Text>
          </TouchableOpacity>
        </View>

        {/* Bağlı kartlar */}
        {cards.length > 0 && (
          <View style={s.block}>
            <Text style={s.secTitle}>BAĞLI KARTLAR ({cards.length})</Text>
            {cards.map(card => (
              <TouchableOpacity key={card.id}
                style={[s.cardRow, card.priority === 'urgent' && s.urgentCard]}
                onPress={() => router.push(`/card/${card.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{card.title}</Text>
                  <Text style={s.cardMeta}>{CARD_STATUS[card.status] || card.status}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {editField && (
        <EditFieldModal
          label={editField.label}
          value={String(stake[editField.key] || '')}
          onSave={v => saveField(editField.key, v)}
          onClose={() => setEditField(null)}
          multiline={editField.multiline}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  back:      { fontSize: 16, color: colors.dark, fontWeight: '600' },
  content:   { paddingBottom: 60, gap: 12 },

  profileCard: { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar:      { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarT:     { fontSize: 20, fontWeight: '900', color: colors.text },
  name:        { fontSize: 20, fontWeight: '800', color: colors.dark },
  title:       { fontSize: 14, color: colors.muted },
  company:     { fontSize: 13, color: colors.muted },
  custLink:    { fontSize: 12, color: colors.muted },

  roleWrap:    { backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  roleLabel:   { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginBottom: 8 },
  roleRow:     { flexDirection: 'row', gap: 6 },
  roleChip:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  roleChipActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  roleChipText:   { fontSize: 13, fontWeight: '600', color: colors.muted },
  roleChipTextActive: { color: '#fff' },

  actionRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  actBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.dark, borderRadius: 14, paddingVertical: 12 },
  actBtnSec:   { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actIcon:     { fontSize: 16 },
  actLabel:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  block:       { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, overflow: 'hidden' },
  secTitle:    { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  notesBox:    { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 8, minHeight: 80, borderTopWidth: 1, borderTopColor: colors.border },
  notesT:      { flex: 1, fontSize: 14, color: colors.dark, lineHeight: 20 },
  notesE:      { flex: 1, fontSize: 14, color: colors.muted, fontStyle: 'italic' },
  notesEdit:   { fontSize: 12, color: colors.muted },

  cardRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  urgentCard:  { borderLeftWidth: 3, borderLeftColor: colors.danger, paddingLeft: 13 },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: colors.dark },
  cardMeta:    { fontSize: 12, color: colors.muted, marginTop: 2 },
  chevron:     { fontSize: 22, color: colors.muted },
});
