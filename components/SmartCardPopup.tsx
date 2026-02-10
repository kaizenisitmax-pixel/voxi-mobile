import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export interface CardField {
  key: string;
  label: string;
  type: 'text' | 'member_select' | 'chip_select' | 'date' | 'location' | 'textarea';
  value: any;
  filled_by: 'user' | 'ai' | 'none';
  editable?: boolean;
  voice_editable?: boolean;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  option_labels?: string[];
  quick_options?: string[];
  quick_labels?: string[];
}

export interface CardData {
  intent: string;
  card_type: 'task' | 'customer' | 'order';
  human_response: string;
  fields: CardField[];
}

interface SmartCardPopupProps {
  visible: boolean;
  cardData: CardData | null;
  onSave: (updates: any) => void;
  onCancel: () => void;
  teamMembers?: Array<{ id: string; name: string }>;
  customers?: Array<{ id: string; name: string }>;
}

export default function SmartCardPopup({
  visible,
  cardData,
  onSave,
  onCancel,
  teamMembers = [],
  customers = [],
}: SmartCardPopupProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<string | null>(null);

  useEffect(() => {
    if (cardData) {
      const initialValues: Record<string, any> = {};
      cardData.fields.forEach((field) => {
        initialValues[field.key] = field.value;
      });
      setValues(initialValues);
    }
  }, [cardData]);

  if (!cardData) return null;

  const handleSave = () => {
    // Validate required fields
    const missingFields = cardData.fields
      .filter((f) => f.required && !values[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      Alert.alert('Eksik Alanlar', `Lütfen şu alanları doldurun: ${missingFields.join(', ')}`);
      return;
    }

    onSave(values);
  };

  const renderField = (field: CardField) => {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <View key={field.key} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8 }}>
              {field.label}
              {field.required && <Text style={{ color: '#FF3B30' }}> *</Text>}
            </Text>
            <TextInput
              value={values[field.key] || ''}
              onChangeText={(text) => setValues({ ...values, [field.key]: text })}
              placeholder={field.placeholder || `${field.label} girin`}
              multiline={field.type === 'textarea'}
              numberOfLines={field.type === 'textarea' ? 4 : 1}
              editable={field.editable !== false}
              style={{
                backgroundColor: '#F5F3EF',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: field.type === 'textarea' ? 12 : 10,
                fontSize: 15,
                color: '#1A1A1A',
                minHeight: field.type === 'textarea' ? 100 : 44,
                textAlignVertical: field.type === 'textarea' ? 'top' : 'center',
              }}
            />
          </View>
        );

      case 'chip_select':
        return (
          <View key={field.key} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8 }}>
              {field.label}
              {field.required && <Text style={{ color: '#FF3B30' }}> *</Text>}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {field.options?.map((option, idx) => {
                const isSelected = values[field.key] === option;
                const label = field.option_labels?.[idx] || option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setValues({ ...values, [field.key]: option })}
                    style={{
                      backgroundColor: isSelected ? '#1A1A1A' : '#F5F3EF',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: isSelected ? '#FFFFFF' : '#1A1A1A',
                        fontWeight: isSelected ? '600' : '400',
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'date':
        return (
          <View key={field.key} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8 }}>
              {field.label}
              {field.required && <Text style={{ color: '#FF3B30' }}> *</Text>}
            </Text>
            
            {field.quick_options && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {field.quick_options.map((option, idx) => {
                  const label = field.quick_labels?.[idx] || option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        const today = new Date();
                        let date = new Date();
                        
                        switch (option) {
                          case 'today':
                            date = today;
                            break;
                          case 'tomorrow':
                            date = new Date(today.setDate(today.getDate() + 1));
                            break;
                          case 'this_week':
                            date = new Date(today.setDate(today.getDate() + 7));
                            break;
                        }
                        
                        setValues({ ...values, [field.key]: date.toISOString().split('T')[0] });
                      }}
                      style={{
                        backgroundColor: '#F5F3EF',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: '#1A1A1A' }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setDatePickerField(field.key);
                setShowDatePicker(true);
              }}
              style={{
                backgroundColor: '#F5F3EF',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 15, color: values[field.key] ? '#1A1A1A' : '#8E8E93' }}>
                {values[field.key]
                  ? new Date(values[field.key]).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : field.placeholder || 'Tarih seçin'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
            </TouchableOpacity>

            {showDatePicker && datePickerField === field.key && (
              <DateTimePicker
                value={values[field.key] ? new Date(values[field.key]) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setValues({ ...values, [field.key]: selectedDate.toISOString().split('T')[0] });
                  }
                }}
              />
            )}
          </View>
        );

      case 'member_select':
        return (
          <View key={field.key} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8 }}>
              {field.label}
              {field.required && <Text style={{ color: '#FF3B30' }}> *</Text>}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {teamMembers.map((member) => {
                const isSelected = values[field.key] === member.id;
                return (
                  <TouchableOpacity
                    key={member.id}
                    onPress={() => setValues({ ...values, [field.key]: member.id })}
                    style={{
                      backgroundColor: isSelected ? '#1A1A1A' : '#F5F3EF',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: isSelected ? '#FFFFFF' : '#1A1A1A',
                        fontWeight: isSelected ? '600' : '400',
                      }}
                    >
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1, backgroundColor: '#F5F3EF' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingTop: 60,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5EA',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={{ fontSize: 16, color: '#1A1A1A' }}>İptal</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A' }}>
              {cardData.card_type === 'task' && 'Görev Düzenle'}
              {cardData.card_type === 'customer' && 'Müşteri Düzenle'}
              {cardData.card_type === 'order' && 'Sipariş Düzenle'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={{ fontSize: 16, color: '#1A1A1A', fontWeight: '600' }}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {cardData.fields.map((field) => renderField(field))}
        </ScrollView>
      </View>
    </Modal>
  );
}
