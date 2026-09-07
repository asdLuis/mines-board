window.UI = (function () {
  const { fmtDuration, fmtClock, toMs } = window.TimeUtils;
  const Engine = window.TimerEngine;
  const Manual = window.ManualTimers;
  const Prefs = window.Prefs;

  let els = {};

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
      mName: document.getElementById('mName'),
      mIntH: document.getElementById('mIntH'),
      mIntM: document.getElementById('mIntM'),
      mIntS: document.getElementById('mIntS'),
      mRemH: document.getElementById('mRemH'),
      mRemM: document.getElementById('mRemM'),
      mRemS: document.getElementById('mRemS'),
      mAddBtn: document.getElementById('mAddBtn'),

      presetGrid: document.getElementById('presetGrid'),
      manualGrid: document.getElementById('manualGrid'),

      sidebar: document.getElementById('sidebar'),
      sidebarOpenBtn: document.getElementById('sidebarOpenBtn'),
      sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
      chkStandard: document.getElementById('chkStandard'),
      chkSpecial: document.getElementById('chkSpecial'),
      chkTimers: document.getElementById('chkTimers'),

      layout: document.getElementById('layout'),
      nextUpName: document.getElementById('nextUpName'),
      nextUpCount: document.getElementById('nextUpCount'),
      nextUpSub: document.getElementById('nextUpSub')
    };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Sidebar ----------
  function renderSidebar() {
    const { mines } = Engine.getState();
    const { presets } = Manual.getState();

    const standard = mines.filter(m => !m.special);
    const special = mines.filter(m => m.special);

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
  }

  function applySidebarOpenState() {
    const open = Prefs.getSidebarOpen();
    els.sidebar.classList.toggle('hidden', !open);
    els.sidebarOpenBtn.classList.toggle('hidden', open);
    els.layout.classList.toggle('collapsed', !open);
  }

  function bindSidebarEvents() {
    els.sidebarCloseBtn.addEventListener('click', () => {
      Prefs.setSidebarOpen(false);
      applySidebarOpenState();
    });

    els.sidebarOpenBtn.addEventListener('click', () => {
      Prefs.setSidebarOpen(true);
      applySidebarOpenState();
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

  // ---------- Calibration dropdown ----------
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

    els.mAddBtn.addEventListener('click', () => {
      const name =
        els.mName.value.trim() || 'New mine';

      const intervalMs = toMs({
        hours: parseInt(els.mIntH.value) || 0,
        minutes: parseInt(els.mIntM.value) || 0,
        seconds: parseInt(els.mIntS.value) || 0
      });

      if (intervalMs <= 0) {
        return;
      }

      const remainingMs = toMs({
        hours: parseInt(els.mRemH.value) || 0,
        minutes: parseInt(els.mRemM.value) || 0,
        seconds: parseInt(els.mRemS.value) || 0
      });

      Engine.addMine(
        name,
        intervalMs,
        remainingMs
      );

      els.mName.value = '';

      renderSidebar();
      renderCalibrationOptions();
      render();
    });

    els.mineGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');

      if (!btn) {
        return;
      }

      const id = btn.dataset.id;

      if (btn.dataset.action === 'remove') {
        Engine.removeMine(id);
        renderSidebar();
        renderCalibrationOptions();
      }

      if (btn.dataset.action === 'star') {
        Engine.toggleStar(id);
      }

      render();
    });

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
  }

  // ---------- Hero: the single soonest thing coming up ----------
  function renderNextUp() {
    const { mines } = Engine.getState();
    const { running } = Manual.getState();
    const now = Date.now();

    const candidates = [];

    mines
      .filter(m =>
        Prefs.isMineVisible(
          m.id,
          m.visibleDefault
        )
      )
      .forEach(m =>
        candidates.push({
          name: m.name,
          endsAt: m.nextReset,
          kind: 'mine'
        })
      );

    running
      .filter(r =>
        !r.finished &&
        Prefs.isTimerVisible(
          r.presetId,
          true
        )
      )
      .forEach(r =>
        candidates.push({
          name: r.name,
          endsAt: r.endsAt,
          kind: 'timer'
        })
      );

    if (candidates.length === 0) {
      els.nextUpName.textContent =
        'Nothing tracked yet';

      els.nextUpCount.textContent =
        '—';

      els.nextUpSub.textContent =
        'Sync the server or start a manual timer to see it here.';

      return;
    }

    candidates.sort(
      (a, b) => a.endsAt - b.endsAt
    );

    const next = candidates[0];

    els.nextUpName.textContent =
      next.name;

    els.nextUpCount.textContent =
      fmtDuration(next.endsAt - now);

    els.nextUpSub.textContent =
      `resets ${fmtClock(next.endsAt)}${
        candidates.length > 1
          ? ` · ${candidates.length - 1} more tracked`
          : ''
      }`;
  }

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

  function renderMines(flashed) {
    const { mines, server } = Engine.getState();

    const visible = mines.filter(m =>
      Prefs.isMineVisible(
        m.id,
        m.visibleDefault
      )
    );

    if (visible.length === 0) {
      els.mineGrid.innerHTML =
        '<div class="empty">Nothing visible — pick some mines in the sidebar.</div>';

      return;
    }

    const now = Date.now();

    // Starred mines first (they need attention), then soonest-to-reset.
    const sorted = [...visible].sort((a, b) => {
      if (a.starred !== b.starred) {
        return a.starred ? -1 : 1;
      }

      return (
        (a.nextReset - now) -
        (b.nextReset - now)
      );
    });

    els.mineGrid.innerHTML =
      sorted.map(mine => {

        const remaining =
          mine.nextReset - now;

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
            ? `<div class="predict-count">${predictions.length} left</div>`
            : `<div class="predict-count muted">—</div>`;

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
              ${escapeHtml(mine.name)}
            </div>

            <div class="interval">
              ${fmtDuration(mine.intervalMs)}
            </div>

            <div class="count">
              ${fmtDuration(remaining)}
            </div>

            ${predictHtml}

            <div class="spacer"></div>

            <div class="row-actions">
              <button
                class="link"
                data-action="remove"
                data-id="${mine.id}"
              >×</button>
            </div>

          </div>
        `;
      })
      .join('');
  }

  function renderManualTimers() {
    const { presets, running } =
      Manual.getState();

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

          return `
            <div class="manual-row ${
              r.finished ? 'done' : ''
            }">

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

  function render(tickInfo) {
    renderNextUp();
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