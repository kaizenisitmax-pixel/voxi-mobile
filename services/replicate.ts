/**
 * VOXI - Enhanced Replicate Service
 * Kategori-ozel model secimi ve optimizasyonu
 * FormData upload (React Native uyumlu)
 */

import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getModelForDesign,
  buildEnhancedPrompt,
  getStylePromptEnhancement,
  calculateModelCost,
  estimateProcessingTime,
  REPLICATE_MODELS,
  ReplicateModelConfig,
} from '../lib/replicate-model-mapping';

const REPLICATE_API_TOKEN = process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || '';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

// ==========================================
// TYPES
// ==========================================

export interface DesignInput {
  imageUri: string;
  category: string;       // 'ev', 'ticari', 'endustriyel', 'diger'
  style: string;          // 'modern', 'minimalist' vb.
  tool: string;           // 'redesign', 'furnish' vb.
  serviceType?: string;   // 'dekorasyon', 'yapi', 'iklimlendirme'
  roomType?: string;
  userId: string;
}

export interface DesignResult {
  id: string;
  original_image_url: string;
  ai_image_url: string;
  replicate_id: string;
  status: 'processing' | 'completed' | 'failed';
  modelUsed?: string;
  estimatedCost?: number;
}

// ==========================================
// IMAGE UPLOAD (React Native FormData - CALISAN YONTEM)
// ==========================================

