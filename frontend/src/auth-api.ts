/** Calls the backend's account endpoints and includes session cookies and CSRF tokens. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export interface PublicUser {
  id: string
  email: string
  created_at: string
}

interface ErrorResponse {
  detail?: string
}

export class AuthApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

let csrfToken: string | null = null

async function parseError(response: Response): Promise<AuthApiError> {
  let message = 'Pyyntö epäonnistui. Yritä uudelleen.'
  try {
    const body = (await response.json()) as ErrorResponse
    if (typeof body.detail === 'string') {
      message = body.detail
    }
  } catch {
    // Keep the generic message if the backend did not return JSON.
  }
  return new AuthApiError(message, response.status)
}

/** Sends an account request; the browser attaches the session cookie automatically. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
  })
  if (!response.ok) {
    throw await parseError(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// Keep the token in memory; state-changing requests send it in a header.
async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!csrfToken || forceRefresh) {
    const response = await request<{ token: string }>('/api/auth/csrf')
    csrfToken = response.token
  }
  return csrfToken
}

/** Adds the CSRF header to POST requests and refreshes it once after a 403. */
async function sendWithCsrf<T>(path: string, body?: object): Promise<T> {
  const send = async (forceRefresh: boolean) =>
    request<T>(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': await getCsrfToken(forceRefresh),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

  try {
    return await send(false)
  } catch (error) {
    // A reload can leave an old in-memory token paired with a renewed cookie.
    if (error instanceof AuthApiError && error.status === 403) {
      return send(true)
    }
    throw error
  }
}

export function register(email: string, password: string): Promise<PublicUser> {
  return sendWithCsrf('/api/auth/register', { email, password })
}

export function login(email: string, password: string): Promise<PublicUser> {
  return sendWithCsrf('/api/auth/login', { email, password })
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    return await request<PublicUser>('/api/auth/me')
  } catch (error) {
    // No session is an ordinary logged-out state; other failures remain errors.
    if (error instanceof AuthApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

export function logout(): Promise<void> {
  return sendWithCsrf('/api/auth/logout')
}

export function resetAuthClientForTests(): void {
  csrfToken = null
}
