import type { AuthProviderProps } from "../types/auth.types"
import { useEffect, useState } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { supabase } from "../services/supabaseClient"
import type { Session, User } from "@supabase/supabase-js"

const debugDelayRaw = Number(import.meta.env.VITE_DEBUG_AUTH_DELAY_MS ?? 0)
const DEBUG_AUTH_DELAY_MS = Number.isFinite(debugDelayRaw) && debugDelayRaw > 0 ? debugDelayRaw : 0
const maybeDelay = DEBUG_AUTH_DELAY_MS > 0
  ? () => new Promise<void>(resolve => setTimeout(resolve, DEBUG_AUTH_DELAY_MS))
  : () => Promise.resolve()

const normalizeRole = (raw?: string | null): 'estudiante' | 'coordinador' | null => {
  if (!raw) return null
  const lowered = raw.toLowerCase()
  if (lowered === 'estudiante' || lowered === 'student') return 'estudiante'
  if (lowered === 'coordinador' || lowered === 'coordinator') return 'coordinador'
  return null
}

const extractRole = (user: User | null): 'estudiante' | 'coordinador' | null => {
  if (!user) return null
  const claimRole = (user as any)?.role as string | undefined
  return (
    normalizeRole(claimRole)
    ?? normalizeRole(user.app_metadata?.role as string | undefined)
    ?? normalizeRole(user.user_metadata?.role as string | undefined)
  )
}

export const AuthProvider = ({children}: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const handleSession = async (session: Session | null) => {
      if (!mounted) return

      setCurrentSession(session ?? null)
      const user = session?.user ?? null

      if (session && user) {
        try {
          // Attempt to read role claim directly from JWT (optional helper, may not exist)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
            const [, payloadB64] = session.access_token.split('.')
            if (payloadB64) {
              const payloadJson = JSON.parse(atob(payloadB64)) as Record<string, unknown>
              const claimRole = typeof payloadJson.app_role === 'string'
                ? payloadJson.app_role
                : typeof payloadJson.role === 'string'
                  ? payloadJson.role
                  : undefined
              if (claimRole) {
                (user as any).role = claimRole
              }
            }
        } catch (error) {
          // ignore — we will fall back to user metadata
        }
      }

      if (!mounted) return

      setCurrentUser(user)
      setRoleLoading(true)
      setRole(extractRole(user))
      await maybeDelay()
      setRoleLoading(false)
      setLoading(false)
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await handleSession(session ?? null)
      } catch (error) {
        console.debug('initial getSession failed', error)
        setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleSession(session ?? null)

      switch (event) {
        case 'SIGNED_IN':
          console.log('Usuario conectado')
          break
        case 'SIGNED_OUT':
          console.log('Usuario desconectado')
          break
        case 'TOKEN_REFRESHED':
          console.log('Token renovado automáticamente')
          break
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{
        currentUser,
        currentSession,
        loading,
        role,
        roleLoading,
        isAuthenticated: !!currentUser,
        signUp: async (credentials) => supabase.auth.signUp(credentials),
        signIn: async (credentials) => supabase.auth.signInWithPassword(credentials),
        signOut: async () => supabase.auth.signOut(),
    }}>
      {children}
    </AuthContext.Provider>
  )
}
