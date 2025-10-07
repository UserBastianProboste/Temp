// Supabase Edge Function: send-email-brevo
// Deploy this in Supabase Dashboard (Functions). Set secrets: BREVO_API_KEY, FROM_EMAIL, APP_URL (optional).
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '*'
  const CORS_ALLOW_HEADERS = 'Content-Type, Authorization, x-client-info, apikey, x-supabase-auth, Origin, Accept'

  const JSON_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Allow-Credentials': 'true'
  } as Record<string, string>

  console.log('Function start', { method: req.method, origin })
  // Log incoming request headers to help debugging preflight issues
  try {
    const hdrs: Record<string,string> = {}
    for (const [k,v] of req.headers) hdrs[k] = v
    console.log('Incoming headers', hdrs)
  } catch (e) {
    console.warn('Failed to enumerate headers', String(e))
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS })
  }

  try {
    let body: any
    try {
      body = await req.json()
    } catch (e) {
      console.error('Invalid JSON body', String(e))
      return new Response(JSON.stringify({ error: 'invalid_json', details: String(e) }), { status: 400, headers: JSON_HEADERS })
    }

    console.log('Request body received', body)

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL')
    const APP_URL = Deno.env.get('APP_URL') || ''

    if (!BREVO_API_KEY || !FROM_EMAIL) {
      console.error('Missing configuration', { hasApiKey: !!BREVO_API_KEY, hasFrom: !!FROM_EMAIL })
      return new Response(JSON.stringify({ error: 'missing_configuration', details: { hasApiKey: !!BREVO_API_KEY, hasFrom: !!FROM_EMAIL } }), { status: 500, headers: JSON_HEADERS })
    }

    const to = body.to
    if (!to) {
      console.error('Missing required field: to')
      return new Response(JSON.stringify({ error: 'missing_field', field: 'to' }), { status: 400, headers: JSON_HEADERS })
    }

    const coordinatorName = body.coordinator_name || ''
    const estudianteNombre = body.estudiante_nombre || ''
    const estudianteApellido = body.estudiante_apellido || ''
    const tipoPractica = body.tipo_practica || ''
    const practicaId = body.practica_id || ''
    const empresa = body.empresa || ''
    const fechaInicio = body.fecha_inicio || ''
    const fechaTermino = body.fecha_termino || ''

    const subject = `Nueva inscripción a ${tipoPractica} - ${estudianteNombre} ${estudianteApellido}`
    const html = `
      <p>Hola ${coordinatorName || 'Coordinador'},</p>
      <p>El estudiante <strong>${estudianteNombre} ${estudianteApellido}</strong> se ha inscrito a <strong>${tipoPractica}</strong> en la empresa <strong>${empresa}</strong>.</p>
      <p>Periodo: ${fechaInicio} — ${fechaTermino}</p>
      <p>Saludos,<br/>Sistema de prácticas</p>
    `

    const payload = {
      sender: { email: FROM_EMAIL },
      to: Array.isArray(to) ? to.map((t: string) => ({ email: t })) : [{ email: to }],
      subject,
      htmlContent: html
    }

    console.log('Sending to Brevo', { to, sender: FROM_EMAIL })

    const encoder = new TextEncoder()
    const bodyBytes = encoder.encode(JSON.stringify(payload))

    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json; charset=utf-8' },
      body: bodyBytes
    })

    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch (_) { json = { raw: text } }

    if (!res.ok) {
      console.error('Brevo rejected request', { status: res.status, body: text })
      return new Response(JSON.stringify({ error: 'brevo_error', status: res.status, details: json }), { status: 502, headers: JSON_HEADERS })
    }

    console.log('Brevo response OK', { status: res.status, body: json })
    return new Response(JSON.stringify({ ok: true, brevo: json }), { status: 200, headers: JSON_HEADERS })

  } catch (err) {
    console.error('Unexpected function error', err)
    const details = (err && (err as any).stack) ? (err as any).stack : String(err)
    const ERR_HEADERS = { ...JSON_HEADERS }
    return new Response(JSON.stringify({ error: { code: 'unexpected', message: 'An unexpected error occurred', details } }), { status: 500, headers: ERR_HEADERS })
  }
})
