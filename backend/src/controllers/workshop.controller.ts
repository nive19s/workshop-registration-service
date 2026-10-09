import { Request, Response } from 'express'
import { WorkshopStatus } from '@prisma/client'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AuthenticatedRequest } from '../types/auth.types'

const workshopSchema = z.object({
  code: z.string().trim().min(2).max(30),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  instructor: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(150),
  dateTime: z.coerce.date(),
  capacity: z.coerce.number().int().positive(),
  status: z.nativeEnum(WorkshopStatus).default(WorkshopStatus.DRAFT),
})

const workshopUpdateSchema = workshopSchema.partial()

export async function listWorkshops(
  request: Request,
  response: Response,
) {
  const querySchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    status: z.nativeEnum(WorkshopStatus).optional(),
    available: z.enum(['true', 'false']).optional(),
  })

  const result = querySchema.safeParse(request.query)

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid workshop filters',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const { from, to, status, available } = result.data

  const workshops = await prisma.workshop.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            dateTime: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          registrations: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
      },
    },
    orderBy: {
      dateTime: 'asc',
    },
  })

  const resultWorkshops = workshops
    .map((workshop) => {
      const activeRegistrations = workshop._count.registrations
      const seatsAvailable = Math.max(
        workshop.capacity - activeRegistrations,
        0,
      )

      return {
        ...workshop,
        activeRegistrations,
        seatsAvailable,
      }
    })
    .filter((workshop) => {
      if (!available) {
        return true
      }

      const hasSeats = workshop.seatsAvailable > 0

      return available === 'true' ? hasSeats : !hasSeats
    })

  response.status(200).json({
    success: true,
    data: resultWorkshops,
  })
}

export async function getWorkshop(
  request: Request,
  response: Response,
) {
  const workshopId = Number(request.params.id)

  if (!Number.isInteger(workshopId)) {
    response.status(400).json({
      success: false,
      message: 'Invalid workshop ID',
    })
    return
  }

  const workshop = await prisma.workshop.findUnique({
    where: {
      id: workshopId,
    },
    include: {
      registrations: {
        include: {
          registeredBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          cancelledBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          registeredAt: 'desc',
        },
      },
      _count: {
        select: {
          registrations: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
      },
    },
  })

  if (!workshop) {
    response.status(404).json({
      success: false,
      message: 'Workshop not found',
    })
    return
  }

  response.status(200).json({
    success: true,
    data: {
      ...workshop,
      activeRegistrations: workshop._count.registrations,
      seatsAvailable: Math.max(
        workshop.capacity - workshop._count.registrations,
        0,
      ),
    },
  })
}

export async function createWorkshop(
  request: Request,
  response: Response,
) {
  const result = workshopSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid workshop details',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const authenticatedRequest = request as AuthenticatedRequest

  if (!authenticatedRequest.user) {
    response.status(401).json({
      success: false,
      message: 'Authentication is required',
    })
    return
  }

  const existingWorkshop = await prisma.workshop.findUnique({
    where: {
      code: result.data.code,
    },
  })

  if (existingWorkshop) {
    response.status(409).json({
      success: false,
      message: 'A workshop with this code already exists',
    })
    return
  }

  const workshop = await prisma.workshop.create({
    data: {
      ...result.data,
      createdById: authenticatedRequest.user.id,
      updatedById: authenticatedRequest.user.id,
    },
  })

  response.status(201).json({
    success: true,
    message: 'Workshop created successfully',
    data: workshop,
  })
}

export async function updateWorkshop(
  request: Request,
  response: Response,
) {
  const workshopId = Number(request.params.id)

  if (!Number.isInteger(workshopId)) {
    response.status(400).json({
      success: false,
      message: 'Invalid workshop ID',
    })
    return
  }

  const result = workshopUpdateSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid workshop details',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const authenticatedRequest = request as AuthenticatedRequest

  if (!authenticatedRequest.user) {
    response.status(401).json({
      success: false,
      message: 'Authentication is required',
    })
    return
  }

  const workshop = await prisma.workshop.findUnique({
    where: {
      id: workshopId,
    },
  })

  if (!workshop) {
    response.status(404).json({
      success: false,
      message: 'Workshop not found',
    })
    return
  }

  const updatedWorkshop = await prisma.workshop.update({
    where: {
      id: workshopId,
    },
    data: {
      ...result.data,
      updatedById: authenticatedRequest.user.id,
    },
  })

  response.status(200).json({
    success: true,
    message: 'Workshop updated successfully',
    data: updatedWorkshop,
  })
}