/**
 * Profil Düzenleme Ekranı
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../lib/colors';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [fullName,   setFullName]   = useState(profile?.full_name   || '');
  const [phone,      setPhone]      = useState(profile?.phone       || '');
  const [jobTitle,   setJobTitle]   = useState('');
  const [department, setDepartment] = useState('');
  const [birthday,   setBirthday]   = useState('');
  const [bio,        setBio]        = useState('');
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, job_title, department, birthday, bio')
        .eq('id', user.id)
        .single();
      if (data) {
        setFullName(data.full_name   || '');
        setPhone(data.phone          || '');
        setJobTitle(data.job_title   || '');
        setDepartment(data.department || '');
        setBirthday(data.birthday    || '');
        setBio(data.bio              || '');
      }
      setFetching(false);
    })();
  }, [user?.id]);

  const save = async () => {
    if (!fullName.trim()) {
      Alert.alert('Hata', 'Ad Soyad zorunludur.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      full_name:  fullName.trim(),
      phone:      phone.trim()      || null,
      job_title:  jobTitle.trim()   || null,
      department: department.trim() || null,
      birthday:   birthday.trim()   || null,
      bio:        bio.trim()        || null,
    }).eq('id', user!.id);

    setLoading(false);
    if (error) {
      Alert.alert('Hata', 'Kaydedilirken bir hata oluştu.');
    } else {
      await refreshProfile();
      Alert.alert('Kaydedildi', 'Profiliniz güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancel}>İptal</Text>
        </TouchableOpacity>
        <Text style={s.title}>Profil Düzenle</Text>
        <TouchableOpacity onPress={save} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={colors.dark} />
            : <Text style={s.saveBtn}>Kaydet</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Avatar placeholder */}
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={s.avatarHint}>{user?.email}</Text>
          </View>

          <View style={s.block}>
            <Text style={s.blockTitle}>KİŞİSEL BİLGİLER</Text>
            <Field label="Ad Soyad *" value={fullName} onChange={setFullName} placeholder="Volkan Şimşirkaya" />
            <Field label="Telefon" value={phone} onChange={setPhone} placeholder="+90 532 000 00 00" keyType="phone-pad" />
            <Field label="Doğum Tarihi" value={birthday} onChange={setBirthday} placeholder="1990-01-15" hint="YYYY-AA-GG formatında" />
          </View>

          <View style={s.block}>
            <Text style={s.blockTitle}>İŞ BİLGİLERİ</Text>
            <Field label="Ünvan" value={jobTitle} onChange={setJobTitle} placeholder="Proje Müdürü" />
            <Field label="Departman" value={department} onChange={setDepartment} placeholder="Saha Ekibi" />
            <Field label="Kısa Bio" value={bio} onChange={setBio} placeholder="Hakkınızda kısa bir not…" multiline />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyType, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyType?: any; hint?: string;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && f.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint && <Text style={f.hint}>{hint}</Text>}
    </View>
  );
}

const f = StyleSheet.create({
  wrap:      { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  label:     { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, marginBottom: 6 },
  input:     { fontSize: 15, color: colors.dark, paddingVertical: 8, backgroundColor: 'transparent' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  hint:      { fontSize: 11, color: colors.muted, marginTop: 4 },
});

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:      { fontSize: 17, fontWeight: '700', color: colors.dark },
  cancel:     { fontSize: 16, color: colors.muted },
  saveBtn:    { fontSize: 16, fontWeight: '700', color: colors.dark },
  content:    { paddingBottom: 60, gap: 16, paddingTop: 8 },
  avatarWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: colors.text },
  avatarHint: { fontSize: 13, color: colors.muted },
  block:      { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, overflow: 'hidden' },
  blockTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
});
