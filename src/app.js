import {
  DIFFICULTIES,
  GENERATOR_VERSION,
  OBJECT_TYPES,
  createRandomSeed,
  describeHint,
  generatePuzzle,
  localizePuzzle,
  parseCellKey,
  serializePuzzle,
  validatePlayerState,
} from './core.js';
import {
  createChallengeUrl,
  normalizeGenerationOptions,
  parseChallengeUrl,
} from './challenge.js';
import {
  COLOR_VISION_STORAGE_KEY,
  VISUAL_AIDS_STORAGE_KEY,
  normalizeColorVisionMode,
  resolveVisualAidsPreference,
} from './accessibility.js';
import { APP_FEATURES } from './feature-config.js';
import { createFeatureHost } from './feature-host.js';
import { getObjectSvg } from './object-visuals.js';
import {
  clearTheorySlot,
  cloneProgress,
  commitHistory,
  createHistory,
  createProgress,
  redoHistory,
  restoreDraft,
  loadTheorySlot,
  saveTheorySlot,
  serializeDraft,
  undoHistory,
} from './progress.js';
import {
  SUPPORTED_LOCALES,
  getObjectCopy,
  normalizeLocale,
  translate,
  translateDocument,
} from './i18n.js';

const state = {
  locale: 'en',
  puzzle: null,
  selectedCharacterId: null,
  placements: {},
  tentativePlacements: {},
  manualExclusionsByCharacter: {},
  candidateCellsByCharacter: {},
  theorySlots: [],
  pendingRemovalKey: null,
  feedback: null,
  hintedFacts: new Set(),
  status: null,
  interactionMode: 'place',
  focusedCellKey: null,
  history: null,
  caseSolvedPublished: false,
};

const dom = {
  appMenu: document.querySelector('#app-menu'),
  appHeader: document.querySelector('.app-header'),
  caseSettings: document.querySelector('#case-settings'),
  caseHeader: document.querySelector('.case-header'),
  suspectsPanel: document.querySelector('.suspects-panel'),
  boardToolbar: document.querySelector('.board-toolbar'),
  boardScrollHint: document.querySelector('.board-scroll-hint'),
  activeCharacter: document.querySelector('#active-character'),
  placeMode: document.querySelector('#mode-place'),
  markMode: document.querySelector('#mode-mark'),
  candidateMode: document.querySelector('#mode-candidate'),
  tentativeMode: document.querySelector('#mode-tentative'),
  theorySlot: document.querySelector('#theory-slot'),
  saveTheory: document.querySelector('#save-theory'),
  loadTheory: document.querySelector('#load-theory'),
  clearTheory: document.querySelector('#clear-theory'),
  language: document.querySelector('#language'),
  rows: document.querySelector('#rows'),
  cols: document.querySelector('#cols'),
  density: document.querySelector('#density'),
  densityValue: document.querySelector('#density-value'),
  difficulty: document.querySelector('#difficulty'),
  caseType: document.querySelector('#case-type'),
  seed: document.querySelector('#seed'),
  randomizeSeed: document.querySelector('#randomize-seed'),
  visualAidsEnabled: document.querySelector('#visual-aids-enabled'),
  colorVisionMode: document.querySelector('#color-vision-mode'),
  generate: document.querySelector('#generate'),
  newGrid: document.querySelector('#new-grid'),
  title: document.querySelector('#case-title'),
  meta: document.querySelector('#case-meta'),
  caseRule: document.querySelector('#case-rule'),
  victim: document.querySelector('#victim-name'),
  boardScroll: document.querySelector('.board-scroll'),
  board: document.querySelector('#board'),
  suspects: document.querySelector('#suspects'),
  themeToggle: document.querySelector('#theme-toggle'),
  themeColor: document.querySelector('#theme-color'),
  check: document.querySelector('#check'),
  undo: document.querySelector('#undo'),
  redo: document.querySelector('#redo'),
  clear: document.querySelector('#clear'),
  hint: document.querySelector('#hint'),
  reveal: document.querySelector('#reveal'),
  shareChallenge: document.querySelector('#share-challenge'),
  exportJson: document.querySelector('#export-json'),
  print: document.querySelector('#print'),
  status: document.querySelector('#status'),
  planning: document.querySelector('#planning-dialog'),
  openPlanning: document.querySelector('#open-planning'),
  closePlanning: document.querySelector('#close-planning'),
  objectLegend: document.querySelector('#object-legend-dialog'),
  objectLegendList: document.querySelector('#object-legend-list'),
  openObjectLegend: document.querySelector('#open-object-legend'),
  closeObjectLegend: document.querySelector('#close-object-legend'),
  rules: document.querySelector('#rules-dialog'),
  openRules: document.querySelector('#open-rules'),
  closeRules: document.querySelector('#close-rules'),
  success: document.querySelector('#success-dialog'),
  successText: document.querySelector('#success-text'),
  successClose: document.querySelector('#success-close'),
};

const THEME_STORAGE_KEY = 'openalibi-theme';
const LOCALE_STORAGE_KEY = 'openalibi-locale';
const CURRENT_DRAFT_STORAGE_KEY = 'openalibi-current-draft';
const DRAFT_STORAGE_PREFIX = 'openalibi-draft:';
const COMPACT_LAYOUT_QUERY = '(max-width: 1120px)';
const compactLayout = window.matchMedia(COMPACT_LAYOUT_QUERY);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const increasedContrast = window.matchMedia('(prefers-contrast: more)');
const featureHost = createFeatureHost(APP_FEATURES, {
  onError: (error, featureId = 'unknown') => console.error(`Feature ${featureId} failed.`, error),
});

function currentCaseSummary() {
  if (!state.puzzle) return null;
  return Object.freeze({
    id: state.puzzle.id,
    version: state.puzzle.version,
    seed: state.puzzle.seed,
    rows: state.puzzle.rows,
    cols: state.puzzle.cols,
    density: state.puzzle.density,
    difficulty: state.puzzle.difficulty,
    caseType: state.puzzle.requestedCaseType,
    archetype: state.puzzle.caseType,
  });
}

