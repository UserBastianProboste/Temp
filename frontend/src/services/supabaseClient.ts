// filepath: c:\Users\overx\consultoria_informatica\frontend\src\services\supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// The project .env uses VITE_SUPABASE_ANON_KEY; use that here.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
	// Keep a helpful message in dev if envs are misnamed/missing
	// This avoids silent 401s caused by using the wrong key/name.
	// (No throw so production builds don't crash here unexpectedly.)
	// eslint-disable-next-line no-console
	console.error('Missing Supabase env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	global: {
		headers: {
			// ensure PostgREST always receives the anon key when running in the browser
			apikey: supabaseAnonKey || '',
		},
	},
});

// Development-only debug helpers: expose minimal helpers on window to inspect session/keys
if (import.meta.env.DEV) {
	try {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		(window).supabase = supabase;
		// expose a tiny object that indicates anon key presence (do NOT expose the full key)
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		(window).__supabase_debug = {
			anonKeyPresent: !!supabaseAnonKey,
			anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
			url: supabaseUrl,
		};
		// eslint-disable-next-line no-console
		console.debug('[supabase] debug helpers exposed to window.supabase and window.__supabase_debug (dev only)');
	} catch (e) {
		// ignore attach errors
	}
}

	// Dev helper: ensure `apikey` is also present as a URL param for REST calls to avoid
	// CORS/headers issues while debugging. This is a temporary workaround and only runs in dev.
	if (import.meta.env.DEV) {
		try {
			const restPrefix = supabaseUrl.replace(/\/$/, '') + '/rest/v1';
			// @ts-ignore
			const _originalFetch = globalThis.fetch;
			// @ts-ignore
			globalThis.fetch = async (input: RequestInfo, init?: RequestInit) => {
				try {
					let urlStr: string;
					if (typeof input === 'string') urlStr = input;
					else urlStr = input instanceof Request ? input.url : String(input);

					if (urlStr.startsWith(restPrefix)) {
						const u = new URL(urlStr);
						if (!u.searchParams.has('apikey') && supabaseAnonKey) {
							u.searchParams.set('apikey', supabaseAnonKey);
							if (typeof input === 'string') {
								input = u.toString();
							} else if (input instanceof Request) {
								input = new Request(u.toString(), input);
							} else {
								input = u.toString();
							}
						}
					}
				} catch (e) {
					// ignore
				}
				// @ts-ignore
				return _originalFetch(input, init);
			};
			// eslint-disable-next-line no-console
			console.debug('[supabase] dev fetch patched to append apikey query param for REST endpoints');
		} catch (e) {
			// ignore
		}
	}

export async function debugSession() {
	try {
		const session = await supabase.auth.getSession();
		// eslint-disable-next-line no-console
		console.debug('[supabase] debugSession', session);
		return session;
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[supabase] debugSession error', e);
		throw e;
	}
}

/**
 * Wait until a session is available (or timeout). Returns the session or null.
 * Useful to avoid race conditions where components call DB before auth is initialized.
 */
export async function ensureAuthReady(timeoutMs = 3000) {
	const start = Date.now();
	// quick check
	let { data: { session } } = await supabase.auth.getSession();
	if (session) return session;

	return new Promise((resolve) => {
		const check = async () => {
			const { data: { session: s } } = await supabase.auth.getSession();
			if (s) return resolve(s);
			if (Date.now() - start > timeoutMs) return resolve(null);
			setTimeout(check, 200);
		};
		check();
	});
}