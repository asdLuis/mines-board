window.Prefs = (function () {
  'use strict';

  const KEY = 'shiftboard-prefs-v1';
  let state = { mineVisible: {}, timerVisible: {}, sidebarOpen: true, resetPinMinutes: 2, soundVolume: 1 };
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

  /**
   * @brief Reads the recently-reset pin duration in minutes.
   * @return The pin duration in whole minutes, clamped between one and ten.
   */
  function getResetPinMinutes() {
    const raw = state.resetPinMinutes;
    if (!Number.isInteger(raw)) return 2;
    return Math.min(10, Math.max(1, raw));
  }

  /**
   * @brief Stores the recently-reset pin duration in minutes.
   * @param val The new pin duration, clamped between one and ten.
   */
  function setResetPinMinutes(val) {
    const next = Number.isInteger(val) ? val : 2;
    state.resetPinMinutes = Math.min(10, Math.max(1, next));
    save();
  }

  /**
   * @brief Reads the saved master volume.
   * @return The volume between 0 and 1.
   */
  function getSoundVolume() {
    const raw = state.soundVolume;
    if (typeof raw !== 'number') return 1;
    return Math.min(1, Math.max(0, raw));
  }

  /**
   * @brief Stores the master volume.
   * @param val The volume between 0 and 1.
   */
  function setSoundVolume(val) {
    const next = Number.isFinite(val) ? val : 1;
    state.soundVolume = Math.min(1, Math.max(0, next));
    save();
  }

  load();

  return { isMineVisible, setMineVisible, isTimerVisible, setTimerVisible, getSidebarOpen, setSidebarOpen, getResetPinMinutes, setResetPinMinutes, getSoundVolume, setSoundVolume };
})();