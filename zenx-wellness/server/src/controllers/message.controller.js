import { findUserById } from '../models/User.js';
import {
  listMessages as queryMessages,
  createMessage as createMessageRecord,
  markConversationRead,
  countUnreadForClient,
  countUnreadForDietitian,
  listConversationsForDietitian as queryConversations,
} from '../models/Message.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';

// The single place conversation identity + membership is decided — every route below calls this
// instead of re-deriving it, so there is exactly one way to get the "am I actually part of this
// conversation" check wrong, not five. A client always means "me and my current assigned
// dietitian" (never client-supplied); a dietitian must name a client and can only ever mean one
// they're actually assigned to right now (assertDietitianOwnsClient — `403` otherwise). Returns
// null only for a client with no dietitian assigned yet — there is no conversation to have.
async function resolveConversation(req) {
  if (req.user.role === 'client') {
    const me = await findUserById(req.user.id);
    if (!me.assignedDietitian) return null;
    return { client: req.user.id, dietitian: String(me.assignedDietitian) };
  }
  const clientId = req.query.client || req.body.client;
  if (!clientId) throw ApiError.badRequest('client is required');
  await assertDietitianOwnsClient(req, clientId);
  return { client: clientId, dietitian: req.user.id };
}

export const listMessages = asyncHandler(async (req, res) => {
  const conversation = await resolveConversation(req);
  if (!conversation) return res.json([]);

  const messages = await queryMessages(conversation.client, conversation.dietitian);
  res.json(messages.map((m) => toClientShape(m)));
});

export const createMessage = asyncHandler(async (req, res) => {
  const conversation = await resolveConversation(req);
  if (!conversation) throw ApiError.badRequest('No dietitian assigned yet — contact support to get set up.');

  const message = await createMessageRecord({ ...conversation, sender: req.user.id, body: req.body.body });
  res.status(201).json(toClientShape(message));
});

export const markRead = asyncHandler(async (req, res) => {
  const conversation = await resolveConversation(req);
  if (!conversation) return res.status(204).send();

  await markConversationRead(conversation.client, conversation.dietitian, req.user.id);
  res.status(204).send();
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  if (req.user.role === 'client') {
    const conversation = await resolveConversation(req);
    const count = conversation ? await countUnreadForClient(conversation.client, conversation.dietitian) : 0;
    return res.json({ count });
  }
  const count = await countUnreadForDietitian(req.user.id);
  res.json({ count });
});

// Dietitian only — one row per assigned client (see routes for the extra authorize() gate).
export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await queryConversations(req.user.id);
  res.json(conversations);
});
