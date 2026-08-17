import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OBJECT_TYPES } from '../src/core.js';
import { OBJECT_SVGS } from '../src/object-visuals.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const gallery = readFileSync(new URL('./fixtures/object-gallery.js', import.meta.url), 'utf8');

assert.deepEqual(
  Object.keys(OBJECT_SVGS).sort(),
  Object.keys(OBJECT_TYPES).sort(),
  'every generated object type must have a dedicated SVG drawing',
);

for (const [type, svg] of Object.entries(OBJECT_SVGS)) {
  assert.match(svg, /viewBox="0 0 32 32"/, `${type} must use the shared visual coordinate system`);
  assert.match(svg, /preserveAspectRatio="none"/, `${type} must scale across rectangular footprints`);
  assert.match(svg, /class="object-drawing"/, `${type} must expose an orientation-safe drawing group`);
}

assert.doesNotMatch(OBJECT_SVGS.carpet, /carpet-weave|M7 10h18|M10 8v17/, 'rugs must not contain a grid motif');
assert.match(OBJECT_SVGS.carpet, /carpet-motif/, 'rugs must retain a recognizable textile motif');
assert.match(styles, /\.cell\.cell-object-carpet\s*\{[^}]*border-color:\s*transparent/s, 'rug cells must hide internal board lines');
assert.match(styles, /\.object-entity\s*\{[^}]*overflow:\s*visible/s, 'multi-cell drawings must not be clipped by their layer');
assert.match(styles, /orientation-east[^{]*\.object-drawing[^}]*rotate\(90deg\)/s, 'east-facing drawings must rotate inside their SVG viewBox');
assert.match(styles, /orientation-west[^{]*\.object-drawing[^}]*rotate\(-90deg\)/s, 'west-facing drawings must rotate inside their SVG viewBox');

assert.match(index, /id="open-object-legend"/, 'the board must expose one object legend button');
assert.match(index, /id="object-legend-dialog"[^>]*aria-labelledby="object-legend-title"/, 'the object legend must use an accessible dialog');
assert.match(index, /id="object-legend-list"/, 'the object legend must expose a rendered item list');

const footprintCount = Object.values(OBJECT_TYPES)
  .reduce((total, object) => total + object.footprints.length, 0);
assert.equal(footprintCount, 15, 'the rendering catalog must track all configured footprints');
assert.match(gallery, /CELL_SIZES\s*=\s*\[44, 54, 72\]/, 'the gallery must cover mobile, tablet, and desktop cell sizes');
assert.match(gallery, /ORIENTATIONS\s*=\s*\['north', 'east', 'south', 'west'\]/, 'the gallery must cover every placement orientation');
assert.match(gallery, /getBBox\(\)/, 'the browser audit must inspect actual SVG drawing bounds');
assert.match(gallery, /window\.__OBJECT_RENDER_AUDIT__/, 'the gallery must publish machine-readable rendering results');

console.log(`OK — ${footprintCount * 4 * 3} object footprint renders covered.`);
