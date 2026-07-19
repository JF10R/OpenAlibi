import assert from 'node:assert/strict';
import {
  DIFFICULTIES,
  OBJECT_PLACEMENT_RULES,
  OBJECT_TYPES,
  createRandomSeed,
  generatePuzzle,
  serializePuzzle,
  solvePuzzle,
  validatePlayerState,
} from '../src/core.js';
import {
  getCharacterNameProfiles,
  getVictimNameProfiles,
} from '../src/i18n.js';

const scenarios = [
  { rows: 4, cols: 4, density: 1, difficulty: 'facile', seed: 'TEST-A', locale: 'fr' },
  { rows: 6, cols: 8, density: 0.8, difficulty: 'moyen', seed: 'TEST-B', locale: 'fr' },
  { rows: 8, cols: 8, density: 1, difficulty: 'difficile', seed: 'TEST-C', locale: 'fr' },
  { rows: 9, cols: 10, density: 0.75, difficulty: 'expert', seed: 'TEST-EXPERT-0', locale: 'fr' },
  { rows: 9, cols: 10, density: 0.75, difficulty: 'expert', seed: 'VICTIM-PRIVACY-expert-3', locale: 'fr' },
];

const maxExactCluesByDifficulty = {
  facile: Infinity,
  moyen: 2,
  difficile: 0,
  expert: 0,
};

assert.deepEqual(
  Object.values(DIFFICULTIES).map(({ objectRepeatTarget }) => objectRepeatTarget),
  [1, 2, 3, 4],
  'harder levels must repeat clue objects more often',
);
assert.deepEqual(
  Object.keys(OBJECT_PLACEMENT_RULES).sort(),
  Object.keys(OBJECT_TYPES).sort(),
  'every object type must define placement rules',
);
assert.equal(OBJECT_TYPES.tv.occupiable, false, 'a television must be a blocking object');
assert.equal(OBJECT_PLACEMENT_RULES.tv.maxPerRoom, 1, 'a room must contain at most one television');

const frenchCharacterProfiles = getCharacterNameProfiles('fr');
const frenchVictimProfiles = getVictimNameProfiles('fr');
const allNameProfiles = [...frenchCharacterProfiles, ...frenchVictimProfiles];
assert.equal(
  new Set(allNameProfiles.map(({ name }) => name)).size,
  allNameProfiles.length,
  'every character name must be unique',
);
for (const profile of allNameProfiles) {
  assert.ok(['f', 'm'].includes(profile.gender), `${profile.name} must have an explicit gender`);
  assert.equal(
    profile.pronoun,
    profile.gender === 'f' ? 'Elle' : 'Il',
    `${profile.name} must use the pronoun matching their gender`,
  );
}
for (const profile of frenchVictimProfiles) {
  assert.match(profile.name, /^V/i, `${profile.name} must be a valid victim name`);
}
for (const name of ['Zoé', 'Iris', 'Valérie']) {
  const profile = allNameProfiles.find((item) => item.name === name);
  assert.equal(profile?.gender, 'f', `${name} must use feminine grammar`);
  assert.equal(profile?.pronoun, 'Elle', `${name} must use a feminine pronoun`);
}

const collisionSeed = 'COLLISION-0';
const compactCollisionCase = generatePuzzle({
  rows: 4,
  cols: 4,
  density: 1,
  difficulty: 'facile',
  seed: collisionSeed,
});
const largerCollisionCase = generatePuzzle({
  rows: 6,
  cols: 6,
  density: 0.8,
  difficulty: 'moyen',
  seed: collisionSeed,
});
assert.notEqual(
  compactCollisionCase.id,
  largerCollisionCase.id,
  'different normalized parameters must never share a case identifier',
);
assert.notEqual(
  compactCollisionCase.generationKey,
  largerCollisionCase.generationKey,
  'different normalized parameters must use distinct random streams',
);
assert.equal(compactCollisionCase.seed, collisionSeed, 'exports must preserve the reproducible user seed');
assert.match(compactCollisionCase.id, /^case-[0-9a-f]{32}$/, 'case identifiers must use a 128-bit fingerprint');
const compactCollisionReplay = generatePuzzle({
  rows: 4,
  cols: 4,
  density: 1,
  difficulty: 'facile',
  seed: collisionSeed,
});
assert.equal(
  serializePuzzle(compactCollisionReplay),
  serializePuzzle(compactCollisionCase),
  'same seed and normalized parameters must reproduce the complete case',
);

const randomSeeds = Array.from({ length: 128 }, () => createRandomSeed());
assert.equal(new Set(randomSeeds).size, randomSeeds.length, 'generated seeds must not collide in a representative sample');
for (const seed of randomSeeds) {
  assert.match(seed, /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/, 'generated seeds must be compact and unambiguous');
}

