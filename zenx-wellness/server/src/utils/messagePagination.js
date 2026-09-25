import { ApiError } from './ApiError.js';

export const DEFAULT_MESSAGE_PAGE_SIZE = 50;
export const MAX_MESSAGE_PAGE_SIZE = 100;

export function encodeMessageCursor(message) {
  if (!message) return null;
  return Buffer.from(JSON.stringify({
    time: new Date(message.createdAt).toISOString(),
    id: message.id,
  })).toString('base64url');
}

export function decodeMessageCursor(value) {
  if (typeof value !== 'string' || value.length > 240 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw ApiError.badRequest('Invalid message cursor');
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const time = new Date(parsed.time);
    if (typeof parsed.time !== 'string' || time.toISOString() !== parsed.time
      || typeof parsed.id !== 'string' || !/^[A-Za-z0-9-]{1,36}$/.test(parsed.id)) {
      throw new Error('Invalid cursor');
    }
    return { time, id: parsed.id };
  } catch {
    throw ApiError.badRequest('Invalid message cursor');
  }
}

export function parseMessagePagination(query = {}) {
  const { limit, before, after } = query;
  if (before !== undefined && after !== undefined) {
    throw ApiError.badRequest('Use either before or after, not both');
  }
  if (limit !== undefined && (typeof limit !== 'string' || !/^\d+$/.test(limit))) {
    throw ApiError.badRequest('Message page size must be an integer');
  }
  const size = limit === undefined ? DEFAULT_MESSAGE_PAGE_SIZE : Number(limit);
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_MESSAGE_PAGE_SIZE) {
    throw ApiError.badRequest(`Message page size must be between 1 and ${MAX_MESSAGE_PAGE_SIZE}`);
  }
  return {
    limit: size,
    direction: after !== undefined ? 'after' : 'before',
    cursor: before !== undefined || after !== undefined ? decodeMessageCursor(before ?? after) : null,
  };
}

export function messagePage(messages = [], hasMore = false) {
  return {
    messages,
    pageInfo: {
      hasMore,
      startCursor: encodeMessageCursor(messages[0]),
      endCursor: encodeMessageCursor(messages.at(-1)),
    },
  };
}
