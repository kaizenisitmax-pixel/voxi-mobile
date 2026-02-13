import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PriceEstimate } from '../../lib/categories';

interface PriceQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  estimate: PriceEstimate;
  onRequestQuote: () => void;
}

export default function PriceQuoteModal({
  visible,
  onClose,
  estimate,
  onRequestQuote,
}: PriceQuoteModalProps) {
  const formatPrice = (price: number) => {
    return price.toLocaleString('tr-TR') + ' ₺';
  };

  const serviceTypeLabels: Record<string, string> = {
    dekorasyon: 'Dekorasyon',
    yapi: 'Yapı',
    iklimlendirme: 'İklimlendirme',
  };

  const categoryLabels: Record<string, string> = {
    ev: 'Ev',
    ticari: 'Ticari',
    endustriyel: 'Endüstriyel',
    diger: 'Diğer',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Anahtar Teslim Fiyat</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#212121" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Price Card */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Tahmini Fiyat Aralığı</Text>
            <View style={styles.priceRange}>
              <Text style={styles.priceMin}>{formatPrice(estimate.minPrice)}</Text>
              <Ionicons name="remove" size={20} color="#8E8E93" />
              <Text style={styles.priceMax}>{formatPrice(estimate.maxPrice)}</Text>
            </View>
            <Text style={styles.priceUnit}>/ {estimate.unit}</Text>

            <View style={styles.priceDivider} />

            <View style={styles.priceDetails}>
              <View style={styles.priceDetailRow}>
                <Text style={styles.priceDetailLabel}>Kategori</Text>
                <Text style={styles.priceDetailValue}>
                  {categoryLabels[estimate.category] || estimate.category}
                </Text>
              </View>
              <View style={styles.priceDetailRow}>
                <Text style={styles.priceDetailLabel}>Hizmet</Text>
                <Text style={styles.priceDetailValue}>
                  {serviceTypeLabels[estimate.serviceType] || estimate.serviceType}
                </Text>
              </View>
              <View style={styles.priceDetailRow}>
                <Text style={styles.priceDetailLabel}>Stil</Text>
                <Text style={[styles.priceDetailValue, { textTransform: 'capitalize' }]}>
                  {estimate.style.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={styles.priceDetailRow}>
                <Text style={styles.priceDetailLabel}>Tahmini Süre</Text>
                <Text style={styles.priceDetailValue}>{estimate.estimatedDays} gün</Text>
              </View>
            </View>
          </View>

          {/* Includes */}
          <View style={styles.includesSection}>
            <Text style={styles.includesTitle}>Fiyata Dahil Olanlar</Text>
            {estimate.includes.map((item, index) => (
              <View key={index} style={styles.includesItem}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.includesText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={18} color="#8E8E93" />
            <Text style={styles.disclaimerText}>
              Bu fiyatlar tahminidir. Kesin fiyat, alan ölçüleri, malzeme tercihi ve
              projenin detaylarına göre değişiklik gösterebilir. Detaylı teklif almak
              için uzmanlarımızla iletişime geçin.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.requestButton}
              onPress={onRequestQuote}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
              <Text style={styles.requestButtonText}>Detaylı Teklif İste</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => {
                Alert.alert(
                  'İletişim',
                  'Bir uzmanımız sizinle en kısa sürede iletişime geçecektir.',
                  [{ text: 'Tamam' }]
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={20} color="#212121" />
              <Text style={styles.contactButtonText}>Uzman ile Konuş</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  // Price Card
  priceCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 8,
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceMin: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
  },
  priceMax: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
  },
  priceUnit: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  priceDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 20,
  },
  priceDetails: {
    width: '100%',
    gap: 12,
  },
  priceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceDetailLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  priceDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  // Includes
  includesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  includesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  includesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  includesText: {
    flex: 1,
    fontSize: 15,
    color: '#3C3C43',
  },
  // Disclaimer
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
  },
  // Actions
  actionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#212121',
    borderRadius: 12,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
});
