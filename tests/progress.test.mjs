import assert from 'node:assert/strict';
import {
  clearTheorySlot,
  cloneProgress,
  commitHistory,
  createHistory,
  createProgress,
  loadTheorySlot,
  redoHistory,
  restoreDraft,
  saveTheorySlot,
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

const withFirstTheory = saveTheorySlot(progress, 0);
const alternative = cloneProgress(withFirstTheory);
alternative.placements[suspect.id] = thirdCell.key;
alternative.tentativePlacements[suspect.id] = firstCell.key;
alternative.candidateCellsByCharacter[suspect.id] = new Set([firstCell.key, thirdCell.key]);
const withTwoTheories = saveTheorySlot(alternative, 1);
const loadedFirstTheory = loadTheorySlot(withTwoTheories, 0);
assert.equal(loadedFirstTheory.placements[suspect.id], firstCell.key, 'loading theory A must restore its confirmed placement');
assert.equal(loadedFirstTheory.tentativePlacements[suspect.id], secondCell.key, 'loading theory A must restore its trial placement');
assert.deepEqual(
  [...loadedFirstTheory.candidateCellsByCharacter[suspect.id]],
  [secondCell.key],
  'loading a theory must restore its candidate combination',
);
assert.ok(loadedFirstTheory.theorySlots[1], 'loading one theory must preserve the other saved theories');
assert.equal(clearTheorySlot(loadedFirstTheory, 0).theorySlots[0], null, 'a theory slot must be independently clearable');

const serialized = serializeDraft(puzzle, withTwoTheories);
const restored = restoreDraft(serialized, puzzle);
assert.equal(restored.puzzleId, puzzle.id);
assert.deepEqual(restored.progress.placements, alternative.placements);
assert.deepEqual(restored.progress.tentativePlacements, alternative.tentativePlacements);
assert.deepEqual(
  [...restored.progress.manualExclusionsByCharacter[suspect.id]],
  [thirdCell.key],
);
assert.deepEqual(
  [...restored.progress.candidateCellsByCharacter[suspect.id]],
  [firstCell.key, thirdCell.key],
);
assert.deepEqual([...restored.progress.hintedFacts], [`${suspect.id}:room`]);
assert.equal(restored.progress.theorySlots.length, 3, 'drafts must persist three theory slots');
assert.equal(restored.progress.theorySlots[0].placements[suspect.id], firstCell.key);
assert.equal(restored.progress.theorySlots[1].placements[suspect.id], thirdCell.key);
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
