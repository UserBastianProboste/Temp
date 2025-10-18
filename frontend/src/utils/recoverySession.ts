import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

export type RecoveryFlowErrorCode =
  | 'INVALID_LINK'
  | 'SESSION_NOT_ESTABLISHED'
  | 'SUPABASE_ERROR';

export class RecoveryFlowError extends Error {
  public readonly code: RecoveryFlowErrorCode;
  public readonly originalError?: unknown;

  constructor(message: string, code: RecoveryFlowErrorCode, originalError?: unknown) {
    super(message);
    this.name = 'RecoveryFlowError';
    this.code = code;
    this.originalError = originalError;
  }
}

type EstablishRecoverySessionOptions = {
  /**
   * Optional fallback email to use when verifying OTP tokens
   * that require an email address but the redirect payload omitted it.
   */
  emailFallback?: string | null;
  /**
   * Set to true if `supabase.auth.getSessionFromUrl` should be invoked manually.
   * Leave false (default) when `detectSessionInUrl` is already handled by the client.
   */
  attemptManualSessionDetection?: boolean;
};

const getCurrentSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

const toUrlSearchParams = (value: string | null | undefined): URLSearchParams => {
  if (!value) return new URLSearchParams();
  return new URLSearchParams(value.replace(/^#/, ''));
};

export const establishRecoverySession = async (
  locationLike: Location = window.location,
  { emailFallback, attemptManualSessionDetection = false }: EstablishRecoverySessionOptions = {}
): Promise<{ session: Session; cleanUrl: string }> => {
  const url = new URL(locationLike.href);
  const urlParams = url.searchParams;
  const hashParams = toUrlSearchParams(locationLike.hash);

  const getParam = (key: string): string | null => {
    return urlParams.get(key) ?? hashParams.get(key);
  };

  const code = getParam('code');
  const tokenHash = getParam('token_hash');
  const otpToken = getParam('token');
  const type = getParam('type') ?? 'recovery';
  const email = getParam('email') ?? emailFallback ?? undefined;
  const accessToken = getParam('access_token');
  const refreshToken = getParam('refresh_token');

  const hasAuthParams = Boolean(code || tokenHash || otpToken || accessToken || refreshToken);

  if (!hasAuthParams) {
    throw new RecoveryFlowError('Enlace inválido o expirado', 'INVALID_LINK');
  }

  let session = await getCurrentSession();

  if (!session && attemptManualSessionDetection) {
    try {
      const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
      if (error) {
        throw error;
      }
      session = data.session ?? (await getCurrentSession());
    } catch (error) {
      console.debug('getSessionFromUrl manual attempt failed', error);
    }
  }

  const ensureSessionOrThrow = async () => {
    session = await getCurrentSession();
    if (!session) {
      throw new RecoveryFlowError(
        'No se pudo establecer la sesión para restablecer la contraseña.',
        'SESSION_NOT_ESTABLISHED'
      );
    }
  };

  if (!session && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw new RecoveryFlowError(error.message, 'SUPABASE_ERROR', error);
    }
    await ensureSessionOrThrow();
  }

  if (!session && tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });
    if (error) {
      throw new RecoveryFlowError(error.message, 'SUPABASE_ERROR', error);
    }
    await ensureSessionOrThrow();
  }

  if (!session && otpToken) {
    let otpError: unknown;

    if (email) {
      const { error } = await supabase.auth.verifyOtp({
        token: otpToken,
        type: type as any,
        email,
      });

      if (!error) {
        await ensureSessionOrThrow();
      } else {
        otpError = error;
      }
    }

    if (!session) {
      const { error } = await supabase.auth.verifyOtp({
        token: otpToken,
        type: type as any,
      });

      if (error) {
        throw new RecoveryFlowError(error.message, 'SUPABASE_ERROR', otpError ?? error);
      }
      await ensureSessionOrThrow();
    }
  }

  if (!session && accessToken) {
    const sessionPayload: { access_token: string; refresh_token?: string } = {
      access_token: accessToken,
    };

    if (refreshToken) {
      sessionPayload.refresh_token = refreshToken;
    }

    const { error } = await supabase.auth.setSession(sessionPayload);

    if (error) {
      throw new RecoveryFlowError(error.message, 'SUPABASE_ERROR', error);
    }
    await ensureSessionOrThrow();
  }

  if (!session) {
    throw new RecoveryFlowError('Enlace inválido o expirado', 'INVALID_LINK');
  }

  const cleanUrl = `${url.origin}${url.pathname}`;

  return { session, cleanUrl };
};
