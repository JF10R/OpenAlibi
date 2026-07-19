import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SUPPORTED_LOCALES, translate } from '../src/i18n.js';

const files = Object.fromEntries(await Promise.all([
  ['index', 'index.html'],
  ['app', 'src/app.js'],
  ['core', 'src/core.js'],
  ['i18n', 'src/i18n.js'],
  ['styles', 'styles.css'],
  ['readme', 'README.md'],
  ['package', 'package.json'],
].map(async ([key, path]) => [key, await readFile(new URL(`../${path}`, import.meta.url), 'utf8')])));

const brandedFiles = Object.values(files).join('\n');
const formerProtectedTerm = ['Mur', 'doku'].join('');
assert.doesNotMatch(brandedFiles, new RegExp(formerProtectedTerm, 'i'), 'the former project name must be fully removed');
assert.match(files.index, /OpenAlibi/, 'the trilingual project name must appear in the interface');
assert.equal(JSON.parse(files.package).name, 'openalibi', 'the package must use the new repository name');

assert.match(files.index, /id="theme-toggle"/, 'the interface must expose a theme toggle');
assert.match(files.index, /id="case-settings"/, 'case settings must use a mobile-friendly disclosure');
assert.match(files.index, /id="mode-place"/, 'the board must expose an explicit placement mode');
assert.match(files.index, /id="mode-mark"/, 'touch users must have an explicit exclusion mode');
assert.match(files.index, /id="active-character"/, 'mobile players must retain selected-character context near the board');
assert.match(files.index, /enterkeyhint="go"/, 'the seed field must expose a mobile submit key');
assert.match(files.styles, /:root\[data-theme=['"]dark['"]\]/, 'a dark color theme must be defined');
assert.match(files.app, /openalibi-theme/, 'the selected theme must be persisted');
assert.match(files.app, /openalibi-locale/, 'the selected locale must be persisted');
assert.match(files.index, /id="language"/, 'the interface must expose a language selector');
for (const locale of SUPPORTED_LOCALES) {
  assert.match(files.index, new RegExp(`<option value="${locale}"`), `${locale} must be selectable`);
}
assert.match(files.index, /data-i18n=/, 'static interface text must use translation keys');
const documentKeys = [...files.index.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)]
  .map((match) => match[1]);
for (const locale of SUPPORTED_LOCALES) {
  for (const key of documentKeys) {
    assert.notEqual(translate(locale, key), key, `${locale} must translate static key ${key}`);
  }
}
assert.match(files.app, /localizePuzzle/, 'language changes must relocalize the active case');
assert.match(files.app, /scrollIntoView/, 'mobile character selection must bring the board into view');
assert.match(files.app, /function toggleExclusion/, 'manual exclusions must share one touch-accessible handler');
assert.match(files.app, /function renderActiveCharacter/, 'the selected character and clues must remain visible on mobile');
assert.match(files.app, /element\.tabIndex\s*=/, 'board cells must use roving keyboard focus');
assert.match(files.app, /moveBoardFocus\(cell, event\)/, 'arrow keys must navigate between board cells');
assert.match(files.i18n, /SUPPORTED_LOCALES/, 'the localization module must declare supported locales');
assert.match(files.app, /createRandomSeed/, 'the interface must use the collision-resistant seed generator');
assert.doesNotMatch(files.app, /Math\.random\(\)\.toString\(36\)/, 'the interface must not derive seeds from Math.random');

assert.doesNotMatch(files.index, /killer-select/, 'the killer dropdown must be removed');
assert.doesNotMatch(files.app, /accusedKillerId|renderKillerSelect/, 'manual killer accusation state must be removed');
assert.match(files.app, /inferredKillerId/, 'answer checking must use the automatically inferred killer');

assert.match(files.app, /pendingRemovalKey/, 'occupied cells must support removal confirmation');
assert.match(files.styles, /\.removal-confirmation/, 'removal confirmation must be visible in the grid');
assert.match(files.styles, /scroll-snap-type:\s*x mandatory/, 'mobile character cards must form a horizontal snap carousel');
assert.match(files.styles, /\.resolution-panel\s*\{[^}]*position:\s*sticky/s, 'mobile actions must remain reachable');
assert.match(files.styles, /safe-area-inset-bottom/, 'mobile controls must respect device safe areas');
assert.match(files.styles, /prefers-reduced-motion:\s*reduce/, 'motion preferences must be respected');
assert.match(files.styles, /:focus-visible/, 'keyboard focus must remain clearly visible');
assert.match(files.styles, /hover:\s*none/, 'touch devices must not retain hover-only effects');
const placementHandler = files.app.match(/function placeSelected\(cell\) \{[\s\S]+?\n\}\n\nfunction checkAnswers/);
assert.ok(placementHandler, 'the cell placement handler must remain testable');
assert.match(
  placementHandler[0],
  /if \(occupant\)/,
  'occupied cells must use a dedicated removal branch',
);
assert.ok(
  placementHandler[0].indexOf('if (occupant)') < placementHandler[0].indexOf('if (!characterId)'),
  'an occupied cell must handle its occupant before the selected character',
);
assert.match(
  placementHandler[0],
  /delete state\.placements\[occupant\.id\]/,
  'confirmed removal must remove the actual occupant',
);
assert.match(files.app, /\btv:\s*`/, 'the interface must draw televisions explicitly');
assert.match(
  files.app,
  /\.filter\(\(character\) => !character\.isVictim && state\.placements\[character\.id\] !== puzzle\.solution\[character\.id\]\)/,
  'extra hints must never target the victim',
);
assert.match(files.readme, /## Localization/, 'the English README must document localization');
assert.doesNotMatch(
  files.readme,
  /## (Points forts|Comment jouer|Démarrage rapide|Contribuer|Licence)/,
  'README headings must remain in English',
);

console.log('OK — interface, branding, and interactions validated.');
