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
import { createChallengeUrl, parseChallengeUrl } from './challenge.js';
import {
  cloneProgress,
  commitHistory,
  createHistory,
  createProgress,
  redoHistory,
  restoreDraft,
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
  pendingRemovalKey: null,
  feedback: null,
  hintedFacts: new Set(),
  status: null,
  interactionMode: 'place',
  focusedCellKey: null,
  history: null,
  boardViewMode: 'fit',
};

const dom = {
  caseSettings: document.querySelector('#case-settings'),
  caseHeader: document.querySelector('.case-header'),
  boardPanel: document.querySelector('.board-panel'),
  activeCharacter: document.querySelector('#active-character'),
  placeMode: document.querySelector('#mode-place'),
  markMode: document.querySelector('#mode-mark'),
  candidateMode: document.querySelector('#mode-candidate'),
  tentativeMode: document.querySelector('#mode-tentative'),
  boardViewMode: document.querySelector('#board-view-mode'),
  language: document.querySelector('#language'),
  rows: document.querySelector('#rows'),
  cols: document.querySelector('#cols'),
  density: document.querySelector('#density'),
  densityValue: document.querySelector('#density-value'),
  difficulty: document.querySelector('#difficulty'),
  caseType: document.querySelector('#case-type'),
  seed: document.querySelector('#seed'),
  generate: document.querySelector('#generate'),
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
const MOBILE_LAYOUT_QUERY = [
  '(max-width: 720px)',
  '(max-width: 960px) and (max-height: 600px) and (orientation: landscape) and (pointer: coarse)',
].join(', ');
const mobileLayout = window.matchMedia(MOBILE_LAYOUT_QUERY);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

function showBoardOnMobile() {
  if (mobileLayout.matches) scrollIntoView(dom.boardPanel);
}

function setInteractionMode(mode, announce = true) {
  const modes = ['place', 'mark', 'candidate', 'tentative'];
  state.interactionMode = modes.includes(mode) ? mode : 'place';
  dom.board.dataset.mode = state.interactionMode;
  dom.placeMode.setAttribute('aria-pressed', String(state.interactionMode === 'place'));
  dom.markMode.setAttribute('aria-pressed', String(state.interactionMode === 'mark'));
  dom.candidateMode.setAttribute('aria-pressed', String(state.interactionMode === 'candidate'));
  dom.tentativeMode.setAttribute('aria-pressed', String(state.interactionMode === 'tentative'));
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

const OBJECT_SVGS = {
  chair: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="7" y="8" width="18" height="18" rx="4" />
      <path d="M8 10h16M10 13h12v10H10z" />
      <circle cx="10" cy="25" r="1.2" /><circle cx="22" cy="25" r="1.2" />
    </svg>`,
  bed: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="5" width="26" height="22" rx="3" />
      <rect x="6" y="8" width="8" height="16" rx="2" />
      <path d="M16 7v18M19 11h7M19 16h7M19 21h7" opacity=".6" />
    </svg>`,
  carpet: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="6" width="24" height="20" rx="3" />
      <path d="m16 9 8 7-8 7-8-7 8-7Z" />
      <path d="M4 10h-2M4 14h-2M4 18h-2M4 22h-2M28 10h2M28 14h2M28 18h2M28 22h2" />
    </svg>`,
  puddle: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 18c0-3 3-4 6-5 2-1 3-5 7-4 3 1 3 4 5 5 3 1 5 2 4 5-1 4-6 5-11 5S5 23 5 18Z" />
      <path d="M11 17c2-2 6-3 9-1M14 21c2 1 5 0 7-1" opacity=".55" />
    </svg>`,
  table: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="15" rx="11" ry="8" />
      <ellipse cx="16" cy="15" rx="7" ry="4.5" opacity=".45" />
      <circle cx="8" cy="15" r="1" /><circle cx="24" cy="15" r="1" />
    </svg>`,
  shelf: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="8" width="24" height="16" rx="2" />
      <path d="M8 8v16M13 8v16M19 8v16M24 8v16" />
      <path d="M5 11h22M5 21h22" opacity=".55" />
    </svg>`,
  plant: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M11 21h10l-1 7h-8l-1-7Z" />
      <path d="M16 21V9M16 14c-5 0-7-3-7-6 4 0 7 2 7 6ZM16 17c5 0 7-3 7-6-4 0-7 2-7 6ZM16 11c0-4 2-6 5-7 1 4-1 7-5 7Z" />
    </svg>`,
  counter: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="8" width="26" height="16" rx="3" />
      <path d="M5 12h22M9 15h10v6H9z" />
      <circle cx="24" cy="18" r="2" />
    </svg>`,
  tv: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="10" width="24" height="11" rx="2" />
      <path d="M7 13h18v5H7zM11 24h10M16 21v3" />
      <circle cx="26" cy="19" r=".8" />
    </svg>`,
  statue: `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="8" r="4" />
      <path d="M10 20c0-5 2-8 6-8s6 3 6 8M8 20h16l-2 4H10l-2-4ZM11 24h10v4H11z" />
    </svg>`,
};

function objectMarkup(type, object, occupiable) {
  const drawing = OBJECT_SVGS[type] ?? object.icon;
  const copy = getObjectCopy(state.locale, type);
  return `<span class="object object-${type}${occupiable ? ' occupiable-object' : ''}" title="${escapeHtml(copy.label)}">${drawing}</span>`;
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
  applyTheme(document.documentElement.dataset.theme, false);
  if (state.puzzle) {
    localizePuzzle(state.puzzle, state.locale);
    render();
    renderSuccessText();
  }
  renderStatus();
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
      state.focusedCellKey = state.puzzle.cells.find((cell) => cell.occupiable)?.key ?? null;
      setInteractionMode('place', false);
      render();
      persistDraft();
      setStatus(restored ? 'status.draftRestored' : 'status.generated', {}, 'success');
      if (mobileLayout.matches) dom.caseSettings.open = false;
      if (focusCase) scrollIntoView(dom.caseHeader);
    } catch (error) {
      console.error(error);
      setStatus('errors.generationFailed', {}, 'error');
    } finally {
      dom.generate.disabled = false;
    }
  }, 20);
}

function render() {
  renderHeader();
  renderSuspects();
  renderBoard();
  setBoardViewMode(state.boardViewMode);
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
  dom.caseRule.textContent = translate(
    state.locale,
    `ui.boardRule${puzzle.caseType[0].toUpperCase()}${puzzle.caseType.slice(1)}`,
  );
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
      showBoardOnMobile();
    });
    dom.suspects.appendChild(card);
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
  if (!state.puzzle || state.boardViewMode === 'zoom') return false;
  const width = Math.max(1, dom.boardScroll.clientWidth - 14);
  const height = Math.max(1, dom.boardScroll.clientHeight - 14);
  const cellSize = Math.max(22, Math.min(
    82,
    Math.floor(width / state.puzzle.cols),
    Math.floor(height / state.puzzle.rows),
  ));
  const nextValue = `${cellSize}px`;
  const changed = dom.board.style.getPropertyValue('--cell-size') !== nextValue;
  dom.board.style.setProperty('--cell-size', nextValue);
  return changed;
}

function setBoardViewMode(mode) {
  state.boardViewMode = mode === 'zoom' ? 'zoom' : 'fit';
  const zoomed = state.boardViewMode === 'zoom';
  dom.board.dataset.view = state.boardViewMode;
  dom.boardScroll.dataset.view = state.boardViewMode;
  dom.boardViewMode.setAttribute('aria-pressed', String(zoomed));
  dom.boardViewMode.textContent = translate(
    state.locale,
    zoomed ? 'ui.fitBoard' : 'ui.zoomBoard',
  );
  if (zoomed) dom.board.style.removeProperty('--cell-size');
  else fitBoardToViewport();
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
    const manualCharacters = puzzle.characters.filter((character) => (
      state.manualExclusionsByCharacter[character.id]?.has(cell.key)
    ));
    const candidateCharacters = puzzle.characters.filter((character) => (
      state.candidateCellsByCharacter[character.id]?.has(cell.key)
    ));
    if (manualCharacters.length) element.classList.add('excluded');
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
        object: objectAria,
        occupant: occupantAria,
      }),
    );
    element.innerHTML = `
      ${showInlineObject ? objectMarkup(cell.object, object, cell.occupiable) : ''}
      ${occupant ? avatarMarkup(occupant, true) : ''}
      ${tentativeOccupant ? avatarMarkup(tentativeOccupant, true).replace('avatar ', 'avatar ghost-avatar ') : ''}
      ${pendingRemoval ? `<span class="removal-confirmation">${translate(state.locale, 'ui.removeConfirmation')}</span>` : ''}
      ${automaticallyExcluded && !occupant
        ? '<span class="x-mark auto-exclusion">×</span>'
        : ''}
      ${manualCharacters.length && !occupant
        ? `<span class="manual-notes">${manualCharacters.map((character) => `<i>×${escapeHtml(character.name[0])}</i>`).join('')}</span>`
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
  const boardBounds = dom.board.getBoundingClientRect();
  const firstCellBounds = dom.board.querySelector('.cell').getBoundingClientRect();
  const cellSize = firstCellBounds.width;
  const originLeft = firstCellBounds.left - boardBounds.left;
  const originTop = firstCellBounds.top - boardBounds.top;
  const positionRoomLayer = (layer, room) => {
    layer.style.left = `${originLeft + room.left * cellSize}px`;
    layer.style.top = `${originTop + room.top * cellSize}px`;
    layer.style.width = `${room.width * cellSize}px`;
    layer.style.height = `${room.height * cellSize}px`;
  };
  for (const room of puzzle.rooms) {
    const surface = document.createElement('span');
    surface.className = `room-surface room-pattern-${room.pattern ?? 'textile'}`;
    surface.style.setProperty('--room-color', room.color);
    surface.dataset.neighbors = room.neighborIds?.join(',') ?? '';
    positionRoomLayer(surface, room);
    dom.board.appendChild(surface);

    const label = document.createElement('span');
    label.className = 'room-label';
    const labelText = document.createElement('span');
    labelText.textContent = room.name;
    label.appendChild(labelText);
    positionRoomLayer(label, room);
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
    layer.style.left = `${originLeft + minCol * cellSize}px`;
    layer.style.top = `${originTop + minRow * cellSize}px`;
    layer.style.width = `${(maxCol - minCol + 1) * cellSize}px`;
    layer.style.height = `${(maxRow - minRow + 1) * cellSize}px`;
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

  if (result.solved) {
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
dom.markMode.addEventListener('click', () => setInteractionMode('mark'));
dom.candidateMode.addEventListener('click', () => setInteractionMode('candidate'));
dom.tentativeMode.addEventListener('click', () => setInteractionMode('tentative'));
dom.boardViewMode.addEventListener('click', () => {
  setBoardViewMode(state.boardViewMode === 'fit' ? 'zoom' : 'fit');
});
dom.generate.addEventListener('click', () => generate(createRandomSeed(), true));
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
dom.print.addEventListener('click', () => window.print());
dom.openRules.addEventListener('click', () => dom.rules.showModal());
dom.closeRules.addEventListener('click', () => dom.rules.close());
dom.successClose.addEventListener('click', () => dom.success.close());
dom.themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
mobileLayout.addEventListener('change', (event) => {
  dom.caseSettings.open = !event.matches;
  state.boardViewMode = event.matches ? state.boardViewMode : 'fit';
  setBoardViewMode(state.boardViewMode);
});
new ResizeObserver(() => {
  if (fitBoardToViewport()) window.requestAnimationFrame(() => renderBoard());
}).observe(dom.boardScroll);
document.addEventListener('keydown', (event) => {
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
dom.caseSettings.open = !mobileLayout.matches;
applyTheme(document.documentElement.dataset.theme, false);
applyLocale(state.locale, false);
let initialGeneration = null;
initialGeneration = parseChallengeUrl(window.location.href, GENERATOR_VERSION);
try {
  initialGeneration ??= JSON.parse(localStorage.getItem(CURRENT_DRAFT_STORAGE_KEY))?.generation ?? null;
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