function publishFeatureEvent(type, detail = {}) {
  featureHost.publish(type, { case: currentCaseSummary(), ...detail });
}

function getFeatureSnapshot() {
  return Object.freeze({ locale: state.locale, case: currentCaseSummary() });
}

function scrollIntoView(element) {
  window.requestAnimationFrame(() => {
    element.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    });
  });
}

function focusBoardCell(key) {
  state.focusedCellKey = key;
  window.requestAnimationFrame(() => {
    dom.board.querySelector(`[data-key="${key}"]`)?.focus({ preventScroll: true });
  });
}

function setInteractionMode(mode, announce = true) {
  const modes = ['place', 'mark', 'candidate', 'tentative'];
  state.interactionMode = modes.includes(mode) ? mode : 'place';
  dom.board.dataset.mode = state.interactionMode;
  dom.placeMode.setAttribute('aria-pressed', String(state.interactionMode === 'place'));
  dom.markMode.setAttribute('aria-pressed', String(state.interactionMode === 'mark'));
  dom.candidateMode.setAttribute('aria-pressed', String(state.interactionMode === 'candidate'));
  dom.tentativeMode.setAttribute('aria-pressed', String(state.interactionMode === 'tentative'));
  dom.openPlanning.setAttribute('aria-pressed', String(state.interactionMode !== 'place'));
  if (announce) {
    setStatus({
      place: 'status.placeMode',
      mark: 'status.markMode',
      candidate: 'status.candidateMode',
      tentative: 'status.tentativeMode',
    }[state.interactionMode]);
  }
}

function progressFromState() {
  return {
    placements: state.placements,
    tentativePlacements: state.tentativePlacements,
    manualExclusionsByCharacter: state.manualExclusionsByCharacter,
    candidateCellsByCharacter: state.candidateCellsByCharacter,
    hintedFacts: state.hintedFacts,
    selectedCharacterId: state.selectedCharacterId,
    theorySlots: state.theorySlots,
  };
}

function applyProgress(progress) {
  const copy = cloneProgress(progress);
  state.placements = copy.placements;
  state.tentativePlacements = copy.tentativePlacements;
  state.manualExclusionsByCharacter = copy.manualExclusionsByCharacter;
  state.candidateCellsByCharacter = copy.candidateCellsByCharacter;
  state.hintedFacts = copy.hintedFacts;
  state.selectedCharacterId = copy.selectedCharacterId;
  state.theorySlots = copy.theorySlots;
  state.pendingRemovalKey = null;
  state.feedback = null;
}

function updateHistoryControls() {
  dom.undo.disabled = !state.history?.past.length;
  dom.redo.disabled = !state.history?.future.length;
}

function persistDraft() {
  if (!state.puzzle) return;
  try {
    const serialized = serializeDraft(state.puzzle, progressFromState());
    localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${state.puzzle.id}`, serialized);
    localStorage.setItem(CURRENT_DRAFT_STORAGE_KEY, serialized);
  } catch {
    // Progress remains available for the current session when storage is unavailable.
  }
}

function commitProgress(mutator) {
  mutator();
  state.history = commitHistory(state.history, progressFromState());
  updateHistoryControls();
  persistDraft();
}

function initializeProgress(puzzle) {
  let progress = createProgress(puzzle);
  let restored = false;
  try {
    const serialized = localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${puzzle.id}`);
    if (serialized) {
      progress = restoreDraft(serialized, puzzle).progress;
      restored = true;
    }
  } catch {
    // Invalid or unavailable storage falls back to an empty case.
  }
  applyProgress(progress);
  state.history = createHistory(progress);
  updateHistoryControls();
  return restored;
}

function undoProgress() {
  const next = undoHistory(state.history);
  if (next === state.history) {
    setStatus('status.undoUnavailable', {}, 'warning');
    return;
  }
  state.history = next;
  applyProgress(next.present);
  updateHistoryControls();
  persistDraft();
  render();
}

function redoProgress() {
  const next = redoHistory(state.history);
  if (next === state.history) {
    setStatus('status.redoUnavailable', {}, 'warning');
    return;
  }
  state.history = next;
  applyProgress(next.present);
  updateHistoryControls();
  persistDraft();
  render();
}

function moveBoardFocus(cell, event) {
  const movements = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    Home: [0, -cell.col],
    End: [0, state.puzzle.cols - cell.col - 1],
  };
  const movement = movements[event.key];
  if (!movement) return;
  const target = state.puzzle.cellByKey.get(
    `${cell.row + movement[0]},${cell.col + movement[1]}`,
  );
  if (!target) return;
  event.preventDefault();
  focusBoardCell(target.key);
}

function toggleExclusion(cell) {
  const occupant = state.puzzle.characters.find(
    (character) => state.placements[character.id] === cell.key,
  );
  const characterId = state.selectedCharacterId;
  if (!characterId || !cell.occupiable || occupant || isAutomaticallyExcluded(cell)) {
    setStatus('status.markUnavailable', {}, 'warning');
    return;
  }
  const exclusions = state.manualExclusionsByCharacter[characterId];
  const removed = exclusions.has(cell.key);
  commitProgress(() => {
    if (removed) exclusions.delete(cell.key);
    else exclusions.add(cell.key);
    state.pendingRemovalKey = null;
    state.feedback = null;
  });
  renderBoard();
  focusBoardCell(cell.key);
  setStatus(removed ? 'status.markRemoved' : 'status.markAdded', {
    cellKey: cell.key,
    characterId,
  });
}

function toggleCandidate(cell) {
  const characterId = state.selectedCharacterId;
  if (!characterId || !cell.occupiable) {
    setStatus('status.markUnavailable', {}, 'warning');
    return;
  }
  const candidates = state.candidateCellsByCharacter[characterId];
  const removed = candidates.has(cell.key);
  commitProgress(() => {
    if (removed) candidates.delete(cell.key);
    else candidates.add(cell.key);
  });
  renderBoard();
  focusBoardCell(cell.key);
  setStatus(removed ? 'status.candidateRemoved' : 'status.candidateAdded', {
    cellKey: cell.key,
    characterId,
  });
}

