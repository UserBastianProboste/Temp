import type { AuthError, Session, User } from "@supabase/supabase-js"
import type { ReactNode } from "react"


export interface SignInCredentials {
    email: string
    password: string
}

export interface AuthProviderProps {
    children: ReactNode
}

export interface AuthContextType {
    currentUser: User | null
    currentSession: Session | null
    loading: boolean
    // role determined server-side (queried by user_id) — prefer this over token claims
    role?: string | null
    roleLoading?: boolean
    isAuthenticated: boolean
    signIn: (credentials: SignInCredentials) => Promise<{
        data: {
            user: User | null;
            session: Session | null
        } | null;
        error: AuthError | null
    }>
    signOut: () => Promise<{ error: AuthError | null }>
    sendPasswordReset: (email: string) => Promise<{ data: Record<string, unknown> | null; error: AuthError | null }>
    exchangeCode: (code: string) => Promise<{
        data: {
            session: Session | null;
            user: User | null;
        } | null;
        error: AuthError | null;
    }>
    updatePassword: (password: string) => Promise<{
        data: {
            user: User | null;
        } | null;
        error: AuthError | null;
    }>
    sendEmailOtp: (email: string) => Promise<{
        data: {
            user: User | null;
            session: Session | null;
        } | null;
        error: AuthError | null;
    }>
    verifyEmailOtp: (params: { email: string; token: string }) => Promise<{
        data: {
            user: User | null;
            session: Session | null;
        } | null;
        error: AuthError | null;
    }>
    updateUserProfile: (payload: { password?: string; data?: Record<string, any> }) => Promise<{
        data: {
            user: User | null;
        } | null;
        error: AuthError | null;
    }>
}