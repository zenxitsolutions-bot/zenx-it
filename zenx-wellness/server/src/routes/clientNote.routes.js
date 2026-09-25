import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
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

clientNoteRouter.get('/', requirePermission('clients.view'), listClientNotes);
clientNoteRouter.post('/', requirePermission('clients.view', 'clients.edit'), validate(createClientNoteSchema), createClientNote);
clientNoteRouter.patch('/:id', requirePermission('clients.view', 'clients.edit'), validate(updateClientNoteSchema), updateClientNote);
clientNoteRouter.delete('/:id', requirePermission('clients.view', 'clients.edit'), deleteClientNote);