function toggleTentativePlacement(cell) {
  const characterId = state.selectedCharacterId;
  if (!characterId || !cell.occupiable) {
    setStatus('status.blockedCell', {}, 'error');
    return;
  }
  const removed = state.tentativePlacements[characterId] === cell.key;
  commitProgress(() => {
    if (removed) delete state.tentativePlacements[characterId];
    else state.tentativePlacements[characterId] = cell.key;
  });
  renderBoard();
  focusBoardCell(cell.key);
  setStatus(removed ? 'status.tentativeRemoved' : 'status.tentativeAdded', {
    cellKey: cell.key,
    characterId,
  });
}

function getInitialLocale() {
  try {
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale) return normalizeLocale(storedLocale);
  } catch {
    // Browser preferences remain available when storage is unavailable.
  }
  const preferredLocale = navigator.languages?.find((locale) => {
    const language = String(locale).toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LOCALES.includes(language);
  }) ?? navigator.language;
  return normalizeLocale(preferredLocale);
}

function applyTheme(theme, persist = true) {
  const selectedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = selectedTheme;
  dom.themeToggle.textContent = translate(
    state.locale,
    selectedTheme === 'dark' ? 'ui.themeLight' : 'ui.themeDark',
  );
  dom.themeToggle.setAttribute('aria-pressed', String(selectedTheme === 'dark'));
  dom.themeToggle.setAttribute(
    'aria-label',
    translate(state.locale, selectedTheme === 'dark' ? 'ui.enableLight' : 'ui.enableDark'),
  );
  dom.themeColor.content = selectedTheme === 'dark' ? '#17131b' : '#251e2c';
  if (!persist) return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
  } catch {
    // The theme still applies when storage is unavailable.
  }
}

function getInitialAccessibilityPreferences() {
  let storedVisualAids = null;
  let storedColorVision = null;
  try {
    storedVisualAids = localStorage.getItem(VISUAL_AIDS_STORAGE_KEY);
    storedColorVision = localStorage.getItem(COLOR_VISION_STORAGE_KEY);
  } catch {
    // System preferences remain available when storage is unavailable.
  }
  return {
    visualAids: resolveVisualAidsPreference(storedVisualAids, increasedContrast.matches),
    colorVision: normalizeColorVisionMode(storedColorVision),
  };
}

function applyAccessibilityPreferences(preferences = {}, persist = true) {
  const visualAids = preferences.visualAids
    ?? document.documentElement.dataset.visualAids === 'true';
  const colorVision = normalizeColorVisionMode(
    preferences.colorVision ?? document.documentElement.dataset.colorVision,
  );
  document.documentElement.dataset.visualAids = String(Boolean(visualAids));
  document.documentElement.dataset.colorVision = colorVision;
  dom.visualAidsEnabled.checked = Boolean(visualAids);
  dom.colorVisionMode.value = colorVision;
  if (persist) {
    try {
      localStorage.setItem(VISUAL_AIDS_STORAGE_KEY, String(Boolean(visualAids)));
      localStorage.setItem(COLOR_VISION_STORAGE_KEY, colorVision);
    } catch {
      // Accessibility preferences still apply for the current session.
    }
  }
  publishFeatureEvent('accessibility-changed', {
    visualAids: Boolean(visualAids),
    colorVision,
  });
}

const ROOM_SYMBOLS = Object.freeze({
  livingRoom: '⌂',
  diningRoom: '◉',
  library: '≡',
  gallery: '◇',
  workshop: '⚒',
  meetingRoom: '◎',
  indoorGarden: '✿',
  kitchen: '♨',
  office: '▤',
  bedroom: '▰',
  sunroom: '☀',
  archives: '▥',
  laboratory: '⚗',
  musicRoom: '♫',
  studio: '✎',
  cafe: '☕',
  bathroom: '≈',
  laundryRoom: '◌',
  storageRoom: '□',
  vestibule: '⇥',
  dressingRoom: '♢',
  warehouse: '▦',
  hall: '↔',
});

function objectMarkup(type, object, occupiable) {
  const drawing = getObjectSvg(type, object.icon);
  const copy = getObjectCopy(state.locale, type);
  return `<span class="object object-${type}${occupiable ? ' occupiable-object' : ''}" title="${escapeHtml(copy.label)}">${drawing}</span><span class="object-label" aria-hidden="true">${escapeHtml(copy.label)}</span>`;
}

function renderObjectLegend() {
  dom.objectLegendList.innerHTML = Object.entries(OBJECT_TYPES).map(([type, object]) => {
    const copy = getObjectCopy(state.locale, type);
    const occupancyKey = object.occupiable ? 'ui.objectLegendOccupiable' : 'ui.objectLegendBlocking';
    return `
      <article class="object-legend-item" role="listitem">
        <span class="object-legend-preview" aria-hidden="true">
          <span class="object object-${type}${object.occupiable ? ' occupiable-object' : ''}">
            ${getObjectSvg(type, object.icon)}
          </span>
        </span>
        <span class="object-legend-copy">
          <strong>${escapeHtml(copy.label)}</strong>
          <small>${translate(state.locale, occupancyKey)}</small>
        </span>
      </article>`;
  }).join('');
}

function resolveStatusParameters(parameters) {
  const resolved = { ...parameters };
  if (parameters.cellKey) {
    resolved.cell = formatCell(parameters.cellKey);
  }
  if (parameters.characterId && state.puzzle) {
    resolved.name = state.puzzle.characters.find(
      (character) => character.id === parameters.characterId,
    )?.name;
  }
  if (parameters.hintType && parameters.characterId && state.puzzle) {
    const character = state.puzzle.characters.find(
      (item) => item.id === parameters.characterId,
    );
    resolved.description = describeHint(state.puzzle, character, parameters.hintType, state.locale);
  }
  return resolved;
}

function renderStatus() {
  if (!state.status) return;
  dom.status.textContent = translate(
    state.locale,
    state.status.key,
    resolveStatusParameters(state.status.parameters),
  );
  dom.status.dataset.type = state.status.type;
}

function setStatus(key, parameters = {}, type = 'neutral') {
  state.status = { key, parameters, type };
  renderStatus();
}

