import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

export const WEB_API = 'https://voxi-web-production.vercel.app';

// ─── Types ────────────────────────────────────────────────────────
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

export type VoxiChatMessage = { role: 'user' | 'assistant'; content: string };

export type VoxiChatResponse = {
  message: string;
  actions: unknown[];
  suggestions: string[];
  eq: {
    tone: string;
    milestone: { count: number; message: string; emoji: string } | null;
  };
};

// ─── Storage Upload Helper ─────────────────────────────────────────
// Uploads a file directly (binary) to Supabase Storage.
// Uses Expo FileSystem.uploadAsync — no base64 in memory, very efficient.
async function uploadToStorage(
  fileUri: string,
  fileType: string,
  fileName: string,
  workspaceId: string,
  accessToken: string,
): Promise<{ signedUrl: string; path: string } | null> {
  const ext = fileName.split('.').pop() || 'bin';
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${workspaceId}/${Date.now()}-${safeName}`;

  console.log('[uploadToStorage] Uploading...', { path, fileType });

  try {
    const uploadResult = await FileSystem.uploadAsync(
      `${SUPABASE_URL}/storage/v1/object/smart-create-uploads/${path}`,
      fileUri,
      {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': fileType,
          'x-upsert': 'true',
        },
        // 0 = BINARY_CONTENT (sends raw file bytes, no encoding)
        uploadType: 0 as FileSystem.FileSystemUploadType,
      },
    );

    console.log('[uploadToStorage] Status:', uploadResult.status, uploadResult.body?.slice(0, 200));

    if (uploadResult.status >= 400) {
      console.error('[uploadToStorage] Upload failed:', uploadResult.body);
      return null;
    }

    // Create signed URL valid for 10 minutes
    const { data: signedData, error: signedError } = await supabase.storage
      .from('smart-create-uploads')
      .createSignedUrl(path, 600);

    if (signedError || !signedData?.signedUrl) {
      console.error('[uploadToStorage] SignedURL error:', signedError);
      return null;
    }

    console.log('[uploadToStorage] Success, signed URL created');
    return { signedUrl: signedData.signedUrl, path };
  } catch (err) {
    console.error('[uploadToStorage] Exception:', err);
    return null;
  }
}

// ─── SmartCreate ──────────────────────────────────────────────────
/**
 * Main AI pipeline: file/text → Supabase Storage upload → API call → structured card data.
 *
 * Architecture:
 * 1. Files are uploaded directly to Supabase Storage (binary, no base64 in memory).
 * 2. A signed URL is passed to the API instead of raw bytes.
 * 3. Server downloads from storage (server-to-server, fast) and processes with AI.
 * 4. Falls back to base64 if storage upload fails (small files only).
 */
export async function smartCreate(
  type: 'voice' | 'photo' | 'text' | 'document',
  payload: { fileUri?: string; text?: string; fileType?: string; fileName?: string },
  workspaceId: string,
  industryId?: number | null,
): Promise<SmartCreateResult> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Oturum bulunamadı');

  const body: Record<string, string | number | undefined> = {
    type,
    workspace_id: workspaceId,
    industryId: industryId ?? undefined,
  };

  if ((type === 'voice' || type === 'photo' || type === 'document') && payload.fileUri) {
    const fileType = payload.fileType || (
      type === 'voice' ? 'audio/m4a' :
      type === 'photo' ? 'image/jpeg' :
      'application/pdf'
    );
    const fileName = payload.fileName || `file.${
      type === 'voice' ? 'm4a' : type === 'photo' ? 'jpg' : 'pdf'
    }`;

    // Try storage upload first (most efficient — no large JSON body)
    const uploaded = await uploadToStorage(
      payload.fileUri,
      fileType,
      fileName,
      workspaceId,
      session.access_token,
    );

    if (uploaded) {
      // Best path: pass signed URL to API (tiny JSON payload)
      body.signedUrl = uploaded.signedUrl;
      body.storagePath = uploaded.path;
      body.fileName = fileName;
      body.fileType = fileType;
      console.log('[smartCreate] Using storage path:', uploaded.path);
    } else {
      // Fallback: base64 (only for small files)
      console.log('[smartCreate] Storage failed, reading as base64...');
      const base64 = await FileSystem.readAsStringAsync(payload.fileUri, {
        encoding: 'base64' as FileSystem.EncodingType,
      });
      const estimatedSizeMB = (base64.length * 0.75) / 1_048_576;
      console.log('[smartCreate] Base64 length:', base64.length, `(~${estimatedSizeMB.toFixed(1)}MB)`);

      if (base64.length > 8_000_000) {
        throw new Error(
          `Dosya çok büyük (~${estimatedSizeMB.toFixed(0)}MB). ` +
          'Lütfen daha küçük bir dosya seçin (max 6MB).',
        );
      }
      body.fileBase64 = base64;
      body.fileName = fileName;
      body.fileType = fileType;
    }
  }

  if (payload.text) body.text = payload.text;

  console.log('[smartCreate] Calling API...', {
    type,
    workspaceId,
    hasSignedUrl: !!body.signedUrl,
    hasBase64: !!(body.fileBase64),
  });

  // 55s client timeout — just under Vercel's 60s maxDuration
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55_000);

  let response: Response;
  try {
    response = await fetch(`${WEB_API}/api/smart-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('İşlem zaman aşımına uğradı. Daha küçük bir dosya deneyin.');
    }
    throw new Error(`Bağlantı hatası: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
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
        if (response.status === 504) {
          errorMsg = 'İşlem zaman aşımına uğradı. Dosya boyutunu küçültün veya tekrar deneyin.';
        }
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}

// ─── VOXI Chat ────────────────────────────────────────────────────
export async function voxiChat(
  messages: VoxiChatMessage[],
  workspaceId: string,
  teamId: string,
  industryId?: number | null,
): Promise<VoxiChatResponse> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Oturum bulunamadı');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55_000);

  let response: Response;
  try {
    response = await fetch(`${WEB_API}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages, workspaceId, teamId, industryId }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('VOXI yanıt vermedi. Tekrar deneyin.');
    throw new Error(`Bağlantı hatası: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Hata (${response.status})`);
  }

  return await response.json();
}

// ─── Mood Check-in ────────────────────────────────────────────────
export async function submitMoodCheckin(
  workspaceId: string,
  level: 1 | 2 | 3 | 4 | 5,
): Promise<{ voxi_response: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Oturum bulunamadı');

  const response = await fetch(`${WEB_API}/api/eq/mood`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ workspaceId, level }),
  });

  return await response.json();
}
