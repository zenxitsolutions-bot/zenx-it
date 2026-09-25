export const MESSAGE_PAGE_SIZE = 50;

export const messageThreadKey = (viewerId, clientId) => ['messages', viewerId, 'thread', clientId ?? 'mine'];

export function sameConversation(first, second) {
  if (!first || !second) return first === second;
  return first.client === second.client && first.dietitian === second.dietitian;
}

export function assertMessageGeneration(requested, current) {
  if (requested !== current) throw new DOMException('Session changed', 'AbortError');
}

export function canApplyHistoryResult(old, conversation, requestedGeneration, currentGeneration) {
  return Boolean(old?.initialized) && requestedGeneration === currentGeneration && sameConversation(old.conversation, conversation);
}

// Changing a client's assignment changes the conversation even though their URL stays the
// same. Never apply the old conversation's cursor to the new dietitian's complete history.
export async function fetchHistoryUpdate({ fetchPage, readCurrent, generation, getGeneration }) {
  assertMessageGeneration(generation, getGeneration());
  const previous = readCurrent();
  const after = previous?.initialized ? previous.syncCursor : null;
  let page = await fetchPage(after ? { after } : {});
  assertMessageGeneration(generation, getGeneration());
  let direction = after ? 'after' : 'initial';
  if (after && !sameConversation(previous.conversation, page.conversation)) {
    page = await fetchPage({});
    assertMessageGeneration(generation, getGeneration());
    direction = 'initial';
  }
  // Re-read after awaiting HTTP so concurrent live messages / earlier pages are retained.
  return mergeHistoryPage(readCurrent(), page, direction);
}

export function mergeMessages(existing = [], incoming = []) {
  const byId = new Map(existing.map((message) => [message._id, message]));
  for (const message of incoming) byId.set(message._id, { ...byId.get(message._id), ...message });
  return [...byId.values()].sort((a, b) => {
    const time = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return time || String(a._id).localeCompare(String(b._id));
  });
}

export function mergeHistoryPage(old, page, direction = 'initial') {
  if (!Array.isArray(page?.messages) || !page.pageInfo || (page.conversation !== null
    && (typeof page.conversation?.client !== 'string' || typeof page.conversation?.dietitian !== 'string'))) {
    throw new Error('Invalid message history response');
  }
  const previous = old?.initialized && sameConversation(old.conversation, page.conversation) ? old : null;
  const state = {
    initialized: true,
    conversation: page.conversation,
    messages: mergeMessages(previous?.messages, page.messages),
    beforeCursor: previous?.beforeCursor ?? page.pageInfo.startCursor,
    hasEarlier: previous?.hasEarlier ?? page.pageInfo.hasMore,
    // Only HTTP synchronization advances this cursor. Live/optimistic messages may arrive
    // after an offline gap, and using their timestamp would silently skip that missing gap.
    syncCursor: previous?.syncCursor ?? page.pageInfo.endCursor,
    hasNewer: previous?.hasNewer ?? false,
  };
  if (direction === 'before') {
    state.beforeCursor = page.pageInfo.startCursor ?? state.beforeCursor;
    state.hasEarlier = page.pageInfo.hasMore;
  } else if (direction === 'after') {
    state.syncCursor = page.pageInfo.endCursor ?? state.syncCursor;
    state.hasNewer = page.pageInfo.hasMore;
  } else {
    state.syncCursor = page.pageInfo.endCursor;
    state.hasEarlier = page.pageInfo.hasMore;
  }
  return state;
}

export function appendHistoryMessage(old, message) {
  // Do not create a partial history cache for unopened conversations from a live event.
  if (!old?.initialized) return old;
  if (message.client && message.dietitian && !sameConversation(old.conversation, message)) return old;
  return { ...old, messages: mergeMessages(old.messages, [message]) };
}

export function settleHistoryMessage(old, optimisticId, saved) {
  if (!old?.initialized) return old;
  const messages = old.messages.filter((message) => message._id !== optimisticId);
  const matches = saved && sameConversation(old.conversation, saved);
  return { ...old, messages: matches ? mergeMessages(messages, [saved]) : messages };
}
