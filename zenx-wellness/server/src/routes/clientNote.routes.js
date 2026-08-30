import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  listClientNotes,
  createClientNote,
  updateClientNote,
  deleteClientNote,
} from '../controllers/clientNote.controller.js';
import { createClientNoteSchema, updateClientNoteSchema } from '../schemas/clientNote.schema.js';

export const clientNoteRouter = Router();
clientNoteRouter.use(authenticate, blockIfMustChangePassword, authorize('dietitian', 'admin'));

clientNoteRouter.get('/', listClientNotes);
clientNoteRouter.post('/', validate(createClientNoteSchema), createClientNote);
clientNoteRouter.patch('/:id', validate(updateClientNoteSchema), updateClientNote);
clientNoteRouter.delete('/:id', deleteClientNote);
