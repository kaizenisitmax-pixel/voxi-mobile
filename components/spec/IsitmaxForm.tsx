/**
 * IsitmaxForm - ISITMAX İletişim Formu
 * Yapı kategorisinde usta eşleştirmesi yerine doğrudan ISITMAX'a form gönderilir
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { sendIsitmaxInquiry } from '../../services/specification';

interface IsitmaxFormProps {
  specificationId: string;
  onSuccess: (inquiryId: string) => void;
  onCancel: () => void;
}

export default function IsitmaxForm({
  specificationId,
  onSuccess,
  onCancel,
}: IsitmaxFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isValid = name.trim().length >= 2 && phone.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Eksik Bilgi', 'Ad soyad ve telefon numarası gereklidir.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);

    try {
      const result = await sendIsitmaxInquiry({
        specification_id: specificationId,
        contact_name: name.trim(),
        contact_phone: phone.trim(),
        contact_email: email.trim() || undefined,
        project_location: location.trim() || undefined,
        project_area_m2: area ? parseFloat(area) : undefined,
        message: message.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Talep Gönderildi',
        result.email_sent
          ? 'ISITMAX ekibine talebiniz iletildi. En kısa sürede sizinle iletişime geçecekler.'
          : 'Talebiniz kaydedildi. ISITMAX ekibi sizinle iletişime geçecektir.',
        [{ text: 'Tamam', onPress: () => onSuccess(result.inquiry_id) }]
      );
    } catch (error: any) {
      console.error('❌ ISITMAX talep hatası:', error);
      Alert.alert('Hata', error.message || 'Talep gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business" size={28} color="#212121" />
          </View>
          <Text style={styles.headerTitle}>ISITMAX ile İletişime Geç</Text>
          <Text style={styles.headerSubtitle}>
            Yapı projeniz için uzman ekibimiz sizinle iletişime geçecektir
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Ad Soyad */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Ad Soyad <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="Adınız ve soyadınız"
                placeholderTextColor="#C7C7CC"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Telefon */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Telefon <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={18} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#C7C7CC"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>

          {/* E-posta */}
          <View style={styles.field}>
            <Text style={styles.label}>E-posta</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="email@ornek.com"
                placeholderTextColor="#C7C7CC"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Proje Konumu */}
          <View style={styles.field}>
            <Text style={styles.label}>Proje Konumu</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={18} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="İl / İlçe"
                placeholderTextColor="#C7C7CC"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Proje Alanı */}
          <View style={styles.field}>
            <Text style={styles.label}>Tahmini Alan (m²)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="resize-outline" size={18} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="Örn: 150"
                placeholderTextColor="#C7C7CC"
                value={area}
                onChangeText={setArea}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Mesaj */}
          <View style={styles.field}>
            <Text style={styles.label}>Ek Mesajınız</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Projeniz hakkında eklemek istediğiniz bilgiler..."
              placeholderTextColor="#C7C7CC"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
          <Text style={styles.infoText}>
            Bilgileriniz yalnızca ISITMAX ekibiyle paylaşılır. Şartname detaylarınız otomatik olarak eklenir.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
          disabled={sending}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!isValid || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Talebi Gönder</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    marginLeft: 4,
  },
  required: {
    color: '#FF3B30',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 100,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#059669',
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  submitButton: {
    flex: 2,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#212121',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
