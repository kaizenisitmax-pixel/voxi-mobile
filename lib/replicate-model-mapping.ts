/**
 * VOXI - Replicate Model Mapping Configuration
 * Kategori, Alt Kategori ve Stil bazinda optimize edilmis model secimi
 */

export interface ReplicateModelConfig {
  modelId: string;
  version?: string;
  strength?: number;
  scale?: number;
  steps?: number;
  resolution?: number;
  costPerRun?: number;
  averageTime?: number;
  description?: string;
}

// MODEL TANIMLARI
export const REPLICATE_MODELS = {
  // DEKORASYON MODELLERI
  interior_design: {
    modelId: 'adirik/interior-design',
    version: '76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38',
    strength: 0.8,
    scale: 9.0,
    steps: 30,
    resolution: 768,
    costPerRun: 0.007,
    averageTime: 8,
    description: 'Genel ic mekan tasarimi - hizli ve dengeli',
  },

  interior_ai_enhanced: {
    modelId: 'erayyavuz/interior-ai',
    strength: 0.75,
    scale: 10.0,
    steps: 35,
    resolution: 1024,
    costPerRun: 0.063,
    averageTime: 65,
    description: 'Yuksek kaliteli ic mekan - daha fotorealistik',
  },

  controlnet_interior: {
    modelId: 'jagilley/controlnet-interior-design',
    strength: 0.85,
    scale: 8.5,
    steps: 25,
    resolution: 768,
    costPerRun: 0.01,
    averageTime: 12,
    description: 'ControlNet ile yapi korumali tasarim',
  },

  luxury_interior: {
    modelId: 'adirik/t2i-adapter-sdxl-depth-midas',
    strength: 0.7,
    scale: 11.0,
    steps: 40,
    resolution: 1024,
    costPerRun: 0.025,
    averageTime: 20,
    description: 'Luks ve detayli tasarimlar icin SDXL tabanli',
  },

  commercial_spaces: {
    modelId: 'timbrooks/instruct-pix2pix',
    strength: 0.75,
    scale: 9.0,
    steps: 30,
    resolution: 768,
    costPerRun: 0.012,
    averageTime: 10,
    description: 'Ticari mekanlar icin kontrollu duzenleme',
  },

  // YAPI/ARCHITECTURAL MODELLERI
  architectural_sdxl: {
    modelId: 'stability-ai/stable-diffusion-xl-base-1.0',
    strength: 0.8,
    scale: 10.0,
    steps: 35,
    resolution: 1024,
    costPerRun: 0.015,
    averageTime: 15,
    description: 'Mimari yapilar icin SDXL',
  },

  steel_structures: {
    modelId: 'lucataco/sdxl-controlnet',
    strength: 0.85,
    scale: 9.5,
    steps: 30,
    resolution: 1024,
    costPerRun: 0.018,
    averageTime: 18,
    description: 'Celik yapilar ve endustriyel binalar',
  },

  architectural_canny: {
    modelId: 'black-forest-labs/flux-canny-pro',
    strength: 0.9,
    scale: 8.0,
    steps: 25,
    resolution: 1024,
    costPerRun: 0.02,
    averageTime: 12,
    description: 'Kenar tespiti ile mimari yapi koruma',
  },

  architectural_depth: {
    modelId: 'black-forest-labs/flux-depth-pro',
    strength: 0.85,
    scale: 9.0,
    steps: 30,
    resolution: 1024,
    costPerRun: 0.022,
    averageTime: 14,
    description: 'Derinlik haritasi ile 3D yapi korumasi',
  },

  // DIS MEKAN MODELLERI
  outdoor_design: {
    modelId: 'rosebud-ai/florence-2-large',
    strength: 0.75,
    scale: 9.0,
    steps: 30,
    resolution: 1024,
    costPerRun: 0.015,
    averageTime: 12,
    description: 'Bahce, teras, dis mekan tasarimi',
  },

  landscape_sdxl: {
    modelId: 'ByteDance/SDXL-Lightning',
    strength: 0.7,
    scale: 8.5,
    steps: 20,
    resolution: 1024,
    costPerRun: 0.008,
    averageTime: 5,
    description: 'Hizli dis mekan render - Lightning model',
  },

  // OBJE OPERASYONLARI
  inpainting: {
    modelId: 'stability-ai/stable-diffusion-inpainting',
    strength: 0.95,
    scale: 7.5,
    steps: 25,
    resolution: 768,
    costPerRun: 0.01,
    averageTime: 8,
    description: 'Obje silme/ekleme icin',
  },

  object_removal: {
    modelId: 'lucataco/remove-bg',
    costPerRun: 0.005,
    averageTime: 3,
    description: 'Arka plan ve obje temizleme',
  },
} as const;

