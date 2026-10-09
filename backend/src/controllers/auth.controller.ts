import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { env } from '../config/env'
import { AuthTokenPayload } from '../types/auth.types'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(request: Request, response: Response) {
  const result = loginSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: 'Email and password are required',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  })

  if (!user || !user.isActive) {
    response.status(401).json({
      success: false,
      message: 'Invalid email or password',
    })
    return
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  )

  if (!passwordMatches) {
    response.status(401).json({
      success: false,
      message: 'Invalid email or password',
    })
    return
  }

  const tokenPayload: AuthTokenPayload = {
    userId: user.id,
    role: user.role,
  }

  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })

  response.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  })
}