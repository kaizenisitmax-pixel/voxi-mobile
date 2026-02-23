import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

const WEB_API = 'https://voxi-web-production.vercel.app';

export type SmartCreateResult = {
  title: string;
  description: string;
  customerName: string | null;
  labels: string[];
  priority: string;
  isNewBusiness: boolean;
  voiceResponse: string;
  transcript?: string;
  insights?: string[];
  extractedDetails?: Record<string, string>;
};

/**
 * Single API call: audio/photo → transcribe/vision → AI analysis → structured card data.
 * Sends file as base64 in JSON body (avoids React Native FormData issues).
 */
export async function smartCreate(
  type: 'voice' | 'photo' | 'text' | 'document',
  payload: { fileUri?: string; text?: string; fileType?: string; fileName?: string },
  workspaceId: string,
  industryId?: number | null
): Promise<SmartCreateResult> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Oturum bulunamadı');

  const body: Record<string, string | number | undefined> = {
    type,
    workspace_id: workspaceId,
    industryId: industryId || undefined,
  };

  if ((type === 'voice' || type === 'photo' || type === 'document') && payload.fileUri) {
    console.log('[smartCreate] Reading file as base64...');
    const base64 = await FileSystem.readAsStringAsync(payload.fileUri, {
      encoding: 'base64' as FileSystem.EncodingType,
    });
    console.log('[smartCreate] Base64 length:', base64.length);
    body.fileBase64 = base64;
    body.fileName = payload.fileName || 'file';
    body.fileType = payload.fileType || 'application/octet-stream';
  }

  if (payload.text) {
    body.text = payload.text;
  }

  console.log('[smartCreate] Calling API...', { type, workspaceId, hasFile: !!body.fileBase64 });

  const fetchPromise = fetch(`${WEB_API}/api/smart-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Zaman aşımı (35s). Lütfen tekrar deneyin.')), 35000)
  );

  let response: Response;
  try {
    response = await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err: any) {
    console.error('[smartCreate] Fetch error:', err.message);
    throw err;
  }

  console.log('[smartCreate] Response status:', response.status);

  if (!response.ok) {
    let errorMsg = `Sunucu hatası (${response.status})`;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const err = await response.json();
        errorMsg = err.error || errorMsg;
      } else {
        const text = await response.text();
        console.error('[smartCreate] Non-JSON error:', text.slice(0, 300));
        errorMsg = `Sunucu hatası (${response.status})`;
      }
    } catch (parseErr) {
      console.error('[smartCreate] Error parsing response:', parseErr);
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}
