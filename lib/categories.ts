// EvimAI Kategoriler, Hizmet Tipleri ve Stiller
// Hiyerarşi: Kategori → Hizmet Tipi → Stil → Fotoğraf → AI Tasarım

// ==========================================
// TYPES
// ==========================================

export type Category = 'ev' | 'ticari' | 'endustriyel' | 'diger';
export type ServiceType = 'dekorasyon' | 'yapi' | 'iklimlendirme';

export type ToolId = 
  | 'redesign' 
  | 'furnish' 
  | 'remove_furniture' 
  | 'wall_paint'
  | 'furnish_commercial'
  | 'facade_design'
  | 'signage_design'
  | 'layout_plan'
  | 'equipment_placement'
  | 'safety_visualize'
  | 'landscape_design'
  | 'pool_design'
  | 'lighting_design'
  | 'steel_structure'
  | 'insulation'
  | 'hvac_design'
  | 'solar_panel';

export interface StyleData {
  id: string;
  label: string;
  description: string;
  icon: string; // Ionicons name
}

export interface ServiceTypeData {
  id: ServiceType;
  label: string;
  description: string;
  icon: string;
  styles: Record<Category, StyleData[]>; // Her kategori için farklı stiller
}

export interface ToolData {
  id: ToolId;
  label: string;
  icon: string;
  description: string;
  buttonText: string;
}

export interface CategoryData {
  id: Category;
  label: string;
  icon: string;
  tools: ToolData[];
  photoHint: string; // Fotoğraf placeholder açıklaması
}

// ==========================================
// SERVICE TYPES (Hizmet Tipleri)
// ==========================================

