import { supabase } from './supabase';

interface WorkspaceInfo {
  workspaceId: string;
  teamId: string;
  userId: string;
  fullName: string;
  role: string;
}

let cachedInfo: WorkspaceInfo | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

export async function getWorkspaceInfo(): Promise<WorkspaceInfo | null> {
  // Cache varsa ve 5 dakikadan eski değilse kullan
  if (cachedInfo && (Date.now() - cacheTime) < CACHE_DURATION) {
    return cachedInfo;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔍 Workspace - user:', user?.id);
    if (!user) return null;

    // Profil bilgisi
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    console.log('🔍 Workspace - profile:', profile, 'error:', profileError);

    // Aktif workspace membership
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id, team_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    console.log('🔍 Workspace - membership:', membership, 'error:', membershipError);

    if (!membership) {
      console.log('🔍 Workspace - membership bulunamadı, null dönüyor');
      return null;
    }

    cachedInfo = {
      workspaceId: membership.workspace_id,
      teamId: membership.team_id,
      userId: user.id,
      fullName: profile?.full_name || 'Bilinmeyen',
      role: membership.role || 'member',
    };
    cacheTime = Date.now();

    return cachedInfo;
  } catch (error) {
    console.error('Workspace info error:', error);
    return null;
  }
}

// Login/logout'ta cache'i temizle
export function clearWorkspaceCache() {
  cachedInfo = null;
  cacheTime = 0;
}
