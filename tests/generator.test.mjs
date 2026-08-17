import assert from 'node:assert/strict';
import {
  CASE_TYPES,
  CONSTRAINT_TYPES,
  DIFFICULTIES,
  MAX_CARDINAL_CLUE_SHARE,
  MAX_CLUE_TYPE_SHARE,
  MAX_DISTANCE_CLUE_SHARE,
  MAX_PERSON_DISTANCE_CLUE_SHARE,
  OBJECT_PLACEMENT_RULES,
  OBJECT_TYPES,
  createRng,
  createRandomSeed,
  generatePuzzle,
  getKillerFromPlacement,
  localizePuzzle,
  selectCharacterCount,
  serializePuzzle,
  solvePuzzle,
  validatePlayerState,
} from '../src/core.js';
import {
  getCharacterNameProfiles,
  getVictimNameProfiles,
} from '../src/i18n.js';

const scenarios = [
  { rows: 4, cols: 4, density: 1, difficulty: 'facile', caseType: 'coPresence', seed: 'TEST-A', locale: 'fr' },
  { rows: 6, cols: 8, density: 0.8, difficulty: 'moyen', caseType: 'coPresence', seed: 'TEST-B', locale: 'fr' },
  { rows: 8, cols: 8, density: 1, difficulty: 'difficile', caseType: 'coPresence', seed: 'TEST-C', locale: 'fr' },
  { rows: 9, cols: 10, density: 0.75, difficulty: 'expert', caseType: 'coPresence', seed: 'TEST-EXPERT-V10-0', locale: 'fr' },
  { rows: 9, cols: 10, density: 0.75, difficulty: 'expert', caseType: 'coPresence', seed: 'VICTIM-PRIVACY-expert-3', locale: 'fr' },
];

const maxExactCluesByDifficulty = {
  facile: Infinity,
  moyen: 2,
  difficile: 0,
  expert: 0,
};

function clueFamily(clue) {
  if (clue.category === 'object' || clue.type === 'notBesideObject') return 'object';
  if (['room', 'roomPosition', 'aloneInRoom', 'sameRoom', 'notSameRoom'].includes(clue.type)) return 'room';
  if (['northOf', 'southOf', 'westOf', 'eastOf', 'besidePerson', 'distanceFromPerson'].includes(clue.type)) {
    return 'person';
  }
  if (['row', 'col', 'rowHalf', 'colHalf'].includes(clue.type)) return 'coordinate';
  return clue.category;
}

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
assert.deepEqual(
  Object.keys(CASE_TYPES).sort(),
  ['coPresence', 'evidenceTrail', 'restrictedAccess'],
  'OpenAlibi must expose three independently generated investigation archetypes',
);
assert.ok(CONSTRAINT_TYPES.includes('distanceFromObject'), 'the constraint DSL must support material distance evidence');
assert.ok(CONSTRAINT_TYPES.includes('roomPosition'), 'the constraint DSL must support positions inside rooms');
assert.ok(CONSTRAINT_TYPES.includes('distanceFromPerson'), 'the constraint DSL must support exact distance between people');
assert.ok(CONSTRAINT_TYPES.includes('onlyOnObject'), 'the constraint DSL must support sole occupancy of an object type');
assert.ok(CONSTRAINT_TYPES.includes('roomContainsObject'), 'the constraint DSL must support room-content evidence');
assert.deepEqual(DIFFICULTIES.expert.densityRange, [0.55, 1]);
assert.equal(DIFFICULTIES.expert.defaultDensity, 0.85);
assert.ok(
  OBJECT_TYPES.carpet.footprints.some((footprint) => footprint.length >= 9),
  'large boards must support rugs covering at least nine cells',
);

