import type { User as BetterAuthUser } from "better-auth/types"

// Extend Better Auth's User type with your custom fields
export interface User extends BetterAuthUser {
  firstName?: string
  lastName?: string
  role?: string
  phoneNumber?: string | null
  isActive?: boolean
}

// Extend Better Auth's Session type
export interface Session {
  user: User
  session: {
    id: string
    userId: string
    expiresAt: Date
    token: string
    ipAddress?: string
    userAgent?: string
  }
}