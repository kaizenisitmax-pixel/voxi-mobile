import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { registerForPushNotificationsAsync, savePushToken } from '../lib/notifications';

interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  push_token?: string;
  notification_prefs?: any;
  last_seen_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  sector?: string;
  plan: string;
  max_teams: number;
  max_members: number;
  settings?: any;
  created_at?: string;
  updated_at?: string;
}

interface Team {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_by: string;
  created_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  workspace: Workspace | null;
  team: Team | null;
  isLoading: boolean;
  isOnboarded: boolean;
  signInWithOtp: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name: string; phone?: string }) => Promise<void>;
  createWorkspace: (name: string, sector: string, teamName: string) => Promise<void>;
  joinWorkspace: (inviteCode: string) => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    // Başlangıç session kontrolü
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      } else {
        setProfile(null);
        setWorkspace(null);
        setTeam(null);
        setIsOnboarded(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfile = async (userId: string) => {
    try {
      // Profil kontrol
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Workspace membership kontrol
        const { data: membership } = await supabase
          .from('workspace_members')
          .select(`
            *,
            workspaces(*),
            teams(*)
          `)
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (membership) {
          setWorkspace(membership.workspaces);
          setTeam(membership.teams);
          setIsOnboarded(true);
          
          // Push token kayıt
          const registerPush = async () => {
            const token = await registerForPushNotificationsAsync();
            if (token && userId) {
              await savePushToken(userId, token);
            }
          };
          registerPush();
        } else {
          setIsOnboarded(false);
        }
      } else {
        setIsOnboarded(false);
      }
    } catch (error) {
      console.error('Profile check error:', error);
      if (typeof Sentry !== 'undefined' && Sentry.captureException) {
        Sentry.captureException(error, {
          tags: { feature: 'auth', action: 'profile_check' },
        });
      }
      setIsOnboarded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    
    if (data.user) {
      await checkProfile(data.user.id);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    setProfile(null);
    setWorkspace(null);
    setTeam(null);
    setIsOnboarded(false);
  };

  const updateProfile = async (data: { full_name: string; phone?: string }) => {
    const userId = session!.user.id;
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    
    setProfile({ id: userId, ...data });
  };

  const createWorkspace = async (name: string, sector: string, teamName: string) => {
    const userId = session!.user.id;

    // 1. Workspace oluştur
    const { data: ws, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        owner_id: userId,
        sector,
      })
      .select()
      .single();
    if (wsError) throw wsError;

    // 2. Varsayılan ekip oluştur
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        workspace_id: ws.id,
        name: teamName || 'Genel',
        is_default: true,
        created_by: userId,
      })
      .select()
      .single();
    if (teamError) throw teamError;

    // 3. Owner olarak workspace_member oluştur
    await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: userId,
      team_id: teamData.id,
      role: 'owner',
    });

    setWorkspace(ws);
    setTeam(teamData);
    setIsOnboarded(true);
  };

  const joinWorkspace = async (inviteCode: string) => {
    const userId = session!.user.id;

    // 1. Davet kodunu kontrol et
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
        workspaces(*),
        teams(*)
      `)
      .eq('invite_code', inviteCode.toUpperCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!invitation || error) {
      throw new Error('Geçersiz veya süresi dolmuş davet kodu');
    }
    
    if (invitation.max_uses > 0 && invitation.use_count >= invitation.max_uses) {
      throw new Error('Bu davet kodu kullanım limitine ulaşmış');
    }

    // 2. workspace_member oluştur
    await supabase.from('workspace_members').insert({
      workspace_id: invitation.workspace_id,
      user_id: userId,
      team_id: invitation.team_id,
      role: invitation.role || 'member',
    });

    // 3. Davet kullanım sayısını artır
    await supabase
      .from('invitations')
      .update({ use_count: invitation.use_count + 1 })
      .eq('id', invitation.id);

    setWorkspace(invitation.workspaces);
    setTeam(invitation.teams);
    setIsOnboarded(true);
  };

  const switchTeam = async (teamId: string) => {
    const userId = session!.user.id;
    
    // Yeni ekibi getir
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (teamData) {
      setTeam(teamData);
      
      // workspace_members'ta güncelle
      await supabase
        .from('workspace_members')
        .update({ team_id: teamId })
        .eq('user_id', userId)
        .eq('workspace_id', workspace!.id);
    }
  };

  const refreshWorkspace = async () => {
    if (session?.user) {
      await checkProfile(session.user.id);
    }
  };

  const value = {
    session,
    user,
    profile,
    workspace,
    team,
    isLoading,
    isOnboarded,
    signInWithOtp,
    signInWithPassword,
    verifyOtp,
    signOut,
    updateProfile,
    createWorkspace,
    joinWorkspace,
    switchTeam,
    refreshWorkspace,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
