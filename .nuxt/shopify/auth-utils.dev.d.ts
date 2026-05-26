import type { defineEventHandler, H3Event } from 'h3'
import type { User, SecureSessionData } from '#auth-utils'

declare module '#imports' {
  const defineOAuthShopifyCustomerEventHandler: (options: {
    onSuccess: (event: H3Event, params: { user: { firstName: string, lastName: string, emailAddress: { emailAddress: string } }, tokens: { access_token: string, refresh_token?: string } }) => Promise<void>
    onError: (event: H3Event, error: Error) => Promise<void>
  }) => ReturnType<typeof defineEventHandler>

  const setUserSession: (event: H3Event, sessionData: { user: User, secure: SecureSessionData, loggedInAt: Date }) => Promise<void>
  const getUserSession: (event: H3Event) => Promise<{ user: User | null, secure: SecureSessionData | null, loggedInAt: Date | null } | null>
  const clearUserSession: (event: H3Event) => Promise<void>
}
