(function () {
  'use strict';

  /**
   * @brief Silences the nag when less than this much remains.
   */
  const NAG_CUTOFF_MS = 10000;

  /**
   * @brief Fetches and parses a JSON file from the Express API.
   * @param path The request path.
   * @return The parsed JSON payload.
   */
  async function loadJson(path) {
    const res = await fetch(path);

    if (!res.ok) {
      throw new Error(`Bad response for ${path}: ${res.status}`);
    }

    return res.json();
  }

  /**
   * @brief Boots the app: loads configuration, initializes the engines and
   *        starts the tick loop plus the starred-mine nag ping.
   */
  async function boot() {
    let mineConfig = {
      serverResetHours: 12,
      mines: []
    };

    let manualConfig = {
      timers: []
    };

    try {
      [mineConfig, manualConfig] = await Promise.all([
        loadJson('/api/mines'),
        loadJson('/api/manual-timers')
      ]);
    } catch (err) {
      console.error('Failed to load configuration:', err);

      document.getElementById('configNote').innerHTML =
        'Could not load the configuration from the server. ' +
        'Make sure the Node server is running.';
    }

    window.TimerEngine.init(mineConfig);
    window.ManualTimers.init(manualConfig);

    const anchor = window.Prefs.getServerAnchor();

    if (
      anchor &&
      anchor.cycleMs === window.TimerEngine.getState().server.cycleMs
    ) {
      window.TimerEngine.restoreServerFromAnchor(anchor.anchorMs);
    } else if (anchor) {
      window.Prefs.clearServerAnchor();
    }

    window.UI.init(
      mineConfig.serverResetHours || 12
    );

    setInterval(() => {
      const mineTick = window.TimerEngine.tick();
      const manualFinished = window.ManualTimers.tick();

      window.UI.render({
        ...mineTick,
        manualFinished
      });

      const { mines, server } = window.TimerEngine.getState();
      const now = Date.now();
      const nagMs = window.Prefs.getReminderMinutes() * 60000;

      const hasStarred = mines.some(m => m.starred);

      const urgentStarred = mines.some(m => {
        if (!m.starred) return false;
        const remaining = m.nextReset - now;
        return remaining > NAG_CUTOFF_MS &&
          remaining <= nagMs;
      });

      const serverAlert =
        hasStarred &&
        server.active &&
        Number.isFinite(server.nextReset) &&
        (server.nextReset - now) > NAG_CUTOFF_MS &&
        (server.nextReset - now) <= nagMs;

      if (urgentStarred || serverAlert) {
        window.SoundFX.playNag();
      }
    }, 1000);
  }

  boot();
})();