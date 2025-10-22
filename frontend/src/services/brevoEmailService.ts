import { supabase } from './supabaseClient';

export interface BrevoEmailPayload {
  to: string | string[];
  subject?: string;
  coordinator_name?: string;
  estudiante_nombre?: string;
  estudiante_apellido?: string;
  tipo_practica?: string;
  practica_id?: string;
  empresa?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  estado?: string;
  mensaje_html?: string;
  [key: string]: unknown;
}

export interface BrevoEmailResponse {
  ok: boolean;
  [key: string]: unknown;
}

export class BrevoEmailError extends Error {
  details?: unknown;
  statusCode?: number;

  constructor(message: string, details?: unknown, statusCode?: number) {
    super(message);
    this.name = 'BrevoEmailError';
    this.details = details;
    this.statusCode = statusCode;
  }
}

/**
 * Valida formato de email
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Sanitiza y valida el payload de email
 */
const sanitizePayload = (payload: BrevoEmailPayload): BrevoEmailPayload => {
  const sanitized = { ...payload };

  // Validar destinatarios
  const recipients = Array.isArray(sanitized.to) ? sanitized.to : [sanitized.to];
  const validRecipients = recipients.filter(email => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      console.warn(`Email inválido ignorado: ${email}`);
      return false;
    }
    return true;
  });

  if (validRecipients.length === 0) {
    throw new BrevoEmailError('No hay destinatarios válidos', { original: sanitized.to });
  }

  sanitized.to = validRecipients.length === 1 ? validRecipients[0] : validRecipients;

  // Sanitizar HTML para evitar problemas de encoding
  if (sanitized.mensaje_html) {
    sanitized.mensaje_html = sanitized.mensaje_html.trim();
  }

  // Asegurar que el subject no esté vacío
  if (!sanitized.subject || sanitized.subject.trim() === '') {
    sanitized.subject = 'Notificación del Sistema de Prácticas';
  }

  return sanitized;
};

/**
 * Envía email usando la edge function de Brevo con retry automático
 */
export const sendBrevoEmail = async (
  payload: BrevoEmailPayload,
  options: { timeout?: number; retries?: number } = {}
): Promise<BrevoEmailResponse> => {
  const { timeout = 30000, retries = 2 } = options;

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new BrevoEmailError(
      'Variables de entorno de Supabase no configuradas',
      { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey }
    );
  }

  // Sanitizar payload
  let sanitizedPayload: BrevoEmailPayload;
  try {
    sanitizedPayload = sanitizePayload(payload);
  } catch (error) {
    throw new BrevoEmailError(
      'Payload inválido: ' + (error instanceof Error ? error.message : String(error)),
      payload
    );
  }

  // Obtener sesión
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'apikey': supabaseAnonKey,
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const endpoint = `${supabaseUrl}/functions/v1/send-email-brevo`;

  // Función para intentar el envío
  const attemptSend = async (attemptNumber: number): Promise<BrevoEmailResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`[Brevo] Intento ${attemptNumber}/${retries + 1} - Enviando a:`, sanitizedPayload.to);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(sanitizedPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let json: any = null;

      if (rawText) {
        try {
          json = JSON.parse(rawText);
        } catch (parseError) {
          console.warn('[Brevo] Respuesta no es JSON válido:', rawText);
          json = { raw: rawText };
        }
      }

      if (!response.ok) {
        const errorInfo = json?.error ?? json ?? `HTTP ${response.status}`;
        const errorMessage = typeof errorInfo === 'string' 
          ? errorInfo 
          : errorInfo?.message ?? `Error HTTP ${response.status}`;

        // Errores 4xx no se reintentan (error del cliente)
        if (response.status >= 400 && response.status < 500) {
          throw new BrevoEmailError(
            `Error del cliente: ${errorMessage}`,
            errorInfo,
            response.status
          );
        }

        // Errores 5xx se pueden reintentar
        throw new BrevoEmailError(
          `Error del servidor: ${errorMessage}`,
          errorInfo,
          response.status
        );
      }

      console.log('[Brevo] Email enviado exitosamente:', json);
      return json || { ok: true };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof BrevoEmailError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BrevoEmailError(
          `Timeout: La petición tardó más de ${timeout}ms`,
          { timeout, attempt: attemptNumber }
        );
      }

      throw new BrevoEmailError(
        'Error de red: ' + (error instanceof Error ? error.message : String(error)),
        { originalError: error, attempt: attemptNumber }
      );
    }
  };

  // Intentar envío con reintentos
  let lastError: BrevoEmailError | null = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await attemptSend(attempt);
    } catch (error) {
      lastError = error instanceof BrevoEmailError 
        ? error 
        : new BrevoEmailError(String(error), error);

      // No reintentar si es error del cliente (4xx)
      if (lastError.statusCode && lastError.statusCode >= 400 && lastError.statusCode < 500) {
        console.error('[Brevo] Error del cliente, no se reintenta:', lastError.message);
        throw lastError;
      }

      // Si no es el último intento, esperar antes de reintentar
      if (attempt < retries + 1) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`[Brevo] Intento ${attempt} falló, reintentando en ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  console.error('[Brevo] Todos los intentos fallaron:', lastError);
  throw lastError || new BrevoEmailError('Error desconocido al enviar email');
};
