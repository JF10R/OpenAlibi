import {
  ACHIEVEMENT_IDS,
  addCompletion,
  createCompletionRecord,
  createLedger,
  createSessionMetrics,
  restoreLedger,
  restoreSessionMetrics,
  serializeLedger,
  serializeSessionMetrics,
} from './records.js';
import {
  createPremiumProfile,
  getPremiumDashboard,
  restorePremiumProfile,
  serializePremiumProfile,
  updatePremiumProfile,
} from './premium.js';
import { createPremiumService } from './premium-service.js';
import { premiumTranslate } from './premium-i18n.js';

const LEDGER_STORAGE_KEY = 'openalibi-completion-ledger';
const PROFILE_STORAGE_KEY = 'openalibi-premium-profile';
const TIMER_STORAGE_KEY = 'openalibi-private-timer';
const SESSION_STORAGE_PREFIX = 'openalibi-session:';
const DIFFICULTIES = Object.freeze(['facile', 'moyen', 'difficile', 'expert']);

function uniqueId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  const bytes = new Uint32Array(4);
  globalThis.crypto?.getRandomValues?.(bytes);
  return `${prefix}-${Date.now()}-${[...bytes].join('-')}`;
}

function loadLedger() {
  try {
    const serialized = localStorage.getItem(LEDGER_STORAGE_KEY);
    return serialized ? restoreLedger(serialized) : createLedger();
  } catch {
    return createLedger();
  }
}

function loadProfile(locale) {
  try {
    const serialized = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (serialized) return restorePremiumProfile(serialized);
  } catch {
    // Invalid or blocked storage falls through to a fresh local profile.
  }
  return createPremiumProfile(uniqueId('investigator'), {
    displayName: premiumTranslate(locale, 'defaultInvestigator'),
  });
}

function loadSession(caseId) {
  try {
    const serialized = localStorage.getItem(`${SESSION_STORAGE_PREFIX}${caseId}`);
    return serialized ? restoreSessionMetrics(serialized, caseId) : null;
  } catch {
    return null;
  }
}

