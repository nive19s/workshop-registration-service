import { Router } from 'express'
import { UserRole } from '@prisma/client'
import {
  cancelRegistration,
  createRegistration,
  listRegistrations,
} from '../controllers/registration.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRoles } from '../middleware/role.middleware'

const router = Router()

router.use(authenticate)

router.get(
  '/workshop/:workshopId',
  listRegistrations,
)

router.post(
  '/workshop/:workshopId',
  requireRoles(UserRole.STAFF),
  createRegistration,
)

router.post(
  '/:id/cancel',
  requireRoles(UserRole.STAFF),
  cancelRegistration,
)

export default router