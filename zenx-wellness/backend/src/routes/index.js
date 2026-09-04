import { Router } from 'express'
import authRoutes from './auth.routes.js'
import appRoutes from './app/index.js'
import platformRoutes from './platform/index.js'

const router = Router()

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok' }))
router.use('/auth', authRoutes)
router.use('/platform', platformRoutes)
router.use('/app', appRoutes)

export default router