export const SERVICE_TYPES: ServiceTypeData[] = [
  {
    id: 'dekorasyon',
    label: 'Dekorasyon',
    description: 'İç mekan tasarımı ve dekorasyon',
    icon: 'color-palette-outline',
    styles: {
      ev: [
        { id: 'modern', label: 'Modern', description: 'Sade çizgiler, minimal mobilya, nötr renkler', icon: 'cube-outline' },
        { id: 'minimalist', label: 'Minimalist', description: 'Az mobilya, çok işlevsellik, açık alanlar', icon: 'remove-outline' },
        { id: 'iskandinav', label: 'İskandinav', description: 'Açık renkler, doğal ahşap, sıcak dokular', icon: 'snow-outline' },
        { id: 'bohem', label: 'Bohem', description: 'Renkli, desenli, rahat ve samimi', icon: 'flower-outline' },
        { id: 'luks', label: 'Lüks', description: 'Şık mobilyalar, değerli malzemeler', icon: 'diamond-outline' },
        { id: 'klasik', label: 'Klasik', description: 'Zarif mobilyalar, simetrik düzen', icon: 'library-outline' },
        { id: 'rustik', label: 'Rustik', description: 'Doğal ahşap, taş, kırsal sıcaklık', icon: 'leaf-outline' },
        { id: 'art_deco', label: 'Art Deco', description: 'Geometrik desenler, altın detaylar', icon: 'star-outline' },
      ],
      ticari: [
        { id: 'otel_lobisi', label: 'Otel Lobisi', description: 'Gösterişli, konforlu, misafirperver', icon: 'bed-outline' },
        { id: 'restoran', label: 'Restoran', description: 'Samimi atmosfer, işlevsel düzen', icon: 'restaurant-outline' },
        { id: 'ofis', label: 'Modern Ofis', description: 'Profesyonel, verimli, ergonomik', icon: 'desktop-outline' },
        { id: 'kafe', label: 'Kafe', description: 'Rahat, sosyal, estetik', icon: 'cafe-outline' },
        { id: 'magaza', label: 'Mağaza', description: 'Çekici vitrinler, aydınlık, düzenli', icon: 'storefront-outline' },
        { id: 'butik', label: 'Butik', description: 'Şık, özel, premium hissiyat', icon: 'shirt-outline' },
        { id: 'spa', label: 'Spa / Wellness', description: 'Huzurlu, doğal, rahatlatıcı', icon: 'water-outline' },
      ],
      endustriyel: [
        { id: 'fabrika_ofis', label: 'Fabrika Ofisi', description: 'Endüstriyel şık, fonksiyonel', icon: 'business-outline' },
        { id: 'showroom', label: 'Showroom', description: 'Ürün sergileme, aydınlatma', icon: 'eye-outline' },
        { id: 'toplanti_salonu', label: 'Toplantı Salonu', description: 'Profesyonel, teknolojik', icon: 'people-outline' },
        { id: 'yemekhane', label: 'Yemekhane', description: 'Temiz, düzenli, ferah', icon: 'fast-food-outline' },
      ],
      diger: [
        { id: 'bahce_dekor', label: 'Bahçe Dekor', description: 'Dış mekan mobilya ve süsleme', icon: 'flower-outline' },
        { id: 'teras_dekor', label: 'Teras Dekor', description: 'Açık hava oturma düzeni', icon: 'umbrella-outline' },
        { id: 'balkon_dekor', label: 'Balkon Dekor', description: 'Küçük alan, büyük etki', icon: 'sunny-outline' },
        { id: 'havuz_dekor', label: 'Havuz Çevresi', description: 'Şezlong, gölgelik, peyzaj', icon: 'water-outline' },
      ],
    },
  },
  {
    id: 'yapi',
    label: 'Yapı',
    description: 'Çelik yapı, modern mimari, inşaat',
    icon: 'construct-outline',
    styles: {
      ev: [
        { id: 'celik_villa', label: 'Çelik Villa', description: 'Hafif çelik taşıyıcı, modern tasarım', icon: 'home-outline' },
        { id: 'konteyner_ev', label: 'Konteyner Ev', description: 'Konteynırdan dönüştürülmüş yaşam alanı', icon: 'cube-outline' },
        { id: 'prefabrik', label: 'Prefabrik', description: 'Fabrikada üretim, sahada montaj', icon: 'grid-outline' },
        { id: 'tiny_house', label: 'Tiny House', description: 'Kompakt, taşınabilir, minimalist', icon: 'trail-sign-outline' },
        { id: 'cati_katlamasi', label: 'Çatı Katı / Loft', description: 'Açık plan, yüksek tavan, çelik detay', icon: 'expand-outline' },
        { id: 'dubleks', label: 'Dubleks', description: 'İki katlı, çelik merdiven, ferah', icon: 'layers-outline' },
      ],
      ticari: [
        { id: 'celik_magaza', label: 'Çelik Mağaza', description: 'Hafif çelik ticari alan', icon: 'storefront-outline' },
        { id: 'ofis_binasi', label: 'Ofis Binası', description: 'Çok katlı çelik ofis', icon: 'business-outline' },
        { id: 'otopark', label: 'Çelik Otopark', description: 'Çok katlı çelik otopark yapısı', icon: 'car-outline' },
        { id: 'alisveris_merkezi', label: 'AVM', description: 'Büyük ölçekli ticari yapı', icon: 'cart-outline' },
        { id: 'otel', label: 'Otel', description: 'Çelik konstrüksiyon otel binası', icon: 'bed-outline' },
      ],
      endustriyel: [
        { id: 'celik_fabrika', label: 'Çelik Fabrika', description: 'Geniş açıklık, yüksek tavan', icon: 'hammer-outline' },
        { id: 'depo_hangar', label: 'Depo / Hangar', description: 'Büyük depolama alanı', icon: 'cube-outline' },
        { id: 'atolye_bina', label: 'Atölye Binası', description: 'Üretim amaçlı çelik yapı', icon: 'build-outline' },
        { id: 'sera_yapi', label: 'Sera Yapısı', description: 'Cam ve çelik sera konstrüksiyonu', icon: 'leaf-outline' },
        { id: 'soğuk_hava_deposu', label: 'Soğuk Hava Deposu', description: 'İzolasyonlu depolama', icon: 'snow-outline' },
        { id: 'enerji_santrali', label: 'Enerji Santrali', description: 'Güneş/rüzgar enerji yapısı', icon: 'flash-outline' },
      ],
      diger: [
        { id: 'dis_cephe', label: 'Dış Cephe', description: 'Bina cephe giydirme, modern mimari', icon: 'business-outline' },
        { id: 'pergola', label: 'Çelik Pergola', description: 'Dış mekan gölgeleme yapısı', icon: 'grid-outline' },
        { id: 'korkuluk', label: 'Korkuluk Sistemi', description: 'Çelik merdiven ve balkon korkulukları', icon: 'git-merge-outline' },
        { id: 'havuz_yapi', label: 'Havuz Yapısı', description: 'Çelik/beton havuz konstrüksiyonu', icon: 'water-outline' },
        { id: 'spor_tesisi', label: 'Spor Tesisi', description: 'Kapalı/açık spor alanı', icon: 'football-outline' },
      ],
    },
  },
  {
    id: 'iklimlendirme',
    label: 'İklimlendirme',
    description: 'HVAC, yalıtım, enerji sistemleri',
    icon: 'thermometer-outline',
    styles: {
      ev: [
        { id: 'merkezi_isitma', label: 'Merkezi Isıtma', description: 'Kazan, radyatör, yerden ısıtma', icon: 'flame-outline' },
        { id: 'klima_sistemi', label: 'Klima Sistemi', description: 'Split, multi-split, VRF', icon: 'snow-outline' },
        { id: 'isi_yalitim', label: 'Isı Yalıtımı', description: 'Mantolama, çatı/taban yalıtım', icon: 'shield-checkmark-outline' },
        { id: 'gunes_enerjisi', label: 'Güneş Enerjisi', description: 'Solar panel, sıcak su sistemi', icon: 'sunny-outline' },
        { id: 'havalandirma', label: 'Havalandırma', description: 'Mekanik havalandırma, enerji geri kazanım', icon: 'aperture-outline' },
      ],
      ticari: [
        { id: 'vrf_sistem', label: 'VRF Sistem', description: 'Değişken debili soğutucu akışkan', icon: 'git-branch-outline' },
        { id: 'chiller', label: 'Chiller Sistem', description: 'Merkezi soğutma, büyük kapasiteli', icon: 'snow-outline' },
        { id: 'rooftop', label: 'Rooftop Ünite', description: 'Çatı tipi paket klima', icon: 'cloud-outline' },
        { id: 'temiz_oda', label: 'Temiz Oda HVAC', description: 'Filtrasyon, basınç kontrolü', icon: 'medical-outline' },
        { id: 'mutfak_havalandirma', label: 'Mutfak Havalandırma', description: 'Davlumbaz, kanal, egzoz', icon: 'restaurant-outline' },
      ],
      endustriyel: [
        { id: 'fabrika_havalandirma', label: 'Fabrika Havalandırma', description: 'Büyük hacim, toz kontrolü', icon: 'aperture-outline' },
        { id: 'endüstriyel_sogutma', label: 'Endüstriyel Soğutma', description: 'Proses soğutma, amonyak', icon: 'snow-outline' },
        { id: 'buharlastirmali', label: 'Buharlaştırmalı Soğutma', description: 'Düşük enerji, yüksek verim', icon: 'water-outline' },
        { id: 'atik_isi', label: 'Atık Isı Geri Kazanım', description: 'Ekonomizer, ısı değiştirici', icon: 'repeat-outline' },
        { id: 'basinc_kontrol', label: 'Basınç Kontrolü', description: 'Pozitif/negatif basınçlandırma', icon: 'speedometer-outline' },
      ],
      diger: [
        { id: 'havuz_isitma', label: 'Havuz Isıtma', description: 'Isı pompası, solar havuz ısıtma', icon: 'water-outline' },
        { id: 'sera_iklimlendirme', label: 'Sera İklimlendirme', description: 'Sıcaklık/nem kontrolü', icon: 'leaf-outline' },
        { id: 'toprak_kaynak', label: 'Toprak Kaynaklı', description: 'Jeotermal ısı pompası', icon: 'earth-outline' },
        { id: 'dis_mekan_isitma', label: 'Dış Mekan Isıtma', description: 'Infrared ısıtıcılar, radyan', icon: 'flame-outline' },
      ],
    },
  },
];

