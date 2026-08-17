import assert from 'node:assert/strict';
import {
  commitHistory,
  createHistory,
  createProgress,
  redoHistory,
  restoreDraft,
  serializeDraft,
  undoHistory,
} from '../src/progress.js';
import { generatePuzzle } from '../src/core.js';

const puzzle = generatePuzzle({
  rows: 6,
  cols: 7,
  difficulty: 'moyen',
  caseType: 'evidenceTrail',
  seed: 'DRAFT-ROUNDTRIP',
  locale: 'fr',
});
const suspect = puzzle.characters.find((character) => !character.isVictim);
const [firstCell, secondCell, thirdCell] = puzzle.cells.filter((cell) => cell.occupiable);
const progress = createProgress(puzzle);
progress.placements[suspect.id] = firstCell.key;
progress.tentativePlacements[suspect.id] = secondCell.key;
progress.manualExclusionsByCharacter[suspect.id].add(thirdCell.key);
progress.candidateCellsByCharacter[suspect.id].add(secondCell.key);
progress.hintedFacts.add(`${suspect.id}:room`);

const serialized = serializeDraft(puzzle, progress);
const restored = restoreDraft(serialized, puzzle);
assert.equal(restored.puzzleId, puzzle.id);
assert.deepEqual(restored.progress.placements, progress.placements);
assert.deepEqual(restored.progress.tentativePlacements, progress.tentativePlacements);
assert.deepEqual(
  [...restored.progress.manualExclusionsByCharacter[suspect.id]],
  [thirdCell.key],
);
assert.deepEqual(
  [...restored.progress.candidateCellsByCharacter[suspect.id]],
  [secondCell.key],
);
assert.deepEqual([...restored.progress.hintedFacts], [`${suspect.id}:room`]);
assert.deepEqual(restored.generation, {
  rows: puzzle.rows,
  cols: puzzle.cols,
  density: puzzle.density,
  difficulty: puzzle.difficulty,
  caseType: puzzle.requestedCaseType,
  seed: puzzle.seed,
});

let history = createHistory(createProgress(puzzle));
history = commitHistory(history, progress);
const changed = createProgress(puzzle);
changed.placements[suspect.id] = thirdCell.key;
history = commitHistory(history, changed);
history = undoHistory(history);
assert.equal(history.present.placements[suspect.id], firstCell.key, 'undo must restore the previous confirmed placement');
history = redoHistory(history);
assert.equal(history.present.placements[suspect.id], thirdCell.key, 'redo must restore the reverted placement');
assert.notEqual(history.present, changed, 'history snapshots must not retain mutable caller objects');

const mismatchedPuzzle = generatePuzzle({
  rows: 6,
  cols: 7,
  difficulty: 'moyen',
  caseType: 'evidenceTrail',
  seed: 'OTHER-DRAFT',
});
assert.throws(() => restoreDraft(serialized, mismatchedPuzzle), /different case/i);

console.log('OK — draft persistence and undo/redo history validated.');
