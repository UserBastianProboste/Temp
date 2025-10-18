import type { AuthProviderProps } from "../types/auth.types";
import { useEffect, useState, useMemo, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

const normalizeRole = (raw?: string | null): 'estudiante' | 'coordinador' | null => {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s === 'estudiante' || s === 'student') return 'estudiante';
  if (s === 'coordinador' || s === 'coordinator') return 'coordinador';
  return null;
};
const extractRole = (user: User | null) =>
    !user ? null :
        normalizeRole((user as any)?.role) ??
        normalizeRole(user.app_metadata?.role as any) ??
        normalizeRole(user.user_metadata?.role as any);

type SignUpArgs = { email: string; password: string; options?: { emailRedirectTo?: string } };
type SignInArgs = { email: string; password: string };
type CompleteProfileArgs = { password: string; data?: Record<string, any> };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleSession = (session: Session | null) => {
      if (!mounted) return;
      const user = session?.user ?? null;

      // intenta leer rol del JWT
      let r = extractRole(user);
      try {
        if (session?.access_token && user) {
          const [, b64] = session.access_token.split(".");
          if (b64) {
            const p = JSON.parse(atob(b64));
            const claim = (p.app_role as string) || (p.role as string);
            if (claim) {
              (user as any).role = claim;
              r = normalizeRole(claim);
            }
          }
        }
      } catch {}

      setCurrentSession(session);
      setCurrentUser(user);
      setRoleLoading(true);
      setRole(r);
      setRoleLoading(false);
      setLoading(false);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      handleSession(data.session ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => handleSession(s ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // ---- API estricta de password (sin OTP/magic) ----
  const signUp = useCallback(async ({ email, password, options }: SignUpArgs) => {
    if (!email || !password) throw new Error("email y password son obligatorios");
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options?.emailRedirectTo ?? `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInArgs) => {
    if (!email || !password) throw new Error("email y password son obligatorios");
    return await supabase.auth.signInWithPassword({ email, password });
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!email) throw new Error("email requerido");
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }, []);

  const exchangeCode = useCallback(async (code: string) => supabase.auth.exchangeCodeForSession(code), []);
  const updatePassword = useCallback(async (password: string) => supabase.auth.updateUser({ password }), []);
  const signOut = useCallback(async () => supabase.auth.signOut(), []);
  const sendEmailOtp = useCallback(
    async (email: string, options?: { shouldCreateUser?: boolean }) => {
      if (!email) throw new Error("email requerido");
      return await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: options?.shouldCreateUser ?? true },
      });
    },
    [],
  );
  const verifyEmailOtp = useCallback(
    async ({ email, token }: { email: string; token: string }) => {
      if (!email || !token) throw new Error("email y token son obligatorios");
      return await supabase.auth.verifyOtp({ type: "email", email, token });
    },
    [],
  );
  const completeUserProfile = useCallback(
    async ({ password, data }: CompleteProfileArgs) => {
      if (!password) throw new Error("password requerido");
      return await supabase.auth.updateUser({ password, data });
    },
    [],
  );

  const ctx = useMemo(() => ({
    currentUser,
    currentSession,
    loading,
    role,
    roleLoading,
    isAuthenticated: !!currentUser,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    exchangeCode,
    updatePassword,
    sendEmailOtp,
    verifyEmailOtp,
    completeUserProfile,
  }), [
    completeUserProfile,
    currentSession,
    currentUser,
    exchangeCode,
    loading,
    role,
    roleLoading,
    sendEmailOtp,
    sendPasswordReset,
    signIn,
    signOut,
    signUp,
    updatePassword,
    verifyEmailOtp,
  ]);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
};