// ==========================================
// CATEGORIES
// ==========================================

export const CATEGORIES: CategoryData[] = [
  {
    id: 'ev',
    label: 'Ev',
    icon: 'home-outline',
    tools: [
      { id: 'redesign', label: 'Yeniden Tasarla', icon: 'sparkles', description: 'Odayı seçilen stilde yeniden tasarla', buttonText: 'AI ile Tasarla' },
      { id: 'furnish', label: 'Boş Oda Döşe', icon: 'cube', description: 'Boş odaya mobilya yerleştir', buttonText: 'Odayı Döşe' },
      { id: 'remove_furniture', label: 'Mobilya Sil', icon: 'trash', description: 'Mevcut mobilyayı kaldır', buttonText: 'Mobilyayı Sil' },
      { id: 'wall_paint', label: 'Duvar Boya', icon: 'color-palette', description: 'Duvar rengini değiştir', buttonText: 'Rengi Uygula' },
    ],
    photoHint: 'Odanızın geniş açılı bir fotoğrafını çekin. Duvarlar, zemin ve tavan görünsün.',
  },
  {
    id: 'ticari',
    label: 'Ticari',
    icon: 'business-outline',
    tools: [
      { id: 'redesign', label: 'Yeniden Tasarla', icon: 'sparkles', description: 'Mekanı seçilen stilde tasarla', buttonText: 'AI ile Tasarla' },
      { id: 'furnish_commercial', label: 'Mekan Döşe', icon: 'cube', description: 'Ticari alana mobilya/dekor', buttonText: 'Mekanı Döşe' },
      { id: 'facade_design', label: 'Cephe Tasarla', icon: 'grid', description: 'Bina dış cephesini tasarla', buttonText: 'Cephe Oluştur' },
      { id: 'signage_design', label: 'Tabela / Vitrin', icon: 'square', description: 'Vitrin veya tabela tasarımı', buttonText: 'Tabela Tasarla' },
    ],
    photoHint: 'Mekanınızın iç veya dış fotoğrafını çekin. Giriş, vitrin veya salon bölümü.',
  },
  {
    id: 'endustriyel',
    label: 'Endüstriyel',
    icon: 'hammer-outline',
    tools: [
      { id: 'redesign', label: 'Yeniden Tasarla', icon: 'sparkles', description: 'Endüstriyel alanı yeniden düzenle', buttonText: 'AI ile Tasarla' },
      { id: 'layout_plan', label: 'Yerleşim Planı', icon: 'grid', description: 'Ekipman/makine yerleşimi', buttonText: 'Plan Oluştur' },
      { id: 'steel_structure', label: 'Çelik Yapı', icon: 'construct', description: 'Çelik konstrüksiyon tasarımı', buttonText: 'Yapı Tasarla' },
      { id: 'safety_visualize', label: 'Güvenlik', icon: 'shield-checkmark', description: 'İş güvenliği düzenleme', buttonText: 'Güvenlik Uygula' },
    ],
    photoHint: 'Alanın genel görünümünü çekin. Tavan yüksekliği ve zemin alanı görünsün.',
  },
  {
    id: 'diger',
    label: 'Diğer',
    icon: 'ellipsis-horizontal-outline',
    tools: [
      { id: 'redesign', label: 'Yeniden Tasarla', icon: 'sparkles', description: 'Alanı yeniden tasarla', buttonText: 'AI ile Tasarla' },
      { id: 'landscape_design', label: 'Peyzaj Tasarla', icon: 'leaf', description: 'Bahçe/peyzaj düzenleme', buttonText: 'Peyzaj Oluştur' },
      { id: 'pool_design', label: 'Havuz Tasarla', icon: 'water', description: 'Havuz ve çevresi tasarımı', buttonText: 'Havuz Tasarla' },
      { id: 'lighting_design', label: 'Aydınlatma', icon: 'bulb', description: 'Dış mekan aydınlatma', buttonText: 'Aydınlatma Ekle' },
    ],
    photoHint: 'Dış mekan alanınızın geniş açılı fotoğrafını çekin. Sınırlar ve mevcut yapılar görünsün.',
  },
];

