import {
  PrismaClient,
  UserRole,
  WorkshopStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function relativeDate(daysFromToday: number, hour: number): Date {
  const date = new Date()

  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + daysFromToday)
  date.setHours(hour, 0, 0, 0)

  return date
}

async function main() {
  const adminPassword = await bcrypt.hash('Admin@12345', 12)

  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@workshops.local',
    },
    update: {
      name: 'System Administrator',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      name: 'System Administrator',
      email: 'admin@workshops.local',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  })

  await prisma.workshop.upsert({
    where: {
      code: 'POTTERY-001',
    },
    update: {
      title: 'Beginner Pottery',
      description:
        'Learn basic pottery techniques and create your first clay project.',
      instructor: 'Sarah Wilson',
      location: 'Studio Room A',
      dateTime: relativeDate(2, 10),
      capacity: 20,
      status: WorkshopStatus.OPEN,
      createdById: null,
      updatedById: null,
    },
    create: {
      code: 'POTTERY-001',
      title: 'Beginner Pottery',
      description:
        'Learn basic pottery techniques and create your first clay project.',
      instructor: 'Sarah Wilson',
      location: 'Studio Room A',
      dateTime: relativeDate(2, 10),
      capacity: 20,
      status: WorkshopStatus.OPEN,
    },
  })

  await prisma.workshop.upsert({
    where: {
      code: 'FITNESS-001',
    },
    update: {
      title: 'Morning Fitness',
      description:
        'A practical fitness session suitable for beginners and intermediate attendees.',
      instructor: 'Daniel Smith',
      location: 'Fitness Hall',
      dateTime: relativeDate(3, 9),
      capacity: 15,
      status: WorkshopStatus.OPEN,
      createdById: null,
      updatedById: null,
    },
    create: {
      code: 'FITNESS-001',
      title: 'Morning Fitness',
      description:
        'A practical fitness session suitable for beginners and intermediate attendees.',
      instructor: 'Daniel Smith',
      location: 'Fitness Hall',
      dateTime: relativeDate(3, 9),
      capacity: 15,
      status: WorkshopStatus.OPEN,
    },
  })

  await prisma.workshop.upsert({
    where: {
      code: 'CODING-001',
    },
    update: {
      title: 'Introduction to Web Development',
      description:
        'Build a simple web page using HTML, CSS, and JavaScript.',
      instructor: 'Michael Brown',
      location: 'Computer Lab',
      dateTime: relativeDate(4, 14),
      capacity: 12,
      status: WorkshopStatus.OPEN,
      createdById: null,
      updatedById: null,
    },
    create: {
      code: 'CODING-001',
      title: 'Introduction to Web Development',
      description:
        'Build a simple web page using HTML, CSS, and JavaScript.',
      instructor: 'Michael Brown',
      location: 'Computer Lab',
      dateTime: relativeDate(4, 14),
      capacity: 12,
      status: WorkshopStatus.OPEN,
    },
  })

  await prisma.workshop.upsert({
    where: {
      code: 'PAINTING-001',
    },
    update: {
      title: 'Watercolour Painting',
      description:
        'Explore basic watercolour techniques and create a finished painting.',
      instructor: 'Emma Taylor',
      location: 'Art Room',
      dateTime: relativeDate(-7, 11),
      capacity: 10,
      status: WorkshopStatus.CANCELLED,
      createdById: null,
      updatedById: null,
    },
    create: {
      code: 'PAINTING-001',
      title: 'Watercolour Painting',
      description:
        'Explore basic watercolour techniques and create a finished painting.',
      instructor: 'Emma Taylor',
      location: 'Art Room',
      dateTime: relativeDate(-7, 11),
      capacity: 10,
      status: WorkshopStatus.CANCELLED,
    },
  })

  console.log('Database seeded successfully')
  console.log('')
  console.log('Initial Admin account:')
  console.log('Email: admin@workshops.local')
  console.log('Password: Admin@12345')
  console.log('')
  console.log('The Admin must create Manager and Staff accounts through the application.')
  console.log(`Admin ID: ${admin.id}`)
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })