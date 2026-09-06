import { asyncHandler } from '../middleware/asyncHandler.js';
import { createInteraction as createInteractionRecord, listInteractions, listInteractionsForEnquiry } from '../models/Interaction.js';

export const createInteraction = asyncHandler(async (req, res) => {
  const interaction = await createInteractionRecord({ ...req.body, adminId: req.staff.id });
  res.status(201).json(interaction);
});

export const getInteractions = asyncHandler(async (req, res) => {
  if (req.query.enquiryId) return res.json(await listInteractionsForEnquiry(req.query.enquiryId));
  res.json(await listInteractions());
});
