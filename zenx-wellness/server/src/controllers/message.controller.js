import { findUserById, listUsers } from '../models/User.js';
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
import { messagePage, parseMessagePagination } from '../utils/messagePagination.js';
import { createLiveSessionGuard } from '../services/liveSessionGuard.js';
import {
  addLiveConnection,
  onlineUserIdsAmong,
  removeLiveConnection,
  sendLiveEvent,
} from '../services/messageLive.js';

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
  const clientId = req.query.client || req.body?.client;
  if (!clientId) throw ApiError.badRequest('client is required');
  await assertDietitianOwnsClient(req, clientId);
  return { client: clientId, dietitian: req.user.id };
}

async function partnerIdsFor(user) {
  if (user.role === 'client') {
    const me = await findUserById(user.id);
    return me.assignedDietitian ? [String(me.assignedDietitian)] : [];
  }
  if (!user.companyId) return [];
  if (user.role === 'dietitian') {
    const clients = await listUsers({ companyId: user.companyId, role: 'client', assignedDietitian: user.id });
    const admins = await listUsers({ companyId: user.companyId, role: 'admin' });
    return [...clients.map((client) => client.id), ...admins.map((admin) => admin.id)];
  }
  if (user.role === 'admin') {
    const dietitians = await listUsers({ companyId: user.companyId, role: 'dietitian' });
    return dietitians.map((dietitian) => dietitian.id);
  }
  return [];
}

export const listMessages = asyncHandler(async (req, res) => {
  const pagination = parseMessagePagination(req.query);
  if (req.query.client !== undefined && (typeof req.query.client !== 'string' || !req.query.client || req.query.client.length > 36)) {
    throw ApiError.badRequest('Invalid client');
  }
  const conversation = await resolveConversation(req);
  if (!conversation) return res.json({ ...messagePage(), conversation: null });

  const page = await queryMessages(conversation.client, conversation.dietitian, pagination);
  res.json({ ...page, conversation, messages: page.messages.map((m) => toClientShape(m)) });
});

export const createMessage = asyncHandler(async (req, res) => {
  const conversation = await resolveConversation(req);
  if (!conversation) throw ApiError.badRequest('No dietitian assigned yet — contact support to get set up.');

  const message = toClientShape(await createMessageRecord({ ...conversation, sender: req.user.id, body: req.body.body }));
  const recipientId = req.user.id === conversation.client ? conversation.dietitian : conversation.client;
  sendLiveEvent(recipientId, { type: 'message', message });
  sendLiveEvent(req.user.id, { type: 'message', message });
  res.status(201).json(message);
});

export const streamMessages = asyncHandler(async (req, res) => {
  const isAuthorized = createLiveSessionGuard(req);
  const partners = await partnerIdsFor(req.user);
  if (!(await isAuthorized())) throw ApiError.unauthorized('Session expired. Sign in again.');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let heartbeat;
  let expiryTimer;
  let settled = false;
  let resolveClosed;
  const closed = new Promise((resolve) => { resolveClosed = resolve; });

  const finish = () => {
    if (settled) return;
    settled = true;
    clearInterval(heartbeat);
    clearTimeout(expiryTimer);
    const wentOffline = removeLiveConnection(req.user.id, res);
    if (wentOffline) {
      for (const partnerId of partners) {
        sendLiveEvent(partnerId, { type: 'presence', userId: req.user.id, online: false });
      }
    }
    try { if (!res.writableEnded) res.end(); } catch { /* socket already closed */ }
    resolveClosed();
  };

  addLiveConnection(req.user.id, res, { isAuthorized, onUnauthorized: finish });
  req.on('close', finish);
  res.on('close', finish);
  if (req.aborted || req.socket?.destroyed) finish();

  if (!settled && !req.aborted) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'hello', onlineUserIds: onlineUserIdsAmong(partners) })}\n\n`);
    } catch {
      finish();
      return;
    }
    for (const partnerId of partners) {
      sendLiveEvent(partnerId, { type: 'presence', userId: req.user.id, online: true });
    }
    let checking = false;
    heartbeat = setInterval(async () => {
      if (checking || settled) return;
      checking = true;
      try {
        if (!(await isAuthorized())) return finish();
        if (settled) return;
        res.write(': ping\n\n');
      } catch {
        finish();
      } finally {
        checking = false;
      }
    }, 25_000);
    // Expiry closes exactly at the token boundary; idle logout/reset is noticed within 25s,
    // while every outgoing event independently checks the current session before writing.
    expiryTimer = setTimeout(finish, Math.max(0, Math.min(2_147_483_647, req.accessTokenExpiresAt - Date.now())));
  }

  await closed;
});

export const getPresence = asyncHandler(async (req, res) => {
  const partners = await partnerIdsFor(req.user);
  res.json({ onlineUserIds: onlineUserIdsAmong(partners) });
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
