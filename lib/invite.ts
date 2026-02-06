import { supabase } from './supabase';
import { sendSms } from './sms';
import { Share, Linking } from 'react-native';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0,O,1,I,L çıkarıldı
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export async function createInvitation(
  workspaceId: string, teamId: string, invitedBy: string,
  role: 'member' | 'manager' = 'member', maxUses: number = 1
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('invitations').insert({
      workspace_id: workspaceId, team_id: teamId, invite_code: code,
      invited_by: invitedBy, role, status: 'pending',
      max_uses: maxUses, use_count: 0, expires_at: expiresAt,
    });

    if (error) {
      console.error('Davet oluşturma hatası:', error);
      return { success: false, error: 'Davet oluşturulamadı' };
    }
    return { success: true, code };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function shareInviteViaWhatsApp(code: string, workspaceName: string, teamName: string): Promise<void> {
  const message = `${workspaceName} - ${teamName} ekibine davet edildiniz!\n\nVOXI uygulamasını indirin ve bu kodla katılın:\n\nDavet Kodu: ${code}\n\nhttps://voxi.app/join/${code}`;
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
  const canOpen = await Linking.canOpenURL(whatsappUrl);
  if (canOpen) await Linking.openURL(whatsappUrl);
  else await Share.share({ message });
}

export async function shareInviteViaSms(
  code: string, phone: string, workspaceName: string, teamName: string
): Promise<{ success: boolean; error?: string }> {
  const message = `${workspaceName} - ${teamName} ekibine davetlisiniz! VOXI uygulamasini indirip ${code} koduyla katilabilirsiniz. voxi.app/join/${code}`;
  return await sendSms(phone, message);
}

export async function shareInviteGeneral(code: string, workspaceName: string, teamName: string): Promise<void> {
  const message = `${workspaceName} - ${teamName} ekibine davet edildiniz!\n\nVOXI uygulamasını indirin ve bu kodla katılın:\n\nDavet Kodu: ${code}\n\nhttps://voxi.app/join/${code}`;
  await Share.share({ message, title: `${teamName} Ekibine Davet` });
}

export async function validateInviteCode(code: string): Promise<{
  valid: boolean; invitation?: any; workspace?: any; team?: any; error?: string;
}> {
  try {
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`*, workspaces:workspace_id (id, name, slug), teams:team_id (id, name)`)
      .eq('invite_code', code)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !invitation) return { valid: false, error: 'Geçersiz veya süresi dolmuş davet kodu' };
    if (invitation.max_uses > 0 && invitation.use_count >= invitation.max_uses) {
      return { valid: false, error: 'Bu davet kodunun kullanım limiti dolmuş' };
    }
    return { valid: true, invitation, workspace: invitation.workspaces, team: invitation.teams };
  } catch (error) {
    return { valid: false, error: 'Doğrulama hatası' };
  }
}

export async function acceptInvitation(
  invitationId: string, userId: string, workspaceId: string, teamId: string, role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: memberError } = await supabase.from('workspace_members').insert({
      workspace_id: workspaceId, user_id: userId, team_id: teamId,
      role: role || 'member', is_active: true,
    });

    if (memberError) {
      if (memberError.code === '23505') return { success: true }; // Zaten üye
      console.error('Üyelik ekleme hatası:', memberError);
      return { success: false, error: 'Ekibe katılamadınız' };
    }

    // use_count artır
    const { data: inv } = await supabase.from('invitations').select('use_count').eq('id', invitationId).single();
    await supabase.from('invitations').update({ use_count: (inv?.use_count || 0) + 1 }).eq('id', invitationId);

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}