// ==========================================
// PHOTO HINTS - Kategori + ServiceType + Stil bazlı
// ==========================================

export function getPhotoHint(category: Category, serviceType: ServiceType, styleId?: string): string {
  const hints: Record<string, Record<string, string>> = {
    dekorasyon: {
      ev: 'Odanızın geniş açılı fotoğrafını çekin.\nDuvarlar, zemin ve pencereler görünsün.',
      ticari: 'Mekanınızın iç fotoğrafını çekin.\nGiriş, tavan ve zemin görünsün.',
      endustriyel: 'Ofisinizin veya salonunuzun fotoğrafını çekin.',
      diger: 'Dış mekan alanınızın fotoğrafını çekin.',
    },
    yapi: {
      ev: 'Yapı alanının veya mevcut evin fotoğrafını çekin.\nArsa, cephe veya iç yapı görünsün.',
      ticari: 'Ticari yapı alanının veya mevcut binanın fotoğrafını çekin.',
      endustriyel: 'Fabrika/depo alanının fotoğrafını çekin.\nÇelik konstrüksiyon detayları görünsün.',
      diger: 'Dış yapı alanının fotoğrafını çekin.\nArazi ve mevcut yapılar görünsün.',
    },
    iklimlendirme: {
      ev: 'Isıtma/soğutma sistemi kurulacak alanın fotoğrafını çekin.\nOda boyutları tahmin edilebilsin.',
      ticari: 'İklimlendirme sistemi kurulacak ticari alanın fotoğrafını çekin.',
      endustriyel: 'Havalandırma/soğutma sistemi kurulacak tesisin fotoğrafını çekin.',
      diger: 'Dış mekan ısıtma/soğutma alanının fotoğrafını çekin.',
    },
  };

  return hints[serviceType]?.[category] || 'Alanın geniş açılı bir fotoğrafını çekin.';
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Hizmet tipine ve kategoriye göre stilleri al
export function getStylesByServiceAndCategory(serviceType: ServiceType, category: Category): StyleData[] {
  const service = SERVICE_TYPES.find(s => s.id === serviceType);
  return service?.styles[category] || [];
}

// Kategori ID'den araç listesi al
export function getToolsByCategory(categoryId: Category): ToolData[] {
  const category = CATEGORIES.find(c => c.id === categoryId);
  return category?.tools || [];
}

// Kategori bilgisi al
export function getCategoryInfo(categoryId: Category): CategoryData | undefined {
  return CATEGORIES.find(c => c.id === categoryId);
}

// Hizmet tipi bilgisi al
export function getServiceTypeInfo(serviceTypeId: ServiceType): ServiceTypeData | undefined {
  return SERVICE_TYPES.find(s => s.id === serviceTypeId);
}

// Araç bilgisi al
export function getToolInfo(toolId: ToolId): ToolData | undefined {
  for (const category of CATEGORIES) {
    const tool = category.tools.find(t => t.id === toolId);
    if (tool) return tool;
  }
  return undefined;
}

// Stil bilgisi al
export function getStyleInfo(serviceType: ServiceType, category: Category, styleId: string): StyleData | undefined {
  const styles = getStylesByServiceAndCategory(serviceType, category);
  return styles.find(s => s.id === styleId);
}

// ==========================================
// PRICE ESTIMATION (Anahtar Teslim Fiyat)
// ==========================================

export interface PriceEstimate {
  category: Category;
  serviceType: ServiceType;
  style: string;
  basePrice: number;      // TL
  minPrice: number;        // TL
  maxPrice: number;        // TL
  unit: string;            // m², adet, vb.
  includes: string[];      // Dahil olan hizmetler
  estimatedDays: number;   // Tahmini süre (gün)
}

export function getEstimatedPrice(
  category: Category,
  serviceType: ServiceType,
  style: string,
): PriceEstimate {
  // Base prices per m² (TL)
  const basePrices: Record<ServiceType, Record<Category, number>> = {
    dekorasyon: {
      ev: 3500,
      ticari: 5000,
      endustriyel: 2500,
      diger: 2000,
    },
    yapi: {
      ev: 12000,
      ticari: 15000,
      endustriyel: 8000,
      diger: 6000,
    },
    iklimlendirme: {
      ev: 1500,
      ticari: 3000,
      endustriyel: 4000,
      diger: 2000,
    },
  };

  const basePrice = basePrices[serviceType]?.[category] || 5000;

  // Style multiplier
  const luxuryStyles = ['luks', 'art_deco', 'otel_lobisi', 'spa', 'celik_villa'];
  const multiplier = luxuryStyles.includes(style) ? 1.5 : 1.0;

  const calculatedBase = Math.round(basePrice * multiplier);

  const includes: Record<ServiceType, string[]> = {
    dekorasyon: [
      'Profesyonel tasarım danışmanlığı',
      '3D görselleştirme',
      'Malzeme seçimi ve tedarik',
      'Uygulama ve montaj',
      'Son kontrol ve teslim',
    ],
    yapi: [
      'Mimari proje çizimi',
      'Statik hesaplama',
      'Çelik konstrüksiyon üretimi',
      'Sahada montaj',
      'İzolasyon ve kaplama',
      'İskan ve ruhsat desteği',
    ],
    iklimlendirme: [
      'Isı kaybı/kazancı hesabı',
      'Sistem tasarımı',
      'Ekipman tedariki',
      'Montaj ve boru tesisatı',
      'Devreye alma ve test',
      '2 yıl garanti',
    ],
  };

  const estimatedDays: Record<ServiceType, number> = {
    dekorasyon: 21,
    yapi: 90,
    iklimlendirme: 14,
  };

  return {
    category,
    serviceType,
    style,
    basePrice: calculatedBase,
    minPrice: Math.round(calculatedBase * 0.8),
    maxPrice: Math.round(calculatedBase * 1.3),
    unit: serviceType === 'iklimlendirme' ? 'sistem' : 'm²',
    includes: includes[serviceType] || [],
    estimatedDays: estimatedDays[serviceType] || 30,
  };
}