const expertCounts = Array.from({ length: 96 }, (_, index) => (
  selectCharacterCount(12, 12, DIFFICULTIES.expert.defaultDensity, 'expert', createRng(`EXPERT-DENSITY-${index}`))
));
assert.ok(expertCounts.includes(12), 'some expert seeds must fill every row and column');
assert.ok(expertCounts.some((count) => count <= 10), 'large expert boards must sometimes leave at least two rows and columns empty');
assert.equal(
  selectCharacterCount(12, 12, 0.85, 'expert', createRng('EXPERT-DETERMINISTIC')),
  selectCharacterCount(12, 12, 0.85, 'expert', createRng('EXPERT-DETERMINISTIC')),
  'expert density variation must remain reproducible by seed',
);

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
  assert.match(seed, /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{12}$/, 'generated seeds must provide a compact 60-bit identity');
}

for (const options of scenarios) {
  const puzzle = generatePuzzle(options);
  assert.equal(puzzle.version, 11, 'localized cases must use generator format version 11');
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
  assert.ok(Array.isArray(puzzle.objects), 'generated cases must expose object entities');
  if (puzzle.rows >= 6 && puzzle.cols >= 6) {
    assert.ok(
      puzzle.objects.some((object) => object.type === 'carpet' && object.footprint.length >= 4),
      'larger cases must include a multi-cell rug when a plausible room is available',
    );
  }
  for (const object of puzzle.objects) {
    const room = roomById.get(object.roomId);
    const rule = OBJECT_PLACEMENT_RULES[object.type];
    assert.ok(object.id, 'every object entity needs a stable identifier');
    assert.ok(object.anchor && Number.isInteger(object.anchor.row) && Number.isInteger(object.anchor.col));
    assert.ok(Array.isArray(object.footprint) && object.footprint.length > 0);
    assert.ok(Array.isArray(object.occupiableMask));
    assert.ok(['north', 'east', 'south', 'west'].includes(object.orientation));
    assert.ok(object.footprint.every((key) => puzzle.cellByKey.get(key)?.objectId === object.id));
    assert.ok(object.footprint.every((key) => puzzle.cellByKey.get(key)?.roomId === object.roomId));
    assert.ok(object.occupiableMask.every((key) => object.footprint.includes(key)));
    assert.ok(rule.roomTypes.includes(room.type), `${object.type} must be plausible in ${room.type}`);
    const countKey = `${room.id}:${object.type}`;
    objectCountsByRoom.set(countKey, (objectCountsByRoom.get(countKey) ?? 0) + 1);
    assert.ok(
      objectCountsByRoom.get(countKey) <= rule.maxPerRoom,
      `${room.name} must respect the ${object.type} limit`,
    );
    if (rule.zone === 'wall') {
      const anchorCell = puzzle.cellByKey.get(object.footprint[0]);
      const onWall = anchorCell.row === room.top
        || anchorCell.row === room.top + room.height - 1
        || anchorCell.col === room.left
        || anchorCell.col === room.left + room.width - 1;
      assert.equal(onWall, true, `${object.type} must be placed against a wall in ${room.name}`);
    }
    if (!OBJECT_TYPES[object.type].occupiable) {
      if (!blockingRoomsByType.has(object.type)) blockingRoomsByType.set(object.type, new Set());
      blockingRoomsByType.get(object.type).add(room.id);
    }
  }
  for (const [type, roomIds] of blockingRoomsByType) {
    const occurrenceCount = puzzle.objects.filter((object) => object.type === type).length;
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
      type: 'victimNoTestimony',
      description: 'La victime ne fournit aucun témoignage.',
    }],
    'the victim must receive no positional or culprit evidence',
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
    assert.ok(
      characterClues.filter((clue) => ['distanceFromObject', 'distanceFromPerson'].includes(clue.type)).length <= 1,
      `${character.name} must receive at most one exact-distance clue`,
    );
    for (const clue of characterClues) {
      assert.doesNotMatch(clue.description, /\b1 cells\b/, 'English distance clues must use singular grammar');
      const leadingPronoun = clue.description.match(/^(Elle|Il)\b/)?.[1];
      if (leadingPronoun) {
        assert.equal(leadingPronoun, character.pronoun, `${character.name}'s rendered clue must use the correct pronoun`);
      }
    }
  }
  const exactClueCount = puzzle.clues.filter((clue) => ['row', 'col'].includes(clue.type)).length;
  assert.ok(exactClueCount <= maxExactCluesByDifficulty[options.difficulty], `${options.difficulty} must limit exact coordinates`);
  const evidenceClues = puzzle.clues.filter((clue) => clue.category !== 'narrative');
  const cardinalClues = evidenceClues.filter((clue) => ['northOf', 'southOf', 'westOf', 'eastOf'].includes(clue.type));
  assert.ok(
    cardinalClues.length <= Math.floor(evidenceClues.length * MAX_CARDINAL_CLUE_SHARE),
    'cardinal clues must not exceed 12% of a case',
  );
  assert.equal(
    new Set(cardinalClues.map((clue) => clue.characterId)).size,
    cardinalClues.length,
    'a character must receive at most one cardinal clue',
  );
  const personDistanceClues = evidenceClues.filter((clue) => clue.type === 'distanceFromPerson');
  assert.ok(
    personDistanceClues.length <= Math.floor(evidenceClues.length * MAX_PERSON_DISTANCE_CLUE_SHARE),
    'person-distance clues must not exceed 20% of a case',
  );
  assert.equal(
    new Set(personDistanceClues.map((clue) => clue.characterId)).size,
    personDistanceClues.length,
    'a character must receive at most one person-distance clue',
  );
  const distanceClues = evidenceClues.filter((clue) => (
    ['distanceFromObject', 'distanceFromPerson'].includes(clue.type)
  ));
  assert.ok(
    distanceClues.length <= Math.floor(evidenceClues.length * MAX_DISTANCE_CLUE_SHARE),
    'exact-distance clues must not exceed 25% of a case',
  );

  const solved = solvePuzzle(puzzle, { maxSolutions: 2, collectSolutions: true });
  assert.equal(solved.count, 1, `puzzle ${options.seed} must have a unique solution`);
  assert.deepEqual(solved.firstSolution, puzzle.solution);

  const validation = validatePlayerState(puzzle, puzzle.solution);
  assert.equal(validation.inferredKillerId, puzzle.killerId, 'the killer must be inferred from the victim room');
  assert.equal(validation.killerCorrect, true, 'the inferred killer must match the generated solution');
  assert.equal(validation.solved, true);
}

