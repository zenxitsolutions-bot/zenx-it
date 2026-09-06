import { Router } from 'express';
import { authenticateStaff } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createInteraction, getInteractions } from '../controllers/interaction.controller.js';
import { createInteractionSchema } from '../schemas/interaction.schema.js';

export const interactionRouter = Router();

interactionRouter.use(authenticateStaff);
interactionRouter.get('/', getInteractions);
interactionRouter.post('/', validate(createInteractionSchema), createInteraction);
