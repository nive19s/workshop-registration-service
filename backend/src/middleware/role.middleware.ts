import { NextFunction, Request, Response } from 'express'
import { UserRole } from '@prisma/client'
import { AuthenticatedRequest } from '../types/auth.types'

export function requireRoles(...allowedRoles: UserRole[]) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    const authenticatedRequest = request as AuthenticatedRequest

    if (!authenticatedRequest.user) {
      response.status(401).json({
        success: false,
        message: 'Authentication is required',
      })
      return
    }

    if (!allowedRoles.includes(authenticatedRequest.user.role)) {
      response.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      })
      return
    }

    next()
  }
}