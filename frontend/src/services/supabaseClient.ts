import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,      // ✅ Auto-refresh cuando el token expira
        persistSession: true,         // ✅ Guardar sesión en localStorage
        detectSessionInUrl: true,     // ✅ Detectar sesión en URL
        storage: localStorage,        // ✅ Usar localStorage
        storageKey: 'sb-auth-token',  // ✅ Key personalizada
        flowType: 'pkce',             // ✅ Más seguro
        debug: false,                 // ✅ DESACTIVAR logs internos de Supabase
    },
    global: {
        headers: {
            apikey: supabaseAnonKey || '',
        },
    },
});

// ✅ Monitorear SOLO eventos importantes en desarrollo
// ⚠️ COMENTADO para evitar logs duplicados en cada cambio de pestaña
/*
if (import.meta.env.DEV) {
    supabase.auth.onAuthStateChange((event, session) => {
        switch(event) {
            case 'SIGNED_IN':
                console.log('✅ Usuario conectado:', session?.user?.email);
                break;
            case 'SIGNED_OUT':
                console.log('🚪 Usuario desconectado');
                break;
            case 'TOKEN_REFRESHED':
                console.log('🔄 Token refrescado');
                break;
        }
    });
}
*/

// ✅ Helpers de desarrollo (solo si realmente los necesitas)
if (import.meta.env.DEV) {
    (window as any).supabase = supabase;
    (window as any).__supabase_debug = {
        anonKeyPresent: !!supabaseAnonKey,
        anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
        url: supabaseUrl,
    };
}

// ✅ Patch de fetch CORREGIDO (sin error de TypeScript)
if (import.meta.env.DEV) {
    const restPrefix = supabaseUrl.replace(/\/$/, '') + '/rest/v1';
    const _originalFetch = globalThis.fetch;
    
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        try {
            let urlStr: string;
            
            // ✅ Manejar correctamente todos los tipos de input
            if (typeof input === 'string') {
                urlStr = input;
            } else if (input instanceof URL) {
                urlStr = input.toString();
            } else if (input instanceof Request) {
                urlStr = input.url;
            } else {
                urlStr = String(input);
            }

            if (urlStr.startsWith(restPrefix)) {
                const u = new URL(urlStr);
                if (!u.searchParams.has('apikey') && supabaseAnonKey) {
                    u.searchParams.set('apikey', supabaseAnonKey);
                    
                    // ✅ Reconstruir input con el tipo correcto
                    if (typeof input === 'string') {
                        input = u.toString();
                    } else if (input instanceof URL) {
                        input = new URL(u.toString());
                    } else if (input instanceof Request) {
                        input = new Request(u.toString(), input);
                    } else {
                        input = u.toString() as RequestInfo;
                    }
                }
            }
        } catch (e) {
            // Ignorar errores en el patch
        }
        return _originalFetch(input, init);
    };
}

export async function debugSession() {
    try {
        const session = await supabase.auth.getSession();
        console.debug('[supabase] debugSession', session);
        return session;
    } catch (e) {
        console.error('[supabase] debugSession error', e);
        throw e;
    }
}

/**
 * Wait until a session is available (or timeout). Returns the session or null.
 */
export async function ensureAuthReady(timeoutMs = 3000) {
    const start = Date.now();
    let { data: { session } } = await supabase.auth.getSession();
    if (session) return session;

    return new Promise<any>((resolve) => {
        const check = async () => {
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s) return resolve(s);
            if (Date.now() - start > timeoutMs) return resolve(null);
            setTimeout(check, 200);
        };
        check();
    });
}

/**
 * Verifica si el token está próximo a expirar y lo refresca si es necesario.
 */
export async function refreshSessionIfNeeded() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            return { session: null, refreshed: false };
        }

        // Verificar si expira en los próximos 5 minutos
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

        if (timeUntilExpiry < 300) { // 5 minutos
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
                console.error('[supabase] Error refrescando sesión:', refreshError);
                return { session: null, refreshed: false, error: refreshError };
            }

            return { session: data.session, refreshed: true };
        }

        return { session, refreshed: false };
    } catch (error) {
        console.error('[supabase] Error en refreshSessionIfNeeded:', error);
        return { session: null, refreshed: false, error };
    }
}