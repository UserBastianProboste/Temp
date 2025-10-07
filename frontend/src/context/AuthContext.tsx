import { createContext, useEffect, useState, useContext, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextValue {
  user: User | null;
  role: 'estudiante' | 'coordinador' | null;
  authLoading: boolean;       // cargando sesión
  roleLoading: boolean;       // cargando rol
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'estudiante' | 'coordinador' | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  // Sesión inicial + listener
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    })();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_evt, session) => {
        setUser(session?.user ?? null);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Cargar rol: primero metadata, luego RPC si falta
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRole(null);
      return;
    }

    setRoleLoading(true);
    const metaRoleRaw = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
    const lowered = metaRoleRaw?.toLowerCase();
    const normalized = lowered === 'estudiante' || lowered === 'student'
      ? 'estudiante'
      : lowered === 'coordinador' || lowered === 'coordinator'
        ? 'coordinador'
        : null;
    if (!cancelled) {
      setRole(normalized);
      setRoleLoading(false);
    }

    return () => { cancelled = true; };
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<{ error: Error | null }> => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, authLoading, roleLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthContext debe usarse dentro de AuthProvider');
    return ctx;
};

export { AuthContext };