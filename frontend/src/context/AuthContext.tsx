import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { authService } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  role: 'estudiante' | 'coordinador' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: unknown }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'estudiante' | 'coordinador' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user || null;
      setUser(u);
      setRole(u?.user_metadata?.role ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      setRole(u?.user_metadata?.role ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await authService.signIn(email, password);
    if (!error && data.user) {
      setUser(data.user);
      setRole(data.user.user_metadata?.role ?? null);
    }
    setLoading(false);
    return { error };
  };

  const logout = async () => {
    setLoading(true);
    await authService.signOut();
    setUser(null);
    setRole(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};