// Replicate API Service for Interior Design AI

import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

const REPLICATE_API_TOKEN = process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || '';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

// Interior design models - GÜNCEL ve ÇALIŞAN MODELLER
const MODELS = {
  // DEFAULT: adirik/interior-design - 1.8M+ runs, doğrulanmış, hızlı (6s)
  // ✅ En popüler, genel amaçlı, hızlı
  interior_design: 'adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38',
  
  // ALTERNATIFLER (gelecekte kullanıcıya seçim sunabiliriz):
  // 1. interior-design-ai - 500K+ runs, daha detaylı
  // interior_ai: 'fofr/interior-design-ai:latest',
  
  // 2. room-designer - 300K+ runs, özel room detection
  // room_designer: 'jagilley/controlnet-scribble:latest',
  
  // 3. Yedek model
  interior_sdxl: 'rocketdigitalai/interior-design-sdxl:latest',
};

export interface DesignInput {
  imageUri: string;           // Yerel fotoğraf URI
  category: string;            // 'ev', 'ticari', 'endustriyel', 'diger'
  style: string;               // 'modern', 'minimalist' vb.
  tool: string;                // 'redesign', 'furnish' vb.
  serviceType?: string;        // 'dekorasyon', 'yapi', 'iklimlendirme'
  roomType?: string;           // 'Oturma Odası', 'Yatak Odası' vb.
  userId: string;              // Supabase user ID
}

export interface DesignResult {
  id: string;                  // Design record ID
  original_image_url: string;  // Orijinal fotoğraf URL
  ai_image_url: string;        // AI tarafından oluşturulan tasarım URL
  replicate_id: string;        // Replicate prediction ID
  status: 'processing' | 'completed' | 'failed';
}

/**
 * Convert local image to base64 data URL (React Native compatible)
 */
async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    console.log('🔄 Base64\'e çevriliyor...');
    
    // Read as base64 using expo-file-system
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Add data URL prefix
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    console.log('✅ Base64 dönüştürme tamamlandı (boyut:', dataUrl.length, 'chars)');
    
    return dataUrl;
  } catch (error) {
    console.error('❌ Base64 dönüştürme hatası:', error);
    throw new Error('Image base64\'e çevrilemedi');
  }
}

/**
 * Upload image to Supabase Storage using FormData (React Native compatible)
 */
