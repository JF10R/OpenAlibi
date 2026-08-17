import assert from 'node:assert/strict';
import {
  COLOR_VISION_MODES,
  normalizeColorVisionMode,
  resolveVisualAidsPreference,
} from '../src/accessibility.js';

assert.deepEqual(COLOR_VISION_MODES, ['standard', 'red-green', 'blue-yellow', 'monochrome']);
assert.ok(Object.isFrozen(COLOR_VISION_MODES));
assert.equal(resolveVisualAidsPreference('true', false), true);
assert.equal(resolveVisualAidsPreference('false', true), false);
assert.equal(resolveVisualAidsPreference(null, true), true);
assert.equal(resolveVisualAidsPreference(null, false), false);
assert.equal(normalizeColorVisionMode('red-green'), 'red-green');
assert.equal(normalizeColorVisionMode('blue-yellow'), 'blue-yellow');
assert.equal(normalizeColorVisionMode('monochrome'), 'monochrome');
assert.equal(normalizeColorVisionMode('unsupported'), 'standard');

console.log('OK — visual accessibility preferences validated.');