function renderSuccessText() {
  if (!state.feedback?.solved) return;
  const killer = state.puzzle.characters.find(
    (character) => character.id === state.feedback.inferredKillerId,
  );
  dom.successText.textContent = translate(state.locale, 'ui.successText', { killer: killer.name });
}

function applyLocale(locale, persist = true) {
  state.locale = normalizeLocale(locale);
  dom.language.value = state.locale;
  translateDocument(document, state.locale);
  renderObjectLegend();
  applyTheme(document.documentElement.dataset.theme, false);
  if (state.puzzle) {
    localizePuzzle(state.puzzle, state.locale);
    render();
    renderSuccessText();
  }
  renderStatus();
  publishFeatureEvent('locale-changed', { locale: state.locale });
  if (!persist) return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, state.locale);
  } catch {
    // The language still applies when storage is unavailable.
  }
}

function generate(seed = createRandomSeed(), focusCase = false) {
  const requestedSeed = String(seed).trim() || createRandomSeed();
  dom.seed.value = requestedSeed;
  dom.generate.disabled = true;
  dom.newGrid.disabled = true;
  setStatus('status.generating');
  window.setTimeout(() => {
    try {
      state.puzzle = generatePuzzle({
        rows: Number(dom.rows.value),
        cols: Number(dom.cols.value),
        density: Number(dom.density.value) / 100,
        difficulty: dom.difficulty.value,
        caseType: dom.caseType.value,
        seed: requestedSeed,
        locale: state.locale,
      });
      const restored = initializeProgress(state.puzzle);
      state.pendingRemovalKey = null;
      state.feedback = null;
      state.caseSolvedPublished = false;
      state.focusedCellKey = state.puzzle.cells.find((cell) => cell.occupiable)?.key ?? null;
      setInteractionMode('place', false);
      render();
      persistDraft();
      setStatus(restored ? 'status.draftRestored' : 'status.generated', {}, 'success');
      publishFeatureEvent('case-generated', { restored });
      if (compactLayout.matches) dom.caseSettings.open = false;
      if (focusCase) scrollIntoView(dom.caseHeader);
    } catch (error) {
      console.error(error);
      setStatus('errors.generationFailed', {}, 'error');
    } finally {
      dom.generate.disabled = false;
      dom.newGrid.disabled = false;
    }
  }, 20);
}

function render() {
  renderHeader();
  renderSuspects();
  renderBoard();
  renderTheoryControls();
}

function renderTheoryControls() {
  const selectedIndex = Number(dom.theorySlot.value);
  const hasSavedTheory = Boolean(state.theorySlots[selectedIndex]);
  dom.loadTheory.disabled = !hasSavedTheory;
  dom.clearTheory.disabled = !hasSavedTheory;
  for (const [index, option] of [...dom.theorySlot.options].entries()) {
    option.textContent = translate(
      state.locale,
      state.theorySlots[index] ? 'ui.theorySlotSaved' : 'ui.theorySlotEmpty',
      { slot: String.fromCharCode(65 + index) },
    );
  }
}

function saveCurrentTheory() {
  const index = Number(dom.theorySlot.value);
  commitProgress(() => applyProgress(saveTheorySlot(progressFromState(), index)));
  renderTheoryControls();
  setStatus('status.theorySaved', { slot: String.fromCharCode(65 + index) }, 'success');
}

function loadCurrentTheory() {
  const index = Number(dom.theorySlot.value);
  if (!state.theorySlots[index]) {
    setStatus('status.theoryEmpty', {}, 'warning');
    return;
  }
  commitProgress(() => applyProgress(loadTheorySlot(progressFromState(), index)));
  render();
  setStatus('status.theoryLoaded', { slot: String.fromCharCode(65 + index) }, 'success');
}

function clearCurrentTheory() {
  const index = Number(dom.theorySlot.value);
  commitProgress(() => applyProgress(clearTheorySlot(progressFromState(), index)));
  renderTheoryControls();
  setStatus('status.theoryCleared', { slot: String.fromCharCode(65 + index) });
}

function renderHeader() {
  const puzzle = state.puzzle;
  dom.title.textContent = puzzle.title;
  dom.victim.textContent = state.feedback?.solved
    ? puzzle.characters.find((character) => character.id === puzzle.victimId).name
    : '—';
  const level = translate(state.locale, `difficulty.${puzzle.difficulty}`);
  const caseType = translate(state.locale, `caseTypes.${puzzle.caseType}`);
  dom.meta.textContent = translate(state.locale, 'ui.caseMeta', {
    rows: puzzle.rows,
    cols: puzzle.cols,
    count: puzzle.characters.length,
    difficulty: level,
    caseType,
    seed: dom.seed.value,
  });
  const investigationRule = translate(
    state.locale,
    `ui.boardRule${puzzle.caseType[0].toUpperCase()}${puzzle.caseType.slice(1)}`,
  );
  dom.caseRule.textContent = `${translate(state.locale, 'ui.boardVictimRule')} ${investigationRule}`;
}

function avatarMarkup(character, small = false) {
  const initial = character.name.slice(0, 1).toUpperCase();
  const victim = character.isVictim
    ? `<span class="victim-mark" title="${escapeHtml(translate(state.locale, 'ui.victimMark'))}">†</span>`
    : '';
  return `<span class="avatar ${small ? 'avatar-small' : ''}" style="--avatar-hue:${character.avatarHue}">${initial}${victim}</span>`;
}

function renderActiveCharacter() {
  const character = state.puzzle.characters.find(
    (item) => item.id === state.selectedCharacterId,
  );
  if (!character) {
    dom.activeCharacter.replaceChildren();
    return;
  }
  const clues = state.puzzle.cluesByCharacter[character.id]
    .map((clue) => clue.description)
    .join(' • ');
  dom.activeCharacter.innerHTML = `
    ${avatarMarkup(character, true)}
    <span class="active-character-copy">
      <span class="active-character-label">${translate(state.locale, 'ui.activeCharacter')}</span>
      <strong>${escapeHtml(character.name)}</strong>
      <span class="active-character-clues">${escapeHtml(clues)}</span>
    </span>
  `;
}