async function uploadImageToStorage(
  imageUri: string,
  folder: string = 'designs'
): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Oturum bulunamadi');
    }

    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    // FormData (React Native uyumlu)
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/media/${filename}`;

    console.log('📤 Uploading to:', uploadUrl);

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

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filename);

    console.log('✅ Uploaded:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('❌ Upload hatasi:', error);
    throw new Error('Fotograf yuklenemedi');
  }
}

// ==========================================
// BASE64 CONVERSION (Replicate icin)
// ==========================================

async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    console.log('🔄 Base64\'e cevriliyor...');
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    console.log('✅ Base64 hazir (boyut:', dataUrl.length, 'chars)');
    return dataUrl;
  } catch (error) {
    console.error('❌ Base64 hatasi:', error);
    throw new Error('Image base64\'e cevrilemedi');
  }
}

// ==========================================
// REPLICATE API - MODEL-AWARE PREDICTION
// ==========================================

async function startReplicatePrediction(
  imageBase64: string,
  prompt: string,
  modelConfig: ReplicateModelConfig
): Promise<string> {
  try {
    // Model version belirle
    const version = modelConfig.version ||
      REPLICATE_MODELS.interior_design.version;

    const strength = modelConfig.strength || 0.8;
    const scale = modelConfig.scale || 9.0;
    const steps = modelConfig.steps || 30;
    const resolution = modelConfig.resolution || 768;

    console.log('🤖 Model:', modelConfig.modelId);
    console.log('⚙️ Params: strength=', strength, 'scale=', scale, 'steps=', steps, 'res=', resolution);

    const response = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: version,
        input: {
          image: imageBase64,
          prompt: prompt,
          a_prompt: 'best quality, extremely detailed, photo realistic, 8k uhd, professional photography, natural lighting, accurate proportions, coherent design',
          n_prompt: 'longbody, lowres, bad anatomy, bad proportions, cropped, worst quality, low quality, blurry, black image, dark image, unrealistic, mixed room types, inconsistent style',
          num_samples: 1,
          image_resolution: resolution,
          detect_resolution: resolution,
          ddim_steps: steps,
          guess_mode: false,
          strength: strength,
          scale: scale,
          seed: -1,
          eta: 0.0,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Replicate API hatasi:', error);
      throw new Error(`Replicate API hatasi: ${error?.detail || response.status}`);
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('❌ Replicate prediction hatasi:', error);
    throw new Error('AI tasarim istegi gonderilemedi');
  }
}

// ==========================================
// POLLING
// ==========================================

async function pollReplicatePrediction(
  predictionId: string,
  maxAttempts: number = 60,
  interval: number = 2000
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
        throw new Error('Prediction durumu alinamadi');
      }

      const data = await response.json();
      console.log(`🔄 Replicate durumu: ${data.status} (${attempts + 1}/${maxAttempts})`);

      if (data.status === 'succeeded') {
        console.log('🎉 Replicate output:', JSON.stringify(data.output, null, 2));
        const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        console.log('✅ AI image URL:', outputUrl);
        return outputUrl;
      }

      if (data.status === 'failed' || data.status === 'canceled') {
        throw new Error(`Tasarim basarisiz: ${data.error || 'Bilinmeyen hata'}`);
      }

      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    } catch (error) {
      console.error('❌ Polling hatasi:', error);
      throw error;
    }
  }

  throw new Error('Tasarim zaman asimina ugradi (max 2 dakika)');
}

// ==========================================
// MAIN: CREATE AI DESIGN
// ==========================================

export async function createAIDesign(input: DesignInput): Promise<DesignResult> {
  try {
    console.log('🎨 AI tasarim baslatiliyor...');
    const serviceType = input.serviceType || 'dekorasyon';

    // 1. Kategori icin en uygun modeli sec
    const modelConfig = getModelForDesign(serviceType, input.category, input.style);
    const finalModel = modelConfig || REPLICATE_MODELS.interior_design;

    console.log(`🤖 Secilen model: ${finalModel.modelId} (${finalModel.description || ''})`);
    console.log(`💰 Tahmini maliyet: $${calculateModelCost(finalModel)}`);
    console.log(`⏱️ Tahmini sure: ${estimateProcessingTime(finalModel)}s`);

    // 2. Orijinal fotoğrafı Supabase Storage'a yukle
    console.log('📤 Fotograf yukleniyor...');
    const originalImageUrl = await uploadImageToStorage(input.imageUri, 'originals');

    // 3. Fotoğrafı base64'e cevir (Replicate icin)
    const base64Image = await convertImageToBase64(input.imageUri);

    // 4. Enhanced prompt olustur
    const prompt = buildEnhancedPrompt(
      serviceType,
      input.category,
      input.style,
      input.tool,
    );
    console.log('📝 Enhanced Prompt:', prompt);

    // 5. Design kaydi olustur (processing)
    const { data: design, error: designError } = await supabase
      .from('designs')
      .insert({
        user_id: input.userId,
        original_image_url: originalImageUrl,
        ai_image_url: '',
        category: input.category,
        style: input.style,
        tool: input.tool,
        service_type: serviceType,
        room_type: input.roomType,
        prompt: prompt,
        processing_status: 'processing',
      })
      .select()
      .single();

    if (designError || !design) {
      console.error('❌ Tasarim kaydi hatasi:', JSON.stringify(designError, null, 2));
      throw new Error(`Tasarim kaydi olusturulamadi: ${designError?.message || 'Bilinmeyen hata'}`);
    }

    console.log('💾 Tasarim kaydi olusturuldu:', design.id);

    // 6. Replicate API'ye istek gonder (model-aware)
    console.log('🚀 Replicate API istegi gonderiliyor...');
    console.log('📸 Original image URL:', originalImageUrl);
    const predictionId = await startReplicatePrediction(base64Image, prompt, finalModel);

    // 7. Design kaydina replicate_id ekle
    await supabase
      .from('designs')
      .update({ replicate_id: predictionId })
      .eq('id', design.id);

    console.log('⏳ Replicate isleniyor... (ID:', predictionId, ')');

    // 8. Polling ile sonucu bekle
    const aiImageUrl = await pollReplicatePrediction(predictionId);

    console.log('✅ AI tasarim tamamlandi!');

    // 9. Design kaydini guncelle
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
      throw new Error('Tasarim guncellenemedi');
    }

    return {
      id: updatedDesign.id,
      original_image_url: updatedDesign.original_image_url,
      ai_image_url: updatedDesign.ai_image_url,
      replicate_id: predictionId,
      status: 'completed',
      modelUsed: finalModel.modelId,
      estimatedCost: calculateModelCost(finalModel),
    };
  } catch (error) {
    console.error('❌ AI tasarim hatasi:', error);

    // Hata durumunda design kaydini guncelle
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

// ==========================================
// CANCEL PREDICTION
// ==========================================

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
    console.error('❌ Prediction iptal hatasi:', error);
  }
}

// ==========================================
// COST & TIME ESTIMATION (UI icin)
// ==========================================

export function estimateDesignCost(
  serviceType: string,
  category: string,
  style: string,
): { cost: number; time: number; model: string } | null {
  const modelConfig = getModelForDesign(serviceType, category, style);
  if (!modelConfig) return null;

  return {
    cost: calculateModelCost(modelConfig),
    time: estimateProcessingTime(modelConfig),
    model: modelConfig.modelId,
  };
}

// ==========================================
// GENERATE VARIATIONS (Gelecek icin)
// ==========================================

export async function generateVariations(
  input: DesignInput,
  count: number = 4
): Promise<DesignResult[]> {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(createAIDesign(input));
  }
  return Promise.all(promises);
}
