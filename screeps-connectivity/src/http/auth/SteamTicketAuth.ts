import type { AuthStrategy } from './AuthStrategy.js'
import type { HttpClient } from '../HttpClient.js'

export class SteamTicketAuth implements AuthStrategy {
  private readonly ticket: string
  private readonly useNativeAuth: boolean | undefined

  constructor(opts: { ticket: string; useNativeAuth?: boolean }) {
    this.ticket = opts.ticket
    this.useNativeAuth = opts.useNativeAuth
  }

  async authenticate(http: HttpClient): Promise<string> {
    const res = await http.auth.steamTicket(this.ticket, this.useNativeAuth)
    return res.token
  }
}
