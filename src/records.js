const LEDGER_VERSION = 1;
const SESSION_VERSION = 1;
const HISTORY_LIMIT = 100;

export const ACHIEVEMENT_IDS = Object.freeze([
  'firstCase',
  'cleanDeduction',
  'caseVariety',
  'difficultyRange',
  'expertClean',
]);

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function validIsoDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isClean(record) {
  return !record.revealed && record.hints === 0 && record.wrongChecks === 0;
}

function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.id || !raw.sessionId || !raw.caseId || !validIsoDate(raw.completedAt)) return null;
  return {
    id: String(raw.id),
    sessionId: String(raw.sessionId),
    caseId: String(raw.caseId),
    generatorVersion: nonNegativeInteger(raw.generatorVersion),
    caseType: String(raw.caseType ?? 'unknown'),
    difficulty: String(raw.difficulty ?? 'unknown'),
    solved: Boolean(raw.solved),
    revealed: Boolean(raw.revealed),
    hints: nonNegativeInteger(raw.hints),
    wrongChecks: nonNegativeInteger(raw.wrongChecks),
    activeTimeMs: raw.activeTimeMs == null ? null : nonNegativeInteger(raw.activeTimeMs),
    completedAt: raw.completedAt,
  };
}

function achievementCriteria(records) {
  const cleanRecords = records.filter(isClean);
  return {
    firstCase: records.some((record) => record.solved),
    cleanDeduction: cleanRecords.length > 0,
    caseVariety: new Set(records.map((record) => record.caseType)).size >= 3,
    difficultyRange: new Set(records.map((record) => record.difficulty)).size >= 4,
    expertClean: cleanRecords.some((record) => record.difficulty === 'expert'),
  };
}

export function createLedger() {
  return { version: LEDGER_VERSION, records: [], achievements: [] };
}

export function createSessionMetrics(sessionId, startedAt = Date.now()) {
  return {
    sessionId: String(sessionId || startedAt),
    startedAt: nonNegativeInteger(startedAt),
    hints: 0,
    wrongChecks: 0,
    revealed: false,
    recorded: false,
    activeTimeMs: 0,
  };
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object' || !raw.sessionId) throw new Error('Invalid session metrics.');
  return {
    sessionId: String(raw.sessionId),
    startedAt: nonNegativeInteger(raw.startedAt),
    hints: nonNegativeInteger(raw.hints),
    wrongChecks: nonNegativeInteger(raw.wrongChecks),
    revealed: Boolean(raw.revealed),
    recorded: Boolean(raw.recorded),
    activeTimeMs: nonNegativeInteger(raw.activeTimeMs),
  };
}

export function serializeSessionMetrics(puzzleId, session) {
  return JSON.stringify({
    version: SESSION_VERSION,
    puzzleId,
    session: normalizeSession(session),
  });
}

export function restoreSessionMetrics(serialized, puzzleId) {
  const value = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  if (!value || value.version !== SESSION_VERSION) throw new Error('Unsupported session version.');
  if (value.puzzleId !== puzzleId) throw new Error('This session belongs to a different case.');
  return normalizeSession(value.session);
}

export function createCompletionRecord(puzzle, session, options = {}) {
  const normalizedSession = normalizeSession(session);
  const completedAt = options.completedAt ?? new Date().toISOString();
  if (!validIsoDate(completedAt)) throw new Error('Completion date must be an ISO date.');
  return {
    id: `${puzzle.id}:${normalizedSession.sessionId}`,
    sessionId: normalizedSession.sessionId,
    caseId: puzzle.id,
    generatorVersion: nonNegativeInteger(puzzle.version),
    caseType: puzzle.caseType,
    difficulty: puzzle.difficulty,
    solved: true,
    revealed: normalizedSession.revealed,
    hints: normalizedSession.hints,
    wrongChecks: normalizedSession.wrongChecks,
    activeTimeMs: options.activeTimeMs == null ? null : nonNegativeInteger(options.activeTimeMs),
    completedAt,
  };
}

export function recordDominates(candidate, comparison) {
  if (!candidate?.solved || !comparison?.solved || candidate.caseId !== comparison.caseId) return false;
  const candidateQuality = [Number(candidate.revealed), candidate.hints, candidate.wrongChecks];
  const comparisonQuality = [Number(comparison.revealed), comparison.hints, comparison.wrongChecks];
  return candidateQuality.every((value, index) => value <= comparisonQuality[index])
    && candidateQuality.some((value, index) => value < comparisonQuality[index]);
}

export function getParetoRecords(ledger, caseId) {
  const records = ledger.records.filter((record) => record.caseId === caseId && record.solved);
  return records.filter((record) => (
    !records.some((candidate) => candidate.id !== record.id && recordDominates(candidate, record))
  ));
}

export function addCompletion(ledger, rawRecord) {
  const record = normalizeRecord(rawRecord);
  if (!record?.solved) throw new Error('A completion record must contain a solved case.');
  const current = restoreLedger(ledger);
  if (current.records.some((candidate) => candidate.id === record.id)) {
    return { ledger: current, unlockedAchievementIds: [] };
  }

  const records = [...current.records, record].slice(-HISTORY_LIMIT);
  const unlocked = new Set(current.achievements.map((achievement) => achievement.id));
  const criteria = achievementCriteria(records);
  const unlockedAchievementIds = ACHIEVEMENT_IDS.filter((id) => criteria[id] && !unlocked.has(id));
  const achievements = [
    ...current.achievements,
    ...unlockedAchievementIds.map((id) => ({ id, unlockedAt: record.completedAt })),
  ];
  return {
    ledger: { version: LEDGER_VERSION, records, achievements },
    unlockedAchievementIds,
  };
}

export function getLedgerSummary(ledger) {
  const current = restoreLedger(ledger);
  const byCaseType = {};
  const byDifficulty = {};
  for (const record of current.records) {
    byCaseType[record.caseType] = (byCaseType[record.caseType] ?? 0) + 1;
    byDifficulty[record.difficulty] = (byDifficulty[record.difficulty] ?? 0) + 1;
  }
  return {
    completions: current.records.length,
    uniqueCases: new Set(current.records.map((record) => record.caseId)).size,
    cleanCompletions: current.records.filter(isClean).length,
    byCaseType,
    byDifficulty,
    achievementIds: current.achievements.map((achievement) => achievement.id),
  };
}

export function serializeLedger(ledger) {
  return JSON.stringify(restoreLedger(ledger));
}

export function restoreLedger(serialized) {
  const value = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  if (!value || value.version !== LEDGER_VERSION) throw new Error('Unsupported ledger version.');
  const records = (Array.isArray(value.records) ? value.records : [])
    .map(normalizeRecord)
    .filter(Boolean)
    .slice(-HISTORY_LIMIT);
  const achievementIds = new Set();
  const achievements = (Array.isArray(value.achievements) ? value.achievements : [])
    .filter((achievement) => (
      ACHIEVEMENT_IDS.includes(achievement?.id)
      && validIsoDate(achievement?.unlockedAt)
      && !achievementIds.has(achievement.id)
      && achievementIds.add(achievement.id)
    ))
    .map((achievement) => ({ id: achievement.id, unlockedAt: achievement.unlockedAt }));
  return { version: LEDGER_VERSION, records, achievements };
}
