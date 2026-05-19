import type { HttpClient } from '../HttpClient.js'
import type { ApiPowerCreepsListResponse } from '../../types/api.js'

export interface PowerCreepsEndpoints {
  list(): Promise<ApiPowerCreepsListResponse>
  create(name: string, className: string): Promise<{ ok: number }>
  delete(id: string): Promise<{ ok: number }>
  cancelDelete(id: string): Promise<{ ok: number }>
  upgrade(id: string, powers: Record<string, number>): Promise<{ ok: number }>
  rename(id: string, name: string): Promise<{ ok: number }>
  experimentation(): Promise<{ ok: number }>
}

export function createPowerCreepsEndpoints(http: HttpClient): PowerCreepsEndpoints {
  return {
    list: () => http.request('GET', '/api/game/power-creeps/list'),
    create: (name, className) => http.request('POST', '/api/game/power-creeps/create', { name, className }),
    delete: (id) => http.request('POST', '/api/game/power-creeps/delete', { id }),
    cancelDelete: (id) => http.request('POST', '/api/game/power-creeps/cancel-delete', { id }),
    upgrade: (id, powers) => http.request('POST', '/api/game/power-creeps/upgrade', { id, powers }),
    rename: (id, name) => http.request('POST', '/api/game/power-creeps/rename', { id, name }),
    experimentation: () => http.request('POST', '/api/game/power-creeps/experimentation'),
  }
}
