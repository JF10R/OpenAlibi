import assert from 'node:assert/strict';
import {
  addCompletion,
  createCompletionRecord,
  createLedger,
  createSessionMetrics,
  getLedgerSummary,
  getParetoRecords,
  recordDominates,
  restoreLedger,
  restoreSessionMetrics,
  serializeLedger,
  serializeSessionMetrics,
} from '../src/records.js';
import { generatePuzzle } from '../src/core.js';

const puzzle = generatePuzzle({
  rows: 6,
  cols: 6,
  difficulty: 'moyen',
  caseType: 'evidenceTrail',
  seed: 'PERSONAL-RECORD',
});

const assisted = createCompletionRecord(puzzle, {
  ...createSessionMetrics('assisted', 1000),
  hints: 2,
  wrongChecks: 1,
}, { completedAt: '2026-08-16T12:00:00.000Z', activeTimeMs: 10_000 });
const clean = createCompletionRecord(puzzle, createSessionMetrics('clean', 2000), {
  completedAt: '2026-08-16T13:00:00.000Z',
  activeTimeMs: 99_000,
});
const tradeoff = createCompletionRecord(puzzle, {
  ...createSessionMetrics('tradeoff', 3000),
  hints: 0,
  wrongChecks: 2,
}, { completedAt: '2026-08-16T14:00:00.000Z', activeTimeMs: 5_000 });

assert.equal(recordDominates(clean, assisted), true, 'a clean result must dominate an assisted result');
assert.equal(recordDominates(assisted, clean), false);
assert.equal(recordDominates(clean, { ...clean, caseId: 'another-case' }), false, 'different cases are incomparable');
assert.equal(recordDominates(assisted, tradeoff), false, 'assistance tradeoffs must remain incomparable');
assert.equal(recordDominates(tradeoff, assisted), false);
assert.equal(
  recordDominates({ ...clean, activeTimeMs: 999_999 }, clean),
  false,
  'time must never create dominance',
);

let ledger = createLedger();
let update = addCompletion(ledger, assisted);
ledger = update.ledger;
assert.deepEqual(update.unlockedAchievementIds, ['firstCase']);
ledger = addCompletion(ledger, clean).ledger;
ledger = addCompletion(ledger, tradeoff).ledger;
assert.deepEqual(
  getParetoRecords(ledger, puzzle.id).map((record) => record.sessionId),
  ['clean'],
  'the Pareto frontier must discard every dominated record',
);

for (const [index, caseType] of ['restrictedAccess', 'coPresence'].entries()) {
  const nextPuzzle = generatePuzzle({
    rows: 6,
    cols: 6,
    difficulty: index ? 'expert' : 'facile',
    caseType,
    seed: `VARIETY-${index}`,
  });
  const nextRecord = createCompletionRecord(
    nextPuzzle,
    createSessionMetrics(`variety-${index}`, 4000 + index),
    { completedAt: `2026-08-16T1${5 + index}:00:00.000Z` },
  );
  update = addCompletion(ledger, nextRecord);
  ledger = update.ledger;
}

const summary = getLedgerSummary(ledger);
assert.equal(summary.completions, 5);
assert.equal(summary.uniqueCases, 3);
assert.equal(summary.cleanCompletions, 3);
assert.equal(summary.byCaseType.evidenceTrail, 3);
assert.ok(summary.achievementIds.includes('cleanDeduction'));
assert.ok(summary.achievementIds.includes('caseVariety'));
assert.equal(new Set(summary.achievementIds).size, summary.achievementIds.length, 'achievements unlock once');

const restoredLedger = restoreLedger(serializeLedger(ledger));
assert.deepEqual(restoredLedger, ledger, 'ledger serialization must round-trip');
assert.throws(() => restoreLedger('{"version":999}'), /version/i);

const session = {
  ...createSessionMetrics('persisted-session', 1234),
  hints: 1,
  wrongChecks: 2,
  revealed: true,
  recorded: true,
  activeTimeMs: 42_000,
};
assert.deepEqual(
  restoreSessionMetrics(serializeSessionMetrics(puzzle.id, session), puzzle.id),
  session,
  'session evidence must survive reloads without duplicate completion records',
);
assert.throws(
  () => restoreSessionMetrics(serializeSessionMetrics(puzzle.id, session), 'other-case'),
  /different case/i,
);

let bounded = createLedger();
for (let index = 0; index < 120; index += 1) {
  bounded = addCompletion(bounded, {
    ...clean,
    id: `record-${index}`,
    sessionId: `session-${index}`,
    caseId: `case-${index}`,
    completedAt: new Date(index * 1000).toISOString(),
  }).ledger;
}
assert.equal(bounded.records.length, 100, 'local history must remain bounded');

console.log('OK — local completion records, Pareto comparison, and achievements validated.');
