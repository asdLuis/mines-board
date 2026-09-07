// Small persisted-preferences layer. This is a real local web app (served
// over http://, not a sandboxed embed), so localStorage works fine and lets
// visibility choices survive a page reload.
window.Prefs = (function () {
  const KEY = 'shiftboard-prefs-v1';
  let state = { mineVisible: {}, timerVisible: {}, sidebarOpen: true };
  let storageOk = true;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) {
      storageOk = false;
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      storageOk = false;
    }
  }

  function isMineVisible(id, fallback) {
    return Object.prototype.hasOwnProperty.call(state.mineVisible, id) ? state.mineVisible[id] : fallback;
  }
  function setMineVisible(id, val) {
    state.mineVisible[id] = val;
    save();
  }

  function isTimerVisible(id, fallback) {
    return Object.prototype.hasOwnProperty.call(state.timerVisible, id) ? state.timerVisible[id] : fallback;
  }
  function setTimerVisible(id, val) {
    state.timerVisible[id] = val;
    save();
  }

  function getSidebarOpen() {
    return state.sidebarOpen !== false;
  }
  function setSidebarOpen(val) {
    state.sidebarOpen = val;
    save();
  }

  load();

  return { isMineVisible, setMineVisible, isTimerVisible, setTimerVisible, getSidebarOpen, setSidebarOpen };
})();
