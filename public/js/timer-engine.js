window.TimerEngine = (function () {
  'use strict';

  const { toMs, mod } = window.TimeUtils;

  const DEFAULT_CYCLE_HOURS = 12;
  const DEFAULT_SOON_SECONDS = 1800;
  const DEFAULT_FOCUS_SECONDS = 600;
  const DEFAULT_NAG_SECONDS = 600;
  const DEFAULT_SOON_MS = DEFAULT_SOON_SECONDS * 1000;
  const DEFAULT_FOCUS_MS = DEFAULT_FOCUS_SECONDS * 1000;
  const DEFAULT_NAG_MS = DEFAULT_NAG_SECONDS * 1000;
  const MAX_PREDICTIONS = 200;

  let mines = [];
  let counter = 1;

  let server = {
    cycleMs: toMs({ hours: DEFAULT_CYCLE_HOURS }),
    nextReset: null,
    active: false,
    delayMs: 0,
    soonMs: DEFAULT_SOON_MS,
    focusMs: DEFAULT_FOCUS_MS,
    nagMs: DEFAULT_NAG_MS
  };

  /**
   * @brief Computes the time remaining until the next reset.
   * @param elapsedSinceEpoch The elapsed milliseconds since the epoch.
   * @param intervalMs The mine interval in milliseconds.
   * @param delayMs The post-reset delay in milliseconds.
   * @return The remaining milliseconds, clamped to zero or above.
   */
  function computeRemaining(elapsedSinceEpoch, intervalMs, delayMs) {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return 0;
    const effective = elapsedSinceEpoch - delayMs;
    if (effective < 0) return -effective;
    return intervalMs - mod(effective, intervalMs);
  }

  /**
   * @brief Initializes the timer engine from configuration.
   * @param config The configuration object with server and mine settings.
   */
  function init(config = {}) {
    server.cycleMs = toMs({ hours: config.serverResetHours || DEFAULT_CYCLE_HOURS });
    server.delayMs = (config.postResetDelaySeconds || 0) * 1000;
    server.soonMs = (config.soonReminderSeconds != null ? config.soonReminderSeconds : DEFAULT_SOON_SECONDS) * 1000;
    server.focusMs = (config.focusReminderSeconds != null ? config.focusReminderSeconds : DEFAULT_FOCUS_SECONDS) * 1000;
    server.nagMs = (config.starNagThresholdSeconds != null ? config.starNagThresholdSeconds : DEFAULT_NAG_SECONDS) * 1000;

    mines = (config.mines || []).map(m => {
      const intervalMs = toMs(m.interval || {});

      if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        console.error(`Invalid interval for mine "${m.name}".`, m.interval);
        return null;
      }

      return {
        id: m.id || `mine-${counter++}`,
        name: m.name || 'Unnamed Mine',
        intervalMs,
        special: !!m.special,
        visibleDefault: m.visible !== false,
        starred: false,
        nextReset: Date.now() + intervalMs
      };
    }).filter(Boolean);
  }

  /**
   * @brief Resets a mine's timer starting from now.
   * @param id The mine id.
   */
  function resyncMineNow(id) {
    const mine = mines.find(m => m.id === id);
    if (!mine) return;

    if (!Number.isFinite(mine.intervalMs) || mine.intervalMs <= 0) {
      console.error(`Cannot resync mine "${mine.name}": invalid interval.`);
      return;
    }

    mine.nextReset = Date.now() + mine.intervalMs;
  }

  /**
   * @brief Toggles the star reminder state of a mine.
   * @param id The mine id.
   */
  function toggleStar(id) {
    const mine = mines.find(m => m.id === id);
    if (mine) mine.starred = !mine.starred;
  }

  /**
   * @brief Synchronizes all mines against the server countdown.
   * @param remainingMs The time left until the server reset.
   */
  function syncFromServerCountdown(remainingMs) {
    if (!Number.isFinite(remainingMs) || remainingMs < 0) {
      console.error('Invalid server countdown:', remainingMs);
      return;
    }

    if (!Number.isFinite(server.cycleMs) || server.cycleMs <= 0) {
      console.error('Invalid server cycle:', server.cycleMs);
      return;
    }

    const now = Date.now();
    server.nextReset = now + remainingMs;
    server.active = true;

    const elapsedSinceLastServerReset = mod(server.cycleMs - remainingMs, server.cycleMs);

    mines.forEach(mine => {
      if (!Number.isFinite(mine.intervalMs) || mine.intervalMs <= 0) {
        console.error(`Skipping "${mine.name}" because its interval is invalid.`);
        return;
      }
      mine.nextReset = now + computeRemaining(elapsedSinceLastServerReset, mine.intervalMs, server.delayMs);
    });
  }

  /**
   * @brief Calibrates the whole system from an actual mine countdown.
   * @param mineId The id of the measured mine.
   * @param actualRemainingMs The measured time left on that mine.
   * @return The applied drift in milliseconds, or null when invalid.
   */
  function calibrateFromMine(mineId, actualRemainingMs) {
    const mine = mines.find(m => m.id === mineId);
    if (!mine) return null;

    if (!Number.isFinite(mine.intervalMs) || mine.intervalMs <= 0) {
      console.error(`Cannot calibrate "${mine.name}": invalid interval.`);
      return null;
    }

    if (!Number.isFinite(actualRemainingMs) || actualRemainingMs < 0) {
      console.error('Invalid calibration time:', actualRemainingMs);
      return null;
    }

    const actualNextReset = Date.now() + actualRemainingMs;
    const driftMs = actualNextReset - mine.nextReset;

    mines.forEach(m => {
      if (Number.isFinite(m.nextReset)) m.nextReset += driftMs;
    });

    if (server.active && Number.isFinite(server.nextReset)) {
      server.nextReset += driftMs;
    }

    return driftMs;
  }

  /**
   * @brief Advances the timer state to the current time.
   * @return An object with the flashed mine ids and the server flash flag.
   */
  function tick() {
    const now = Date.now();
    const flashed = new Set();

    mines.forEach(mine => {
      let rolled = false;

      if (!Number.isFinite(mine.intervalMs) || mine.intervalMs <= 0) {
        console.error(`Invalid interval detected for mine "${mine.name}".`);
        return;
      }

      if (!Number.isFinite(mine.nextReset)) {
        console.error(`Invalid nextReset detected for mine "${mine.name}".`);
        mine.nextReset = now + mine.intervalMs;
        return;
      }

      if (mine.nextReset <= now) {
        const intervalsPassed = Math.floor((now - mine.nextReset) / mine.intervalMs) + 1;
        mine.nextReset += intervalsPassed * mine.intervalMs;
        rolled = true;
      }

      if (rolled) {
        flashed.add(mine.id);
        mine.starred = false;
      }
    });

    let serverFlashed = false;

    if (server.active && Number.isFinite(server.nextReset) && server.nextReset <= now) {
      const serverIntervalsPassed = Math.floor((now - server.nextReset) / server.cycleMs) + 1;
      const exactLastReset = server.nextReset + ((serverIntervalsPassed - 1) * server.cycleMs);

      mines.forEach(mine => {
        if (!Number.isFinite(mine.intervalMs) || mine.intervalMs <= 0) return;

        mine.nextReset = exactLastReset + computeRemaining(0, mine.intervalMs, server.delayMs);
        mine.starred = false;
        flashed.add(mine.id);
      });

      server.nextReset += serverIntervalsPassed * server.cycleMs;
      serverFlashed = true;
    }

    return { flashed, serverFlashed };
  }

  /**
   * @brief Calculates the upcoming predicted resets for a mine.
   * @param mine The mine to predict for.
   * @return An array of prediction timestamps.
   */
  function predictedResets(mine) {
    if (!server.active || !mine || !Number.isFinite(mine.intervalMs) || mine.intervalMs <= 0) {
      return [];
    }

    if (!Number.isFinite(mine.nextReset) || !Number.isFinite(server.nextReset)) {
      return [];
    }

    const list = [];
    let t = mine.nextReset;
    let guard = 0;

    while (t < server.nextReset && guard < MAX_PREDICTIONS) {
      list.push(t);
      t += mine.intervalMs;
      guard++;
    }

    return list;
  }

  /**
   * @brief Returns the current timer state.
   * @return An object with the mines and server state.
   */
  function getState() {
    return { mines, server };
  }

  return {
    init,
    resyncMineNow,
    toggleStar,
    syncFromServerCountdown,
    calibrateFromMine,
    tick,
    predictedResets,
    getState
  };
})();