import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCurrentUser,
  register,
  resetAuthClientForTests,
} from './auth-api'

afterEach(() => {
  vi.unstubAllGlobals()
  resetAuthClientForTests()
})

describe('auth API client', () => {
  it('sends cookies when checking the current user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'test@example.com',
          created_at: '2026-10-02T09:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = await getCurrentUser()

    expect(user?.email).toBe('test@example.com')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('gets a CSRF token before registration', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-example' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: '00000000-0000-0000-0000-000000000001',
            email: 'test@example.com',
            created_at: '2026-10-02T09:00:00Z',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    await register('test@example.com', 'a long example password')

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8000/api/auth/register',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-example' }),
      }),
    )
  })
})
