window.TimerEngine = (function () {
  const { toMs, mod } = window.TimeUtils;

  let mines = [];
  let counter = 1;

  let server = {
    cycleMs: toMs({ hours: 12 }),
    nextReset: null,
    active: false,
    delayMs: 0,
    soonMs: 1800000,
    focusMs: 600000,
    nagMs: 600000
  };

  // Calculate how much time remains until the next mine reset.
  function computeRemaining(elapsedSinceEpoch, intervalMs, delayMs) {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return 0;
    const effective = elapsedSinceEpoch - delayMs;
    if (effective < 0) return -effective;
    return intervalMs - mod(effective, intervalMs);
  }

  // Initialize the timer engine from config.
  function init(config = {}) {
    server.cycleMs = toMs({ hours: config.serverResetHours || 12 });
    server.delayMs = (config.postResetDelaySeconds || 0) * 1000;
    server.soonMs = (config.soonReminderSeconds != null ? config.soonReminderSeconds : 1800) * 1000;
    server.focusMs = (config.focusReminderSeconds != null ? config.focusReminderSeconds : 600) * 1000;
    server.nagMs = (config.starNagThresholdSeconds != null ? config.starNagThresholdSeconds : 600) * 1000;

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

  // Reset a mine's timer starting from now.
  function resyncMineNow(id) {
    const mine = mines.find(m => m.id === id);
    if (!mine) return;

    if (!Number.isFinite(mine.intervalMs) || mine.intervalMs <= 0) {
      console.error(`Cannot resync mine "${mine.name}": invalid interval.`);
      return;
    }

    mine.nextReset = Date.now() + mine.intervalMs;
  }

  // Toggle the star/reminder state of a mine.
  function toggleStar(id) {
    const mine = mines.find(m => m.id === id);
    if (mine) mine.starred = !mine.starred;
  }

  // Synchronize all mines against the server countdown.
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

  // Calibrate the entire system from an actual mine countdown.
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

  // Advance timers.
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

    // Handle the server-wide reset.
    if (server.active && Number.isFinite(server.nextReset) && server.nextReset <= now) {
      const serverIntervalsPassed = Math.floor((now - server.nextReset) / server.cycleMs) + 1;
      
      // Calculate the exact time the reset theoretically happened to avoid drift
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

  // Calculate upcoming predicted resets for a mine.
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

    while (t < server.nextReset && guard < 200) {
      list.push(t);
      t += mine.intervalMs;
      guard++;
    }

    return list;
  }

  // Return the current timer state.
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