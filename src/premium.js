import {
  ACHIEVEMENT_IDS,
  getLedgerSummary,
  restoreLedger,
} from './records.js';

const PREMIUM_PROFILE_VERSION = 1;
const DIFFICULTY_ORDER = ['facile', 'moyen', 'difficile', 'expert'];

function normalizeDisplayName(value) {
  const normalized = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [...(normalized || 'Investigator')].slice(0, 30).join('');
}

function normalizeHue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 280;
  return ((Math.round(number) % 360) + 360) % 360;
}

function normalizeProfile(raw) {
  if (!raw || raw.version !== PREMIUM_PROFILE_VERSION || !raw.id) {
    throw new Error('Invalid premium profile.');
  }
  const createdAt = typeof raw.createdAt === 'string' && Number.isFinite(Date.parse(raw.createdAt))
    ? raw.createdAt
    : new Date().toISOString();
  return {
    version: PREMIUM_PROFILE_VERSION,
    id: String(raw.id),
    displayName: normalizeDisplayName(raw.displayName),
    avatarHue: normalizeHue(raw.avatarHue),
    createdAt,
  };
}

export function createPremiumProfile(id, options = {}) {
  return normalizeProfile({
    version: PREMIUM_PROFILE_VERSION,
    id,
    displayName: options.displayName,
    avatarHue: options.avatarHue,
    createdAt: options.createdAt ?? new Date().toISOString(),
  });
}

export function updatePremiumProfile(profile, updates = {}) {
  const current = normalizeProfile(profile);
  return normalizeProfile({
    ...current,
    displayName: updates.displayName ?? current.displayName,
    avatarHue: updates.avatarHue ?? current.avatarHue,
  });
}

export function serializePremiumProfile(profile) {
  return JSON.stringify(normalizeProfile(profile));
}

export function restorePremiumProfile(serialized) {
  return normalizeProfile(typeof serialized === 'string' ? JSON.parse(serialized) : serialized);
}

function emptyBreakdown() {
  return { completions: 0, uniqueCases: 0, clean: 0, assisted: 0 };
}

function isClean(record) {
  return !record.revealed && record.hints === 0 && record.wrongChecks === 0;
}

function summarizeRecords(records, key) {
  const groups = {};
  for (const record of records) {
    const value = record[key];
    groups[value] ??= { ...emptyBreakdown(), caseIds: new Set() };
    groups[value].completions += 1;
    groups[value].caseIds.add(record.caseId);
    groups[value][isClean(record) ? 'clean' : 'assisted'] += 1;
  }
  return Object.fromEntries(Object.entries(groups).map(([value, group]) => [value, {
    completions: group.completions,
    uniqueCases: group.caseIds.size,
    clean: group.clean,
    assisted: group.assisted,
  }]));
}

export function getPremiumDashboard(ledger) {
  const current = restoreLedger(ledger);
  const summary = getLedgerSummary(current);
  const byDifficulty = {
    ...Object.fromEntries(DIFFICULTY_ORDER.map((difficulty) => [difficulty, emptyBreakdown()])),
    ...summarizeRecords(current.records, 'difficulty'),
  };
  const byCaseType = summarizeRecords(current.records, 'caseType');
  const highestCleanDifficulty = [...DIFFICULTY_ORDER]
    .reverse()
    .find((difficulty) => byDifficulty[difficulty].clean > 0) ?? null;
  const progressValues = {
    firstCase: [Math.min(summary.completions, 1), 1],
    cleanDeduction: [Math.min(summary.cleanCompletions, 1), 1],
    caseVariety: [Math.min(Object.keys(summary.byCaseType).length, 3), 3],
    difficultyRange: [Math.min(Object.keys(summary.byDifficulty).length, 4), 4],
    expertClean: [Math.min(byDifficulty.expert.clean, 1), 1],
  };
  const unlocked = new Set(summary.achievementIds);
  const achievementProgress = Object.fromEntries(ACHIEVEMENT_IDS.map((id) => [id, {
    current: progressValues[id][0],
    target: progressValues[id][1],
    unlocked: unlocked.has(id),
  }]));

  return {
    ...summary,
    byDifficulty,
    byCaseType,
    highestCleanDifficulty,
    achievementProgress,
  };
}
