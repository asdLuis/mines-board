// Small, dependency-free time helpers used by the engine and the UI.
window.TimeUtils = (function () {
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // { hours, minutes, seconds } -> milliseconds
  function toMs({ hours = 0, minutes = 0, seconds = 0 } = {}) {
    return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
  }

  // milliseconds -> "HH:MM:SS" (drops the hour segment under 1h)
  function fmtDuration(ms) {
    if (ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  // epoch ms -> local clock time, e.g. "14:32:05"
  function fmtClock(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Positive modulo (JS % can return negative for negative inputs)
  function mod(a, b) {
    return ((a % b) + b) % b;
  }

  return { pad, toMs, fmtDuration, fmtClock, mod };
})();