async function uploadImageToStorage(
  imageUri: string,
  folder: string = 'designs'
): Promise<string> {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Oturum bulunamadı');
    }

    // Unique filename oluştur
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    // FormData oluştur (React Native)
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    // Supabase Storage API endpoint
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/media/${filename}`;

    console.log('📤 Uploading to:', uploadUrl);

    // Fetch ile upload
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    // Public URL al
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filename);

    console.log('✅ Uploaded successfully:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('❌ Fotoğraf yükleme hatası:', error);
    throw new Error('Fotoğraf yüklenemedi');
  }
}

/**
 * Generate prompt based on category, style, and tool
 * Enhanced with room type detection and context
 */
function generatePrompt(input: DesignInput): string {
  const { category, style, tool, serviceType, roomType } = input;

  // Türkçe → İngilizce stil çevirileri
  const styleMap: Record<string, string> = {
    // Ev
    modern: 'modern',
    minimalist: 'minimalist',
    iskandinav: 'scandinavian',
    bohem: 'bohemian',
    endustriyel: 'industrial',
    luks: 'luxury',
    klasik: 'classic',
    rustik: 'rustic',
    // Ticari
    otel_lobisi: 'hotel lobby',
    restoran: 'restaurant',
    ofis: 'office',
    kafe: 'cafe',
    magaza: 'retail store',
    butik: 'boutique',
    spa: 'spa',
    // Endüstriyel
    fabrika: 'factory',
    depo: 'warehouse',
    atolye: 'workshop',
    sera: 'greenhouse',
    laboratuvar: 'laboratory',
    // Diğer
    dis_cephe: 'exterior facade',
    bahce: 'garden',
    teras: 'terrace',
    havuz: 'pool area',
    balkon: 'balcony',
  };

  const englishStyle = styleMap[style] || style;

  // Service type context
  const serviceContext: Record<string, string> = {
    dekorasyon: 'interior decoration',
    yapi: 'steel construction and modern architecture',
    iklimlendirme: 'HVAC and climate control system',
  };

  // Category-specific context
  const categoryContext: Record<string, string> = {
    ev: 'residential',
    ticari: 'commercial',
    endustriyel: 'industrial',
    diger: 'outdoor',
  };

  const serviceDesc = serviceContext[serviceType || 'dekorasyon'] || 'interior design';
  const categoryDesc = categoryContext[category] || 'interior';
  const context = `${categoryDesc} ${serviceDesc}`;

  // Tool'a göre instruction-based prompts with enhanced context
  const toolInstructions: Record<string, string> = {
    redesign: `transform this ${context} into a ${englishStyle} design, maintain the room structure and layout`,
    furnish: `add ${englishStyle} furniture and decor to this ${context}, keep the architectural elements`,
    remove_furniture: `remove all furniture from this ${context}, keep walls and floors clean`,
    wall_paint: `repaint walls of this ${context} in ${englishStyle} colors, preserve furniture placement`,
    furnish_commercial: `furnish this ${context} with ${englishStyle} commercial furniture and professional decor`,
    facade_design: `redesign exterior facade in ${englishStyle} architecture style`,
    signage_design: `add ${englishStyle} storefront signage and branding elements`,
    layout_plan: `organize equipment and layout in ${englishStyle} industrial design`,
    equipment_placement: `place industrial equipment following ${englishStyle} principles`,
    safety_visualize: `add industrial safety markings, equipment and signage`,
    landscape_design: `transform this outdoor area into ${englishStyle} garden landscape`,
    pool_design: `add ${englishStyle} pool area with surrounding landscape`,
    lighting_design: `add ${englishStyle} outdoor lighting and ambiance`,
  };

  const instruction = toolInstructions[tool] || `redesign this ${context} in ${englishStyle} style`;

  return instruction;
}

/**
 * Start Replicate prediction with base64 image
 */
async function startReplicatePrediction(
  imageBase64: string,
  prompt: string
): Promise<string> {
  try {
    const response = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MODELS.interior_design.split(':')[1],
        input: {
          image: imageBase64,
          prompt: `${prompt}, professional interior design, photorealistic, high quality, 8k, maintain room type and structure`,
          a_prompt: "best quality, extremely detailed, photo realistic, 8k uhd, professional photography, natural lighting, accurate proportions, coherent design",
          n_prompt: "longbody, lowres, bad anatomy, bad proportions, cropped, worst quality, low quality, blurry, black image, dark image, unrealistic, mixed room types, inconsistent style, extra rooms",
          num_samples: 1,
          image_resolution: 768,
          detect_resolution: 768,
          ddim_steps: 30,
          guess_mode: false,
          strength: 0.8, // Daha az agresif (orijinal yapıyı koru)
          scale: 9.0,    // Daha yüksek guidance (prompt'u daha iyi takip et)
          seed: -1,
          eta: 0.0,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Replicate API hatası:', error);
      throw new Error('Replicate API isteği başarısız');
    }

    const data = await response.json();
    return data.id; // Prediction ID
  } catch (error) {
    console.error('❌ Replicate prediction hatası:', error);
    throw new Error('AI tasarım isteği gönderilemedi');
  }
}

/**
 * Poll Replicate prediction status
 */
async function pollReplicatePrediction(
  predictionId: string,
  maxAttempts: number = 60, // 60 * 2 = 120 saniye max
  interval: number = 2000    // 2 saniye
): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${REPLICATE_API_URL}/${predictionId}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error('Prediction durumu alınamadı');
      }

      const data = await response.json();

      console.log(`🔄 Replicate durumu: ${data.status} (${attempts + 1}/${maxAttempts})`);

      if (data.status === 'succeeded') {
        // Output URL'i döndür
        console.log('🎉 Replicate output:', JSON.stringify(data.output, null, 2));
        
        // Output string ise direkt döndür, array ise ilk elemanı al
        const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        
        console.log('✅ AI image URL:', outputUrl);
        return outputUrl;
      }

      if (data.status === 'failed' || data.status === 'canceled') {
        throw new Error(`Tasarım başarısız: ${data.error || 'Bilinmeyen hata'}`);
      }

      // Status: starting, processing → bekle ve tekrar dene
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    } catch (error) {
      console.error('❌ Polling hatası:', error);
      throw error;
    }
  }

  throw new Error('Tasarım zaman aşımına uğradı (max 2 dakika)');
}

/**
 * Main function: Start AI design process
 */
export async function createAIDesign(input: DesignInput): Promise<DesignResult> {
  try {
    console.log('🎨 AI tasarım başlatılıyor...');

    // 1. Orijinal fotoğrafı Supabase Storage'a yükle
    console.log('📤 Fotoğraf yükleniyor...');
    const originalImageUrl = await uploadImageToStorage(input.imageUri, 'originals');

    // 2. Fotoğrafı base64'e çevir (Replicate için)
    const base64Image = await convertImageToBase64(input.imageUri);

    // 3. Prompt oluştur
    const prompt = generatePrompt(input);
    console.log('📝 Prompt:', prompt);

    // 4. Design kaydı oluştur (processing durumunda)
    const { data: design, error: designError } = await supabase
      .from('designs')
      .insert({
        user_id: input.userId,
        original_image_url: originalImageUrl,
        ai_image_url: '', // Henüz yok
        category: input.category,
        style: input.style,
        tool: input.tool,
        room_type: input.roomType,
        prompt: prompt,
        processing_status: 'processing',
      })
      .select()
      .single();

    if (designError || !design) {
      console.error('❌ Tasarım kaydı hatası:', JSON.stringify(designError, null, 2));
      throw new Error(`Tasarım kaydı oluşturulamadı: ${designError?.message || 'Bilinmeyen hata'}`);
    }

    console.log('💾 Tasarım kaydı oluşturuldu:', design.id);

    // 5. Replicate API'ye istek gönder (base64 ile)
    console.log('🚀 Replicate API isteği gönderiliyor...');
    console.log('📸 Original image URL (Supabase):', originalImageUrl);
    console.log('📦 Base64 image ready (length:', base64Image.length, 'chars)');
    const predictionId = await startReplicatePrediction(base64Image, prompt);

    // 5. Design kaydına replicate_id ekle
    await supabase
      .from('designs')
      .update({ replicate_id: predictionId })
      .eq('id', design.id);

    console.log('⏳ Replicate işleniyor... (ID:', predictionId, ')');

    // 6. Polling ile sonucu bekle
    const aiImageUrl = await pollReplicatePrediction(predictionId);

    console.log('✅ AI tasarım tamamlandı!');

    // 7. Design kaydını güncelle
    const { data: updatedDesign, error: updateError } = await supabase
      .from('designs')
      .update({
        ai_image_url: aiImageUrl,
        processing_status: 'completed',
      })
      .eq('id', design.id)
      .select()
      .single();

    if (updateError || !updatedDesign) {
      throw new Error('Tasarım güncellenemedi');
    }

    return {
      id: updatedDesign.id,
      original_image_url: updatedDesign.original_image_url,
      ai_image_url: updatedDesign.ai_image_url,
      replicate_id: predictionId,
      status: 'completed',
    };
  } catch (error) {
    console.error('❌ AI tasarım hatası:', error);
    
    // Hata durumunda design kaydını güncelle
    if (input.userId) {
      await supabase
        .from('designs')
        .update({ processing_status: 'failed' })
        .eq('user_id', input.userId)
        .eq('processing_status', 'processing')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    throw error;
  }
}

/**
 * Cancel ongoing prediction
 */
export async function cancelReplicatePrediction(predictionId: string): Promise<void> {
  try {
    await fetch(`${REPLICATE_API_URL}/${predictionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      },
    });
    console.log('🛑 Replicate prediction iptal edildi');
  } catch (error) {
    console.error('❌ Prediction iptal hatası:', error);
  }
}
