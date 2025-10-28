import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name?: string | null;
  avatar?: string | null;
}

interface Workspace {
  name: string;
  logo: string;
}

async function fetchOrgOnce() {
  const { data } = await supabase
    .from('org')
    .select('org_name, org_logo')
    .limit(1)
    .maybeSingle()
  return data as { org_name?: string; org_logo?: string } | null
}

interface AuthContextType {
  user: Profile | null;
  workspace: Workspace;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateWorkspace: (updates: Partial<Workspace>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_WORKSPACE: Workspace = {
  name: 'BrunelAI',
  logo: 'figma:asset/2a8790cd130a03ff81ea4aec63fd5860503e90bf.png'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);

  const loadWorkspaceFromOrg = async () => {
    try {
      const org = await fetchOrgOnce()
      if (org) {
        setWorkspace({ name: org.org_name || DEFAULT_WORKSPACE.name, logo: org.org_logo || DEFAULT_WORKSPACE.logo })
      }
    } catch {}
  }

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    if (error) throw error;
    setUser(data as Profile);
  };

  const setFromSessionFallback = async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (s?.user) {
      const fallback: Profile = {
        id: s.user.id,
        email: s.user.email || '',
        role: (s.user.user_metadata?.role as 'admin' | 'user') || 'user',
        name: s.user.user_metadata?.name || null,
        avatar: s.user.user_metadata?.avatar || null,
      };
      setUser(fallback);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // restore session
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s?.user) fetchProfile(s.user.id).catch(() => setFromSessionFallback());
    });

    // load org/workspace regardless of auth
    loadWorkspaceFromOrg();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id).catch(() => setFromSessionFallback());
      else setUser(null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      try { await fetchProfile(data.user.id); }
      catch { await setFromSessionFallback(); }
    }
  };

  const signup = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { role: 'user' } } });
    if (error) throw error;
    if (data.user) await fetchProfile(data.user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { error, data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setUser(data as Profile);
  };

  const updateWorkspace = async (updates: Partial<Workspace>) => {
    // Admin-only in DB via RLS; this call will fail for non-admins
    // Fetch existing row
    const existing = await supabase.from('org').select('id').limit(1).maybeSingle()
    const payload: any = {}
    if (updates.name !== undefined) payload.org_name = updates.name
    if (updates.logo !== undefined) payload.org_logo = updates.logo
    let data: any = null; let error: any = null
    if (existing.data?.id) {
      const res = await supabase.from('org').update(payload).eq('id', existing.data.id).select('org_name, org_logo').single()
      data = res.data; error = res.error
    } else {
      const res = await supabase.from('org').insert(payload).select('org_name, org_logo').single()
      data = res.data; error = res.error
    }
    if (!error && data) {
      setWorkspace({ name: data.org_name || workspace.name, logo: data.org_logo || workspace.logo })
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      workspace,
      login,
      signup,
      logout,
      updateProfile,
      updateWorkspace,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
