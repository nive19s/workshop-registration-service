import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'
import prisma from '../lib/prisma'
import { env } from '../config/env'
import {
  AuthTokenPayload,
  AuthenticatedRequest,
} from '../types/auth.types'

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const authorization = request.headers.authorization

    if (!authorization?.startsWith('Bearer ')) {
      response.status(401).json({
        success: false,
        message: 'Authentication token is required',
      })
      return
    }

    const token = authorization.substring('Bearer '.length)

    const payload = jwt.verify(
      token,
      env.JWT_SECRET,
    ) as AuthTokenPayload

    if (!payload.userId || !payload.role) {
      response.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      response.status(401).json({
        success: false,
        message: 'User account is inactive or does not exist',
      })
      return
    }

    const authenticatedRequest = request as AuthenticatedRequest

    authenticatedRequest.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
    }

    next()
  } catch (error) {
    console.error('Authentication failed:', error)

    response.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    })
  }
}