// KATEGORI -> MODEL MAPPING
export const MODEL_MAPPING: Record<string, Record<string, Record<string, ReplicateModelConfig | null>>> = {
  dekorasyon: {
    ev: {
      modern: REPLICATE_MODELS.interior_design,
      minimalist: REPLICATE_MODELS.interior_design,
      iskandinav: REPLICATE_MODELS.interior_design,
      bohem: REPLICATE_MODELS.controlnet_interior,
      rustik: REPLICATE_MODELS.controlnet_interior,
      luks: REPLICATE_MODELS.luxury_interior,
      klasik: REPLICATE_MODELS.luxury_interior,
      art_deco: REPLICATE_MODELS.luxury_interior,
    },
    ticari: {
      otel_lobisi: REPLICATE_MODELS.commercial_spaces,
      restoran: REPLICATE_MODELS.commercial_spaces,
      ofis: REPLICATE_MODELS.commercial_spaces,
      kafe: REPLICATE_MODELS.commercial_spaces,
      magaza: REPLICATE_MODELS.commercial_spaces,
      butik: REPLICATE_MODELS.commercial_spaces,
      spa: REPLICATE_MODELS.luxury_interior,
    },
    endustriyel: {
      fabrika_ofis: REPLICATE_MODELS.interior_design,
      showroom: REPLICATE_MODELS.commercial_spaces,
      toplanti_salonu: REPLICATE_MODELS.commercial_spaces,
      yemekhane: REPLICATE_MODELS.interior_design,
    },
    diger: {
      bahce_dekor: REPLICATE_MODELS.outdoor_design,
      teras_dekor: REPLICATE_MODELS.outdoor_design,
      balkon_dekor: REPLICATE_MODELS.outdoor_design,
      havuz_dekor: REPLICATE_MODELS.landscape_sdxl,
    },
  },

  yapi: {
    ev: {
      celik_villa: REPLICATE_MODELS.steel_structures,
      konteyner_ev: REPLICATE_MODELS.architectural_sdxl,
      prefabrik: REPLICATE_MODELS.architectural_sdxl,
      tiny_house: REPLICATE_MODELS.architectural_sdxl,
      cati_katlamasi: REPLICATE_MODELS.architectural_canny,
      dubleks: REPLICATE_MODELS.steel_structures,
    },
    ticari: {
      celik_magaza: REPLICATE_MODELS.steel_structures,
      ofis_binasi: REPLICATE_MODELS.architectural_depth,
      otopark: REPLICATE_MODELS.architectural_canny,
      alisveris_merkezi: REPLICATE_MODELS.architectural_depth,
      otel: REPLICATE_MODELS.steel_structures,
    },
    endustriyel: {
      celik_fabrika: REPLICATE_MODELS.steel_structures,
      depo_hangar: REPLICATE_MODELS.steel_structures,
      atolye_bina: REPLICATE_MODELS.steel_structures,
      sera_yapi: REPLICATE_MODELS.steel_structures,
      soguk_hava_deposu: REPLICATE_MODELS.steel_structures,
      enerji_santrali: REPLICATE_MODELS.architectural_depth,
    },
    diger: {
      dis_cephe: REPLICATE_MODELS.architectural_canny,
      pergola: REPLICATE_MODELS.steel_structures,
      korkuluk: REPLICATE_MODELS.steel_structures,
      havuz_yapi: REPLICATE_MODELS.architectural_sdxl,
      spor_tesisi: REPLICATE_MODELS.steel_structures,
    },
  },

  iklimlendirme: {
    ev: {
      merkezi_isitma: null,
      klima_sistemi: null,
      isi_yalitim: null,
      gunes_enerjisi: null,
      havalandirma: null,
    },
    ticari: {
      vrf_sistem: null,
      chiller: null,
      rooftop: null,
      temiz_oda: null,
      mutfak_havalandirma: null,
    },
    endustriyel: {
      fabrika_havalandirma: null,
      endustriyel_sogutma: null,
      buharlastirmali: null,
      atik_isi: null,
      basinc_kontrol: null,
    },
    diger: {
      havuz_isitma: null,
      sera_iklimlendirme: null,
      toprak_kaynak: null,
      dis_mekan_isitma: null,
    },
  },
};

