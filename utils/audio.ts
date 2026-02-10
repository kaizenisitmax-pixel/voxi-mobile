/**
 * VOXI Audio/TTS Utilities
 * Ortak TTS (Text-to-Speech) fonksiyonları
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

/**
 * OpenAI TTS ile metni sese çevirir ve çalar
 * @param text - Konuşturulacak metin
 * @returns Promise<Audio.Sound | null> - Çalan ses objesi veya null
 */
export async function speakText(text: string): Promise<Audio.Sound | null> {
  if (!text || !OPENAI_API_KEY) {
    console.log('⚠️ TTS atlandı: text veya API key yok');
    return null;
  }
  
  try {
    console.log('🔊 TTS başlıyor:', text);
    console.log('🔑 TTS Key:', OPENAI_API_KEY?.substring(0, 15) + '...');
    
    const headers = {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text,
        voice: 'echo',
        response_format: 'mp3',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ TTS hatası:', response.status, errorText);
      return null;
    }

    const blob = await response.blob();
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const fileUri = FileSystem.cacheDirectory + 'tts_response.mp3';
          
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Audio modunu speaker'a çek (maksimum ses için)
          // ÖNEMLI: allowsRecordingIOS: false olmalı, yoksa ses kısılır
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
          });
          
          const { sound } = await Audio.Sound.createAsync(
            { uri: fileUri },
            { 
              shouldPlay: true,
              volume: 1.0,
              rate: 1.0,
              shouldCorrectPitch: true,
            }
          );
          
          // Volume'ü maksimuma çek
          await sound.setVolumeAsync(1.0);
          
          // Ses durumunu logla
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            console.log('✅ TTS çalıyor - Süre:', status.durationMillis, 'ms');
            console.log('🔊 Volume:', status.volume);
          }
          
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) {
              console.log('✅ TTS tamamlandı');
              sound.unloadAsync();
            }
          });
          
          resolve(sound);
        } catch (e) {
          console.error('❌ TTS dosya yazma hatası:', e);
          reject(e);
        }
      };
      
      reader.onerror = () => {
        console.error('❌ TTS blob okuma hatası');
        reject(new Error('Blob okuma hatası'));
      };
      
      console.log('📦 TTS blob boyutu:', blob.size, 'bytes');
      reader.readAsDataURL(blob);
    });
    
  } catch (error) {
    console.error('❌ TTS hatası:', error);
    return null;
  }
}

/**
 * Çalan sesi durdurur
 * @param sound - Durdurulacak Audio.Sound objesi
 */
export async function stopSound(sound: Audio.Sound | null) {
  if (sound) {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
      console.log('🛑 TTS durduruldu');
    } catch (e) {
      console.error('TTS durdurma hatası:', e);
    }
  }
}
