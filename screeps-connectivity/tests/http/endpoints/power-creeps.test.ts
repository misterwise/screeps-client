import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpClient } from '../../../src/http/HttpClient.js'
import { TokenAuth } from '../../../src/http/auth/TokenAuth.js'

function mockResponse(body: unknown, opts: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...opts.headers },
    ...opts,
  })
}

describe('game.powerCreeps endpoints', () => {
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

  it('list sends GET to /api/game/power-creeps/list', async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: 1, list: [] }))
    await http.game.powerCreeps.list()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('GET')
    expect(url).toContain('/api/game/power-creeps/list')
  })

  it('create sends POST with name and className', async () => {
    await http.game.powerCreeps.create('MyPC', 'operator')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/game/power-creeps/create')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'MyPC', className: 'operator' })
  })

  it('delete sends POST with id', async () => {
    await http.game.powerCreeps.delete('pc-id')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/game/power-creeps/delete')
    expect(JSON.parse(init.body as string)).toEqual({ id: 'pc-id' })
  })

  it('cancelDelete sends POST with id', async () => {
    await http.game.powerCreeps.cancelDelete('pc-id')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/game/power-creeps/cancel-delete')
    expect(JSON.parse(init.body as string)).toEqual({ id: 'pc-id' })
  })

  it('upgrade sends POST with id and powers', async () => {
    await http.game.powerCreeps.upgrade('pc-id', { OPERATE_SPAWN: 2 })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/game/power-creeps/upgrade')
    expect(JSON.parse(init.body as string)).toEqual({ id: 'pc-id', powers: { OPERATE_SPAWN: 2 } })
  })

  it('rename sends POST with id and name', async () => {
    await http.game.powerCreeps.rename('pc-id', 'NewName')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/game/power-creeps/rename')
    expect(JSON.parse(init.body as string)).toEqual({ id: 'pc-id', name: 'NewName' })
  })

  it('experimentation sends POST to /api/game/power-creeps/experimentation', async () => {
    await http.game.powerCreeps.experimentation()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(url).toContain('/api/game/power-creeps/experimentation')
  })
})
