import type {
    AuthError,
    AuthResponse,
    AuthTokenResponse,
    Session,
    User,
    UserResponse,
} from "@supabase/supabase-js"
import type { ReactNode } from "react"


export interface SignInCredentials {
    email: string
    password: string
}

export interface SignUpCredentials {
    email: string
    password: string
    options?: {
        emailRedirectTo?: string
        data?: Record<string, any>
    }
}

export interface ResetPasswordOptions {
    options?: {
        redirectTo?: string
        captchaToken?: string
    }
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
    signUp: (credentials: SignUpCredentials) => Promise<{
        data: {
            user: User | null;
            session: Session | null
        } | null;
        error: AuthError | null
    }>
    signIn: (credentials: SignInCredentials) => Promise<{
        data: {
            user: User | null;
            session: Session | null
        } | null;
        error: AuthError | null
    }>
    signOut: () => Promise<{ error: AuthError | null }>
    sendPasswordReset: (email: string) => Promise<{ data: {}; error: AuthError | null }>
    exchangeCode: (code: string) => Promise<AuthResponse>
    updatePassword: (password: string) => Promise<UserResponse>
    sendEmailOtp: (
        email: string,
        options?: { shouldCreateUser?: boolean }
    ) => Promise<AuthResponse>
    verifyEmailOtp: (
        params: { email: string; token: string; type?: 'email' | 'recovery' }
    ) => Promise<AuthTokenResponse>
    completeAccountSetup: (
        params: { password?: string; data?: Record<string, any> }
    ) => Promise<UserResponse>

}