function renderSuspects() {
  const puzzle = state.puzzle;
  const previousScrollLeft = dom.suspects.scrollLeft;
  const focusedCharacterId = document.activeElement instanceof HTMLElement
    && dom.suspects.contains(document.activeElement)
    ? document.activeElement.dataset.characterId
    : null;
  dom.suspects.innerHTML = '';
  for (const character of puzzle.characters) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'suspect-card';
    card.dataset.characterId = character.id;
    const selected = state.selectedCharacterId === character.id;
    card.setAttribute('aria-pressed', String(selected));
    if (selected) card.classList.add('selected');
    if (state.placements[character.id]) card.classList.add('placed');
    const feedback = state.feedback?.characterResults?.[character.id];
    const inferredKiller = state.feedback?.inferredKillerId === character.id;
    if (feedback?.placed) card.classList.add(feedback.correct ? 'correct' : 'wrong');
    if (inferredKiller) card.classList.add('inferred-killer');

    const clues = puzzle.cluesByCharacter[character.id];
    card.innerHTML = `
      <span class="suspect-top">
        ${avatarMarkup(character)}
        <span>
          <strong>${character.name}</strong>
          <small>${character.isVictim
    ? translate(state.locale, 'ui.suspectVictim')
    : inferredKiller
      ? translate(state.locale, 'ui.inferredKiller')
      : state.placements[character.id]
        ? translate(state.locale, 'ui.placed', { cell: formatCell(state.placements[character.id]) })
        : translate(state.locale, 'ui.unplaced')}</small>
        </span>
      </span>
      <span class="clue-list">${clues.map((clue) => `<span>${escapeHtml(clue.description)}</span>`).join('')}</span>
    `;
    card.addEventListener('click', () => {
      const unplacedNonVictim = puzzle.characters.find((item) => !item.isVictim && !state.placements[item.id]);
      if (character.isVictim && unplacedNonVictim && state.interactionMode === 'place') {
        setStatus('status.placeOthersFirst', {}, 'warning');
        return;
      }
      state.pendingRemovalKey = null;
      state.selectedCharacterId = character.id;
      state.feedback = null;
      persistDraft();
      renderSuspects();
      renderBoard();
    });
    dom.suspects.appendChild(card);
  }
  dom.suspects.scrollLeft = previousScrollLeft;
  if (focusedCharacterId) {
    const focusedCard = [...dom.suspects.children]
      .find((card) => card.dataset.characterId === focusedCharacterId);
    focusedCard?.focus({ preventScroll: true });
  }
  renderActiveCharacter();
}

function formatCell(key) {
  const { row, col } = parseCellKey(key);
  return translate(state.locale, 'ui.cellFormat', { row: row + 1, col: col + 1 });
}

function borderClass(puzzle, cell) {
  const classes = [];
  const neighbors = {
    top: puzzle.cellByKey.get(`${cell.row - 1},${cell.col}`),
    bottom: puzzle.cellByKey.get(`${cell.row + 1},${cell.col}`),
    left: puzzle.cellByKey.get(`${cell.row},${cell.col - 1}`),
    right: puzzle.cellByKey.get(`${cell.row},${cell.col + 1}`),
  };
  if (!neighbors.top || neighbors.top.roomId !== cell.roomId) classes.push('room-top');
  if (!neighbors.bottom || neighbors.bottom.roomId !== cell.roomId) classes.push('room-bottom');
  if (!neighbors.left || neighbors.left.roomId !== cell.roomId) classes.push('room-left');
  if (!neighbors.right || neighbors.right.roomId !== cell.roomId) classes.push('room-right');
  return classes.join(' ');
}

function isAutomaticallyExcluded(cell) {
  return state.puzzle.characters.some((character) => {
    const placedKey = state.placements[character.id];
    if (!placedKey) return false;
    const placedCell = state.puzzle.cellByKey.get(placedKey);
    return placedCell.row === cell.row || placedCell.col === cell.col;
  });
}

function fitBoardToViewport() {
  if (!state.puzzle) return;
  const scrollStyle = getComputedStyle(dom.boardScroll);
  const boardStyle = getComputedStyle(dom.board);
  const horizontalPadding = [
    scrollStyle.paddingLeft,
    scrollStyle.paddingRight,
    boardStyle.paddingLeft,
    boardStyle.paddingRight,
  ].reduce((total, value) => total + (Number.parseFloat(value) || 0), 0);
  const verticalPadding = [
    scrollStyle.paddingTop,
    scrollStyle.paddingBottom,
    boardStyle.paddingTop,
    boardStyle.paddingBottom,
  ].reduce((total, value) => total + (Number.parseFloat(value) || 0), 0);
  const width = Math.max(1, dom.boardScroll.clientWidth - horizontalPadding);
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const compactReservedHeight = [
    dom.appHeader,
    dom.suspectsPanel,
    dom.boardToolbar,
    dom.boardScrollHint,
  ].reduce((total, element) => total + (element?.getBoundingClientRect().height ?? 0), 28);
  const height = Math.max(1, compactLayout.matches
    ? viewportHeight - compactReservedHeight - verticalPadding
    : dom.boardScroll.clientHeight - verticalPadding);
  const minimumCellSize = compactLayout.matches ? 44 : 22;
  const cellSize = Math.max(minimumCellSize, Math.min(
    82,
    Math.floor(width / state.puzzle.cols),
    Math.floor(height / state.puzzle.rows),
  ));
  dom.board.style.setProperty('--cell-size', `${cellSize}px`);
}

