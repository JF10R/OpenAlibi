import assert from 'node:assert/strict';
import {
  createPremiumProfile,
  getPremiumDashboard,
  restorePremiumProfile,
  serializePremiumProfile,
  updatePremiumProfile,
} from '../src/premium.js';
import { addCompletion, createLedger } from '../src/records.js';

const profile = createPremiumProfile('profile-local-1', {
  displayName: '  Ada   Lovelace  ',
  avatarHue: 725,
});
assert.deepEqual(profile, {
  version: 1,
  id: 'profile-local-1',
  displayName: 'Ada Lovelace',
  avatarHue: 5,
  createdAt: profile.createdAt,
});

const renamedProfile = updatePremiumProfile(profile, {
  displayName: '  Détective   Nova  ',
  avatarHue: -20,
});
assert.equal(renamedProfile.displayName, 'Détective Nova');
assert.equal(renamedProfile.avatarHue, 340);
assert.equal(renamedProfile.id, profile.id, 'profile identity must remain immutable');
assert.deepEqual(
  restorePremiumProfile(serializePremiumProfile(renamedProfile)),
  renamedProfile,
  'premium profiles must survive local persistence',
);

let ledger = createLedger();
const records = [
  {
    id: 'easy-clean', sessionId: 'session-1', caseId: 'case-a', generatorVersion: 7,
    caseType: 'coPresence', difficulty: 'facile', solved: true, revealed: false,
    hints: 0, wrongChecks: 0, activeTimeMs: null, completedAt: '2026-08-16T10:00:00.000Z',
  },
  {
    id: 'expert-assisted', sessionId: 'session-2', caseId: 'case-b', generatorVersion: 7,
    caseType: 'evidenceTrail', difficulty: 'expert', solved: true, revealed: false,
    hints: 1, wrongChecks: 0, activeTimeMs: 42_000, completedAt: '2026-08-16T11:00:00.000Z',
  },
  {
    id: 'expert-clean', sessionId: 'session-3', caseId: 'case-c', generatorVersion: 7,
    caseType: 'restrictedAccess', difficulty: 'expert', solved: true, revealed: false,
    hints: 0, wrongChecks: 0, activeTimeMs: null, completedAt: '2026-08-16T12:00:00.000Z',
  },
];
for (const record of records) ledger = addCompletion(ledger, record).ledger;

const dashboard = getPremiumDashboard(ledger);
assert.deepEqual(dashboard.byDifficulty.facile, {
  completions: 1,
  uniqueCases: 1,
  clean: 1,
  assisted: 0,
});
assert.deepEqual(dashboard.byDifficulty.expert, {
  completions: 2,
  uniqueCases: 2,
  clean: 1,
  assisted: 1,
});
assert.equal(dashboard.highestCleanDifficulty, 'expert');
assert.deepEqual(dashboard.achievementProgress.firstCase, { current: 1, target: 1, unlocked: true });
assert.deepEqual(dashboard.achievementProgress.caseVariety, { current: 3, target: 3, unlocked: true });
assert.deepEqual(dashboard.achievementProgress.difficultyRange, { current: 2, target: 4, unlocked: false });

console.log('OK — premium profile persistence and descriptive analytics validated.');
