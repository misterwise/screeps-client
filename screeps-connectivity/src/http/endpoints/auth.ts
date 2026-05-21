import type { HttpClient } from '../HttpClient.js'
import type { ApiAuthSigninResponse, ApiAuthMeResponse, ApiAuthQueryTokenResponse, ApiAuthSteamTicketResponse, ApiAuthModInfoResponse } from '../../types/api.js'

export interface AuthEndpoints {
  /** @mmonly Not available on private servers (backend-local). Use steamTicket() instead. */
  signin(email: string, password: string): Promise<ApiAuthSigninResponse>
  me(): Promise<ApiAuthMeResponse>
  /** @mmonly Not available on private servers (backend-local). */
  queryToken(token: string): Promise<ApiAuthQueryTokenResponse>
  steamTicket(ticket: string, useNativeAuth?: boolean): Promise<ApiAuthSteamTicketResponse>
  /** Query screepsmod-auth capabilities (allowRegistration, available OAuth providers). Only available on servers running screepsmod-auth. */
  modInfo(): Promise<ApiAuthModInfoResponse>
}

export function createAuthEndpoints(http: HttpClient): AuthEndpoints {
  return {
    signin: (email, password) => http.request('POST', '/api/auth/signin', { email, password }),
    me: () => http.request('GET', '/api/auth/me'),
    queryToken: (token) => http.request('GET', '/api/auth/query-token', { token }),
    steamTicket: (ticket, useNativeAuth) => http.request('POST', '/api/auth/steam-ticket', { ticket, ...(useNativeAuth != null ? { useNativeAuth } : {}) }),
    modInfo: () => http.request('GET', '/api/authmod'),
  }
}
