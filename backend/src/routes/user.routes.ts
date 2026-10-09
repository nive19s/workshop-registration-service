import { Router } from 'express'
import { UserRole } from '@prisma/client'
import {
  createUser,
  listUsers,
} from '../controllers/user.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRoles } from '../middleware/role.middleware'

const router = Router()

router.use(authenticate)

router.get(
  '/',
  requireRoles(UserRole.ADMIN),
  listUsers,
)

router.post(
  '/',
  requireRoles(UserRole.ADMIN),
  createUser,
)

export default router