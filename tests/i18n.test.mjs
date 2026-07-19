import assert from 'node:assert/strict';
import {
  generatePuzzle,
  localizePuzzle,
} from '../src/core.js';
import {
  SUPPORTED_LOCALES,
  getCharacterNameProfiles,
  getObjectCopy,
  getRoomName,
  getTranslationKeys,
  getVictimNameProfiles,
  normalizeLocale,
  translate,
} from '../src/i18n.js';

assert.deepEqual(SUPPORTED_LOCALES, ['en', 'fr', 'es']);
assert.equal(normalizeLocale('en-CA'), 'en');
assert.equal(normalizeLocale('fr-CA'), 'fr');
assert.equal(normalizeLocale('es-MX'), 'es');
assert.equal(normalizeLocale('de-DE'), 'en');

const englishKeys = getTranslationKeys('en');
for (const locale of SUPPORTED_LOCALES) {
  assert.deepEqual(getTranslationKeys(locale), englishKeys, `${locale} must implement every translation key`);
}

assert.equal(translate('en', 'difficulty.facile'), 'Easy');
assert.equal(translate('fr', 'difficulty.facile'), 'Facile');
assert.equal(translate('es', 'difficulty.facile'), 'Fácil');
assert.equal(getRoomName('en', 'livingRoom'), 'Living Room');
assert.equal(getRoomName('fr', 'livingRoom'), 'Salon');
assert.equal(getRoomName('es', 'livingRoom'), 'Salón');
assert.equal(getObjectCopy('en', 'chair').label, 'chair');
assert.equal(getObjectCopy('fr', 'chair').label, 'chaise');
assert.equal(getObjectCopy('es', 'chair').label, 'silla');

const expectedPronouns = {
  en: { f: 'She', m: 'He' },
  fr: { f: 'Elle', m: 'Il' },
  es: { f: 'Ella', m: 'Él' },
};
for (const locale of SUPPORTED_LOCALES) {
  const characters = getCharacterNameProfiles(locale);
  const victims = getVictimNameProfiles(locale);
  assert.equal(characters.length, getCharacterNameProfiles('en').length, `${locale} must preserve the character pool size`);
  assert.equal(victims.length, 2, `${locale} must provide female and male victim names`);
  assert.equal(new Set([...characters, ...victims].map(({ name }) => name)).size, characters.length + victims.length);
  assert.ok(characters.every(({ name }) => !/^V/i.test(name)), `${locale} non-victim names must not begin with V`);
  assert.ok(victims.every(({ name }) => /^V/i.test(name)), `${locale} victim names must begin with V`);
  for (const profile of [...characters, ...victims]) {
    assert.equal(profile.pronoun, expectedPronouns[locale][profile.gender]);
  }
}

const options = {
  rows: 6,
  cols: 6,
  density: 1,
  difficulty: 'moyen',
  seed: 'I18N-SEMANTICS',
};
const puzzles = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, generatePuzzle({ ...options, locale })]),
);

function semanticCase(puzzle) {
  return {
    id: puzzle.id,
    generationKey: puzzle.generationKey,
    solution: puzzle.solution,
    rooms: puzzle.rooms.map(({ name, ...room }) => room),
    cells: puzzle.cells,
    characters: puzzle.characters.map(({ name, pronoun, ...character }) => character),
    clues: puzzle.clues.map(({ description, ...clue }) => clue),
  };
}

assert.deepEqual(semanticCase(puzzles.fr), semanticCase(puzzles.en));
assert.deepEqual(semanticCase(puzzles.es), semanticCase(puzzles.en));
assert.notDeepEqual(
  puzzles.en.characters.map(({ name }) => name),
  puzzles.fr.characters.map(({ name }) => name),
  'character names must adapt to the locale',
);
assert.notDeepEqual(
  puzzles.en.rooms.map(({ name }) => name),
  puzzles.es.rooms.map(({ name }) => name),
  'room names must adapt to the locale',
);

const victimClues = {
  en: 'The victim was alone with the murderer.',
  fr: 'La victime était seule avec le meurtrier.',
  es: 'La víctima estaba a solas con el asesino.',
};
for (const locale of SUPPORTED_LOCALES) {
  const puzzle = puzzles[locale];
  const victim = puzzle.characters.find(({ isVictim }) => isVictim);
  assert.equal(puzzle.locale, locale);
  assert.equal(puzzle.cluesByCharacter[victim.id][0].description, victimClues[locale]);
  assert.ok(puzzle.clues.every(({ description }) => description.length > 0));
}

const localized = puzzles.en;
const originalIdentity = {
  id: localized.id,
  solution: structuredClone(localized.solution),
  cells: structuredClone(localized.cells),
};
localizePuzzle(localized, 'es');
assert.equal(localized.locale, 'es');
assert.equal(localized.id, originalIdentity.id);
assert.deepEqual(localized.solution, originalIdentity.solution);
assert.deepEqual(localized.cells, originalIdentity.cells);
assert.equal(
  localized.cluesByCharacter[localized.victimId][0].description,
  victimClues.es,
);

console.log('OK — English, French and Spanish localization validated.');
