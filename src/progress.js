const DRAFT_VERSION = 1;
const HISTORY_LIMIT = 80;

function cloneSetsByCharacter(source = {}) {
  return Object.fromEntries(
    Object.entries(source).map(([characterId, cells]) => [characterId, new Set(cells)]),
  );
}

export function cloneProgress(progress) {
  return {
    placements: { ...progress.placements },
    tentativePlacements: { ...progress.tentativePlacements },
    manualExclusionsByCharacter: cloneSetsByCharacter(progress.manualExclusionsByCharacter),
    candidateCellsByCharacter: cloneSetsByCharacter(progress.candidateCellsByCharacter),
    hintedFacts: new Set(progress.hintedFacts),
    selectedCharacterId: progress.selectedCharacterId ?? null,
  };
}

export function createProgress(puzzle) {
  const selectedCharacterId = puzzle.characters.find((character) => !character.isVictim)?.id
    ?? puzzle.victimId;
  return {
    placements: {},
    tentativePlacements: {},
    manualExclusionsByCharacter: Object.fromEntries(
      puzzle.characters.map((character) => [character.id, new Set()]),
    ),
    candidateCellsByCharacter: Object.fromEntries(
      puzzle.characters.map((character) => [character.id, new Set()]),
    ),
    hintedFacts: new Set(),
    selectedCharacterId,
  };
}

function encodeProgress(progress) {
  return {
    placements: { ...progress.placements },
    tentativePlacements: { ...progress.tentativePlacements },
    manualExclusionsByCharacter: Object.fromEntries(
      Object.entries(progress.manualExclusionsByCharacter)
        .map(([characterId, cells]) => [characterId, [...cells]]),
    ),
    candidateCellsByCharacter: Object.fromEntries(
      Object.entries(progress.candidateCellsByCharacter)
        .map(([characterId, cells]) => [characterId, [...cells]]),
    ),
    hintedFacts: [...progress.hintedFacts],
    selectedCharacterId: progress.selectedCharacterId ?? null,
  };
}

function sanitizeProgress(rawProgress, puzzle) {
  const characterIds = new Set(puzzle.characters.map((character) => character.id));
  const cellKeys = new Set(puzzle.cells.map((cell) => cell.key));
  const progress = createProgress(puzzle);

  for (const [characterId, key] of Object.entries(rawProgress?.placements ?? {})) {
    if (characterIds.has(characterId) && cellKeys.has(key)) progress.placements[characterId] = key;
  }
  for (const [characterId, key] of Object.entries(rawProgress?.tentativePlacements ?? {})) {
    if (characterIds.has(characterId) && cellKeys.has(key)) progress.tentativePlacements[characterId] = key;
  }
  for (const field of ['manualExclusionsByCharacter', 'candidateCellsByCharacter']) {
    for (const characterId of characterIds) {
      const values = Array.isArray(rawProgress?.[field]?.[characterId])
        ? rawProgress[field][characterId]
        : [];
      progress[field][characterId] = new Set(values.filter((key) => cellKeys.has(key)));
    }
  }
  progress.hintedFacts = new Set(
    (Array.isArray(rawProgress?.hintedFacts) ? rawProgress.hintedFacts : [])
      .filter((fact) => typeof fact === 'string'),
  );
  if (characterIds.has(rawProgress?.selectedCharacterId)) {
    progress.selectedCharacterId = rawProgress.selectedCharacterId;
  }
  return progress;
}

export function serializeDraft(puzzle, progress) {
  return JSON.stringify({
    version: DRAFT_VERSION,
    puzzleId: puzzle.id,
    savedAt: new Date().toISOString(),
    generation: {
      rows: puzzle.rows,
      cols: puzzle.cols,
      density: puzzle.density,
      difficulty: puzzle.difficulty,
      caseType: puzzle.requestedCaseType,
      seed: puzzle.seed,
    },
    progress: encodeProgress(progress),
  });
}

export function restoreDraft(serialized, puzzle) {
  const draft = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  if (!draft || draft.version !== DRAFT_VERSION) throw new Error('Unsupported draft version.');
  if (draft.puzzleId !== puzzle.id) throw new Error('This draft belongs to a different case.');
  return {
    ...draft,
    progress: sanitizeProgress(draft.progress, puzzle),
  };
}

export function createHistory(progress) {
  return { past: [], present: cloneProgress(progress), future: [] };
}

export function commitHistory(history, progress, limit = HISTORY_LIMIT) {
  return {
    past: [...history.past, cloneProgress(history.present)].slice(-limit),
    present: cloneProgress(progress),
    future: [],
  };
}

export function undoHistory(history) {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: cloneProgress(history.past.at(-1)),
    future: [cloneProgress(history.present), ...history.future],
  };
}

export function redoHistory(history) {
  if (!history.future.length) return history;
  return {
    past: [...history.past, cloneProgress(history.present)],
    present: cloneProgress(history.future[0]),
    future: history.future.slice(1),
  };
}
