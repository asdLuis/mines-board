// Tiny beep generator so alerts work with no audio assets and no server
// round-trip. Browsers block audio until a user gesture happens on the page,
// so call SoundFX.unlock() from any click/tap handler first.
window.SoundFX = (function () {
  let ctx = null;

  function ensureCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, durationMs, delayMs, volume) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);

    const start = c.currentTime + delayMs / 1000;
    const end = start + durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.start(start);
    osc.stop(end + 0.02);
  }

  // Timer finished: two-note chime.
  function playDone() {
    beep(880, 160, 0, 0.28);
    beep(660, 220, 190, 0.28);
  }

  // 30-min-left style reminder: a single short, higher blip. (kept for
  // compatibility, currently unused by the UI directly)
  function playStar() {
    beep(1300, 140, 0, 0.22);
  }

  // Repeats periodically while any mine is starred — a nagging "you left
  // something" ping, distinct from the finish chime.
  function playNag() {
    beep(520, 90, 0, 0.2);
    beep(520, 90, 140, 0.2);
  }

  function unlock() {
    ensureCtx();
  }

  return { unlock, playDone, playStar, playNag };
})();
