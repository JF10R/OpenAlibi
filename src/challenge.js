const DIFFICULTIES = new Set(['facile', 'moyen', 'difficile', 'expert']);
const CASE_TYPES = new Set(['mixed', 'coPresence', 'evidenceTrail', 'restrictedAccess']);

function boundedInteger(value, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : null;
}

export function normalizeGenerationOptions(value) {
  const rows = boundedInteger(value?.rows, 4, 12);
  const cols = boundedInteger(value?.cols, 4, 12);
  const density = Number(value?.density);
  const difficulty = value?.difficulty;
  const caseType = value?.caseType;
  const seed = typeof value?.seed === 'string' ? value.seed.trim() : '';
  if (!rows || !cols || !Number.isFinite(density) || density < 0.55 || density > 1) return null;
  if (!DIFFICULTIES.has(difficulty) || !CASE_TYPES.has(caseType)) return null;
  if (!seed || seed.length > 30) return null;
  return { rows, cols, density, difficulty, caseType, seed };
}

export function createChallengeUrl(baseUrl, puzzle) {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('challenge', '1');
  url.searchParams.set('v', String(puzzle.version));
  url.searchParams.set('seed', puzzle.seed);
  url.searchParams.set('rows', String(puzzle.rows));
  url.searchParams.set('cols', String(puzzle.cols));
  url.searchParams.set('density', String(Math.round(puzzle.density * 100)));
  url.searchParams.set('difficulty', puzzle.difficulty);
  url.searchParams.set('case', puzzle.requestedCaseType);
  return url.toString();
}

export function parseChallengeUrl(value, expectedVersion) {
  let url;
  try {
    url = value instanceof URL ? value : new URL(value);
  } catch {
    return null;
  }
  if (url.searchParams.get('challenge') !== '1') return null;
  if (boundedInteger(url.searchParams.get('v'), 1, 999) !== expectedVersion) return null;

  const densityPercent = boundedInteger(url.searchParams.get('density'), 55, 100);
  if (!densityPercent) return null;
  return normalizeGenerationOptions({
    rows: url.searchParams.get('rows'),
    cols: url.searchParams.get('cols'),
    density: densityPercent / 100,
    difficulty: url.searchParams.get('difficulty'),
    caseType: url.searchParams.get('case'),
    seed: url.searchParams.get('seed'),
  });
}
