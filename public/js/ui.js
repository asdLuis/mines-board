window.UI = (function () {
  'use strict';

  const { fmtDuration, fmtClock, toMs } = window.TimeUtils;
  const Engine = window.TimerEngine;
  const Manual = window.ManualTimers;
  const Prefs = window.Prefs;
  const XpCalc = window.XpCalc;

  let els = {};
  let xpDriving = null;

  const RECENT_MS = 5 * 60000;
  const QUICK_MAX_MS = 12 * 3600000;

  /**
   * @brief Caches all referenced DOM elements into the els map.
   */
  function cacheEls() {
    els = {
      serverPanel: document.getElementById('serverPanel'),
      serverReadout: document.getElementById('serverReadout'),
      serverSub: document.getElementById('serverSub'),
      sH: document.getElementById('sH'),
      sM: document.getElementById('sM'),
      sS: document.getElementById('sS'),
      syncBtn: document.getElementById('syncBtn'),

      calMine: document.getElementById('calMine'),
      calH: document.getElementById('calH'),
      calM: document.getElementById('calM'),
      calS: document.getElementById('calS'),
      calBtn: document.getElementById('calBtn'),
      calNote: document.getElementById('calNote'),

      mineGrid: document.getElementById('mineGrid'),
      specialGrid: document.getElementById('specialGrid'),

      calModal: document.getElementById('calModal'),
      calBackdrop: document.getElementById('calBackdrop'),
      calOpenBtn: document.getElementById('calOpenBtn'),
      calCloseBtn: document.getElementById('calCloseBtn'),

      xpOpenBtn: document.getElementById('xpOpenBtn'),
      xpCloseBtn: document.getElementById('xpCloseBtn'),
      xpBackdrop: document.getElementById('xpBackdrop'),
      xpPanel: document.getElementById('xpPanel'),
      xpLevelInput: document.getElementById('xpLevelInput'),
      xpPointsInput: document.getElementById('xpPointsInput'),
      xpResult: document.getElementById('xpResult'),

      presetGrid: document.getElementById('presetGrid'),
      manualGrid: document.getElementById('manualGrid'),

      pinDecBtn: document.getElementById('pinDecBtn'),
      pinIncBtn: document.getElementById('pinIncBtn'),
      pinValue: document.getElementById('pinValue'),

      quickAddBtn: document.getElementById('quickAddBtn'),
      quickTimerForm: document.getElementById('quickTimerForm'),
      qName: document.getElementById('qName'),
      qH: document.getElementById('qH'),
      qM: document.getElementById('qM'),
      qS: document.getElementById('qS'),
      qStartBtn: document.getElementById('qStartBtn'),

      sidebar: document.getElementById('sidebar'),
      sidebarBackdrop: document.getElementById('sidebarBackdrop'),
      sidebarOpenBtn: document.getElementById('sidebarOpenBtn'),
      sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
      chkStandard: document.getElementById('chkStandard'),
      chkSpecial: document.getElementById('chkSpecial'),
      chkTimers: document.getElementById('chkTimers')
    };
  }

  /**
   * @brief Escapes a string for safe insertion into innerHTML.
   * @param str The raw string.
   * @return The HTML-escaped string.
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * @brief Renders the sidebar visibility switches for mines and presets.
   */
  function renderSidebar() {
    const { mines } = Engine.getState();
    const { presets } = Manual.getState();

    const standard = mines.filter(m => !m.special);
    const special = mines.filter(m => m.special);

    /**
     * @brief Builds one sidebar check row for a mine or timer preset.
     * @param item The mine or preset object.
     * @param kind Either 'mine' or 'timer'.
     * @return The row HTML.
     */
    const chkHtml = (item, kind) => {
      const checked = kind === 'mine'
        ? Prefs.isMineVisible(item.id, item.visibleDefault)
        : Prefs.isTimerVisible(item.id, item.visibleDefault);

      return `
        <label class="chk-row switch-row">
          <span class="switch-label">
            ${escapeHtml(item.name)}
          </span>

          <span class="switch">
            <input
              type="checkbox"
              data-kind="${kind}"
              data-id="${item.id}"
              ${checked ? 'checked' : ''}
            >
            <span class="slider"></span>
          </span>
        </label>
      `;
    };

    els.chkStandard.innerHTML = standard.map(m => chkHtml(m, 'mine')).join('');
    els.chkSpecial.innerHTML = special.map(m => chkHtml(m, 'mine')).join('');
    els.chkTimers.innerHTML = presets.map(p => chkHtml(p, 'timer')).join('');

    els.pinValue.textContent =
      `${Prefs.getResetPinMinutes()} min`;
  }

  /**
   * @brief Applies the sidebar open state to the drawer and backdrop.
   */
  function applySidebarOpenState() {
    const open = Prefs.getSidebarOpen();
    els.sidebar.classList.toggle('open', open);
    els.sidebarBackdrop.classList.toggle('visible', open);
    document.body.classList.toggle('no-scroll', open);
  }

  /**
   * @brief Binds the sidebar drawer, backdrop and visibility-switch events.
   */
  function bindSidebarEvents() {
    els.sidebarCloseBtn.addEventListener('click', () => {
      Prefs.setSidebarOpen(false);
      applySidebarOpenState();
    });

    els.sidebarOpenBtn.addEventListener('click', () => {
      Prefs.setSidebarOpen(true);
      applySidebarOpenState();
    });

    els.sidebarBackdrop.addEventListener('click', () => {
      Prefs.setSidebarOpen(false);
      applySidebarOpenState();
    });

    els.pinDecBtn.addEventListener('click', () => {
      Prefs.setResetPinMinutes(Prefs.getResetPinMinutes() - 1);
      renderSidebar();
      render();
    });

    els.pinIncBtn.addEventListener('click', () => {
      Prefs.setResetPinMinutes(Prefs.getResetPinMinutes() + 1);
      renderSidebar();
      render();
    });

    document.getElementById('sidebar').addEventListener('change', (e) => {
      const input = e.target.closest('input[data-kind]');
      if (!input) return;

      if (input.dataset.kind === 'mine') {
        Prefs.setMineVisible(input.dataset.id, input.checked);
      }

      if (input.dataset.kind === 'timer') {
        Prefs.setTimerVisible(input.dataset.id, input.checked);
      }

      renderCalibrationOptions();
      render();
    });
  }

  /**
   * @brief Rebuilds the calibration dropdown from the visible mines.
   */
  function renderCalibrationOptions() {
    const { mines } = Engine.getState();

    const visible = mines.filter(m =>
      Prefs.isMineVisible(m.id, m.visibleDefault)
    );

    const list = visible.length ? visible : mines;

    els.calMine.innerHTML = list
      .map(m =>
        `<option value="${m.id}">${escapeHtml(m.name)}</option>`
      )
      .join('');
  }

  /**
   * @brief Binds the star toggle for a mine grid.
   * @param gridEl The grid element to listen on.
   */
  function bindMineGridEvents(gridEl) {
    gridEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');

      if (!btn) {
        return;
      }

      const id = btn.dataset.id;

      if (btn.dataset.action === 'star') {
        Engine.toggleStar(id);
      }

      render();
    });
  }

  /**
   * @brief Opens or closes the calibration modal.
   * @param open Whether the modal should be open.
   */
  function setCalModal(open) {
    els.calModal.classList.toggle('open', open);
    els.calBackdrop.classList.toggle('visible', open);

    if (open) {
      renderCalibrationOptions();
    }
  }

  /**
   * @brief Opens or closes the XP calculator drawer.
   * @param open Whether the drawer should be open.
   */
  function setXpOpen(open) {
    els.xpPanel.classList.toggle('open', open);
    els.xpBackdrop.classList.toggle('visible', open);
    document.body.classList.toggle(
      'no-scroll',
      open && !Prefs.getSidebarOpen()
    );

    if (open) {
      els.xpLevelInput.focus();
    }
  }

  /**
   * @brief Formats a number with thousands separators.
   * @param n The number to format.
   * @return The formatted string.
   */
  function fmtXp(n) {
    return Number(n).toLocaleString('en-US');
  }

  /**
   * @brief Recomputes and renders the XP calculator result panel.
   */
  function renderXpResult() {
    const levelVal = els.xpLevelInput.value.trim();
    const pointsVal = els.xpPointsInput.value.trim();

    if (xpDriving === 'level') {
      if (levelVal === '') {
        els.xpResult.innerHTML =
          '<p class="xp-empty">Enter a target level — the XP total shows here.</p>';
        return;
      }

      const level = Math.max(0, Math.floor(parseFloat(levelVal) || 0));
      const total = XpCalc.totalXpForLevel(level);
      const nextCost = XpCalc.costToNext(level);

      els.xpResult.innerHTML = `
        <div class="xp-rows">
          <div class="xp-row"><span>Total XP to reach</span><b class="gold">${fmtXp(total)}</b></div>
          <div class="xp-row"><span>Level ${level} &rarr; ${level + 1}</span><b>${fmtXp(nextCost)} XP</b></div>
        </div>`;

      return;
    }

    if (pointsVal === '') {
      els.xpResult.innerHTML =
        '<p class="xp-empty">Enter an XP amount — the level shows here.</p>';
      return;
    }

    const points = Math.max(0, Math.floor(parseFloat(pointsVal) || 0));
    const level = XpCalc.levelForXp(points);
    const nextTotal = XpCalc.totalXpForLevel(level + 1);

    els.xpResult.innerHTML = `
      <div class="xp-rows">
        <div class="xp-row"><span>${fmtXp(points)} XP reaches</span><b class="gold">Level ${level}</b></div>
        <div class="xp-row"><span>Level ${level + 1} needs</span><b>${fmtXp(nextTotal)} XP</b></div>
      </div>`;
  }

  /**
   * @brief Binds the XP calculator open, close and input events.
   */
  function bindXpEvents() {
    els.xpOpenBtn.addEventListener('click', () => setXpOpen(true));
    els.xpCloseBtn.addEventListener('click', () => setXpOpen(false));
    els.xpBackdrop.addEventListener('click', () => setXpOpen(false));

    els.xpLevelInput.addEventListener('input', () => {
      xpDriving = 'level';
      const raw = els.xpLevelInput.value.trim();

      if (raw === '') {
        renderXpResult();
        return;
      }

      const level = Math.max(0, Math.floor(parseFloat(raw) || 0));
      els.xpPointsInput.value = XpCalc.totalXpForLevel(level);
      renderXpResult();
    });

    els.xpPointsInput.addEventListener('input', () => {
      xpDriving = 'points';
      const raw = els.xpPointsInput.value.trim();

      if (raw === '') {
        renderXpResult();
        return;
      }

      const points = Math.max(0, Math.floor(parseFloat(raw) || 0));
      els.xpLevelInput.value = XpCalc.levelForXp(points);
      renderXpResult();
    });
  }

  /**
   * @brief Clears the quick-add form and collapses it.
   */
  function resetQuickForm() {
    els.qName.value = '';
    els.qH.value = '';
    els.qM.value = '';
    els.qS.value = '';
    els.quickTimerForm.classList.add('hidden');
  }

  /**
   * @brief Binds the quick-add session manual timer controls.
   */
  function bindQuickTimerEvents() {
    els.quickAddBtn.addEventListener('click', () => {
      els.quickTimerForm.classList.toggle('hidden');

      if (!els.quickTimerForm.classList.contains('hidden')) {
        els.qName.focus();
      }
    });

    els.qStartBtn.addEventListener('click', () => {
      const ms = toMs({
        hours: parseInt(els.qH.value) || 0,
        minutes: parseInt(els.qM.value) || 0,
        seconds: parseInt(els.qS.value) || 0
      });

      if (ms <= 0 || ms > QUICK_MAX_MS) {
        return;
      }

      if (!Manual.startCustom(els.qName.value, ms)) {
        return;
      }

      resetQuickForm();
      render();
    });
  }

  /**
   * @brief Binds all page-wide event listeners.
   * @param cycleHours The server reset cycle in hours.
   */
  function bindEvents(cycleHours) {
    document.addEventListener(
      'pointerdown',
      window.SoundFX.unlock,
      { once: true }
    );

    els.syncBtn.addEventListener('click', () => {
      const ms = toMs({
        hours: parseInt(els.sH.value) || 0,
        minutes: parseInt(els.sM.value) || 0,
        seconds: parseInt(els.sS.value) || 0
      });

      if (ms <= 0 || ms > toMs({ hours: cycleHours })) {
        return;
      }

      Engine.syncFromServerCountdown(ms);
      els.sH.value = '';
      els.sM.value = '';
      els.sS.value = '';
      render();
    });

    els.calBtn.addEventListener('click', () => {
      const ms = toMs({
        hours: parseInt(els.calH.value) || 0,
        minutes: parseInt(els.calM.value) || 0,
        seconds: parseInt(els.calS.value) || 0
      });

      const drift = Engine.calibrateFromMine(
        els.calMine.value,
        ms
      );

      if (drift == null) {
        return;
      }

      const sign = drift >= 0 ? '+' : '-';

      els.calNote.textContent =
        `Applied: shifted everything ${sign}${fmtDuration(Math.abs(drift))}`;

      render();
    });

    els.calOpenBtn.addEventListener('click', () => setCalModal(true));
    els.calCloseBtn.addEventListener('click', () => setCalModal(false));
    els.calBackdrop.addEventListener('click', () => setCalModal(false));
    bindXpEvents();

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;

      if (els.xpPanel.classList.contains('open')) {
        setXpOpen(false);
      } else if (els.calModal.classList.contains('open')) {
        setCalModal(false);
      } else if (Prefs.getSidebarOpen()) {
        Prefs.setSidebarOpen(false);
        applySidebarOpenState();
      }
    });

    bindMineGridEvents(els.mineGrid);
    bindMineGridEvents(els.specialGrid);

    els.presetGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-preset]');

      if (!btn) {
        return;
      }

      Manual.start(btn.dataset.preset);
      render();
    });

    els.manualGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dismiss]');

      if (!btn) {
        return;
      }

      Manual.dismiss(btn.dataset.dismiss);
      render();
    });

    bindSidebarEvents();
    bindQuickTimerEvents();
  }

  /**
   * @brief Renders the server sync readout and sub-line.
   */
  function renderServerPanel() {
    const { server } = Engine.getState();

    if (server.active) {
      els.serverReadout.classList.remove('idle');

      els.serverReadout.textContent =
        fmtDuration(
          server.nextReset - Date.now()
        );

      els.serverSub.textContent =
        `${fmtClock(server.nextReset)} · every ${server.cycleMs / 3600000}h`;
    } else {
      els.serverReadout.classList.add('idle');

      els.serverReadout.textContent =
        'Not synced';

      els.serverSub.textContent =
        'Enter time left to sync all mines.';
    }
  }

  /**
   * @brief Builds the HTML rows for a list of mines.
   * @param mines The mines to render.
   * @param server The server state with focus and soon thresholds.
   * @param now The current timestamp.
   * @param flashed The set of mine ids that just rolled.
   * @param pinMs Keeps recently reset mines on top within this window.
   * @return The joined row HTML.
   */
  function mineRows(mines, server, now, flashed, pinMs) {
    const sorted = [...mines].sort((a, b) => {
      const pinA =
        a.lastResetAt != null &&
        (now - a.lastResetAt) <= pinMs;

      const pinB =
        b.lastResetAt != null &&
        (now - b.lastResetAt) <= pinMs;

      if (pinA !== pinB) {
        return pinA ? -1 : 1;
      }

      if (a.starred !== b.starred) {
        return a.starred ? -1 : 1;
      }

      return (
        (a.nextReset - now) -
        (b.nextReset - now)
      );
    });

    return sorted.map(mine => {

      const remaining =
        mine.nextReset - now;

      const age =
        mine.lastResetAt != null
          ? now - mine.lastResetAt
          : Number.MAX_SAFE_INTEGER;

      const recent =
        age <= RECENT_MS;

      const focus =
        remaining > 0 &&
        remaining <= server.focusMs;

      const soon =
        !focus &&
        remaining > 0 &&
        remaining <= server.soonMs;

      const predictions =
        Engine.predictedResets(mine);

      const predictHtml =
        (predictions && predictions.length)
          ? `<div class="predict-count">${predictions.length} left before global reset</div>`
          : `<div class="predict-count muted">—</div>`;

      const recentSub =
        recent
          ? `<span class="recent-sub">reset ${Math.max(1, Math.floor(age / 60000))}m ago</span>`
          : '';

      return `
        <div class="mine-row ${
          flashed.has(mine.id)
            ? 'flash'
            : ''
        } ${
          focus
            ? 'focus'
            : soon
              ? 'soon'
              : ''
        } ${
          mine.starred
            ? 'starred'
            : ''
        } ${
          recent
            ? 'recent'
            : ''
        }">

          <button
            class="star-btn ${mine.starred ? 'on' : ''}"
            data-action="star"
            data-id="${mine.id}"
            title="${
              mine.starred
                ? 'Clear reminder'
                : 'Mark a reminder'
            }"
          >★</button>

          <div class="name">
            <span class="name-line">
              ${escapeHtml(mine.name)}
            </span>
            ${recentSub}
          </div>

          <div class="interval">
            ${fmtDuration(mine.intervalMs)}
          </div>

          <div class="count">
            ${fmtDuration(remaining)}
          </div>

          ${predictHtml}

        </div>
      `;
    }).join('');
  }

  /**
   * @brief Renders the visible standard and special mine grids.
   * @param flashed The set of mine ids that just rolled.
   */
  function renderMines(flashed) {
    const { mines, server } = Engine.getState();
    const now = Date.now();
    const pinMs = Prefs.getResetPinMinutes() * 60000;

    const visible = mines.filter(m =>
      Prefs.isMineVisible(
        m.id,
        m.visibleDefault
      )
    );

    const standard = visible.filter(m => !m.special);
    const special = visible.filter(m => m.special);

    if (standard.length === 0) {
      els.mineGrid.innerHTML =
        '<div class="empty">Nothing visible — pick some mines in the sidebar.</div>';
    } else {
      els.mineGrid.innerHTML = mineRows(standard, server, now, flashed, pinMs);
    }

    if (special.length === 0) {
      els.specialGrid.innerHTML =
        '<div class="empty">No special mines tracked.</div>';
    } else {
      els.specialGrid.innerHTML = mineRows(special, server, now, flashed, pinMs);
    }
  }

  /**
   * @brief Renders the manual timer preset buttons and running rows.
   */
  function renderManualTimers() {
    const { presets, running } =
      Manual.getState();

    const { server } = Engine.getState();

    const visiblePresets =
      presets.filter(p =>
        Prefs.isTimerVisible(
          p.id,
          p.visibleDefault
        )
      );

    els.presetGrid.innerHTML =
      visiblePresets
        .map(p => `
          <button
            class="preset-btn"
            data-preset="${p.id}"
          >
            ${escapeHtml(p.name)}
            <span class="dur">
              ${fmtDuration(p.durationMs)}
            </span>
          </button>
        `)
        .join('') ||
      '<div class="empty">Nothing visible — pick some in the sidebar.</div>';

    const visibleIds =
      new Set(
        visiblePresets.map(p => p.id)
      );

    const visibleRunning =
      running.filter(r =>
        r.presetId == null ||
        visibleIds.has(r.presetId)
      );

    if (visibleRunning.length === 0) {
      els.manualGrid.innerHTML =
        '<div class="empty">Nothing running right now.</div>';
      return;
    }

    els.manualGrid.innerHTML =
      visibleRunning
        .map(r => {

          const remaining =
            r.endsAt - Date.now();

          const stateClass =
            !r.finished && remaining > 0
              ? (remaining <= server.focusMs
                  ? 'focus'
                  : remaining <= server.soonMs
                    ? 'soon'
                    : '')
              : '';

          return `
            <div class="manual-row ${
              r.finished ? 'done' : ''
            }${stateClass ? ' ' + stateClass : ''}">

              <span>
                ${escapeHtml(r.name)}
              </span>

              <span class="count">
                ${
                  r.finished
                    ? 'Done'
                    : fmtDuration(remaining)
                }
              </span>

              <button
                class="link"
                data-dismiss="${r.uid}"
              >
                ${
                  r.finished
                    ? 'dismiss'
                    : 'cancel'
                }
              </button>

            </div>
          `;
        })
        .join('');
  }

  /**
   * @brief Renders the whole board from the current state.
   * @param tickInfo Optional result of the latest engine tick.
   */
  function render(tickInfo) {
    renderServerPanel();

    renderMines(
      tickInfo
        ? tickInfo.flashed
        : new Set()
    );

    renderManualTimers();

    if (
      tickInfo &&
      tickInfo.serverFlashed
    ) {
      els.serverPanel.classList.add('flash');

      setTimeout(() => {
        els.serverPanel.classList.remove('flash');
      }, 900);
    }

    if (
      tickInfo &&
      tickInfo.manualFinished &&
      tickInfo.manualFinished.length > 0
    ) {
      window.SoundFX.playDone();
    }
  }

  /**
   * @brief Initializes the UI: caches elements, binds events, first render.
   * @param cycleHours The server reset cycle in hours.
   */
  function init(cycleHours) {
    cacheEls();
    applySidebarOpenState();
    renderSidebar();
    renderCalibrationOptions();
    bindEvents(cycleHours);
    render();
  }

  return {
    init,
    render
  };
})();