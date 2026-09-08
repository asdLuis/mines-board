window.ManualTimers = (function () {
  'use strict';

  const { toMs } = window.TimeUtils;

  let presets = [];
  let running = [];
  let uidCounter = 1;
  const MAX_CUSTOM_MS = 12 * 3600000;

  /**
   * @brief Loads the timer presets from configuration.
   * @param config The configuration containing a timers array.
   */
  function init(config) {
    presets = (config.timers || []).map(t => ({
      id: t.id,
      name: t.name,
      durationMs: toMs(t.duration || {}),
      visibleDefault: t.visible !== false
    }));
  }

  /**
   * @brief Starts a new running instance of a preset.
   * @param presetId The id of the preset to start.
   */
  function start(presetId) {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    running.push({
      uid: `run-${uidCounter++}`,
      presetId: preset.id,
      name: preset.name,
      durationMs: preset.durationMs,
      endsAt: Date.now() + preset.durationMs,
      finished: false,
      notified: false
    });
  }

  /**
   * @brief Starts a session-only timer with a custom name and duration.
   * @param name The timer name.
   * @param durationMs The duration in milliseconds.
   * @return True when the timer started, false when invalid.
   */
  function startCustom(name, durationMs) {
    if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_CUSTOM_MS) {
      return false;
    }

    const label = (name || '').trim() || 'Timer';

    running.push({
      uid: `run-${uidCounter++}`,
      presetId: null,
      name: label,
      durationMs,
      endsAt: Date.now() + durationMs,
      finished: false,
      notified: false
    });

    return true;
  }

  /**
   * @brief Removes a running timer instance.
   * @param uid The unique id of the running timer.
   */
  function dismiss(uid) {
    running = running.filter(r => r.uid !== uid);
  }

  /**
   * @brief Advances timer state to the current time.
   * @return The timers that just finished this tick.
   */
  function tick() {
    const now = Date.now();
    const justFinished = [];
    running.forEach(r => {
      if (!r.finished && r.endsAt <= now) {
        r.finished = true;
        justFinished.push(r);
      }
    });
    return justFinished;
  }

  /**
   * @brief Returns the current timer state.
   * @return An object with the presets and running instances.
   */
  function getState() {
    return { presets, running };
  }

  return { init, start, startCustom, dismiss, tick, getState };
})();