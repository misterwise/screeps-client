import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpClient } from '../../../src/http/HttpClient.js'
import { TokenAuth } from '../../../src/http/auth/TokenAuth.js'
import { SteamTicketAuth } from '../../../src/http/auth/SteamTicketAuth.js'

function mockResponse(body: unknown, opts: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...opts.headers },
    ...opts,
  })
}

describe('auth endpoints', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let http: HttpClient

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(mockResponse({ ok: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    http = new HttpClient({ url: 'http://test.local', auth: new TokenAuth({ token: 't' }) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('steamTicket sends POST with ticket', async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: 1, token: 'tok', steamid: 'steam123' }))
    const res = await http.auth.steamTicket('ticket-value')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/auth/steam-ticket')
    expect(JSON.parse(init.body as string)).toEqual({ ticket: 'ticket-value' })
    expect(res.token).toBe('tok')
    expect(res.steamid).toBe('steam123')
  })

  it('steamTicket includes useNativeAuth when provided', async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: 1, token: 'tok', steamid: 'steam123' }))
    await http.auth.steamTicket('ticket-value', true)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toEqual({ ticket: 'ticket-value', useNativeAuth: true })
  })
})

describe('SteamTicketAuth strategy', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('authenticate() calls steam-ticket and returns the token', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: 1, token: 'steam-tok', steamid: 'sid' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }))
    const http = new HttpClient({ url: 'http://test.local', auth: new TokenAuth({ token: '' }) })
    const strategy = new SteamTicketAuth({ ticket: 'my-steam-ticket' })
    const token = await strategy.authenticate(http)
    expect(token).toBe('steam-tok')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toEqual({ ticket: 'my-steam-ticket' })
  })

  it('passes useNativeAuth when set', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: 1, token: 't', steamid: 's' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }))
    const http = new HttpClient({ url: 'http://test.local', auth: new TokenAuth({ token: '' }) })
    const strategy = new SteamTicketAuth({ ticket: 'ticket', useNativeAuth: true })
    await strategy.authenticate(http)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.useNativeAuth).toBe(true)
  })
})

describe('register endpoints', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let http: HttpClient

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(mockResponse({ ok: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    http = new HttpClient({ url: 'http://test.local', auth: new TokenAuth({ token: 't' }) })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('checkEmail sends GET with email query param', async () => {
    await http.register.checkEmail('test@example.com')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('GET')
    expect(url).toContain('/api/register/check-email')
    expect(url).toContain('email=test%40example.com')
  })

  it('checkUsername sends GET with username query param', async () => {
    await http.register.checkUsername('Tigga')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('GET')
    expect(url).toContain('/api/register/check-username')
    expect(url).toContain('username=Tigga')
  })

  it('setUsername sends POST with username', async () => {
    await http.register.setUsername('Tigga')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/register/set-username')
    expect(JSON.parse(init.body as string)).toEqual({ username: 'Tigga' })
  })

  it('setUsername includes email when provided', async () => {
    await http.register.setUsername('Tigga', 'tigga@example.com')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toEqual({ username: 'Tigga', email: 'tigga@example.com' })
  })
})
