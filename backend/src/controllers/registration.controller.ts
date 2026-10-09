import { Request, Response } from 'express'
import { Prisma, RegistrationStatus } from '@prisma/client'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { AuthenticatedRequest } from '../types/auth.types'

const registrationSchema = z.object({
  attendeeName: z.string().trim().min(2).max(100),
  attendeeEmail: z.string().email(),
})

export async function listRegistrations(
  request: Request,
  response: Response,
) {
  const workshopId = Number(request.params.workshopId)

  if (!Number.isInteger(workshopId)) {
    response.status(400).json({
      success: false,
      message: 'Invalid workshop ID',
    })
    return
  }

  const registrations = await prisma.registration.findMany({
    where: {
      workshopId,
    },
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
  })

  response.status(200).json({
    success: true,
    data: registrations,
  })
}

export async function createRegistration(
  request: Request,
  response: Response,
) {
  const workshopId = Number(request.params.workshopId)

  if (!Number.isInteger(workshopId)) {
    response.status(400).json({
      success: false,
      message: 'Invalid workshop ID',
    })
    return
  }

  const result = registrationSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      success: false,
      message: 'Invalid attendee details',
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

  try {
    const registration = await prisma.$transaction(
      async (transaction) => {
        const workshops = await transaction.$queryRaw<
          Array<{
            id: number
            capacity: number
            status: string
          }>
        >(Prisma.sql`
          SELECT "id", "capacity", "status"
          FROM "Workshop"
          WHERE "id" = ${workshopId}
          FOR UPDATE
        `)

        const workshop = workshops[0]

        if (!workshop) {
          throw new Error('WORKSHOP_NOT_FOUND')
        }

        if (workshop.status === 'CANCELLED') {
          throw new Error('WORKSHOP_CANCELLED')
        }

        const activeRegistrationCount =
          await transaction.registration.count({
            where: {
              workshopId,
              status: RegistrationStatus.ACTIVE,
            },
          })

        if (activeRegistrationCount >= workshop.capacity) {
          throw new Error('WORKSHOP_FULL')
        }

        const existingRegistration =
          await transaction.registration.findFirst({
            where: {
              workshopId,
              attendeeEmail: result.data.attendeeEmail,
              status: RegistrationStatus.ACTIVE,
            },
          })

        if (existingRegistration) {
          throw new Error('ATTENDEE_ALREADY_REGISTERED')
        }

        return transaction.registration.create({
          data: {
            workshopId,
            attendeeName: result.data.attendeeName,
            attendeeEmail: result.data.attendeeEmail,
            registeredById: authenticatedRequest.user!.id,
            status: RegistrationStatus.ACTIVE,
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    )

    response.status(201).json({
      success: true,
      message: 'Attendee registered successfully',
      data: registration,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'WORKSHOP_NOT_FOUND') {
        response.status(404).json({
          success: false,
          message: 'Workshop not found',
        })
        return
      }

      if (error.message === 'WORKSHOP_CANCELLED') {
        response.status(409).json({
          success: false,
          message: 'Cancelled workshops cannot accept registrations',
        })
        return
      }

      if (error.message === 'WORKSHOP_FULL') {
        response.status(409).json({
          success: false,
          message: 'Workshop has no available seats',
        })
        return
      }

      if (error.message === 'ATTENDEE_ALREADY_REGISTERED') {
        response.status(409).json({
          success: false,
          message: 'This attendee is already registered',
        })
        return
      }
    }

    console.error('Registration failed:', error)

    response.status(500).json({
      success: false,
      message: 'Registration could not be completed',
    })
  }
}

export async function cancelRegistration(
  request: Request,
  response: Response,
) {
  const registrationId = Number(request.params.id)

  if (!Number.isInteger(registrationId)) {
    response.status(400).json({
      success: false,
      message: 'Invalid registration ID',
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

  const registration = await prisma.registration.findUnique({
    where: {
      id: registrationId,
    },
  })

  if (!registration) {
    response.status(404).json({
      success: false,
      message: 'Registration not found',
    })
    return
  }

  if (registration.status === RegistrationStatus.CANCELLED) {
    response.status(409).json({
      success: false,
      message: 'Registration is already cancelled',
    })
    return
  }

  const cancelledRegistration = await prisma.registration.update({
    where: {
      id: registrationId,
    },
    data: {
      status: RegistrationStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById: authenticatedRequest.user.id,
    },
  })

  response.status(200).json({
    success: true,
    message: 'Registration cancelled successfully',
    data: cancelledRegistration,
  })
}