import assert from 'node:assert/strict';
import { createChallengeUrl, parseChallengeUrl } from '../src/challenge.js';
import { GENERATOR_VERSION, generatePuzzle } from '../src/core.js';

const puzzle = generatePuzzle({
  rows: 7,
  cols: 9,
  difficulty: 'difficile',
  density: 0.75,
  caseType: 'mixed',
  seed: 'FRIEND-CHALLENGE',
  locale: 'fr',
});
const challengeUrl = createChallengeUrl('https://example.test/play?draft=secret#progress', puzzle);
const url = new URL(challengeUrl);
assert.equal(url.origin + url.pathname, 'https://example.test/play');
assert.equal(url.hash, '');
assert.equal(url.searchParams.get('challenge'), '1');
assert.equal(url.searchParams.get('v'), String(GENERATOR_VERSION));
assert.equal(url.searchParams.get('seed'), puzzle.seed);
assert.equal(url.searchParams.get('case'), puzzle.requestedCaseType);
assert.equal(url.searchParams.has('locale'), false, 'challenge identity must be locale-independent');
assert.equal(url.searchParams.has('draft'), false, 'draft state must never leak into challenge links');

assert.deepEqual(parseChallengeUrl(challengeUrl, GENERATOR_VERSION), {
  rows: puzzle.rows,
  cols: puzzle.cols,
  density: puzzle.density,
  difficulty: puzzle.difficulty,
  caseType: puzzle.requestedCaseType,
  seed: puzzle.seed,
});

const reproduced = generatePuzzle({
  ...parseChallengeUrl(challengeUrl, GENERATOR_VERSION),
  locale: 'es',
});
assert.equal(reproduced.id, puzzle.id, 'a shared challenge must reproduce the same semantic case');
assert.deepEqual(reproduced.solution, puzzle.solution);

const wrongVersion = new URL(challengeUrl);
wrongVersion.searchParams.set('v', String(GENERATOR_VERSION + 1));
assert.equal(parseChallengeUrl(wrongVersion, GENERATOR_VERSION), null);
const invalidSize = new URL(challengeUrl);
invalidSize.searchParams.set('rows', '13');
assert.equal(parseChallengeUrl(invalidSize, GENERATOR_VERSION), null);
assert.equal(parseChallengeUrl('https://example.test/play?seed=IGNORED', GENERATOR_VERSION), null);

console.log('OK — shareable challenge identity validated.');
