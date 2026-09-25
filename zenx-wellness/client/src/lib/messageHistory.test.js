import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendHistoryMessage, canApplyHistoryResult, fetchHistoryUpdate, mergeHistoryPage,
  mergeMessages, messageThreadKey, sameConversation, settleHistoryMessage,
} from './messageHistory.js';

const conversation = { client: 'client-a', dietitian: 'dietitian-a' };
const reassigned = { client: 'client-a', dietitian: 'dietitian-b' };
const message = (id, extra = {}) => ({ ...conversation, _id: id, createdAt: '2026-09-24T13:00:00.123Z', sender: 'client', body: id, ...extra });
const page = (ids, more = false, identity = conversation) => ({ conversation: identity, messages: ids.map((id) => message(id, identity)), pageInfo: { hasMore: more, startCursor: ids[0] ?? null, endCursor: ids.at(-1) ?? null } });

test('loading earlier preserves latest synchronization cursor and chronological order', () => {
  const latest = mergeHistoryPage(undefined, page(['m3', 'm4'], true));
  const previous = mergeHistoryPage(latest, page(['m1', 'm2'], false), 'before');
  assert.deepEqual(previous.messages.map((item) => item._id), ['m1', 'm2', 'm3', 'm4']);
  assert.equal(previous.syncCursor, 'm4');
  assert.equal(previous.beforeCursor, 'm1');
  assert.equal(previous.hasEarlier, false);
  assert.equal(latest.messages.length, 2, 'cache updates are immutable');
});

