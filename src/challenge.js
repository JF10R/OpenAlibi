const DIFFICULTIES = new Set(['facile', 'moyen', 'difficile', 'expert']);
const CASE_TYPES = new Set(['mixed', 'coPresence', 'evidenceTrail', 'restrictedAccess']);

function boundedInteger(value, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : null;
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

  const rows = boundedInteger(url.searchParams.get('rows'), 4, 12);
  const cols = boundedInteger(url.searchParams.get('cols'), 4, 12);
  const densityPercent = boundedInteger(url.searchParams.get('density'), 55, 100);
  const difficulty = url.searchParams.get('difficulty');
  const caseType = url.searchParams.get('case');
  const seed = url.searchParams.get('seed')?.trim() ?? '';
  if (!rows || !cols || !densityPercent || !DIFFICULTIES.has(difficulty)) return null;
  if (!CASE_TYPES.has(caseType) || !seed || seed.length > 30) return null;

  return {
    rows,
    cols,
    density: densityPercent / 100,
    difficulty,
    caseType,
    seed,
  };
}
