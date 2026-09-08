(function () {
  'use strict';

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

      const urgentStarred = mines.some(m => {
        if (!m.starred) return false;
        const remaining = m.nextReset - now;
        return remaining > 0 && remaining <= server.nagMs;
      });

      if (urgentStarred) {
        window.SoundFX.playNag();
      }
    }, 1000);
  }

  boot();
})();