import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PREMIUM_LOCALES, premiumTranslate } from '../src/premium-i18n.js';
import { premiumFeature } from '../src/premium-feature.js';

const featureSource = await readFile(new URL('../src/premium-feature.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/premium.css', import.meta.url), 'utf8');
const documentSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.equal(premiumFeature.id, 'premium');
assert.ok(Object.isFrozen(premiumFeature));
for (const eventType of [
  'case-generated',
  'case-checked',
  'case-solved',
  'case-cleared',
  'hint-used',
  'solution-revealed',
  'locale-changed',
]) {
  assert.match(featureSource, new RegExp(`subscribe\\('${eventType}'`), `${eventType} must be observed`);
}
assert.match(featureSource, /services\.mounts/, 'premium UI must use public extension mounts');
assert.doesNotMatch(featureSource, /from ['"]\.\/app\.js['"]/, 'premium must not import the public app shell');
assert.match(featureSource, /visibilitychange/, 'private timer must pause when the page is hidden');
assert.match(featureSource, /openalibi-premium-api/, 'network service must require explicit configuration');
assert.doesNotMatch(featureSource, /subscribe\('case-cleared',[^{]+setSession/, 'clearing the board must preserve assistance metrics');
assert.match(featureSource, /requestId !== networkRequestId/, 'stale leaderboard responses must be ignored');
assert.match(featureSource, /appMenu\.open = false/, 'opening premium must close the compact app menu');
assert.match(documentSource, /name="openalibi-premium-api" content=""/, 'private service configuration must be explicit and empty by default');
assert.match(styles, /@media \(max-width: 680px\)/, 'premium dialog must adapt to phones');
assert.match(styles, /@media \(forced-colors: active\)/, 'premium controls must support forced colors');

for (const locale of PREMIUM_LOCALES) {
  assert.notEqual(premiumTranslate(locale, 'profileTitle'), 'profileTitle');
  assert.notEqual(premiumTranslate(locale, 'timerHelp'), 'timerHelp');
  assert.notEqual(premiumTranslate(locale, 'achievement.firstCaseTitle'), 'achievement.firstCaseTitle');
}
assert.equal(premiumTranslate('unknown', 'profileTitle'), premiumTranslate('en', 'profileTitle'));
assert.equal(premiumTranslate('fr', 'recordTime', { time: '1:23' }).includes('1:23'), true);

console.log('OK — premium feature boundary and localization validated.');
