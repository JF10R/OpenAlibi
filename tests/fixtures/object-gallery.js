import { OBJECT_TYPES } from '../../src/core.js';
import { getObjectSvg } from '../../src/object-visuals.js';

const CELL_SIZES = [44, 54, 72];
const ORIENTATIONS = ['north', 'east', 'south', 'west'];
const gallery = document.querySelector('#render-gallery');
const summary = document.querySelector('#audit-summary');

function rotateOffset([row, col], orientation) {
  if (orientation === 'east') return [col, -row];
  if (orientation === 'south') return [-row, -col];
  if (orientation === 'west') return [-col, row];
  return [row, col];
}

function footprintBounds(footprint, orientation) {
  const offsets = footprint.map((offset) => rotateOffset(offset, orientation));
  const rows = offsets.map(([row]) => row);
  const cols = offsets.map(([, col]) => col);
  return {
    rows: Math.max(...rows) - Math.min(...rows) + 1,
    cols: Math.max(...cols) - Math.min(...cols) + 1,
  };
}

function objectMarkup(type, object) {
  return `<span class="object object-${type}${object.occupiable ? ' occupiable-object' : ''}">${getObjectSvg(type, object.icon)}</span>`;
}

function renderCase(type, object, footprint, footprintIndex, orientation, cellSize) {
  const bounds = footprintBounds(footprint, orientation);
  const figure = document.createElement('figure');
  figure.className = 'render-case';
  figure.dataset.type = type;
  figure.dataset.orientation = orientation;
  figure.dataset.cellSize = String(cellSize);

  const board = document.createElement('div');
  board.className = 'board render-board';
  board.style.setProperty('--rows', bounds.rows);
  board.style.setProperty('--cols', bounds.cols);
  board.style.setProperty('--cell-size', `${cellSize}px`);
  for (let index = 0; index < bounds.rows * bounds.cols; index += 1) {
    const cell = document.createElement('span');
    cell.className = `cell${type === 'carpet' ? ' cell-object-carpet' : ''}`;
    if (footprint.length === 1 && index === 0) cell.innerHTML = objectMarkup(type, object);
    board.appendChild(cell);
  }

  if (footprint.length > 1) {
    const layer = document.createElement('span');
    layer.className = `object-entity object-entity-${type} orientation-${orientation}`;
    layer.style.setProperty('--layer-col', 0);
    layer.style.setProperty('--layer-row', 0);
    layer.style.setProperty('--layer-cols', bounds.cols);
    layer.style.setProperty('--layer-rows', bounds.rows);
    layer.innerHTML = objectMarkup(type, object);
    board.appendChild(layer);
  }

  const caption = document.createElement('figcaption');
  caption.innerHTML = `<strong>${type}</strong><span>${bounds.cols}×${bounds.rows} · ${orientation} · ${cellSize}px</span><span class="render-error"></span>`;
  figure.append(board, caption);
  figure.dataset.footprint = String(footprintIndex);
  gallery.appendChild(figure);
}

for (const [type, object] of Object.entries(OBJECT_TYPES)) {
  object.footprints.forEach((footprint, footprintIndex) => {
    for (const orientation of ORIENTATIONS) {
      for (const cellSize of CELL_SIZES) {
        renderCase(type, object, footprint, footprintIndex, orientation, cellSize);
      }
    }
  });
}

function contains(outer, inner, tolerance = 1) {
  return inner.left >= outer.left - tolerance
    && inner.top >= outer.top - tolerance
    && inner.right <= outer.right + tolerance
    && inner.bottom <= outer.bottom + tolerance;
}

requestAnimationFrame(() => {
  const failures = [];
  for (const figure of document.querySelectorAll('.render-case')) {
    const svg = figure.querySelector('svg');
    const drawing = figure.querySelector('.object-drawing');
    const host = figure.querySelector('.object-entity') ?? figure.querySelector('.cell');
    const reasons = [];
    const svgRect = svg.getBoundingClientRect();
    const drawingRect = drawing.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const drawingBox = drawing.getBBox();
    if (svgRect.width <= 0 || svgRect.height <= 0) reasons.push('empty SVG');
    if (!contains(hostRect, svgRect)) reasons.push('SVG outside host');
    if (!contains(svgRect, drawingRect, 1.5)) reasons.push('drawing clipped');
    if (drawingBox.x < 0.5 || drawingBox.y < 0.5
      || drawingBox.x + drawingBox.width > 31.5
      || drawingBox.y + drawingBox.height > 31.5) reasons.push('unsafe viewBox bounds');
    figure.dataset.renderStatus = reasons.length ? 'fail' : 'pass';
    figure.querySelector('.render-error').textContent = reasons.join(', ');
    if (reasons.length) failures.push({
      type: figure.dataset.type,
      orientation: figure.dataset.orientation,
      cellSize: Number(figure.dataset.cellSize),
      footprint: Number(figure.dataset.footprint),
      reasons,
    });
  }

  window.__OBJECT_RENDER_AUDIT__ = {
    total: document.querySelectorAll('.render-case').length,
    failed: failures.length,
    failures,
  };
  summary.dataset.status = failures.length ? 'fail' : 'pass';
  summary.textContent = failures.length
    ? `${failures.length} rendering variants failed.`
    : `${window.__OBJECT_RENDER_AUDIT__.total} rendering variants passed.`;
});
