import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface Workspace {
  name: string;
  logo: string;
}

interface AuthContextType {
  user: User | null;
  workspace: Workspace;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  updateWorkspace: (updates: Partial<Workspace>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_WORKSPACE: Workspace = {
  name: 'BrunelAI',
  logo: 'figma:asset/2a8790cd130a03ff81ea4aec63fd5860503e90bf.png'
};

// Mock users for demo
const MOCK_USERS = [
  {
    id: '1',
    name: 'John Doe',
    email: 'admin@brunel.com',
    password: 'admin123',
    role: 'admin' as const,
    avatar: undefined
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'user@brunel.com',
    password: 'user123',
    role: 'user' as const,
    avatar: undefined
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);

  useEffect(() => {
    // Check for saved auth on mount
    const savedUser = localStorage.getItem('brunelai_user');
    const savedWorkspace = localStorage.getItem('brunelai_workspace');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedWorkspace) {
      setWorkspace(JSON.parse(savedWorkspace));
    }
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Login attempt:', email);
    
    // Mock authentication
    const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    
    if (!mockUser) {
      console.error('Invalid credentials for:', email);
      throw new Error('Invalid credentials');
    }

    console.log('User found:', mockUser.name);
    const { password: _, ...userWithoutPassword } = mockUser;
    setUser(userWithoutPassword);
    
    try {
      localStorage.setItem('brunelai_user', JSON.stringify(userWithoutPassword));
      console.log('User saved to localStorage');
    } catch (storageError) {
      console.error('localStorage error:', storageError);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('brunelai_user');
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('brunelai_user', JSON.stringify(updatedUser));
    }
  };

  const updateWorkspace = (updates: Partial<Workspace>) => {
    const updatedWorkspace = { ...workspace, ...updates };
    setWorkspace(updatedWorkspace);
    localStorage.setItem('brunelai_workspace', JSON.stringify(updatedWorkspace));
  };

  return (
    <AuthContext.Provider value={{
      user,
      workspace,
      login,
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
