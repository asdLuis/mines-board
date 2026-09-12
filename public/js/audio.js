window.SoundFX = (function () {
  'use strict';

  let ctx = null;
  let master = null;
  let masterVolume = 1;

  /**
   * @brief Resolves the best audio context constructor available.
   * @return The constructor, or null when unsupported.
   */
  function pickCtx() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  /**
   * @brief Ensures the audio context and master gain lane exist and beeps
   *        can be scheduled on a running context.
   * @return The audio context, or null when unsupported or unavailable.
   */
  function ensureCtx() {
    const Ctx = pickCtx();

    if (!Ctx) return null;

    if (!ctx) {
      try {
        ctx = new Ctx();
      } catch (err) {
        console.error('Could not create the audio context:', err);
        return null;
      }
    }

    if (!master) {
      master = ctx.createGain();
      master.gain.value = masterVolume;
      master.connect(ctx.destination);
    }

    if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
      const pending = ctx.resume();

      if (pending && typeof pending.catch === 'function') {
        pending.catch(() => {});
      }
    }

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

    if (!c || c.state !== 'running' || !master) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(master);

    const start = c.currentTime + delayMs / 1000;
    const end = start + durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * masterVolume), start + 0.02);
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
   * @brief Unlocks audio playback after a user gesture, resuming the
   *        context whenever the browser holds it suspended or interrupted.
   */
  function unlock() {
    ensureCtx();
  }

  /**
   * @brief Sets the master volume applied to every sound.
   * @param val A value between 0 and 1.
   */
  function setVolume(val) {
    masterVolume = Math.min(1, Math.max(0, val));

    if (master && ctx) {
      master.gain.setValueAtTime(masterVolume, ctx.currentTime);
    }
  }

  /**
   * @brief Reads the current master volume.
   * @return The master volume between 0 and 1.
   */
  function getVolume() {
    return masterVolume;
  }

  return { unlock, playDone, playStar, playNag, setVolume, getVolume };
})();