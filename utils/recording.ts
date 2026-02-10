/**
 * VOXI Recording Utilities
 * Ortak ses kayıt fonksiyonları
 */

import { Audio } from 'expo-av';

// transcribeAudio'yu lib/ai'den re-export
export { transcribeAudio } from '../lib/ai';

export interface RecordingResult {
  uri: string;
  duration: number;
}

/**
 * Ses kaydı başlatır
 * @returns Promise<Audio.Recording> - Kayıt objesi
 */
export async function startRecording(): Promise<Audio.Recording> {
  console.log('🎤 Kayıt başlatılıyor...');
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  
  const recordingOptions = {
    isMeteringEnabled: true,
    android: {
      extension: '.wav',
      outputFormat: Audio.AndroidOutputFormat.DEFAULT,
      audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.wav',
      outputFormat: Audio.IOSOutputFormat.LINEARPCM,
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/wav',
      bitsPerSecond: 128000,
    },
  };
  
  const { recording } = await Audio.Recording.createAsync(recordingOptions);
  console.log('✅ Kayıt başladı:', new Date().toISOString());
  
  return recording;
}

/**
 * Ses kaydını durdurur ve URI döndürür
 * @param recording - Audio.Recording objesi
 * @returns Promise<RecordingResult | null> - Kayıt URI'si ve süresi veya null
 */
export async function stopRecording(recording: Audio.Recording | null): Promise<RecordingResult | null> {
  if (!recording) {
    console.error('❌ Recording objesi yok');
    return null;
  }
  
  try {
    console.log('🛑 Kayıt durduruluyor...');
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    // ÖNEMLI: Kayıt modundan çık (TTS için gerekli)
    // allowsRecordingIOS: true iken ses çıkışı kısılır
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    console.log('🔊 Audio mode: Kayıt kapatıldı, TTS hazır');
    
    if (!uri) {
      console.error('❌ URI alınamadı');
      return null;
    }
    
    console.log('📂 Dosya URI:', uri);
    
    // Dosya boyutu kontrolü
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileSize = blob.size;
    
    console.log('📊 Dosya boyutu:', fileSize, 'bytes');
    
    // Minimum 10KB kontrolü (boş WAV header ~4KB)
    if (!fileSize || fileSize < 10000) {
      console.warn('⚠️ Dosya çok küçük veya boş:', fileSize, 'bytes');
      return null;
    }
    
    // Yaklaşık süre hesapla (WAV için: bytes / (sample_rate * channels * bit_depth / 8))
    // 16000 Hz, 1 kanal, 16 bit = 16000 * 1 * 2 = 32000 bytes/sec
    const duration = Math.round((fileSize / 32000) * 1000); // milliseconds
    
    return {
      uri,
      duration,
    };
  } catch (error) {
    console.error('❌ Kayıt durdurma hatası:', error);
    return null;
  }
}
