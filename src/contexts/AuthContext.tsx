import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { appConfig } from "../config";
import { fetchOrgOnce } from "../hooks/useOrg";

type Role = "admin" | "user";

export interface Profile {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  avatar: string | null;
  user_id: string | null;
}

interface Workspace {
  name: string;
  logo: string;
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

type UsersRow = {
  id: string;
  email: string;
  role: Role;
  "Full Name": string | null;
  "Profile_Photo": string | null;
  user_id: string | null;
};

type OrgRow = {
  org_name: string | null;
  org_logo: string | null;
};

const DEFAULT_WORKSPACE: Workspace = {
  name: appConfig.brandFallbackName,
  logo: appConfig.brandLogoUrl,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUserRowToProfile = (row: UsersRow): Profile => ({
  id: row.id,
  email: row.email,
  role: row.role,
  name: row["Full Name"] ?? null,
  avatar: row["Profile_Photo"] ?? null,
  user_id: row.user_id,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from<UsersRow>("users")
      .select('id, email, role, "Full Name", "Profile_Photo", user_id')
      .eq("user_id", uid)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      setUser(mapUserRowToProfile(data));
      return;
    }

    const sessionResponse = await supabase.auth.getSession();
    const sessionUser = sessionResponse.data.session?.user;
    const email = sessionUser?.email ?? "";

    if (!email) {
      setUser(null);
      return;
    }

    const { data: existingUser } = await supabase
      .from<UsersRow>("users")
      .select('id, email, role, "Full Name", "Profile_Photo", user_id')
      .eq("email", email)
      .is("user_id", null)
      .maybeSingle();

    if (existingUser) {
      const { data: updated, error: updateError } = await supabase
        .from<UsersRow>("users")
        .update({ user_id: uid })
        .eq("id", existingUser.id)
        .select('id, email, role, "Full Name", "Profile_Photo", user_id')
        .single();

      if (updateError) throw updateError;
      if (updated) {
        setUser(mapUserRowToProfile(updated));
      }
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from<UsersRow>("users")
      .insert({ user_id: uid, email, role: "user" })
      .select('id, email, role, "Full Name", "Profile_Photo", user_id')
      .single();

    if (insertError) throw insertError;
    if (inserted) {
      setUser(mapUserRowToProfile(inserted));
    }
  }, []);

  const setFromSessionFallback = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;

    if (!sessionUser) {
      setUser(null);
      return;
    }

    try {
      await fetchProfile(sessionUser.id);
    } catch (error) {
      console.warn("Falling back to minimal profile", error);
      setUser({
        id: sessionUser.id,
        email: sessionUser.email ?? "",
        role: "user",
        name: null,
        avatar: null,
        user_id: sessionUser.id,
      });
    }
  }, [fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        const sessionUser = data.session?.user;
        if (sessionUser) {
          fetchProfile(sessionUser.id).catch(() => setFromSessionFallback());
        }
      })
      .catch((error) => {
        console.error("Failed to restore session", error);
      });

    void (async () => {
      try {
        const org = await fetchOrgOnce();
        if (isMounted && org) {
          setWorkspace((prev) => ({
            name: org.org_name ?? prev.name,
            logo: org.org_logo ?? prev.logo,
          }));
        }
      } catch (error) {
        console.error("Failed to load workspace branding", error);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }
        const sessionUser = session?.user;
        if (sessionUser) {
          fetchProfile(sessionUser.id).catch(() => setFromSessionFallback());
        } else {
          setUser(null);
        }
      },
    );
    const authSubscription = subscription?.subscription;

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, [fetchProfile, setFromSessionFallback]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const sessionUser = data.user;
      if (sessionUser) {
        try {
          await fetchProfile(sessionUser.id);
        } catch (profileError) {
          console.error("Failed to load profile after login", profileError);
          await setFromSessionFallback();
        }
      }
    },
    [fetchProfile, setFromSessionFallback],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "user" } },
      });
      if (error) throw error;
      const sessionUser = data.user;
      if (sessionUser) {
        await fetchProfile(sessionUser.id);
      }
    },
    [fetchProfile],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) throw new Error("Not authenticated");

      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload["Full Name"] = updates.name;
      if (updates.avatar !== undefined) payload["Profile_Photo"] = updates.avatar;
      if (updates.email !== undefined) payload.email = updates.email;

      if (Object.keys(payload).length === 0) {
        return;
      }

      const { data, error } = await supabase
        .from<UsersRow>("users")
        .update(payload)
        .eq("id", user.id)
        .select('id, email, role, "Full Name", "Profile_Photo", user_id')
        .single();

      if (error) throw error;
      if (data) {
        setUser(mapUserRowToProfile(data));
      }
    },
    [user],
  );

  const uploadProfileAvatar = useCallback(
    async (file: File) => {
      if (!user) throw new Error("Not authenticated");
      const isSupported = ["png", "jpeg", "jpg"].some((type) =>
        file.type.includes(type),
      );
      if (!isSupported) {
        throw new Error("Only PNG/JPG supported");
      }

      const ext = file.type.includes("png") ? "png" : "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar: data.publicUrl });
    },
    [updateProfile, user],
  );

  const updateWorkspace = useCallback(
    async (updates: Partial<Workspace>) => {
      const { data, error } = await supabase.rpc<OrgRow>("upsert_org", {
        p_name: updates.name ?? null,
        p_logo: updates.logo ?? null,
      });
      if (error) throw error;

      if (data) {
        const updatedWorkspace: Workspace = {
          name: data.org_name ?? workspace.name,
          logo: data.org_logo ?? workspace.logo,
        };
        setWorkspace(updatedWorkspace);
        return updatedWorkspace;
      }

      return workspace;
    },
    [workspace],
  );

  const uploadWorkspaceLogo = useCallback(
    async (file: File) => {
      if (!file.type.includes("png")) {
        throw new Error("Only PNG supported");
      }
      const path = `logo-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from("org")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/png",
        });
      if (error) throw error;

      const { data } = supabase.storage.from("org").getPublicUrl(path);
      await updateWorkspace({ logo: data.publicUrl });
    },
    [updateWorkspace],
  );

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      workspace,
      login,
      signup,
      logout,
      updateProfile,
      uploadProfileAvatar,
      updateWorkspace,
      uploadWorkspaceLogo,
      isAdmin: user?.role === "admin",
    }),
    [
      login,
      logout,
      signup,
      updateProfile,
      updateWorkspace,
      uploadProfileAvatar,
      uploadWorkspaceLogo,
      user,
      workspace,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
