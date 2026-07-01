'use client'

/**
 * Client-side global fetch interceptor with automatic JWT token injection.
 * This module patches the global `fetch` so ALL fetch() calls throughout
 * the application automatically include the Authorization header.
 *
 * The token is managed via setAuthToken() / getAuthToken() and synced
 * with the Zustand store's setToken().
 */

let token: string | null = null
let _originalFetch: typeof globalThis.fetch | null = null

export function setAuthToken(t: string | null) {
  token = t
}

export function getAuthToken(): string | null {
  return token
}

/**
 * Initialize the fetch interceptor. Call once on app mount.
 * Patches global.fetch to auto-inject the JWT Authorization header.
 */
export function initFetchInterceptor() {
  if (typeof window === 'undefined') return // SSR safety
  if (_originalFetch) return // Already patched

  _originalFetch = window.fetch

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // Only inject token for same-origin API calls
    if (token && (url.startsWith('/') || url.startsWith(window.location.origin))) {
      const headers = new Headers(init?.headers)
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return _originalFetch!(input, { ...init, headers })
    }

    return _originalFetch!(input, init)
  }
}

/**
 * Optional: named authFetch for explicit use when needed.
 * Most code can just use fetch() since the global interceptor handles it.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, { ...options, headers })
}