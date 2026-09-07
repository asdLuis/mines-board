// Manual timers: presets loaded from manual-timers.json, each of which can
// be "started" on demand. Every start creates its own running instance so
// the same preset can be fired more than once at a time if needed.
window.ManualTimers = (function () {
  const { toMs } = window.TimeUtils;

  let presets = [];
  let running = [];
  let uidCounter = 1;

  function init(config) {
    presets = (config.timers || []).map(t => ({
      id: t.id,
      name: t.name,
      durationMs: toMs(t.duration || {}),
      visibleDefault: t.visible !== false
    }));
  }

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

  function dismiss(uid) {
    running = running.filter(r => r.uid !== uid);
  }

  // Advance state to "now". Returns the timers that just finished this tick
  // (for the sound), and marks them finished so the UI can show that state
  // until the person dismisses the card.
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

  function getState() {
    return { presets, running };
  }

  return { init, start, dismiss, tick, getState };
})();