const rugVariationPuzzles = Array.from({ length: 12 }, (_, index) => generatePuzzle({
  rows: 9,
  cols: 9,
  density: 0.9,
  difficulty: 'moyen',
  caseType: 'mixed',
  seed: `RUG-VARIETY-${index}`,
  locale: 'fr',
}));

function hasWallToWallRug(puzzle) {
  const roomById = new Map(puzzle.rooms.map((room) => [room.id, room]));
  return puzzle.objects.some((object) => {
    if (object.type !== 'carpet') return false;
    const room = roomById.get(object.roomId);
    const footprintCells = object.footprint.map((key) => puzzle.cellByKey.get(key));
    const footprintWidth = Math.max(...footprintCells.map((cell) => cell.col))
      - Math.min(...footprintCells.map((cell) => cell.col)) + 1;
    const footprintHeight = Math.max(...footprintCells.map((cell) => cell.row))
      - Math.min(...footprintCells.map((cell) => cell.row)) + 1;
    return footprintWidth === room.width || footprintHeight === room.height;
  });
}

const seedsWithWallToWallRugs = rugVariationPuzzles.filter(hasWallToWallRug);
assert.ok(seedsWithWallToWallRugs.length > 0, 'wall-to-wall rugs must remain possible');
assert.ok(
  seedsWithWallToWallRugs.length <= Math.ceil(rugVariationPuzzles.length / 3),
  'wall-to-wall rugs must be limited to a minority of seeds',
);

