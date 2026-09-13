import { findUserById, listUsers } from '../models/User.js';
import {
  listSupportMessages as queryMessages,
  createSupportMessage as createMessageRecord,
  markSupportThreadRead,
  countUnreadSupportForDietitian,
  countUnreadSupportForAdmin,
  listSupportConversationsForAdmin as queryConversations,
} from '../models/SupportMessage.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';
import { sendLiveEvent } from '../services/messageLive.js';

async function companyAdminIds(companyId) {
  const admins = await listUsers({ companyId, role: 'admin' });
  return admins.filter((admin) => !admin.accountStatus || admin.accountStatus === 'active').map((admin) => admin.id);
}

async function resolveSupportThread(req) {
  if (req.user.role === 'dietitian') {
    return { companyId: req.user.companyId, dietitianId: req.user.id };
  }
  const dietitianId = req.query.dietitian || req.body.dietitian;
  if (!dietitianId) throw ApiError.badRequest('dietitian is required');
  const dietitian = await findUserById(dietitianId);
  if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
    throw ApiError.notFound('Dietitian not found');
  }
  return { companyId: req.user.companyId, dietitianId: dietitian.id };
}

async function notifyThread({ companyId, dietitianId, message }) {
  const payload = { type: 'message', message };
  sendLiveEvent(dietitianId, payload);
  for (const adminId of await companyAdminIds(companyId)) {
    sendLiveEvent(adminId, payload);
  }
}

export const listSupportMessages = asyncHandler(async (req, res) => {
  const thread = await resolveSupportThread(req);
  const messages = await queryMessages(thread.companyId, thread.dietitianId);
  res.json(messages.map((m) => toClientShape(m)));
});

export const createSupportMessage = asyncHandler(async (req, res) => {
  const thread = await resolveSupportThread(req);
  const message = toClientShape(
    await createMessageRecord({
      companyId: thread.companyId,
      dietitianId: thread.dietitianId,
      sender: req.user.id,
      body: req.body.body,
    })
  );
  await notifyThread({ ...thread, message });
  res.status(201).json(message);
});

export const markSupportRead = asyncHandler(async (req, res) => {
  const thread = await resolveSupportThread(req);
  await markSupportThreadRead(thread.companyId, thread.dietitianId, req.user.id);
  res.status(204).send();
});

export const getSupportUnreadCount = asyncHandler(async (req, res) => {
  if (req.user.role === 'dietitian') {
    const count = await countUnreadSupportForDietitian(req.user.id);
    return res.json({ count });
  }
  const count = await countUnreadSupportForAdmin(req.user.companyId);
  res.json({ count });
});

export const listSupportConversations = asyncHandler(async (req, res) => {
  const conversations = await queryConversations(req.user.companyId);
  res.json(conversations);
});
