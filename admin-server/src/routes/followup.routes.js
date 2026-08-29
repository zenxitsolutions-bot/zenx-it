import { Router } from 'express';
import { authenticateStaff } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createFollowup, getFollowups, patchFollowup } from '../controllers/followup.controller.js';
import { createFollowupSchema, patchFollowupSchema } from '../schemas/followup.schema.js';

export const followupRouter = Router();

followupRouter.use(authenticateStaff);
followupRouter.get('/', getFollowups);
followupRouter.post('/', validate(createFollowupSchema), createFollowup);
followupRouter.patch('/:id', validate(patchFollowupSchema), patchFollowup);
