import type { AuthProviderProps } from "../types/auth.types";
import { useEffect, useState, useMemo } from "react";
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

type SignUpArgs = {
  email: string;
  password: string;
  options?: {
    emailRedirectTo?: string;
    data?: Record<string, any>;
  };
};
type SignInArgs = { email: string; password: string };

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
  const signUp = async ({ email, password, options }: SignUpArgs) => {
    if (!email || !password) throw new Error("email y password son obligatorios");
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options?.emailRedirectTo ?? `${window.location.origin}/auth/callback`,
        data: options?.data,
      },
    });
  };

  const signIn = async ({ email, password }: SignInArgs) => {
    if (!email || !password) throw new Error("email y password son obligatorios");
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const sendPasswordReset = async (email: string) => {
    if (!email) throw new Error("email requerido");
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const exchangeCode = async (code: string) => supabase.auth.exchangeCodeForSession(code);
  const updatePassword = async (password: string) => supabase.auth.updateUser({ password });

  const sendEmailOtp = async (
    email: string,
    options?: {
      shouldCreateUser?: boolean;
      emailRedirectTo?: string;
      data?: Record<string, any>;
      captchaToken?: string;
    },
  ) => {
    if (!email) throw new Error("email requerido");
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: options?.shouldCreateUser ?? true,
        emailRedirectTo: options?.emailRedirectTo,
        data: options?.data,
        captchaToken: options?.captchaToken,
      },
    });
  };

  const verifyEmailOtp = async ({
    email,
    token,
    type = 'signup',
    redirectTo,
  }: {
    email: string;
    token: string;
    type?: 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';
    redirectTo?: string;
  }) => {
    if (!email || !token) throw new Error("email y token son obligatorios");
    return await supabase.auth.verifyOtp({ type, email, token, options: { redirectTo } });
  };

  const completeAccountSetup = async ({
    password,
    data,
  }: { password?: string; data?: Record<string, any> }) => {
    if (!password && !data) {
      throw new Error("Debe proporcionarse password o metadatos para actualizar el usuario");
    }
    return await supabase.auth.updateUser({ password, data });
  };

  const signOut = async () => supabase.auth.signOut();

  const ctx = useMemo(() => ({
    currentUser,
    currentSession,
    loading,
    role,
    roleLoading,
    isAuthenticated: !!currentUser,
    signUp, signIn, signOut,
    sendPasswordReset, exchangeCode, updatePassword,
    sendEmailOtp, verifyEmailOtp, completeAccountSetup,
  }), [currentUser, currentSession, loading, role, roleLoading]);

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
};