function renderBoard() {
  const puzzle = state.puzzle;
  const roomById = new Map(puzzle.rooms.map((room) => [room.id, room]));
  const objectById = new Map(puzzle.objects.map((object) => [object.id, object]));
  const selectedPlacement = state.selectedCharacterId ? state.placements[state.selectedCharacterId] : null;
  const selectedCell = selectedPlacement ? puzzle.cellByKey.get(selectedPlacement) : null;
  dom.board.innerHTML = '';
  dom.board.style.setProperty('--rows', puzzle.rows);
  dom.board.style.setProperty('--cols', puzzle.cols);
  const focusedCellKey = puzzle.cellByKey.has(state.focusedCellKey)
    ? state.focusedCellKey
    : puzzle.cells.find((cell) => cell.occupiable)?.key;
  state.focusedCellKey = focusedCellKey;

  for (const cell of puzzle.cells) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `cell ${borderClass(puzzle, cell)}`;
    element.dataset.key = cell.key;
    element.tabIndex = cell.key === focusedCellKey ? 0 : -1;
    element.style.setProperty('--room-color', roomById.get(cell.roomId).color);
    if (!cell.occupiable) element.classList.add('blocked');
    if (cell.object) element.classList.add('has-object', `cell-object-${cell.object}`);
    const manuallyExcluded = puzzle.characters.some((character) => (
      state.manualExclusionsByCharacter[character.id]?.has(cell.key)
    ));
    const candidateCharacters = puzzle.characters.filter((character) => (
      state.candidateCellsByCharacter[character.id]?.has(cell.key)
    ));
    if (manuallyExcluded) element.classList.add('excluded');
    if (candidateCharacters.length) element.classList.add('has-candidates');
    if (selectedCell && (selectedCell.row === cell.row || selectedCell.col === cell.col)) element.classList.add('selected-line');

    const occupant = puzzle.characters.find((character) => state.placements[character.id] === cell.key);
    const tentativeOccupant = !occupant
      ? puzzle.characters.find((character) => state.tentativePlacements[character.id] === cell.key)
      : null;
    const pendingRemoval = state.pendingRemovalKey === cell.key && Boolean(occupant);
    const automaticallyExcluded = !occupant && isAutomaticallyExcluded(cell);
    if (automaticallyExcluded) element.classList.add('auto-excluded');
    if (occupant) {
      element.classList.add('occupied');
      if (pendingRemoval) element.classList.add('pending-removal');
      const feedback = state.feedback?.characterResults?.[occupant.id];
      if (feedback) element.classList.add(feedback.correct ? 'correct' : 'wrong');
    }
    if (tentativeOccupant) element.classList.add('tentative');

    const object = cell.object ? OBJECT_TYPES[cell.object] : null;
    const objectInstance = cell.objectId ? objectById.get(cell.objectId) : null;
    const showInlineObject = object && objectInstance?.footprint.length === 1;
    const objectCopy = cell.object ? getObjectCopy(state.locale, cell.object) : null;
    const objectAria = object
      ? translate(state.locale, 'ui.cellObjectAria', {
        object: objectCopy.label,
        occupancy: translate(
          state.locale,
          cell.occupiable ? 'ui.occupiable' : 'ui.notOccupiable',
        ),
      })
      : '';
    const occupantAria = occupant
      ? translate(
        state.locale,
        pendingRemoval ? 'ui.cellRemovalAria' : 'ui.cellOccupantAria',
        { name: occupant.name },
      )
      : tentativeOccupant
        ? `, ${translate(state.locale, 'ui.tentativeOccupant', { name: tentativeOccupant.name })}`
      : '';
    element.setAttribute(
      'aria-label',
      translate(state.locale, 'ui.cellAria', {
        row: cell.row + 1,
        col: cell.col + 1,
        room: roomById.get(cell.roomId).name,
        object: objectAria,
        occupant: occupantAria,
      }),
    );
    element.innerHTML = `
      ${showInlineObject ? objectMarkup(cell.object, object, cell.occupiable) : ''}
      ${occupant ? avatarMarkup(occupant, true) : ''}
      ${tentativeOccupant ? avatarMarkup(tentativeOccupant, true).replace('avatar ', 'avatar ghost-avatar ') : ''}
      ${pendingRemoval ? `<span class="removal-confirmation">${translate(state.locale, 'ui.removeConfirmation')}</span>` : ''}
      ${automaticallyExcluded && !occupant && !manuallyExcluded
        ? '<span class="x-mark auto-exclusion">×</span>'
        : ''}
      ${manuallyExcluded && !occupant
        ? '<span class="x-mark manual-exclusion">×</span>'
        : ''}
      ${candidateCharacters.length && !occupant
        ? `<span class="candidate-notes">${candidateCharacters.map((character) => `<i style="--avatar-hue:${character.avatarHue}">${escapeHtml(character.name[0])}</i>`).join('')}</span>`
        : ''}
      <span class="coordinate">${cell.row + 1}.${cell.col + 1}</span>
    `;

    element.addEventListener('focus', () => {
      state.focusedCellKey = cell.key;
    });
    element.addEventListener('keydown', (event) => moveBoardFocus(cell, event));
    element.addEventListener('click', () => {
      if (state.interactionMode === 'mark') toggleExclusion(cell);
      else if (state.interactionMode === 'candidate') toggleCandidate(cell);
      else if (state.interactionMode === 'tentative') toggleTentativePlacement(cell);
      else placeSelected(cell);
    });
    element.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      toggleExclusion(cell);
    });
    dom.board.appendChild(element);
  }

  fitBoardToViewport();
  const positionGridLayer = (layer, bounds) => {
    layer.style.setProperty('--layer-col', bounds.left);
    layer.style.setProperty('--layer-row', bounds.top);
    layer.style.setProperty('--layer-cols', bounds.width);
    layer.style.setProperty('--layer-rows', bounds.height);
  };
  for (const room of puzzle.rooms) {
    const surface = document.createElement('span');
    surface.className = `room-surface room-pattern-${room.pattern ?? 'textile'}`;
    surface.style.setProperty('--room-color', room.color);
    surface.dataset.roomType = room.type;
    surface.dataset.neighbors = room.neighborIds?.join(',') ?? '';
    positionGridLayer(surface, room);
    dom.board.appendChild(surface);

    const label = document.createElement('span');
    label.className = 'room-label';
    label.dataset.compact = String(room.width <= 2 || room.height <= 2);
    label.setAttribute('aria-label', room.name);
    const plaque = document.createElement('span');
    plaque.className = 'room-plaque';
    const symbol = document.createElement('span');
    symbol.className = 'room-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = ROOM_SYMBOLS[room.type] ?? '⌂';
    const labelText = document.createElement('span');
    labelText.className = 'room-name';
    labelText.textContent = room.name;
    plaque.append(symbol, labelText);
    label.appendChild(plaque);
    positionGridLayer(label, room);
    dom.board.appendChild(label);
  }

  for (const object of puzzle.objects.filter((item) => item.footprint.length > 1)) {
    const footprintCells = object.footprint.map((key) => puzzle.cellByKey.get(key));
    const minRow = Math.min(...footprintCells.map((cell) => cell.row));
    const maxRow = Math.max(...footprintCells.map((cell) => cell.row));
    const minCol = Math.min(...footprintCells.map((cell) => cell.col));
    const maxCol = Math.max(...footprintCells.map((cell) => cell.col));
    const layer = document.createElement('span');
    layer.className = `object-entity object-entity-${object.type} orientation-${object.orientation}`;
    positionGridLayer(layer, {
      left: minCol,
      top: minRow,
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1,
    });
    layer.innerHTML = objectMarkup(
      object.type,
      OBJECT_TYPES[object.type],
      object.occupiableMask.length > 0,
    );
    dom.board.appendChild(layer);
  }

}

