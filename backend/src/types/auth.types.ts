import { UserRole } from '@prisma/client'

export enum RoleLevel {
  ADMIN = 0,
  MANAGER = 1,
  STAFF = 2,
}

export const roleLevel: Record<UserRole, RoleLevel> = {
  ADMIN: RoleLevel.ADMIN,
  MANAGER: RoleLevel.MANAGER,
  STAFF: RoleLevel.STAFF,
}

export interface AuthTokenPayload {
  userId: number
  role: UserRole
}

export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: number
    name: string
    email: string
    role: UserRole
  }
}