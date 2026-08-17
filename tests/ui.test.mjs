import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SUPPORTED_LOCALES, translate } from '../src/i18n.js';

const files = Object.fromEntries(await Promise.all([
  ['index', 'index.html'],
  ['app', 'src/app.js'],
  ['accessibility', 'src/accessibility.js'],
  ['core', 'src/core.js'],
  ['challenge', 'src/challenge.js'],
  ['featureConfig', 'src/feature-config.js'],
  ['featureHost', 'src/feature-host.js'],
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
assert.match(files.index, /id="app-menu"/, 'secondary header actions must use one compact menu');
assert.match(files.index, /id="feature-menu-actions"/, 'optional features need a stable menu mount');
assert.match(files.index, /id="case-feature-status"/, 'optional features need a stable case-status mount');
assert.match(files.index, /id="success-feature-summary"/, 'optional features need a stable success-summary mount');
assert.match(files.index, /id="feature-dialog-root"/, 'optional features need a stable dialog mount');
assert.match(files.index, /class="brand-mark"/, 'the header must use a concise brand lockup');
assert.match(files.index, /id="visual-aids-enabled"/, 'players must be able to enable enhanced visual labels');
assert.match(files.index, /id="color-vision-mode"/, 'players must be able to select a color-vision profile');
assert.match(files.index, /id="share-challenge"/, 'players must be able to copy a reproducible challenge link');
assert.match(files.index, /id="case-settings"/, 'case settings must use a mobile-friendly disclosure');
assert.match(files.index, /id="mode-place"/, 'the board must expose an explicit placement mode');
assert.match(files.index, /id="mode-mark"/, 'touch users must have an explicit exclusion mode');
assert.match(files.index, /id="mode-candidate"/, 'players must have a per-character pencil mode');
assert.match(files.index, /id="mode-tentative"/, 'players must have a tentative placement mode');
assert.match(files.index, /id="open-planning"/, 'planning tools must be grouped behind one control');
assert.match(files.index, /id="planning-dialog"/, 'planning tools must use an accessible dialog');
const primaryActions = files.index.match(/<div class="action-row">([\s\S]+?)<\/div>/)?.[1] ?? '';
assert.ok((primaryActions.match(/<button/g) ?? []).length <= 4, 'the persistent action bar must stay focused');
assert.doesNotMatch(primaryActions, /share-challenge|export-json|reveal/, 'secondary case actions must stay in the compact menu');
assert.match(files.index, /id="theory-slot"/, 'players must be able to select a saved theory workspace');
assert.match(files.index, /id="save-theory"/, 'players must be able to save a complete hypothetical combination');
assert.match(files.index, /id="load-theory"/, 'players must be able to compare saved hypothetical combinations');
assert.match(files.index, /id="undo"/, 'the action bar must expose undo');
assert.match(files.index, /id="redo"/, 'the action bar must expose redo');
assert.match(files.index, /id="case-type"/, 'settings must expose investigation archetypes');
assert.match(files.index, /id="board-view-mode"/, 'small screens must switch between fit and zoom modes');
assert.match(files.index, /id="active-character"/, 'mobile players must retain selected-character context near the board');
assert.match(files.index, /board-panel[\s\S]*suspects-panel[\s\S]*board-scroll/, 'characters and their clues must stay inside the grid workspace');
assert.match(files.index, /enterkeyhint="go"/, 'the seed field must expose a mobile submit key');
assert.match(files.index, /id="randomize-seed"/, 'seed randomization must be an explicit action');
assert.match(files.styles, /:root\[data-theme=['"]dark['"]\]/, 'a dark color theme must be defined');
assert.match(files.app, /openalibi-theme/, 'the selected theme must be persisted');
assert.match(files.accessibility, /openalibi-visual-aids/, 'visual accessibility preferences must be persisted');
assert.match(files.accessibility, /openalibi-color-vision/, 'color-vision preferences must be persisted');
assert.match(files.app, /publishFeatureEvent\('accessibility-changed'/, 'optional features must receive accessibility changes');
assert.match(files.app, /openalibi-locale/, 'the selected locale must be persisted');
assert.match(files.app, /openalibi-current-draft/, 'the active case must be restored across sessions');
assert.match(files.app, /createFeatureHost\(APP_FEATURES/, 'optional features must use the public host contract');
assert.match(files.app, /archetype:\s*state\.puzzle\.caseType/, 'feature events must expose the generated investigation archetype');
assert.match(files.app, /mounts:\s*featureMounts/, 'optional features must receive stable DOM mounts');
assert.match(files.app, /publishFeatureEvent\('case-solved'/, 'case completion must expose a stable lifecycle event');
assert.match(files.app, /publishFeatureEvent\('hint-used'/, 'assistance tracking must expose a stable lifecycle event');
assert.match(files.app, /publishFeatureEvent\('solution-revealed'/, 'reveals must expose a stable lifecycle event');
assert.doesNotMatch(files.featureConfig, /premium|leaderboard|achievement/i, 'the public feature configuration must remain premium-free');
assert.match(files.challenge, /createChallengeUrl/, 'shared challenges must use a canonical serializer');
assert.match(files.challenge, /parseChallengeUrl/, 'shared challenge settings must be validated before generation');
assert.match(files.app, /serializeDraft/, 'progress persistence must use the validated draft serializer');
assert.match(files.app, /commitHistory/, 'player mutations must be recorded in undo history');
assert.match(files.app, /saveTheorySlot/, 'theory workspaces must use the validated progress model');
assert.match(files.app, /ResizeObserver/, 'board fit must react to viewport and panel size changes');
assert.match(files.app, /fitBoardToViewport/, 'board sizing must use available width and height');
assert.match(files.app, /visualViewport\?\.height/, 'compact board fitting must use the real mobile and tablet viewport height');
assert.match(files.app, /previousScrollLeft/, 'rerendering characters must preserve the horizontal rail position');
assert.match(files.app, /focusedCharacterId/, 'rerendering characters must restore keyboard focus');
assert.match(files.app, /isEditableTarget/, 'game history shortcuts must not intercept editable controls');
assert.match(files.app, /hadBoardFocus/, 'responsive board fitting must preserve keyboard focus');
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
assert.match(files.app, /scrollIntoView/, 'new cases must bring the active case into view');
assert.match(files.app, /function toggleExclusion/, 'manual exclusions must share one touch-accessible handler');
assert.match(files.app, /function renderActiveCharacter/, 'the selected character and clues must remain visible on mobile');
assert.match(files.app, /element\.tabIndex\s*=/, 'board cells must use roving keyboard focus');
assert.match(files.app, /moveBoardFocus\(cell, event\)/, 'arrow keys must navigate between board cells');
assert.match(files.i18n, /SUPPORTED_LOCALES/, 'the localization module must declare supported locales');
assert.match(files.app, /createRandomSeed/, 'the interface must use the collision-resistant seed generator');
assert.match(files.app, /dom\.generate\.addEventListener\('click', \(\) => generate\(dom\.seed\.value, true\)\)/, 'generation must respect the visible seed');
assert.doesNotMatch(files.app, /Math\.random\(\)\.toString\(36\)/, 'the interface must not derive seeds from Math.random');

assert.doesNotMatch(files.index, /killer-select/, 'the killer dropdown must be removed');
assert.doesNotMatch(files.app, /accusedKillerId|renderKillerSelect/, 'manual killer accusation state must be removed');
assert.match(files.app, /inferredKillerId/, 'answer checking must use the automatically inferred killer');

assert.match(files.app, /pendingRemovalKey/, 'occupied cells must support removal confirmation');
assert.match(files.styles, /\.removal-confirmation/, 'removal confirmation must be visible in the grid');
assert.match(files.styles, /scroll-snap-type:\s*x mandatory/, 'mobile character cards must form a horizontal snap carousel');
assert.match(files.styles, /\.suspect-list\s*\{[^}]*grid-auto-flow:\s*column[^}]*overflow-y:\s*hidden/s, 'characters must use a horizontal rail without nested vertical scrolling');
assert.match(files.styles, /@media \(min-width: 721px\) and \(max-width: 1120px\)/, 'tablet scaling must have an explicit layout contract');
assert.match(files.app, /COMPACT_LAYOUT_QUERY = '\(max-width: 1120px\)'/, 'compact behavior must include tablets');
assert.doesNotMatch(files.app, /showBoardOnMobile/, 'selecting a character must not force a vertical page jump');
assert.doesNotMatch(files.styles, /\.room-label\[data-compact=['"]true['"]\]\s+\.room-name\s*\{[^}]*display:\s*none/s, 'room names must remain visible at every size');
assert.match(files.styles, /\.suspects-panel\s*\{[^}]*position:\s*sticky/s, 'character selection and clues must remain reachable while exploring the grid');
assert.match(files.styles, /safe-area-inset-bottom/, 'mobile controls must respect device safe areas');
assert.match(files.styles, /prefers-reduced-motion:\s*reduce/, 'motion preferences must be respected');
assert.match(files.styles, /:focus-visible/, 'keyboard focus must remain clearly visible');
assert.match(files.styles, /hover:\s*none/, 'touch devices must not retain hover-only effects');
const placementHandler = files.app.match(/function placeSelected\(cell\) \{[\s\S]+?\r?\n\}\r?\n\r?\nfunction checkAnswers/);
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
assert.match(files.app, /ROOM_SYMBOLS/, 'room labels must expose recognizable type-specific symbols');
assert.match(files.app, /object-fill/, 'object drawings must use layered vector surfaces');
assert.match(files.app, /object-label/, 'objects must expose localized visible labels');
assert.match(files.app, /object-entity/, 'multi-cell objects must render as unified visual entities');
assert.match(files.styles, /data-visual-aids=['"]true['"]/, 'enhanced visual labels must have an explicit style mode');
assert.match(files.styles, /data-color-vision=['"]red-green['"]/, 'red-green distinction must have a dedicated palette');
assert.match(files.styles, /data-color-vision=['"]blue-yellow['"]/, 'blue-yellow distinction must have a dedicated palette');
assert.match(files.styles, /data-color-vision=['"]monochrome['"]/, 'monochrome distinction must have a dedicated palette');
assert.match(files.styles, /prefers-contrast:\s*more/, 'system contrast preferences must receive stronger visual treatment');
assert.match(files.styles, /\.candidate-notes/, 'per-character pencil notes must remain visible in cells');
assert.match(files.styles, /\.ghost-avatar/, 'tentative placements must be visually distinct');
assert.match(files.styles, /@media \(min-width: 1121px\) and \(min-height: 820px\)/, 'tall desktop viewports must use a viewport-constrained workspace');
assert.match(files.styles, /body\s*\{[^}]*overflow:\s*hidden/s, 'desktop mode must avoid page scrolling');
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
