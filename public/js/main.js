(function () {

  // How often the nag ping repeats once a starred mine is inside its
  // threshold window (server.nagMs, from starNagThresholdSeconds in
  // data/mines.json — default 600s / 10 min).
  const NAG_INTERVAL_MS = 15000;


  // Load JSON from the Node/Express API.
  async function loadJson(path) {
    const res = await fetch(path);

    if (!res.ok) {
      throw new Error(`Bad response for ${path}: ${res.status}`);
    }

    return res.json();
  }


  async function boot() {

    let mineConfig = {
      serverResetHours: 12,
      mines: []
    };

    let manualConfig = {
      timers: []
    };


    // Load configuration from the Node server.
    try {

      [mineConfig, manualConfig] = await Promise.all([
        loadJson('/api/mines'),
        loadJson('/api/manual-timers')
      ]);

    } catch (err) {

      console.error('Failed to load configuration:', err);

      document.getElementById('configNote').innerHTML =
        'Could not load the configuration from the server. ' +
        'Make sure the Node server is running.';

    }


    // Initialize the timer systems.
    window.TimerEngine.init(mineConfig);

    window.ManualTimers.init(manualConfig);

    window.UI.init(
      mineConfig.serverResetHours || 12
    );

    // Timer used for the starred-mine reminder.
    let nagTimer = 0;


    // Main application loop.
    setInterval(() => {

      const mineTick =
        window.TimerEngine.tick();

      const manualFinished =
        window.ManualTimers.tick();


      // Update the UI.
      window.UI.render({
        ...mineTick,
        manualFinished
      });


      // Check whether any starred mine is inside its nag threshold window.
      const { mines, server } =
        window.TimerEngine.getState();

      const now = Date.now();

      const urgentStarred = mines.some(m => {
        if (!m.starred) return false;
        const remaining = m.nextReset - now;
        return remaining > 0 && remaining <= server.nagMs;
      });


      if (urgentStarred) {

        if (nagTimer <= 0) {

          window.SoundFX.playNag();

          nagTimer = NAG_INTERVAL_MS;

        } else {

          nagTimer -= 1000;

        }

      } else {

        // Nothing urgent right now.
        // Reset the nag timer so the next ping fires immediately once it is.
        nagTimer = 0;

      }

    }, 1000);

  }


  // Start the application.
  boot();

})();

