import { useEffect, useState } from 'react';
import { supabase, refreshSessionIfNeeded } from '../services/supabaseClient';

interface SessionStatus {
  isValid: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number | null; // en segundos
  needsRefresh: boolean;
}

/**
 * Hook para monitorear el estado de la sesión de Supabase
 * y mostrar advertencias cuando el token está próximo a expirar.
 */
export const useSessionMonitor = (checkInterval = 60000) => { // Check cada 60 segundos
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isValid: false,
    expiresAt: null,
    timeUntilExpiry: null,
    needsRefresh: false,
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setSessionStatus({
            isValid: false,
            expiresAt: null,
            timeUntilExpiry: null,
            needsRefresh: false,
          });
          return;
        }

        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = session.expires_at ? session.expires_at - now : null;
        const needsRefresh = timeUntilExpiry !== null && timeUntilExpiry < 300; // < 5 minutos

        setSessionStatus({
          isValid: true,
          expiresAt,
          timeUntilExpiry,
          needsRefresh,
        });

        // Auto-refresh si es necesario
        if (needsRefresh) {
          console.log('🔄 [SessionMonitor] Token próximo a expirar, refrescando...');
          await refreshSessionIfNeeded();
        }
      } catch (error) {
        console.error('❌ [SessionMonitor] Error verificando sesión:', error);
      }
    };

    // Check inicial
    checkSession();

    // Check periódico
    const intervalId = setInterval(checkSession, checkInterval);

    return () => clearInterval(intervalId);
  }, [checkInterval]);

  return sessionStatus;
};
