window.TimeUtils = (function () {
  'use strict';

  /**
   * @brief Pads a number to at least two digits.
   * @param n The value to pad.
   * @return The zero-padded string.
   */
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * @brief Converts a time object to milliseconds.
   * @param time Object with optional hours, minutes and seconds.
   * @return The total duration in milliseconds.
   */
  function toMs({ hours = 0, minutes = 0, seconds = 0 } = {}) {
    return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
  }

  /**
   * @brief Formats milliseconds as a clock-style duration.
   * @param ms The duration in milliseconds.
   * @return Time string like "HH:MM:SS", dropping the hour segment under one hour.
   */
  function fmtDuration(ms) {
    if (ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  /**
   * @brief Formats an epoch timestamp as local clock time.
   * @param ts The epoch milliseconds timestamp.
   * @return Local time string like "14:32:05".
   */
  function fmtClock(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /**
   * @brief Returns the positive modulo of two numbers.
   * @param a The dividend.
   * @param b The divisor.
   * @return The positive remainder of a divided by b.
   */
  function mod(a, b) {
    return ((a % b) + b) % b;
  }

  return { pad, toMs, fmtDuration, fmtClock, mod };
})();