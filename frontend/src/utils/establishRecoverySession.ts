import type { Session, SupabaseClient } from '@supabase/supabase-js';

type RecoveryType = 'recovery' | string;

export type RecoveryLinkTokens = {
  code?: string;
  tokenHash?: string;
  otpToken?: string;
  accessToken?: string;
  refreshToken?: string;
  type?: RecoveryType;
  email?: string;
  cleanedUrl?: string;
};

export type RecoveryLinkErrorCode =
  | 'missing_params'
  | 'session_not_found'
  | 'verification_failed';

export class RecoveryLinkError extends Error {
  public readonly code: RecoveryLinkErrorCode;

  constructor(code: RecoveryLinkErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'RecoveryLinkError';
    this.code = code;
    if (options?.cause !== undefined) {
      (this as any).cause = options.cause;
    }
  }
}

const getActiveSession = async (supabase: SupabaseClient): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};

export async function establishRecoverySession({
  supabase,
  tokens
}: {
  supabase: SupabaseClient;
  tokens: RecoveryLinkTokens;
}): Promise<Session | null> {
  const {
    code,
    tokenHash,
    otpToken,
    accessToken,
    refreshToken,
    type = 'recovery',
    email
  } = tokens;

  const hasAuthParams = Boolean(code || tokenHash || otpToken || accessToken || refreshToken);

  if (!hasAuthParams) {
    throw new RecoveryLinkError('missing_params', 'Enlace inválido o expirado');
  }

  let lastError: unknown = null;

  const existingSession = await getActiveSession(supabase);
  if (existingSession) {
    return existingSession;
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return data.session ?? (await getActiveSession(supabase));
    }
    lastError = error;
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any
    });
    if (!error) {
      const session = await getActiveSession(supabase);
      if (session) {
        return session;
      }
    }
    lastError = error;
  }

  if (otpToken) {
    const attemptTokenOnly = async () => {
      const { error } = await supabase.auth.verifyOtp({
        token: otpToken,
        type: type as any
      });
      if (!error) {
        const session = await getActiveSession(supabase);
        if (session) {
          return session;
        }
      }
      lastError = error;
      return null;
    };

    const attemptWithEmail = async () => {
      if (!email) return null;
      const { error } = await supabase.auth.verifyOtp({
        token: otpToken,
        type: type as any,
        email
      });
      if (!error) {
        const session = await getActiveSession(supabase);
        if (session) {
          return session;
        }
      }
      lastError = error;
      return null;
    };

    const tokenOnlyResult = await attemptTokenOnly();
    if (tokenOnlyResult) {
      return tokenOnlyResult;
    }

    const emailResult = await attemptWithEmail();
    if (emailResult) {
      return emailResult;
    }
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (!error) {
      return data.session ?? (await getActiveSession(supabase));
    }
    lastError = error;
  }

  if (accessToken && !refreshToken) {
    const session = await getActiveSession(supabase);
    if (session) {
      return session;
    }
    lastError = lastError ?? new Error('Missing refresh token');
  }

  throw new RecoveryLinkError(
    'verification_failed',
    'Enlace inválido o expirado',
    { cause: lastError ?? undefined }
  );
}