function placeSelected(cell) {
  const puzzle = state.puzzle;
  const characterId = state.selectedCharacterId;
  const occupant = puzzle.characters.find(
    (character) => state.placements[character.id] === cell.key,
  );

  if (occupant) {
    if (state.pendingRemovalKey !== cell.key) {
      state.pendingRemovalKey = cell.key;
      state.feedback = null;
      renderBoard();
      focusBoardCell(cell.key);
      setStatus('status.confirmRemoval', {
        cellKey: cell.key,
        characterId: occupant.id,
      }, 'warning');
      return;
    }
    commitProgress(() => {
      delete state.placements[occupant.id];
      state.pendingRemovalKey = null;
      state.feedback = null;
    });
    render();
    focusBoardCell(cell.key);
    setStatus('status.characterRemoved');
    return;
  }

  if (state.pendingRemovalKey) {
    state.pendingRemovalKey = null;
    renderBoard();
  }
  if (!characterId) {
    setStatus('status.selectCharacter', {}, 'error');
    return;
  }
  if (characterId === puzzle.victimId && puzzle.characters.some((character) => !character.isVictim && !state.placements[character.id])) {
    setStatus('status.victimLast', {}, 'warning');
    return;
  }
  if (!cell.occupiable) {
    setStatus('status.blockedCell', {}, 'error');
    return;
  }

  const conflict = puzzle.characters.find((character) => {
    if (character.id === characterId || !state.placements[character.id]) return false;
    const occupied = puzzle.cellByKey.get(state.placements[character.id]);
    return occupied.row === cell.row || occupied.col === cell.col;
  });
  if (conflict) {
    setStatus('status.rowColumnConflict', { characterId: conflict.id }, 'error');
    return;
  }

  commitProgress(() => {
    state.placements[characterId] = cell.key;
    delete state.tentativePlacements[characterId];
    state.manualExclusionsByCharacter[characterId].delete(cell.key);
    state.candidateCellsByCharacter[characterId].delete(cell.key);
    state.pendingRemovalKey = null;
    state.feedback = null;

    const next = puzzle.characters.find((character) => !state.placements[character.id]);
    if (next) state.selectedCharacterId = next.id;
  });
  render();
  focusBoardCell(cell.key);
  setStatus('status.characterPlaced', {
    characterId,
    cellKey: cell.key,
  });
}

function checkAnswers() {
  state.pendingRemovalKey = null;
  const result = validatePlayerState(state.puzzle, state.placements);
  state.feedback = result;
  renderHeader();
  renderSuspects();
  renderBoard();
  publishFeatureEvent('case-checked', {
    solved: result.solved,
    complete: result.complete,
    correctCount: result.correctCount,
    total: result.total,
    victimRoomValid: result.victimRoomValid,
  });

  if (result.solved) {
    if (!state.caseSolvedPublished) {
      state.caseSolvedPublished = true;
      publishFeatureEvent('case-solved');
    }
    renderSuccessText();
    dom.success.showModal();
    setStatus('status.solved', {}, 'success');
    return;
  }

  if (!result.complete) {
    setStatus('status.incomplete', {
      correct: result.correctCount,
      total: result.total,
    }, result.correctCount ? 'warning' : 'error');
  } else if (!result.victimRoomValid) {
    setStatus(
      result.victimCompanionCount === 0 ? 'status.victimAlone' : 'status.victimCrowded',
      {},
      'error',
    );
  } else if (result.correctCount < result.total) {
    setStatus('status.wrongPositions', {
      correct: result.correctCount,
      total: result.total,
    }, 'error');
  } else {
    setStatus('status.killerUnknown', {}, 'error');
  }
}

function clearBoard() {
  commitProgress(() => applyProgress(createProgress(state.puzzle)));
  state.focusedCellKey = state.puzzle.cells.find((cell) => cell.occupiable)?.key ?? null;
  setInteractionMode('place', false);
  render();
  publishFeatureEvent('case-cleared');
  setStatus('status.cleared');
}

function availableHints(puzzle, character) {
  const knownTypes = new Set(puzzle.cluesByCharacter[character.id].map((clue) => clue.type));
  return ['room', 'row', 'col']
    .filter((type) => !knownTypes.has(type) && !state.hintedFacts.has(`${character.id}:${type}`));
}

function giveHint() {
  const puzzle = state.puzzle;
  const candidates = puzzle.characters
    .filter((character) => !character.isVictim && state.placements[character.id] !== puzzle.solution[character.id])
    .flatMap((character) => availableHints(puzzle, character).map((hintType) => ({ character, hintType })));
  if (!candidates.length) {
    setStatus('status.noHint', {}, 'warning');
    return;
  }
  const { character, hintType } = candidates[Math.floor(Math.random() * candidates.length)];
  commitProgress(() => {
    state.hintedFacts.add(`${character.id}:${hintType}`);
    state.selectedCharacterId = character.id;
  });
  renderSuspects();
  renderBoard();
  publishFeatureEvent('hint-used', { characterId: character.id, hintType });
  setStatus('status.hint', { characterId: character.id, hintType }, 'warning');
}

