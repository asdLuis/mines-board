window.SoundFX = (function () {
  'use strict';

  let ctx = null;

  /**
   * @brief Ensures the audio context exists and is running.
   * @return The audio context, or null when unsupported.
   */
  function ensureCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /**
   * @brief Plays a short sine beep through the audio context.
   * @param freq The beep frequency in hertz.
   * @param durationMs The beep duration in milliseconds.
   * @param delayMs The delay before the beep in milliseconds.
   * @param volume The peak gain between 0 and 1.
   */
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

  /**
   * @brief Plays the timer-finished chime.
   */
  function playDone() {
    beep(880, 160, 0, 0.28);
    beep(660, 220, 190, 0.28);
  }

  /**
   * @brief Plays a short reminder blip.
   */
  function playStar() {
    beep(1300, 140, 0, 0.22);
  }

  /**
   * @brief Plays a sharp repeating alert for the ten-minute nag.
   */
  function playNag() {
    beep(1568, 90, 0, 0.22);
    beep(1568, 90, 130, 0.22);
  }

  /**
   * @brief Unlocks audio playback after a user gesture.
   */
  function unlock() {
    ensureCtx();
  }

  return { unlock, playDone, playStar, playNag };
})();