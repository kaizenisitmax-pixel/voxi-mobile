import { supabase } from './supabase';

const API_BASE = 'https://blckiefpjkuytdraokwn.supabase.co/functions/v1';
const WEB_API = process.env.EXPO_PUBLIC_WEB_URL || 'https://voxi-web-6ids.vercel.app';

type AIProcessResult = {
  title: string;
  description: string;
  customerName: string | null;
  labels: string[];
  priority: string;
  isNewBusiness: boolean;
};

export async function processInput(
  input: string,
  type: 'voice' | 'photo' | 'document' | 'text',
  workspaceId: string
): Promise<AIProcessResult> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('No session');

    const response = await fetch(`${WEB_API}/api/ai-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ input, type, workspace_id: workspaceId }),
    });

    if (response.ok) {
      return await response.json();
    }

    throw new Error('API error');
  } catch {
    return {
      title: input.slice(0, 80),
      description: input,
      customerName: null,
      labels: [],
      priority: 'normal',
      isNewBusiness: true,
    };
  }
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('No session');

    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${WEB_API}/api/transcribe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || '';
    }

    return '';
  } catch {
    return '';
  }
}

export async function analyzeImage(imageUri: string): Promise<string> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('No session');

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const response = await fetch(`${WEB_API}/api/vision`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.description || '';
    }

    return '';
  } catch {
    return '';
  }
}
