import type { HttpClient } from '../HttpClient.js'
import type { ApiRegisterCheckResponse } from '../../types/api.js'

export interface RegisterEndpoints {
  checkEmail(email: string): Promise<ApiRegisterCheckResponse>
  checkUsername(username: string): Promise<ApiRegisterCheckResponse>
  setUsername(username: string, email?: string): Promise<{ ok: number }>
  /** Register a new user account (screepsmod-auth private servers only). */
  submit(username: string, email: string, password: string, modules?: Record<string, string>): Promise<{ ok: number }>
}

export function createRegisterEndpoints(http: HttpClient): RegisterEndpoints {
  return {
    checkEmail: (email) => http.request('GET', '/api/register/check-email', { email }),
    checkUsername: (username) => http.request('GET', '/api/register/check-username', { username }),
    setUsername: (username, email) => http.request('POST', '/api/register/set-username', { username, ...(email != null ? { email } : {}) }),
    submit: (username, email, password, modules) => http.request('POST', '/api/register/submit', { username, email, password, ...(modules != null ? { modules } : {}) }),
  }
}
