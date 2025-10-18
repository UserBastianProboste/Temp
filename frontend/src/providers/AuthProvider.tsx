import type { AuthProviderProps } from "../types/auth.types"
import { useEffect, useState } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { supabase } from "../services/supabaseClient"
import type { Session, User } from "@supabase/supabase-js"


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

    const handleSession = (session: Session | null) => {
      if (!mounted) return;

      const user = session?.user ?? null;
      let extractedRole = extractRole(user);

      // ✅ Extraer rol del JWT si existe
      if (session && user) {
        try {
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
              extractedRole = normalizeRole(claimRole);
            }
          }
        } catch (error) {
          // Ignorar errores silenciosamente
        }
      }


      if (!mounted) return


      setCurrentSession(session); 
      setCurrentUser(user)
      setRoleLoading(true)
      setRole(extractedRole) 
      setRoleLoading(false)
      setLoading(false) 
    }

    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error obteniendo sesión:', error);
        }

        handleSession(session ?? null)
      } catch (error) {
        console.error('Error crítico en getSession:', error)
        setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session ?? null)
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