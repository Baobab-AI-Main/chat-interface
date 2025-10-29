import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name?: string | null;
  avatar?: string | null;
  user_id?: string | null;
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
  uploadProfileAvatar: (file: File) => Promise<void>;
  updateWorkspace: (updates: Partial<Workspace>) => Promise<Workspace>;
  uploadWorkspaceLogo: (file: File) => Promise<void>;
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
    // Load from public.users by auth uid mapping
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, "Full Name", "Profile_Photo", user_id')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const p: Profile = {
        id: (data as any).id,
        email: (data as any).email,
        role: (data as any).role,
        name: (data as any)["Full Name"] || null,
        avatar: (data as any)["Profile_Photo"] || null,
        user_id: (data as any).user_id || null
      }
      setUser(p);
    } else {
      // Create a row bound to this auth user if missing (email from session)
      const s = (await supabase.auth.getSession()).data.session
      const email = s?.user?.email || ''
      const ins = await supabase.from('users').insert({ user_id: uid, email, role: 'user' }).select('id, email, role, "Full Name", "Profile_Photo", user_id').single()
      if (ins.error) throw ins.error
      const d: any = ins.data
      setUser({ id: d.id, email: d.email, role: d.role, name: d["Full Name"] || null, avatar: d["Profile_Photo"] || null, user_id: d.user_id || null })
    }
  };

  const setFromSessionFallback = async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (s?.user) {
      try {
        await fetchProfile(s.user.id)
      } catch {
        setUser({ id: s.user.id, email: s.user.email || '', role: 'user', name: null, avatar: null, user_id: s.user.id })
      }
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
    if (!user) throw new Error('Not authenticated');
    const payload: any = {}
    if (updates.name !== undefined) payload['Full Name'] = updates.name
    if (updates.avatar !== undefined) payload['Profile_Photo'] = updates.avatar
    const { error, data } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id)
      .select('id, email, role, "Full Name", "Profile_Photo", user_id')
      .single();
    if (error) throw error;
    const d: any = data
    setUser({ id: d.id, email: d.email, role: d.role, name: d['Full Name'] || null, avatar: d['Profile_Photo'] || null, user_id: d.user_id || null });
  };

  const uploadProfileAvatar = async (file: File) => {
    if (!user) throw new Error('Not authenticated');
    if (!file.type.includes('png') && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      throw new Error('Only PNG/JPG supported')
    }
    const ext = file.type.includes('png') ? 'png' : 'jpg'
    const path = `${user.id}/avatar-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await updateProfile({ avatar: data.publicUrl })
  };

  const updateWorkspace = async (updates: Partial<Workspace>) => {
    // Use SECURITY DEFINER function to bypass RLS for admins only
    const { error, data } = await supabase.rpc('upsert_org', {
      p_name: updates.name ?? null,
      p_logo: updates.logo ?? null,
    })
    if (error) throw error
    if (data) {
      const updated = { name: (data as any).org_name || workspace.name, logo: (data as any).org_logo || workspace.logo }
      setWorkspace(updated)
      return updated
    }
    return workspace
  };

  const uploadWorkspaceLogo = async (file: File) => {
    if (!file.type.includes('png')) throw new Error('Only PNG supported')
    const path = `logo-${Date.now()}.png`
    const { error } = await supabase.storage.from('org').upload(path, file, { cacheControl: '3600', upsert: true, contentType: 'image/png' })
    if (error) throw error
    const { data } = supabase.storage.from('org').getPublicUrl(path)
    await updateWorkspace({ logo: data.publicUrl })
  };

  return (
    <AuthContext.Provider value={{
      user,
      workspace,
      login,
      signup,
      logout,
      updateProfile,
      uploadProfileAvatar,
      updateWorkspace,
      uploadWorkspaceLogo,
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
