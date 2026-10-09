import { Router } from 'express'
import { UserRole } from '@prisma/client'
import {
  createWorkshop,
  getWorkshop,
  listWorkshops,
  updateWorkshop,
} from '../controllers/workshop.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRoles } from '../middleware/role.middleware'

const router = Router()

router.use(authenticate)

router.get('/', listWorkshops)

router.get('/:id', getWorkshop)

router.post(
  '/',
  requireRoles(UserRole.MANAGER),
  createWorkshop,
)

router.patch(
  '/:id',
  requireRoles(UserRole.MANAGER),
  updateWorkshop,
)

export default router