test('SSE and optimistic sends cannot advance HTTP cursor past an offline gap', () => {
  let state = mergeHistoryPage(undefined, page(['m1'], true));
  state = appendHistoryMessage(state, message('m9'));
  state = appendHistoryMessage(state, message('local-send'));
  assert.equal(state.syncCursor, 'm1');
  state = mergeHistoryPage(state, page(['m2', 'm3'], true), 'after');
  assert.equal(state.syncCursor, 'm3');
  assert.equal(state.hasNewer, true);
  assert.equal(state.hasEarlier, true);
  state = settleHistoryMessage(state, 'local-send', message('m8'));
  state = mergeHistoryPage(state, page(['m4', 'm5', 'm6', 'm7', 'm8', 'm9']), 'after');
  assert.deepEqual(state.messages.map((item) => item._id), ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9']);
  assert.equal(state.syncCursor, 'm9');
  assert.equal(state.hasNewer, false);
});

test('polls retain loaded earlier pages and concurrent live events, with no duplicates', () => {
  let state = mergeHistoryPage(undefined, page(['m3', 'm4'], true));
  state = mergeHistoryPage(state, page(['m1', 'm2']), 'before');
  state = appendHistoryMessage(state, message('m6'));
  state = mergeHistoryPage(state, page(['m5', 'm6']), 'after');
  state = appendHistoryMessage(state, message('m6'));
  state = mergeHistoryPage(state, page([]), 'after');
  assert.equal(state.messages.length, 6);
  assert.equal(state.syncCursor, 'm6');
  assert.equal(state.beforeCursor, 'm1');
});

test('failed sends remove only their optimistic message, not incoming messages or another send', () => {
  let state = mergeHistoryPage(undefined, page(['m1']));
  for (const id of ['local-a', 'local-b', 'm2']) state = appendHistoryMessage(state, message(id));
  state = settleHistoryMessage(state, 'local-a');
  assert.deepEqual(state.messages.map((item) => item._id), ['local-b', 'm1', 'm2']);
  assert.equal(state.syncCursor, 'm1');
});

test('live events do not create partial history for unopened conversations', () => {
  assert.equal(appendHistoryMessage(undefined, message('m1')), undefined);
  assert.throws(() => mergeHistoryPage(undefined, []), /Invalid message history/);
});

test('duplicate updates retain read markers and deterministic timestamp/id order', () => {
  const result = mergeMessages([message('m2'), message('m1')], [message('m1', { readAt: '2026-09-24T13:01:00Z' })]);
  assert.deepEqual(result.map((item) => item._id), ['m1', 'm2']);
  assert.equal(result[0].readAt, '2026-09-24T13:01:00Z');
});

test('message thread keys isolate viewers, including two clients using the same mine route', () => {
  assert.deepEqual(messageThreadKey('client-a'), ['messages', 'client-a', 'thread', 'mine']);
  assert.notDeepEqual(messageThreadKey('client-a'), messageThreadKey('client-b'));
  assert.notDeepEqual(messageThreadKey('dietitian-a', 'client-a'), messageThreadKey('dietitian-b', 'client-a'));
  assert.notDeepEqual(messageThreadKey('dietitian-a', 'client-a'), messageThreadKey('dietitian-a', 'client-b'));
});

test('assignment changes reset messages and both cursors instead of merging conversations', () => {
  const previous = mergeHistoryPage(undefined, page(['old-1', 'old-2'], true));
  const changed = mergeHistoryPage(previous, page(['new-1', 'new-2'], false, reassigned));
  assert.deepEqual(changed.messages.map((item) => item._id), ['new-1', 'new-2']);
  assert.deepEqual(changed.conversation, reassigned);
  assert.equal(changed.syncCursor, 'new-2');
  assert.equal(changed.beforeCursor, 'new-1');
  assert.equal(changed.hasEarlier, false);
  const unassigned = mergeHistoryPage(changed, page([], false, null));
  assert.deepEqual(unassigned.messages, []);
  assert.equal(unassigned.conversation, null);
  assert.equal(unassigned.syncCursor, null);
  assert.equal(appendHistoryMessage(changed, message('old-live')), changed);
  assert.equal(appendHistoryMessage(unassigned, message('old-live')), unassigned);
});

test('poll detects reassignment even on an empty cursor response and fetches the new latest page', async () => {
  const previous = mergeHistoryPage(undefined, page(['old-1', 'old-2'], true));
  const requests = [];
  const updated = await fetchHistoryUpdate({
    fetchPage: async (cursor) => {
      requests.push(cursor);
      return cursor.after ? page([], false, reassigned) : page(['new-1', 'new-2'], true, reassigned);
    },
    readCurrent: () => previous,
    generation: 7,
    getGeneration: () => 7,
  });
  assert.deepEqual(requests, [{ after: 'old-2' }, {}]);
  assert.deepEqual(updated.messages.map((item) => item._id), ['new-1', 'new-2']);
  assert.equal(updated.hasEarlier, true);
  assert.equal(updated.syncCursor, 'new-2');
});

test('poll re-reads same-conversation cache after network completion to retain concurrent data', async () => {
  let current = mergeHistoryPage(undefined, page(['m3'], true));
  const updated = await fetchHistoryUpdate({
    fetchPage: async () => {
      current = mergeHistoryPage(current, page(['m1', 'm2']), 'before');
      current = appendHistoryMessage(current, message('m5'));
      return page(['m4']);
    },
    readCurrent: () => current,
    generation: 7,
    getGeneration: () => 7,
  });
  assert.deepEqual(updated.messages.map((item) => item._id), ['m1', 'm2', 'm3', 'm4', 'm5']);
  assert.equal(updated.syncCursor, 'm4');
});

test('a poll cannot commit or start another request after its login generation is invalidated', async () => {
  let generation = 7;
  let requests = 0;
  const options = {
    fetchPage: async () => {
      requests += 1;
      generation = 8;
      return page([], false, reassigned);
    },
    readCurrent: () => mergeHistoryPage(undefined, page(['m1'])),
    generation: 7,
    getGeneration: () => generation,
  };
  await assert.rejects(fetchHistoryUpdate(options), { name: 'AbortError' });
  assert.equal(requests, 1, 'must not start the reassigned conversation fetch');
  await assert.rejects(fetchHistoryUpdate(options), { name: 'AbortError' });
  assert.equal(requests, 1, 'must reject before issuing a request under a newer login');
});

test('earlier/send mutation context rejects cleared caches, changed accounts and reassignment', () => {
  const existing = mergeHistoryPage(undefined, page(['m3'], true));
  const request = { queryKey: messageThreadKey('client-a'), conversation, generation: 7 };
  assert.equal(canApplyHistoryResult(existing, request.conversation, request.generation, 7), true);
  assert.equal(canApplyHistoryResult(undefined, request.conversation, request.generation, 7), false, 'never recreate a cleared cache');
  assert.equal(canApplyHistoryResult(existing, request.conversation, request.generation, 8), false, 'new login, including same account');
  const changed = mergeHistoryPage(existing, page(['new-1'], false, reassigned));
  assert.equal(canApplyHistoryResult(changed, request.conversation, request.generation, 7), false, 'assignment changed while earlier/send was pending');
  assert.equal(sameConversation(request.conversation, page(['new-1'], false, reassigned).conversation), false);
  assert.deepEqual(request.queryKey, messageThreadKey('client-a'), 'captured key remains the requesting account, never a later viewer');
});

test('send completion cannot insert a message from a different conversation', () => {
  let existing = mergeHistoryPage(undefined, page(['m1']));
  existing = appendHistoryMessage(existing, message('local-send'));
  const settled = settleHistoryMessage(existing, 'local-send', message('new-send', reassigned));
  assert.deepEqual(settled.messages.map((item) => item._id), ['m1']);
});
