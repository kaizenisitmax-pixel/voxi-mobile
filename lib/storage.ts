import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

/**
 * Upload voice note to Supabase Storage
 * @param fileUri Local file URI of the voice note
 * @param taskId Task ID for organizing files
 * @returns Public URL of the uploaded file
 */
export async function uploadVoiceToStorage(
  fileUri: string,
  taskId: string
): Promise<string> {
  try {
    // Generate unique file name
    const timestamp = Date.now();
    const fileName = `voice_${taskId}_${timestamp}.m4a`;
    const storagePath = `voice-notes/${fileName}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob
    const blob = base64ToBlob(base64, 'audio/m4a');

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('voice-notes')
      .upload(storagePath, blob, {
        contentType: 'audio/m4a',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Storage upload hatası:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-notes')
      .getPublicUrl(storagePath);

    console.log('✅ Ses dosyası yüklendi:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ uploadVoiceToStorage hatası:', error);
    throw error;
  }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Delete voice note from Supabase Storage
 * @param fileUrl Public URL of the file to delete
 */
export async function deleteVoiceFromStorage(fileUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split('/voice-notes/');
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL');
    }

    const filePath = `voice-notes/${urlParts[1]}`;

    const { error } = await supabase.storage
      .from('voice-notes')
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage silme hatası:', error);
      throw error;
    }

    console.log('✅ Ses dosyası silindi:', filePath);
  } catch (error) {
    console.error('❌ deleteVoiceFromStorage hatası:', error);
    throw error;
  }
}
