import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/auth.routes'
import userRoutes from './routes/user.routes'
import workshopRoutes from './routes/workshop.routes'
import registrationRoutes from './routes/registration.routes'
import { errorHandler } from './middleware/error.middleware'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'Workshop registration API is running',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/workshops', workshopRoutes)
app.use('/api/registrations', registrationRoutes)

app.use(errorHandler)

export default app