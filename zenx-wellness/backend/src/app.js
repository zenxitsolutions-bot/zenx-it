import cors from 'cors'
import express from 'express'
import { errorHandler, notFound } from './middleware/error.middleware.js'
import { resolveTenant } from './middleware/tenant.middleware.js'
import routes from './routes/index.js'
import { isAllowedOrigin } from './utils/origin.js'

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin, curl or Postman — allow it through.
      if (!origin) return callback(null, true)
      if (isAllowedOrigin(origin)) return callback(null, true)

      console.warn(`[cors] blocked origin ${origin}`)
      return callback(null, false)
    },
    credentials: true,
  }),
)

app.use(express.json())

// Runs before every route: resolves the company from the subdomain, or null on
// a ZenX platform host. This is the only trusted source of companyId.
app.use(resolveTenant)

app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

export default app