function loadTimerPreference() {
  try {
    return localStorage.getItem(TIMER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function extractCollection(response, key) {
  const collection = response?.[key] ?? response;
  return Array.isArray(collection) ? collection : [];
}

function setText(root, selector, text) {
  const element = root.querySelector(selector);
  if (element) element.textContent = text;
}

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function qualityKey(record) {
  if (record.revealed) return 'recordRevealed';
  return record.hints === 0 && record.wrongChecks === 0 ? 'recordClean' : 'recordAssisted';
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function readServiceBaseUrl() {
  return document.querySelector('meta[name="openalibi-premium-api"]')?.content?.trim() || null;
}

function installStylesheet() {
  if (document.querySelector('link[data-openalibi-premium-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './src/premium.css';
  link.dataset.openalibiPremiumStyle = '';
  document.head.append(link);
}

function buildInterface(mounts) {
  const openButton = createElement('button', 'button ghost', 'Profile');
  openButton.type = 'button';
  openButton.id = 'open-premium-profile';
  mounts.menuActions.append(openButton);

  const timer = createElement('span', 'premium-case-timer');
  timer.id = 'premium-timer-display';
  mounts.caseStatus.append(timer);

  const success = createElement('div', 'premium-success-summary');
  mounts.successSummary.append(success);

  const dialog = document.createElement('dialog');
  dialog.id = 'premium-profile-dialog';
  dialog.className = 'modal premium-dialog';
  dialog.setAttribute('aria-labelledby', 'premium-profile-title');
  dialog.setAttribute('aria-describedby', 'premium-profile-intro');
  dialog.innerHTML = `
    <header class="modal-header premium-dialog-header">
      <div>
        <p class="eyebrow" data-premium-text="premium"></p>
        <h2 id="premium-profile-title" data-premium-text="profileTitle"></h2>
        <p id="premium-profile-intro" class="premium-intro" data-premium-text="profileIntro"></p>
      </div>
      <button class="button ghost compact" id="close-premium-profile" type="button" data-premium-text="close"></button>
    </header>
    <div class="premium-content">
      <section class="premium-card premium-profile-card" aria-labelledby="premium-local-profile-title">
        <h3 id="premium-local-profile-title" data-premium-text="localProfile"></h3>
        <form id="premium-profile-form" class="premium-profile-form">
          <div id="premium-profile-avatar" class="premium-avatar" aria-hidden="true"></div>
          <label class="premium-field">
            <span data-premium-text="displayName"></span>
            <input id="premium-profile-name" maxlength="30" autocomplete="nickname">
          </label>
          <label class="premium-field">
            <span data-premium-text="avatarColor"></span>
            <input id="premium-profile-hue" type="range" min="0" max="359" step="1" aria-describedby="premium-hue-value">
            <output id="premium-hue-value" for="premium-profile-hue"></output>
          </label>
          <button class="button secondary" type="submit" data-premium-text="saveProfile"></button>
          <p id="premium-profile-status" class="premium-inline-status" role="status" aria-live="polite"></p>
        </form>
        <label class="premium-timer-option">
          <input id="premium-timer-enabled" type="checkbox" aria-describedby="premium-timer-help">
          <span data-premium-text="timerOption"></span>
        </label>
        <p id="premium-timer-help" class="premium-help" data-premium-text="timerHelp"></p>
      </section>

      <section class="premium-card" aria-labelledby="premium-progress-title">
        <h3 id="premium-progress-title" data-premium-text="progress"></h3>
        <dl id="premium-progress-summary" class="premium-summary-grid"></dl>
        <h4 data-premium-text="difficultyStats"></h4>
        <div id="premium-difficulty-breakdown" class="premium-difficulty-list"></div>
      </section>

      <section class="premium-card" aria-labelledby="premium-achievements-title">
        <h3 id="premium-achievements-title" data-premium-text="achievements"></h3>
        <ul id="premium-achievements-list" class="premium-achievements"></ul>
      </section>

      <section class="premium-card" aria-labelledby="premium-recent-title">
        <h3 id="premium-recent-title" data-premium-text="recentCases"></h3>
        <ul id="premium-recent-completions" class="premium-completion-list"></ul>
      </section>

      <section class="premium-card premium-network-card" aria-labelledby="premium-network-title">
        <h3 id="premium-network-title" data-premium-text="socialCompetition"></h3>
        <p class="premium-help" data-premium-text="socialIntro"></p>
        <p id="premium-network-status" class="premium-network-status" role="status" aria-live="polite"></p>
        <div class="premium-network-grid">
          <div>
            <h4 data-premium-text="friends"></h4>
            <form id="premium-friend-form" class="premium-inline-form">
              <label class="premium-field">
                <span data-premium-text="friendCode"></span>
                <input id="premium-friend-code" autocomplete="off" minlength="6" maxlength="32" required>
              </label>
              <button class="button secondary" type="submit" data-premium-text="addFriend"></button>
            </form>
            <ul id="premium-friends-list" class="premium-service-list"></ul>
          </div>
          <div>
            <h4 data-premium-text="leaderboard"></h4>
            <label class="premium-field">
              <span data-premium-text="leaderboardDifficulty"></span>
              <select id="premium-leaderboard-difficulty"></select>
            </label>
            <ol id="premium-leaderboard-list" class="premium-service-list"></ol>
          </div>
        </div>
      </section>
    </div>`;
  mounts.dialogRoot.append(dialog);

  return {
    dialog,
    openButton,
    success,
    timer,
    closeButton: dialog.querySelector('#close-premium-profile'),
    profileForm: dialog.querySelector('#premium-profile-form'),
    profileName: dialog.querySelector('#premium-profile-name'),
    profileHue: dialog.querySelector('#premium-profile-hue'),
    profileAvatar: dialog.querySelector('#premium-profile-avatar'),
    profileStatus: dialog.querySelector('#premium-profile-status'),
    hueValue: dialog.querySelector('#premium-hue-value'),
    timerEnabled: dialog.querySelector('#premium-timer-enabled'),
    summary: dialog.querySelector('#premium-progress-summary'),
    difficultyBreakdown: dialog.querySelector('#premium-difficulty-breakdown'),
    achievements: dialog.querySelector('#premium-achievements-list'),
    recent: dialog.querySelector('#premium-recent-completions'),
    networkStatus: dialog.querySelector('#premium-network-status'),
    friendForm: dialog.querySelector('#premium-friend-form'),
    friendCode: dialog.querySelector('#premium-friend-code'),
    friends: dialog.querySelector('#premium-friends-list'),
    leaderboardDifficulty: dialog.querySelector('#premium-leaderboard-difficulty'),
    leaderboard: dialog.querySelector('#premium-leaderboard-list'),
  };
}

export const premiumFeature = Object.freeze({
  id: 'premium',
  setup({ services, subscribe }) {
    const mounts = services.mounts;
    if (!mounts?.menuActions || !mounts.caseStatus || !mounts.successSummary || !mounts.dialogRoot) {
      throw new Error('Premium requires the public feature mounts.');
    }

    installStylesheet();
    const initialSnapshot = services.getSnapshot();
    const state = {
      locale: initialSnapshot.locale,
      currentCase: initialSnapshot.case,
      ledger: loadLedger(),
      profile: loadProfile(initialSnapshot.locale),
      session: null,
      timerEnabled: loadTimerPreference(),
      timerStartedAt: null,
      timerInterval: null,
      lastRecord: null,
      lastUnlocked: [],
      friends: [],
      leaderboard: [],
    };
    const ui = buildInterface(mounts);
    const appMenu = mounts.menuActions.closest('details');
    const returnFocus = appMenu?.querySelector('summary') ?? ui.openButton;
    const configuredBaseUrl = readServiceBaseUrl();
    let premiumService = null;
    let networkRequestId = 0;
    try {
      premiumService = configuredBaseUrl ? createPremiumService({ baseUrl: configuredBaseUrl }) : null;
    } catch {
      premiumService = null;
    }

    const t = (key, parameters = {}) => premiumTranslate(state.locale, key, parameters);
    const sessionKey = () => `${SESSION_STORAGE_PREFIX}${state.currentCase?.id}`;
    const currentActiveTime = () => (
      (state.session?.activeTimeMs ?? 0)
      + (state.timerStartedAt == null ? 0 : Date.now() - state.timerStartedAt)
    );

    function persistLedger() {
      try { localStorage.setItem(LEDGER_STORAGE_KEY, serializeLedger(state.ledger)); } catch { /* local only */ }
    }

    function persistProfile() {
      try { localStorage.setItem(PROFILE_STORAGE_KEY, serializePremiumProfile(state.profile)); } catch { /* local only */ }
    }

    function persistSession() {
      if (!state.currentCase || !state.session) return;
      try {
        localStorage.setItem(sessionKey(), serializeSessionMetrics(state.currentCase.id, state.session));
      } catch { /* local only */ }
    }

    function pauseTimer() {
      if (state.timerStartedAt == null || !state.session) return;
      state.session.activeTimeMs += Date.now() - state.timerStartedAt;
      state.timerStartedAt = null;
      persistSession();
    }

    function canRunTimer() {
      return state.timerEnabled && state.session && !state.session.recorded && !document.hidden;
    }

    function renderTimer() {
      ui.timer.hidden = !state.timerEnabled || !state.currentCase;
      ui.timer.textContent = ui.timer.hidden
        ? ''
        : `${t('privateTimer')}: ${formatDuration(currentActiveTime())}`;
    }

    function syncTimer() {
      if (canRunTimer() && state.timerStartedAt == null) state.timerStartedAt = Date.now();
      if (!canRunTimer()) pauseTimer();
      if (canRunTimer() && !state.timerInterval) {
        state.timerInterval = window.setInterval(renderTimer, 1000);
      } else if (!canRunTimer() && state.timerInterval) {
        window.clearInterval(state.timerInterval);
        state.timerInterval = null;
      }
      renderTimer();
    }

    function persistTimerPreference() {
      try { localStorage.setItem(TIMER_STORAGE_KEY, String(state.timerEnabled)); } catch { /* local only */ }
    }

    function setSession(caseSummary, restored) {
      pauseTimer();
      state.currentCase = caseSummary;
      state.session = restored ? loadSession(caseSummary.id) : null;
      state.session ??= createSessionMetrics(uniqueId('session'));
      state.lastRecord = null;
      state.lastUnlocked = [];
      ui.success.replaceChildren();
      persistSession();
      syncTimer();
    }

    function difficultyLabel(difficulty) {
      const keys = {
        facile: 'difficultyEasy',
        moyen: 'difficultyMedium',
        difficile: 'difficultyHard',
        expert: 'difficultyExpert',
    };
      return t(keys[difficulty] ?? difficulty);
    }

    function renderProfileEditor() {
      if (document.activeElement !== ui.profileName) ui.profileName.value = state.profile.displayName;
      if (document.activeElement !== ui.profileHue) ui.profileHue.value = String(state.profile.avatarHue);
      ui.profileAvatar.style.setProperty('--premium-avatar-hue', String(ui.profileHue.value));
      ui.hueValue.textContent = t('avatarColorValue', { hue: ui.profileHue.value });
      ui.timerEnabled.checked = state.timerEnabled;
    }

    function addMetric(label, value) {
      const group = createElement('div', 'premium-metric');
      group.append(createElement('dt', '', label), createElement('dd', '', String(value)));
      ui.summary.append(group);
    }

    function renderDashboard() {
      const dashboard = getPremiumDashboard(state.ledger);
      ui.summary.replaceChildren();
      addMetric(t('completions'), dashboard.completions);
      addMetric(t('uniqueCases'), dashboard.uniqueCases);
      addMetric(t('cleanCompletions'), dashboard.cleanCompletions);
      addMetric(
        t('highestCleanDifficulty'),
        dashboard.highestCleanDifficulty ? difficultyLabel(dashboard.highestCleanDifficulty) : t('noneYet'),
      );

      ui.difficultyBreakdown.replaceChildren();
      for (const difficulty of DIFFICULTIES) {
        const values = dashboard.byDifficulty[difficulty];
        const row = createElement('div', 'premium-difficulty-row');
        row.append(
          createElement('strong', '', difficultyLabel(difficulty)),
          createElement('span', '', t('cleanShort', { count: values.clean })),
          createElement('span', '', t('assistedShort', { count: values.assisted })),
        );
        ui.difficultyBreakdown.append(row);
      }

      ui.achievements.replaceChildren();
      for (const id of ACHIEVEMENT_IDS) {
        const progress = dashboard.achievementProgress[id];
        const item = createElement('li', `premium-achievement ${progress.unlocked ? 'is-unlocked' : 'is-locked'}`);
        const copy = createElement('div');
        copy.append(
          createElement('strong', '', t(`achievement.${id}Title`)),
          createElement('p', '', t(`achievement.${id}Description`)),
        );
        item.append(
          createElement('span', 'premium-achievement-mark', progress.unlocked ? '✓' : `${progress.current}/${progress.target}`),
          copy,
          createElement('span', 'premium-achievement-state', t(progress.unlocked ? 'unlocked' : 'locked')),
        );
        ui.achievements.append(item);
      }

      ui.recent.replaceChildren();
      const recentRecords = [...state.ledger.records].reverse().slice(0, 8);
      if (!recentRecords.length) {
        ui.recent.append(createElement('li', 'premium-empty', t('noCompletions')));
      }
      for (const record of recentRecords) {
        const item = createElement('li', 'premium-completion-entry');
        const heading = createElement('strong', '', `${difficultyLabel(record.difficulty)} · ${record.caseId}`);
        const details = [t(qualityKey(record)), new Date(record.completedAt).toLocaleDateString(state.locale)];
        if (record.activeTimeMs != null) details.push(t('recordTime', { time: formatDuration(record.activeTimeMs) }));
        item.append(heading, createElement('span', '', details.join(' · ')));
        ui.recent.append(item);
      }
    }

    function renderSuccess() {
      ui.success.replaceChildren();
      if (!state.lastRecord) return;
      ui.success.append(createElement('p', '', t('completionRecord', {
        quality: t(qualityKey(state.lastRecord)).toLocaleLowerCase(state.locale),
      })));
      if (state.lastRecord.activeTimeMs != null) {
        ui.success.append(createElement('p', '', t('recordTime', {
          time: formatDuration(state.lastRecord.activeTimeMs),
        })));
      }
      if (state.lastUnlocked.length) {
        ui.success.append(createElement('p', 'premium-unlock-summary', t('newMilestones', {
          achievements: state.lastUnlocked.map((id) => t(`achievement.${id}Title`)).join(', '),
        })));
      }
    }

    function renderNetwork() {
      const unavailable = !premiumService;
      ui.friendCode.disabled = unavailable;
      ui.friendForm.querySelector('button').disabled = unavailable;
      ui.leaderboardDifficulty.disabled = unavailable;
      if (unavailable) ui.networkStatus.textContent = t('premiumServiceUnavailable');

      ui.friends.replaceChildren();
      if (!state.friends.length) ui.friends.append(createElement('li', 'premium-empty', t('noFriends')));
      for (const friend of state.friends) {
        ui.friends.append(createElement('li', 'premium-service-entry', String(
          friend?.displayName ?? friend?.name ?? friend?.id ?? '—',
        )));
      }

      ui.leaderboard.replaceChildren();
      if (!state.leaderboard.length) {
        ui.leaderboard.append(createElement('li', 'premium-empty', t('noLeaderboardEntries')));
      }
      state.leaderboard.forEach((entry, index) => {
        ui.leaderboard.append(createElement('li', 'premium-service-entry', t('leaderboardEntry', {
          rank: entry?.rank ?? index + 1,
          name: entry?.displayName ?? entry?.name ?? '—',
          completions: entry?.completions ?? entry?.score ?? 0,
        })));
      });
    }

    function renderTranslations() {
      for (const element of ui.dialog.querySelectorAll('[data-premium-text]')) {
        element.textContent = t(element.dataset.premiumText);
      }
      ui.openButton.textContent = t('profile');
      const selectedDifficulty = ui.leaderboardDifficulty.value || 'expert';
      ui.leaderboardDifficulty.replaceChildren(...DIFFICULTIES.map((difficulty) => {
        const option = createElement('option', '', difficultyLabel(difficulty));
        option.value = difficulty;
        return option;
      }));
      ui.leaderboardDifficulty.value = selectedDifficulty;
    }

    function renderAll() {
      renderTranslations();
      renderProfileEditor();
      renderDashboard();
      renderSuccess();
      renderNetwork();
      renderTimer();
    }

    async function refreshNetwork() {
      if (!premiumService) return;
      const requestId = ++networkRequestId;
      const difficulty = ui.leaderboardDifficulty.value || 'expert';
      ui.networkStatus.textContent = t('premiumServiceLoading');
      try {
        const [friendsResponse, leaderboardResponse] = await Promise.all([
          premiumService.listFriends(),
          premiumService.getLeaderboard({ difficulty }),
        ]);
        if (requestId !== networkRequestId) return;
        state.friends = extractCollection(friendsResponse, 'friends');
        state.leaderboard = extractCollection(leaderboardResponse, 'entries');
        ui.networkStatus.textContent = '';
      } catch {
        if (requestId !== networkRequestId) return;
        state.friends = [];
        state.leaderboard = [];
        ui.networkStatus.textContent = t('premiumServiceFailed');
      }
      renderNetwork();
    }

    function updateHuePreview() {
      ui.profileAvatar.style.setProperty('--premium-avatar-hue', ui.profileHue.value);
      ui.hueValue.textContent = t('avatarColorValue', { hue: ui.profileHue.value });
    }

    ui.openButton.addEventListener('click', () => {
      if (appMenu) appMenu.open = false;
      ui.profileStatus.textContent = '';
      renderAll();
      ui.dialog.showModal();
      refreshNetwork();
    });
    ui.closeButton.addEventListener('click', () => ui.dialog.close());
    ui.dialog.addEventListener('close', () => returnFocus.focus({ preventScroll: true }));
    ui.profileHue.addEventListener('input', updateHuePreview);
    ui.profileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      state.profile = updatePremiumProfile(state.profile, {
        displayName: ui.profileName.value,
        avatarHue: ui.profileHue.value,
      });
      persistProfile();
      renderProfileEditor();
      ui.profileStatus.textContent = t('profileSaved');
    });
    ui.timerEnabled.addEventListener('change', () => {
      pauseTimer();
      state.timerEnabled = ui.timerEnabled.checked;
      if (!state.timerEnabled && state.session) {
        state.session.activeTimeMs = 0;
        persistSession();
      }
      persistTimerPreference();
      syncTimer();
    });
    ui.friendForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!premiumService) return;
      ui.networkStatus.textContent = t('premiumServiceLoading');
      try {
        await premiumService.sendFriendRequest(ui.friendCode.value);
        ui.friendCode.value = '';
        await refreshNetwork();
        ui.networkStatus.textContent = t('friendRequestSent');
      } catch {
        ui.networkStatus.textContent = t('premiumServiceFailed');
      }
    });
    ui.leaderboardDifficulty.addEventListener('change', refreshNetwork);
    document.addEventListener('visibilitychange', syncTimer);
    window.addEventListener('pagehide', pauseTimer);

    subscribe('case-generated', (event) => setSession(event.detail.case, event.detail.restored));
    subscribe('case-checked', (event) => {
      if (!event.detail.solved && state.session && !state.session.recorded) {
        state.session.wrongChecks += 1;
        persistSession();
      }
    });
    subscribe('hint-used', () => {
      if (state.session && !state.session.recorded) {
        state.session.hints += 1;
        persistSession();
      }
    });
    subscribe('solution-revealed', () => {
      if (state.session && !state.session.recorded) {
        state.session.revealed = true;
        persistSession();
      }
    });
    subscribe('case-solved', (event) => {
      if (!state.session || state.session.recorded) return;
      pauseTimer();
      const caseSummary = event.detail.case ?? state.currentCase;
      const record = createCompletionRecord({
        id: caseSummary.id,
        version: caseSummary.version,
        difficulty: caseSummary.difficulty,
        caseType: caseSummary.archetype ?? caseSummary.caseType,
      }, state.session, {
        activeTimeMs: state.timerEnabled ? state.session.activeTimeMs : null,
      });
      const update = addCompletion(state.ledger, record);
      state.ledger = update.ledger;
      state.lastRecord = record;
      state.lastUnlocked = update.unlockedAchievementIds;
      state.session.recorded = true;
      persistLedger();
      persistSession();
      renderDashboard();
      renderSuccess();
      syncTimer();
    });
    subscribe('case-cleared', () => {
      state.lastRecord = null;
      state.lastUnlocked = [];
      ui.success.replaceChildren();
      persistSession();
      syncTimer();
    });
    subscribe('locale-changed', (event) => {
      state.locale = event.detail.locale;
      renderAll();
    });

    persistProfile();
    if (state.currentCase) setSession(state.currentCase, true);
    renderAll();
  },
});