function revealSolution() {
  const confirmed = window.confirm(translate(state.locale, 'ui.confirmReveal'));
  if (!confirmed) return;
  commitProgress(() => {
    state.placements = { ...state.puzzle.solution };
    state.tentativePlacements = {};
    state.pendingRemovalKey = null;
    state.feedback = validatePlayerState(state.puzzle, state.placements);
  });
  render();
  publishFeatureEvent('solution-revealed');
  const killer = state.puzzle.characters.find((character) => character.id === state.puzzle.killerId);
  setStatus('status.revealed', { characterId: killer.id }, 'warning');
}

function exportJson() {
  const blob = new Blob([serializePuzzle(state.puzzle)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${state.puzzle.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copyChallengeLink() {
  try {
    const url = createChallengeUrl(window.location.href, state.puzzle);
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable.');
    await navigator.clipboard.writeText(url);
    setStatus('status.challengeCopied', {}, 'success');
  } catch {
    setStatus('status.challengeCopyFailed', {}, 'error');
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

dom.density.addEventListener('input', () => {
  dom.densityValue.textContent = `${dom.density.value}%`;
});
dom.difficulty.addEventListener('change', () => {
  const density = Math.round(DIFFICULTIES[dom.difficulty.value].defaultDensity * 100);
  dom.density.value = String(density);
  dom.densityValue.textContent = `${density}%`;
});
dom.language.addEventListener('change', () => applyLocale(dom.language.value));
dom.placeMode.addEventListener('click', () => setInteractionMode('place'));
for (const [control, mode] of [
  [dom.markMode, 'mark'],
  [dom.candidateMode, 'candidate'],
  [dom.tentativeMode, 'tentative'],
]) {
  control.addEventListener('click', () => {
    setInteractionMode(mode);
    dom.planning.close();
  });
}
dom.theorySlot.addEventListener('change', renderTheoryControls);
dom.saveTheory.addEventListener('click', saveCurrentTheory);
dom.loadTheory.addEventListener('click', loadCurrentTheory);
dom.clearTheory.addEventListener('click', clearCurrentTheory);
dom.generate.addEventListener('click', () => generate(dom.seed.value, true));
dom.newGrid.addEventListener('click', () => generate(createRandomSeed(), true));
dom.randomizeSeed.addEventListener('click', () => {
  dom.seed.value = createRandomSeed();
  dom.seed.focus();
});
dom.seed.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  generate(dom.seed.value, true);
});
dom.check.addEventListener('click', checkAnswers);
dom.undo.addEventListener('click', undoProgress);
dom.redo.addEventListener('click', redoProgress);
dom.clear.addEventListener('click', clearBoard);
dom.hint.addEventListener('click', giveHint);
dom.reveal.addEventListener('click', revealSolution);
dom.shareChallenge.addEventListener('click', copyChallengeLink);
dom.exportJson.addEventListener('click', exportJson);
dom.print.addEventListener('click', () => {
  dom.appMenu.open = false;
  window.print();
});
dom.openPlanning.addEventListener('click', () => dom.planning.showModal());
dom.closePlanning.addEventListener('click', () => dom.planning.close());
dom.openObjectLegend.addEventListener('click', () => dom.objectLegend.showModal());
dom.closeObjectLegend.addEventListener('click', () => dom.objectLegend.close());
dom.openRules.addEventListener('click', () => {
  dom.appMenu.open = false;
  dom.rules.showModal();
});
dom.closeRules.addEventListener('click', () => dom.rules.close());
dom.successClose.addEventListener('click', () => dom.success.close());
dom.themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
dom.appMenu.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('button')) dom.appMenu.open = false;
});
dom.visualAidsEnabled.addEventListener('change', () => {
  applyAccessibilityPreferences({ visualAids: dom.visualAidsEnabled.checked });
});
dom.colorVisionMode.addEventListener('change', () => {
  applyAccessibilityPreferences({ colorVision: dom.colorVisionMode.value });
});
compactLayout.addEventListener('change', (event) => {
  dom.caseSettings.open = !event.matches;
  fitBoardToViewport();
});
new ResizeObserver(() => {
  fitBoardToViewport();
}).observe(dom.boardScroll);
window.visualViewport?.addEventListener('resize', fitBoardToViewport);
function isEditableTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
}
document.addEventListener('keydown', (event) => {
  if (isEditableTarget(event.target)) return;
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault();
    undoProgress();
  } else if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
    event.preventDefault();
    redoProgress();
  }
});

state.locale = getInitialLocale();
const featureMounts = Object.freeze({
  menuActions: document.querySelector('#feature-menu-actions'),
  caseStatus: document.querySelector('#case-feature-status'),
  successSummary: document.querySelector('#success-feature-summary'),
  dialogRoot: document.querySelector('#feature-dialog-root'),
});
featureHost.start({
  getSnapshot: getFeatureSnapshot,
  mounts: featureMounts,
  setStatus,
  translate: (key, parameters = {}) => translate(state.locale, key, parameters),
});
dom.caseSettings.open = !compactLayout.matches;
applyTheme(document.documentElement.dataset.theme, false);
applyAccessibilityPreferences(getInitialAccessibilityPreferences(), false);
applyLocale(state.locale, false);
let initialGeneration = null;
initialGeneration = parseChallengeUrl(window.location.href, GENERATOR_VERSION);
try {
  const savedGeneration = JSON.parse(localStorage.getItem(CURRENT_DRAFT_STORAGE_KEY))?.generation;
  initialGeneration ??= normalizeGenerationOptions(savedGeneration);
} catch {
  // Start a fresh case when the current draft is unavailable or invalid.
}
if (initialGeneration) {
  dom.rows.value = initialGeneration.rows;
  dom.cols.value = initialGeneration.cols;
  dom.difficulty.value = initialGeneration.difficulty;
  dom.caseType.value = initialGeneration.caseType;
  dom.density.value = Math.round(initialGeneration.density * 100);
  dom.densityValue.textContent = `${dom.density.value}%`;
}
generate(initialGeneration?.seed ?? createRandomSeed());
