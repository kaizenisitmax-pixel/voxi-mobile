import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export async function sendSms(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ phone, message }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Bağlantı hatası' };
  }
}

export async function sendOtp(phone: string): Promise<{ success: boolean; error?: string; wait_seconds?: number }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Bağlantı hatası' };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<{
  success: boolean; error?: string; user_id?: string; is_new_user?: boolean; remaining_attempts?: number;
}> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Bağlantı hatası' };
  }
}
