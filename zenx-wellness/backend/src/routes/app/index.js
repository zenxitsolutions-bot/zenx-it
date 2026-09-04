import { Router } from 'express'
import * as dashboardController from '../../controllers/app/dashboard.controller.js'
import { makeAssignmentController } from '../../controllers/app/assignment.controller.js'
import * as clientPlanController from '../../controllers/app/clientPlan.controller.js'
import { authenticate } from '../../middleware/auth.middleware.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { requireTenant } from '../../middleware/tenant.middleware.js'
import { CATALOGS } from '../../services/app/catalog.service.js'
import { STAFF_KINDS } from '../../services/app/staff.service.js'
import { validateBody, validateParams } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import { setAssignmentsSchema } from '../../validators/app/staff.validator.js'
import {
  createExerciseSchema,
  createRecipeSchema,
  exerciseListQuerySchema,
  recipeListQuerySchema,
  updateExerciseSchema,
  updateRecipeSchema,
} from '../../validators/app/catalog.validator.js'
import clientRoutes from './client.routes.js'
import dietPlanRoutes from './dietPlan.routes.js'
import enquiryRoutes from './enquiry.routes.js'
import roleRoutes from './role.routes.js'
import userRoutes from './user.routes.js'
import workoutPlanRoutes from './workoutPlan.routes.js'
import { makeCatalogRouter } from './catalog.routes.js'
import { availabilityRouter, makeStaffRouter } from './staff.routes.js'

const router = Router()

/**
 * Customer surface. Gated once here:
 *   requireTenant — a company subdomain must have resolved
 *   authenticate  — reloads the user and matches them against that tenant
 *
 * Individual routes then add authorize('<permission>'). Every service below
 * takes req.tenant.companyId and filters by it; nothing reads a companyId from
 * the body, query or token.
 */
router.use(requireTenant, authenticate)

router.get('/dashboard/summary', authorize('dashboard.view'), dashboardController.summary)

router.use('/roles', roleRoutes)
router.use('/users', userRoutes)
router.use('/clients', clientRoutes)
router.use('/enquiries', enquiryRoutes)

router.use('/dietitians', makeStaffRouter(STAFF_KINDS.DIETITIAN, 'dietitians'))
router.use('/trainers', makeStaffRouter(STAFF_KINDS.TRAINER, 'trainers'))
router.use('/availability', availabilityRouter())

// Client-side assignment management, one path per staff kind.
const dietitianAssignments = makeAssignmentController(STAFF_KINDS.DIETITIAN)
const trainerAssignments = makeAssignmentController(STAFF_KINDS.TRAINER)

router.get(
  '/clients/:id/dietitians',
  authorize('clients.view'),
  validateParams(idParamSchema),
  dietitianAssignments.list,
)
router.put(
  '/clients/:id/dietitians',
  authorize('clients.assign'),
  validateParams(idParamSchema),
  validateBody(setAssignmentsSchema),
  dietitianAssignments.set,
)
router.get(
  '/clients/:id/trainers',
  authorize('clients.view'),
  validateParams(idParamSchema),
  trainerAssignments.list,
)
router.put(
  '/clients/:id/trainers',
  authorize('clients.assign'),
  validateParams(idParamSchema),
  validateBody(setAssignmentsSchema),
  trainerAssignments.set,
)

// What a client (or their carer) can see for one client record.
router.get(
  '/clients/:id/diet-plans',
  authorize('diet_plans.view'),
  validateParams(idParamSchema),
  clientPlanController.dietPlans,
)
router.get(
  '/clients/:id/workout-plans',
  authorize('workout_plans.view'),
  validateParams(idParamSchema),
  clientPlanController.workoutPlans,
)

router.use(
  '/recipes',
  makeCatalogRouter(CATALOGS.RECIPE, 'recipes', {
    listQuery: recipeListQuerySchema,
    createSchema: createRecipeSchema,
    updateSchema: updateRecipeSchema,
  }),
)
router.use(
  '/exercises',
  makeCatalogRouter(CATALOGS.EXERCISE, 'exercises', {
    listQuery: exerciseListQuerySchema,
    createSchema: createExerciseSchema,
    updateSchema: updateExerciseSchema,
  }),
)

router.use('/diet-plans', dietPlanRoutes)
router.use('/workout-plans', workoutPlanRoutes)

export default router
