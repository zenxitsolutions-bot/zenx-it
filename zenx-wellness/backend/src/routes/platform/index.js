import { Router } from 'express'
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js'
import { platformOnly } from '../../middleware/tenant.middleware.js'
import companyRoutes from './company.routes.js'
import enquiryRoutes from './enquiry.routes.js'
import planRoutes from './plan.routes.js'
import subscriptionRoutes from './subscription.routes.js'

const router = Router()

/**
 * Every platform route is gated here rather than per controller:
 *   platformOnly  — refuses the request if it arrived on a company subdomain
 *   authenticate  — reloads the user and matches them against the host's tenant
 *   authorizeRoles — SUPER_ADMIN only
 *
 * Nothing below this line may touch a customer-owned table.
 */
router.use(platformOnly, authenticate, authorizeRoles('SUPER_ADMIN'))

router.use('/enquiries', enquiryRoutes)
router.use('/companies', companyRoutes)
router.use('/plans', planRoutes)
router.use('/subscriptions', subscriptionRoutes)

export default router