for (const options of scenarios) {
  const puzzle = generatePuzzle(options);
  assert.equal(puzzle.version, 5, 'localized cases must use generator format version 5');
  assert.equal(puzzle.rows, options.rows);
  assert.equal(puzzle.cols, options.cols);
  assert.ok(puzzle.characters.length <= Math.min(options.rows, options.cols));
  assert.equal(Object.keys(puzzle.solution).length, puzzle.characters.length);

  for (const room of puzzle.rooms) {
    const shortestSide = Math.min(room.height, room.width);
    const longestSide = Math.max(room.height, room.width);
    assert.ok(shortestSide >= 2, `${room.name} must be at least two cells wide`);
    assert.ok(longestSide / shortestSide <= 2.5, `${room.name} must not be a narrow strip`);
    assert.ok(['tile', 'parquet', 'textile', 'organic', 'paper'].includes(room.pattern), `${room.name} must have a visual pattern`);
    assert.ok(Array.isArray(room.neighborIds), `${room.name} must expose adjacent rooms`);
    for (const neighborId of room.neighborIds) {
      const neighbor = puzzle.rooms.find((item) => item.id === neighborId);
      assert.ok(neighbor, `${room.name} must reference an existing adjacent room`);
      assert.notEqual(room.color, neighbor.color, 'adjacent rooms must use different colors');
    }
  }

  const roomById = new Map(puzzle.rooms.map((room) => [room.id, room]));
  const objectCountsByRoom = new Map();
  const blockingRoomsByType = new Map();
  for (const cell of puzzle.cells.filter((item) => item.object)) {
    const room = roomById.get(cell.roomId);
    const rule = OBJECT_PLACEMENT_RULES[cell.object];
    assert.ok(rule.roomTypes.includes(room.type), `${cell.object} must be plausible in ${room.type}`);
    const countKey = `${room.id}:${cell.object}`;
    objectCountsByRoom.set(countKey, (objectCountsByRoom.get(countKey) ?? 0) + 1);
    assert.ok(
      objectCountsByRoom.get(countKey) <= rule.maxPerRoom,
      `${room.name} must respect the ${cell.object} limit`,
    );
    if (rule.zone === 'wall') {
      const onWall = cell.row === room.top
        || cell.row === room.top + room.height - 1
        || cell.col === room.left
        || cell.col === room.left + room.width - 1;
      assert.equal(onWall, true, `${cell.object} must be placed against a wall in ${room.name}`);
    }
    if (!OBJECT_TYPES[cell.object].occupiable) {
      if (!blockingRoomsByType.has(cell.object)) blockingRoomsByType.set(cell.object, new Set());
      blockingRoomsByType.get(cell.object).add(room.id);
    }
  }
  for (const [type, roomIds] of blockingRoomsByType) {
    const occurrenceCount = puzzle.cells.filter((cell) => cell.object === type).length;
    assert.equal(roomIds.size, occurrenceCount, `${type} occurrences must be distributed across rooms`);
  }
  if (options.difficulty === 'expert') {
    const maxBlockingRepeat = Math.max(0, ...[...blockingRoomsByType.values()].map((roomIds) => roomIds.size));
    assert.ok(maxBlockingRepeat >= 3, 'expert cases must repeat a plausible blocking object across rooms');
  }

  const victim = puzzle.characters.find((character) => character.id === puzzle.victimId);
  assert.match(victim.name, /^V/i, 'victim name must begin with V');
  assert.equal(puzzle.characters.at(-1).id, puzzle.victimId, 'victim must be listed last');
  assert.deepEqual(
    puzzle.cluesByCharacter[victim.id].map(({ type, description }) => ({ type, description })),
    [{
      type: 'victimWithKiller',
      description: 'La victime était seule avec le meurtrier.',
    }],
    'the victim must receive only the neutral murderer clue',
  );
  for (const room of puzzle.rooms) {
    assert.equal(
      puzzle.cluesByCharacter[victim.id][0].description.includes(room.name),
      false,
      'the victim clue must not reveal a room',
    );
  }
  for (const clue of puzzle.clues.filter((item) => item.characterId !== victim.id)) {
    assert.notEqual(clue.otherId, victim.id, 'another character clue must not target the victim');
    assert.equal(
      clue.description.includes(victim.name),
      false,
      'another character clue must not name the victim',
    );
  }

  const positions = puzzle.characters.map((character) => puzzle.cellByKey.get(puzzle.solution[character.id]));
  assert.equal(new Set(positions.map((cell) => cell.row)).size, positions.length, 'rows must be unique');
  assert.equal(new Set(positions.map((cell) => cell.col)).size, positions.length, 'cols must be unique');
  assert.ok(positions.every((cell) => cell.occupiable), 'all solution cells must be occupiable');

  for (const character of puzzle.characters) {
    const characterClues = puzzle.cluesByCharacter[character.id];
    const exactClues = characterClues
      .filter((clue) => ['row', 'col'].includes(clue.type));
    assert.ok(exactClues.length <= 1, `${character.name} must not receive both an exact row and column clue`);
    for (const clue of characterClues) {
      const leadingPronoun = clue.description.match(/^(Elle|Il)\b/)?.[1];
      if (leadingPronoun) {
        assert.equal(leadingPronoun, character.pronoun, `${character.name}'s rendered clue must use the correct pronoun`);
      }
    }
  }
  const exactClueCount = puzzle.clues.filter((clue) => ['row', 'col'].includes(clue.type)).length;
  assert.ok(exactClueCount <= maxExactCluesByDifficulty[options.difficulty], `${options.difficulty} must limit exact coordinates`);

  const solved = solvePuzzle(puzzle, { maxSolutions: 2, collectSolutions: true });
  assert.equal(solved.count, 1, `puzzle ${options.seed} must have a unique solution`);
  assert.deepEqual(solved.firstSolution, puzzle.solution);

  const validation = validatePlayerState(puzzle, puzzle.solution);
  assert.equal(validation.inferredKillerId, puzzle.killerId, 'the killer must be inferred from the victim room');
  assert.equal(validation.killerCorrect, true, 'the inferred killer must match the generated solution');
  assert.equal(validation.solved, true);
}

