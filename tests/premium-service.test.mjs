import assert from 'node:assert/strict';
import {
  createFriendRequest,
  createPremiumService,
  createRankedSubmission,
} from '../src/premium-service.js';

const cleanRecord = {
  id: 'record-1',
  sessionId: 'session-1',
  caseId: 'case-1',
  generatorVersion: 7,
  caseType: 'coPresence',
  difficulty: 'expert',
  solved: true,
  revealed: false,
  hints: 0,
  wrongChecks: 0,
  activeTimeMs: 12_000,
  completedAt: '2026-08-16T12:00:00.000Z',
};
const officialChallenge = {
  id: 'challenge-1',
  caseId: 'case-1',
  generatorVersion: 7,
  authority: 'server',
  signature: 'opaque-server-signature',
};

assert.throws(
  () => createRankedSubmission(cleanRecord, { ...officialChallenge, authority: 'client' }),
  /server-authorized/i,
  'ranked submissions must reject client-authored challenge manifests',
);
assert.throws(
  () => createRankedSubmission({ ...cleanRecord, hints: 1 }, officialChallenge),
  /without assistance/i,
  'ranked submissions must reject assisted completions',
);
const submission = createRankedSubmission(cleanRecord, officialChallenge);
assert.deepEqual(submission, {
  version: 1,
  challengeId: 'challenge-1',
  caseId: 'case-1',
  sessionId: 'session-1',
  generatorVersion: 7,
  difficulty: 'expert',
  caseType: 'coPresence',
  completedAt: '2026-08-16T12:00:00.000Z',
  manifestSignature: 'opaque-server-signature',
});
assert.equal('activeTimeMs' in submission, false, 'time must not be part of ranked evidence');

assert.deepEqual(createFriendRequest('  oa-7k2 p9  '), { friendCode: 'OA-7K2P9' });
assert.throws(() => createFriendRequest(''), /friend code/i);

const calls = [];
const service = createPremiumService({
  baseUrl: 'https://premium.openalibi.test',
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ friends: [] }) };
  },
});
assert.deepEqual(await service.listFriends(), { friends: [] });
assert.equal(calls[0].url, 'https://premium.openalibi.test/v1/friends');
assert.equal(calls[0].options.credentials, 'include', 'authentication must use secure server cookies');
assert.equal('Authorization' in calls[0].options.headers, false, 'tokens must never be stored or attached by client code');
const emptyResponseService = createPremiumService({
  baseUrl: 'https://premium.openalibi.test',
  fetchImpl: async () => ({ ok: true, status: 204 }),
});
assert.equal(await emptyResponseService.sendFriendRequest('OA-7K2P9'), null, 'successful empty responses must not be parsed as JSON');
assert.throws(
  () => createPremiumService({ baseUrl: 'http://premium.example.com', fetchImpl: async () => null }),
  /https/i,
);

console.log('OK — premium social and ranked-service contracts validated.');
