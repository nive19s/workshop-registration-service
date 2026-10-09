import app from './app'
import { env } from './config/env'
import prisma from './lib/prisma'

const server = app.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`)
})

async function shutdown() {
  console.log('Shutting down server...')

  await prisma.$disconnect()

  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)