// HIZMET TIPI AYARLAMALARI
export const SERVICE_TYPE_ADJUSTMENTS: Record<string, { strengthMultiplier: number; scaleMultiplier: number }> = {
  dekorasyon: { strengthMultiplier: 1.0, scaleMultiplier: 1.0 },
  yapi: { strengthMultiplier: 0.9, scaleMultiplier: 1.1 },
  iklimlendirme: { strengthMultiplier: 0.95, scaleMultiplier: 1.0 },
};

// STYLE-SPECIFIC PROMPT ENHANCEMENTS
export const STYLE_PROMPT_ENHANCEMENTS: Record<string, string> = {
  // Modern/Minimalist
  modern: 'clean lines, contemporary furniture, neutral colors, open space, natural light',
  minimalist: 'minimal furniture, white walls, simple design, uncluttered, Scandinavian style',
  iskandinav: 'light wood, white and gray tones, cozy textiles, hygge atmosphere, functional design',

  // Traditional
  luks: 'elegant furniture, marble surfaces, chandeliers, rich textures, gold accents, high-end materials',
  klasik: 'traditional furniture, ornate details, warm colors, timeless design, crown molding',
  art_deco: 'geometric patterns, bold colors, metallic accents, vintage glamour, 1920s style',

  // Eclectic
  bohem: 'colorful textiles, plants, eclectic mix, layered textures, artistic pieces',
  rustik: 'natural wood, exposed beams, stone accents, earthy tones, cozy atmosphere',

  // Commercial
  otel_lobisi: 'luxury hospitality, grand entrance, elegant lobby, premium furnishings',
  restoran: 'dining atmosphere, professional kitchen visible, ambient lighting, table settings',
  ofis: 'professional workspace, ergonomic furniture, collaborative areas, corporate design',
  kafe: 'cozy seating, coffee bar, casual atmosphere, natural light, welcoming ambiance',
  magaza: 'retail display, well-lit space, product showcasing, modern shelving',
  butik: 'exclusive atmosphere, curated displays, premium finishes, intimate space',
  spa: 'serene atmosphere, natural materials, water elements, calming tones, zen design',

  // Construction
  celik_villa: 'modern steel structure, large windows, contemporary architecture, industrial elegance',
  konteyner_ev: 'shipping container home, creative adaptation, compact living, industrial chic',
  prefabrik: 'prefabricated building, modular design, quick assembly, modern finish',
  tiny_house: 'compact living, smart storage, minimalist design, mobile home',
  celik_fabrika: 'industrial steel building, wide span, high ceiling, functional layout',
  depo_hangar: 'warehouse structure, steel frame, large doors, efficient storage',
  sera_yapi: 'greenhouse structure, glass and steel, climate controlled, agricultural',

  // Outdoor
  bahce_dekor: 'lush plants, outdoor furniture, natural landscaping, pathways, water features',
  teras_dekor: 'outdoor seating, pergola, planters, ambient lighting, entertainment area',
  balkon_dekor: 'small space design, railing planters, cozy seating, vertical garden',
  havuz_dekor: 'pool surroundings, sun loungers, cabana, tropical plants',
  dis_cephe: 'building facade, modern cladding, architectural lighting, curb appeal',
  pergola: 'steel pergola, outdoor shade, climbing plants, modern design',

  // Industrial interiors
  fabrika_ofis: 'industrial office, exposed brick, open ceiling, modern furnishings',
  showroom: 'product display space, dramatic lighting, clean layout, brand-focused',
  toplanti_salonu: 'conference room, large table, tech-equipped, professional atmosphere',
};

/**
 * Kategori, hizmet tipi ve stil icin en uygun modeli dondurur
 */
export function getModelForDesign(
  serviceType: string,
  category: string,
  style: string
): ReplicateModelConfig | null {
  const serviceMapping = MODEL_MAPPING[serviceType];
  if (!serviceMapping) return REPLICATE_MODELS.interior_design; // Fallback

  const categoryMapping = serviceMapping[category];
  if (!categoryMapping) return REPLICATE_MODELS.interior_design;

  // Exact match
  let model = categoryMapping[style];

  // Fallback: ilk bos olmayan model
  if (!model) {
    const models = Object.values(categoryMapping).filter(Boolean);
    model = models[0] || REPLICATE_MODELS.interior_design;
  }

  // null ise (iklimlendirme vb.) default don
  if (!model) return REPLICATE_MODELS.interior_design;

  // Service type adjustments
  const adjustments = SERVICE_TYPE_ADJUSTMENTS[serviceType];
  if (adjustments) {
    return {
      ...model,
      strength: (model.strength || 0.8) * adjustments.strengthMultiplier,
      scale: (model.scale || 9.0) * adjustments.scaleMultiplier,
    };
  }

  return model;
}

/**
 * Stil icin prompt enhancement dondurur
 */
export function getStylePromptEnhancement(style: string): string {
  return STYLE_PROMPT_ENHANCEMENTS[style] || '';
}

/**
 * Tam prompt olusturur (category context + style enhancement)
 */
export function buildEnhancedPrompt(
  serviceType: string,
  category: string,
  style: string,
  tool: string,
  customPrompt?: string
): string {
  const styleEnhancement = getStylePromptEnhancement(style);

  // Service type context
  const serviceContext: Record<string, string> = {
    dekorasyon: 'interior design',
    yapi: 'architectural design, steel construction',
    iklimlendirme: 'HVAC system visualization',
  };

  // Category context
  const categoryContext: Record<string, string> = {
    ev: 'residential',
    ticari: 'commercial',
    endustriyel: 'industrial',
    diger: 'outdoor',
  };

  // Tool-specific instructions
  const toolInstructions: Record<string, string> = {
    redesign: 'transform and redesign this space',
    furnish: 'add furniture and decor to this empty space',
    remove_furniture: 'remove all furniture, keep the empty room structure',
    wall_paint: 'change wall colors and finishes',
    furnish_commercial: 'add commercial furniture and professional decor',
    facade_design: 'redesign the exterior facade',
    signage_design: 'add storefront signage and branding',
    layout_plan: 'organize equipment and optimize the layout',
    equipment_placement: 'place industrial equipment efficiently',
    steel_structure: 'design steel construction elements',
    safety_visualize: 'add safety markings and equipment',
    landscape_design: 'create landscape design',
    pool_design: 'add pool area with surroundings',
    lighting_design: 'add outdoor lighting design',
    insulation: 'visualize insulation and energy systems',
    hvac_design: 'show HVAC system placement',
    solar_panel: 'add solar panel installation',
  };

  const serviceDesc = serviceContext[serviceType] || 'interior design';
  const categoryDesc = categoryContext[category] || 'residential';
  const toolInstruction = toolInstructions[tool] || 'redesign this space';

  let prompt = `${toolInstruction}, ${categoryDesc} ${serviceDesc}`;

  // Stil ismini ekle
  const readableStyle = style.replace(/_/g, ' ');
  prompt += `, ${readableStyle} style`;

  // Stil enhancement
  if (styleEnhancement) {
    prompt += `, ${styleEnhancement}`;
  }

  // Custom prompt
  if (customPrompt) {
    prompt += `, ${customPrompt}`;
  }

  // Genel kalite
  prompt += ', professional, photorealistic, high quality, 8k, maintain room structure';

  return prompt;
}

/**
 * Model maliyetini hesaplar
 */
export function calculateModelCost(model: ReplicateModelConfig, count: number = 1): number {
  return (model.costPerRun || 0.01) * count;
}

/**
 * Tahmini sureyi hesaplar
 */
export function estimateProcessingTime(model: ReplicateModelConfig, count: number = 1): number {
  return (model.averageTime || 10) * count;
}
