import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import prisma from '../lib/prisma'

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
})

export async function createUser(
  request: Request,
  response: Response,
) {
  const result = createUserSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid user details',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const { name, email, password, role } = result.data

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  })

  if (existingUser) {
    response.status(409).json({
      success: false,
      message: 'A user with this email already exists',
    })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  response.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  })
}

export async function listUsers(
  _request: Request,
  response: Response,
) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  response.status(200).json({
    success: true,
    data: users,
  })
}