window.Prefs = (function () {
  'use strict';

  const KEY = 'shiftboard-prefs-v1';
  let state = { mineVisible: {}, timerVisible: {}, sidebarOpen: true };
  let storageOk = true;

  /**
   * @brief Loads persisted preferences from local storage.
   */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) {
      storageOk = false;
    }
  }

  /**
   * @brief Persists the current preferences to local storage.
   */
  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      storageOk = false;
    }
  }

  /**
   * @brief Checks whether a mine is marked visible.
   * @param id The mine id.
   * @param fallback The default visibility when no choice is saved.
   * @return True when the mine is visible.
   */
  function isMineVisible(id, fallback) {
    return Object.prototype.hasOwnProperty.call(state.mineVisible, id) ? state.mineVisible[id] : fallback;
  }

  /**
   * @brief Sets whether a mine is visible.
   * @param id The mine id.
   * @param val The new visibility.
   */
  function setMineVisible(id, val) {
    state.mineVisible[id] = val;
    save();
  }

  /**
   * @brief Checks whether a timer preset is marked visible.
   * @param id The preset id.
   * @param fallback The default visibility when no choice is saved.
   * @return True when the preset is visible.
   */
  function isTimerVisible(id, fallback) {
    return Object.prototype.hasOwnProperty.call(state.timerVisible, id) ? state.timerVisible[id] : fallback;
  }

  /**
   * @brief Sets whether a timer preset is visible.
   * @param id The preset id.
   * @param val The new visibility.
   */
  function setTimerVisible(id, val) {
    state.timerVisible[id] = val;
    save();
  }

  /**
   * @brief Reads the saved sidebar open state.
   * @return True when the sidebar should be open.
   */
  function getSidebarOpen() {
    return state.sidebarOpen !== false;
  }

  /**
   * @brief Stores the sidebar open state.
   * @param val The new state.
   */
  function setSidebarOpen(val) {
    state.sidebarOpen = val;
    save();
  }

  load();

  return { isMineVisible, setMineVisible, isTimerVisible, setTimerVisible, getSidebarOpen, setSidebarOpen };
})();