const reportedWallToWallRugSeeds = [
  'JS2D5YQVW9',
  '1QM8ZJ4G47',
  '3ZYT29HEM9',
  'Q92YYWVS2W',
];
const reportedPuzzlesWithWallToWallRugs = reportedWallToWallRugSeeds
  .map((seed) => generatePuzzle({
    rows: 9,
    cols: 9,
    density: 1,
    difficulty: 'difficile',
    caseType: 'restrictedAccess',
    seed,
    locale: 'fr',
  }))
  .filter(hasWallToWallRug);
assert.ok(
  reportedPuzzlesWithWallToWallRugs.length <= 1,
  'at most one of the reported seeds may receive a wall-to-wall rug',
);

const besideObjectPuzzle = generatePuzzle({
  rows: 8,
  cols: 8,
  density: 1,
  difficulty: 'moyen',
  caseType: 'evidenceTrail',
  seed: 'MIX-FINAL-0',
  locale: 'fr',
});
const besideObjectClue = besideObjectPuzzle.clues.find((clue) => (
  clue.type === 'besideObject'
  && clue.value === 'tv'
  && besideObjectPuzzle.cluesByCharacter[clue.characterId].some((other) => (
    other.id !== clue.id && clueFamily(other) !== 'object'
  ))
));
assert.ok(besideObjectClue, 'a television may produce a concrete beside-object clue');
assert.match(besideObjectClue.description, /à côté d[’']une télévision/, 'television clues must use correct French elision');
const besideObjectCard = besideObjectPuzzle.cluesByCharacter[besideObjectClue.characterId];
assert.ok(
  besideObjectCard.some((clue) => clue.id !== besideObjectClue.id && clueFamily(clue) !== 'object'),
  'a beside-television clue must be mixed with a complementary clue family',
);
assert.ok(
  besideObjectCard.every((clue) => !['distanceFromObject', 'distanceFromPerson'].includes(clue.type)),
  'the mixed beside-television card must not fall back to an exact-distance clue',
);

const soleRugPuzzle = generatePuzzle({
  rows: 8,
  cols: 8,
  density: 1,
  difficulty: 'difficile',
  caseType: 'coPresence',
  seed: 'RUG-NODIST-15',
  locale: 'fr',
});
const soleRugClue = soleRugPuzzle.clues.find((clue) => (
  clue.type === 'onlyOnObject'
  && clue.value === 'carpet'
  && soleRugPuzzle.cluesByCharacter[clue.characterId].some((other) => (
    other.id !== clue.id && clueFamily(other) !== 'object'
  ))
));
assert.ok(soleRugClue, 'a character may be identified as the only person on a rug');
assert.match(soleRugClue.description, /seule personne sur un tapis/, 'sole-rug clues must be explicit and natural');
const soleRugCard = soleRugPuzzle.cluesByCharacter[soleRugClue.characterId];
assert.ok(
  soleRugCard.some((clue) => clue.id !== soleRugClue.id && clueFamily(clue) !== 'object'),
  'a sole-rug clue must be mixed with a complementary clue family',
);
assert.equal(
  soleRugPuzzle.characters.filter((character) => (
    soleRugPuzzle.cellByKey.get(soleRugPuzzle.solution[character.id]).object === 'carpet'
  )).length,
  1,
  'sole-rug evidence must reflect the complete solution',
);
const saturatedRugCells = soleRugPuzzle.cells.map((cell) => (
  cell.occupiable ? { ...cell, object: 'carpet' } : { ...cell }
));
const impossibleSoleRugPuzzle = {
  ...soleRugPuzzle,
  cells: saturatedRugCells,
  cellByKey: new Map(saturatedRugCells.map((cell) => [cell.key, cell])),
};
const soleRugPruning = solvePuzzle(impossibleSoleRugPuzzle, {
  clues: [soleRugClue],
  maxSolutions: 2,
  maxNodes: 50,
});
assert.equal(soleRugPruning.aborted, false, 'sole-object conflicts must be rejected before exhaustive search');
assert.equal(soleRugPruning.count, 0, 'multiple rug occupants must make sole-rug evidence impossible');
assert.ok(soleRugPruning.stats.nodes <= 2, 'sole-object evidence must prune incompatible domains immediately');

const largeRugPuzzle = generatePuzzle({
  rows: 10,
  cols: 10,
  difficulty: 'moyen',
  seed: 'LARGE-RUG-2',
  locale: 'en',
});
assert.ok(
  largeRugPuzzle.objects.some((object) => object.type === 'carpet' && object.footprint.length >= 9),
  'large cases must place a large rug when a suitable room exists',
);

const clueVarietyPuzzle = generatePuzzle({
  rows: 8,
  cols: 8,
  difficulty: 'difficile',
  seed: 'CLUE-VARIETY-2',
  locale: 'en',
});
const clueVarietyTypes = new Set(clueVarietyPuzzle.clues.map((clue) => clue.type));
assert.ok(clueVarietyTypes.has('distanceFromPerson'), 'generated cases must use person-distance evidence');
assert.ok(clueVarietyTypes.has('roomContainsObject'), 'generated cases must use room-content evidence');
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

const sweepTypeCounts = new Map();
for (const difficulty of Object.keys(DIFFICULTIES)) {
  for (const caseType of Object.keys(CASE_TYPES)) {
    for (let index = 0; index < 12; index += 1) {
      const puzzle = generatePuzzle({
        rows: 6,
        cols: 6,
        density: 1,
        difficulty,
        caseType,
        seed: `CLUE-SWEEP-V10-${difficulty}-${caseType}-${index}`,
        locale: 'fr',
      });
      const evidenceClues = puzzle.clues.filter((clue) => clue.category !== 'narrative');
      const distanceClues = evidenceClues.filter((clue) => (
        ['distanceFromObject', 'distanceFromPerson'].includes(clue.type)
      ));
      const personDistanceClues = evidenceClues.filter((clue) => clue.type === 'distanceFromPerson');
      assert.ok(distanceClues.length <= Math.floor(evidenceClues.length * MAX_DISTANCE_CLUE_SHARE));
      assert.ok(personDistanceClues.length <= Math.floor(evidenceClues.length * MAX_PERSON_DISTANCE_CLUE_SHARE));

      const typeCounts = new Map();
      for (const clue of evidenceClues) {
        typeCounts.set(clue.type, (typeCounts.get(clue.type) ?? 0) + 1);
        sweepTypeCounts.set(clue.type, (sweepTypeCounts.get(clue.type) ?? 0) + 1);
      }
      for (const [type, count] of typeCounts) {
        assert.ok(
          count <= Math.max(1, Math.floor(evidenceClues.length * MAX_CLUE_TYPE_SHARE)),
          `${type} must not dominate ${puzzle.seed}`,
        );
      }
      for (const character of puzzle.characters) {
        assert.ok(
          puzzle.cluesByCharacter[character.id]
            .filter((clue) => ['distanceFromObject', 'distanceFromPerson'].includes(clue.type)).length <= 1,
          `${character.name} must not repeat exact-distance evidence in ${puzzle.seed}`,
        );
      }

      const solved = solvePuzzle(puzzle, { maxSolutions: 2, collectSolutions: true });
      assert.equal(solved.aborted, false, `${puzzle.seed} must finish solving`);
      assert.equal(solved.count, 1, `${puzzle.seed} must remain unique`);
      assert.deepEqual(solved.firstSolution, puzzle.solution, `${puzzle.seed} must retain its generated solution`);
    }
  }
}
assert.ok(sweepTypeCounts.get('onlyOnObject') > 0, 'the generator must regularly use sole-object occupancy');
assert.ok(sweepTypeCounts.get('besideObject') > 0, 'the generator must regularly use concrete adjacency');
assert.ok(
  ['northOf', 'southOf', 'westOf', 'eastOf'].some((type) => sweepTypeCounts.get(type) > 0),
  'cardinal clues must remain part of the clue mix',
);

const ambiguityPuzzle = generatePuzzle({
  rows: 4,
  cols: 4,
  density: 1,
  difficulty: 'expert',
  caseType: 'coPresence',
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
    type: 'victimNoTestimony',
    description: 'La victime ne fournit aucun témoignage.',
  }],
  'Valérie must receive no positional or culprit evidence',
);

const expertProfilePuzzle = generatePuzzle({
  rows: 9,
  cols: 10,
  difficulty: 'expert',
  caseType: 'evidenceTrail',
  seed: 'EXPERT-PROFILE',
  locale: 'en',
});
assert.equal(expertProfilePuzzle.density, DIFFICULTIES.expert.defaultDensity);
assert.ok(expertProfilePuzzle.characters.length <= Math.min(expertProfilePuzzle.rows, expertProfilePuzzle.cols));
const expertPositions = expertProfilePuzzle.characters.map((character) => (
  expertProfilePuzzle.cellByKey.get(expertProfilePuzzle.solution[character.id])
));
assert.equal(
  new Set(expertPositions.map((cell) => cell.row)).size,
  expertProfilePuzzle.characters.length,
  'expert character count must control the number of occupied rows',
);
assert.equal(
  new Set(expertPositions.map((cell) => cell.col)).size,
  expertProfilePuzzle.characters.length,
  'expert character count must control the number of occupied columns',
);

for (const [index, caseType] of Object.keys(CASE_TYPES).entries()) {
  const puzzle = generatePuzzle({
    rows: 8,
    cols: 9,
    difficulty: 'difficile',
    caseType,
    seed: `ARCHETYPE-${index}`,
    locale: 'en',
  });
  assert.equal(puzzle.caseType, caseType);
  assert.ok(puzzle.clues.every((clue) => clue.description.length > 0));
  assert.ok(puzzle.clues.every((clue) => !/\b1 cells\b/.test(clue.description)));
  assert.ok(puzzle.caseRule && puzzle.caseRule.type === caseType, `${caseType} must serialize its culpability rule`);
  assert.deepEqual(Object.keys(puzzle.caseRule), ['type'], `${caseType} must not encode culprit-identifying evidence`);
  assert.equal(puzzle.cluesByCharacter[puzzle.victimId][0].type, CASE_TYPES[caseType].narrativeClue);
  for (const locale of ['en', 'fr', 'es']) {
    localizePuzzle(puzzle, locale);
    const victimNarrative = puzzle.cluesByCharacter[puzzle.victimId][0].description;
    assert.doesNotMatch(
      victimNarrative,
      /\b\d{1,2}[.,]\d{1,2}\b/,
      `${caseType} must not reveal the victim's coordinates in ${locale}`,
    );
    assert.doesNotMatch(
      puzzle.clues.map((clue) => clue.description).join(' '),
      /\b(murderer|killer|meurtrier|assassin|asesino)\b/i,
      `${caseType} clues must not identify or describe the murderer in ${locale}`,
    );
  }
  const solved = solvePuzzle(puzzle, { maxSolutions: 2, collectSolutions: true });
  assert.equal(solved.count, 1, `${caseType} must have one spatial solution`);
  const validation = validatePlayerState(puzzle, puzzle.solution);
  assert.equal(
    getKillerFromPlacement({ ...puzzle, caseRule: { type: caseType } }, puzzle.solution),
    puzzle.killerId,
    `${caseType} must infer the murderer only as the victim's room companion`,
  );
  assert.equal(validation.inferredKillerId, puzzle.killerId, `${caseType} must infer its killer from the victim room`);
  assert.equal(validation.caseRuleValid, true);
  assert.equal(validation.solved, true);
}

console.log(`OK — ${scenarios.length} scenarios and ${Object.keys(CASE_TYPES).length} archetypes generated, solved, and validated.`);