const besideObjectPuzzle = generatePuzzle({
  rows: 6,
  cols: 6,
  density: 1,
  difficulty: 'difficile',
  seed: 'beside-fixture-v5-2',
  locale: 'fr',
});
const besideObjectClue = besideObjectPuzzle.clues.find((clue) => (
  clue.type === 'besideObject'
  && besideObjectPuzzle.cluesByCharacter[clue.characterId].length === 1
));
assert.ok(besideObjectClue, 'a blocked object may produce a beside-object clue');
assert.equal(OBJECT_TYPES[besideObjectClue.value].occupiable, false, 'beside-object clues must target blocking objects');
assert.match(besideObjectClue.description, /à côté d[’'](?:un|une) /, 'beside-object clues must use correct French elision');
assert.equal(
  besideObjectPuzzle.cluesByCharacter[besideObjectClue.characterId].length,
  1,
  'a beside-object clue may be the character’s only clue',
);
const besideCharacterCell = besideObjectPuzzle.cellByKey.get(
  besideObjectPuzzle.solution[besideObjectClue.characterId],
);
assert.ok(
  besideObjectPuzzle.cells.some((cell) => (
    !cell.occupiable
    && cell.object === besideObjectClue.value
    && cell.roomId === besideCharacterCell.roomId
    && Math.abs(cell.row - besideCharacterCell.row) + Math.abs(cell.col - besideCharacterCell.col) === 1
  )),
  'beside-object clues must be orthogonal and stay inside the same room',
);

const ambiguityPuzzle = generatePuzzle({
  rows: 4,
  cols: 4,
  density: 1,
  difficulty: 'expert',
  seed: 'R47XK61',
  locale: 'fr',
});
const ambiguitySolutions = solvePuzzle(ambiguityPuzzle, { maxSolutions: 3, collectSolutions: true });
assert.equal(ambiguitySolutions.count, 1, 'R47XK61 must have exactly one solution');
function findVictimAlonePlacement(puzzle) {
  const availableCells = puzzle.cells.filter((cell) => cell.occupiable);
  const otherCharacters = puzzle.characters.filter((character) => !character.isVictim);
  for (const victimCell of availableCells) {
    const placement = { [puzzle.victimId]: victimCell.key };
    const usedRows = new Set([victimCell.row]);
    const usedCols = new Set([victimCell.col]);
    function placeNext(index) {
      if (index === otherCharacters.length) return true;
      const character = otherCharacters[index];
      for (const cell of availableCells) {
        if (cell.roomId === victimCell.roomId || usedRows.has(cell.row) || usedCols.has(cell.col)) continue;
        placement[character.id] = cell.key;
        usedRows.add(cell.row);
        usedCols.add(cell.col);
        if (placeNext(index + 1)) return true;
        delete placement[character.id];
        usedRows.delete(cell.row);
        usedCols.delete(cell.col);
      }
      return false;
    }
    if (placeNext(0)) return placement;
  }
  return null;
}
const ambiguityAlternative = findVictimAlonePlacement(ambiguityPuzzle);
assert.ok(ambiguityAlternative, 'the validation fixture must provide a complete victim-alone placement');
const ambiguityValidation = validatePlayerState(ambiguityPuzzle, ambiguityAlternative);
assert.equal(ambiguityValidation.victimCompanionCount, 0, 'the alternate placement leaves the victim alone');
assert.equal(ambiguityValidation.victimRoomValid, false, 'the victim must have exactly one companion');
assert.equal(ambiguityValidation.inferredKillerId, null, 'no killer can be inferred while the victim is alone');
const ambiguityVictim = ambiguityPuzzle.characters.find((character) => character.isVictim);
assert.equal(
  ambiguityVictim.pronoun,
  ambiguityVictim.gender === 'f' ? 'Elle' : 'Il',
  'the generated victim must use grammar matching their profile',
);
assert.deepEqual(
  ambiguityPuzzle.cluesByCharacter[ambiguityVictim.id].map(({ type, description }) => ({ type, description })),
  [{
    type: 'victimWithKiller',
    description: 'La victime était seule avec le meurtrier.',
  }],
  'Valérie must receive only the neutral murderer clue',
);

console.log(`OK — ${scenarios.length} scenarios generated, solved, and validated.`);
