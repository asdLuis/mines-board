'use strict';

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * @brief Serves the mines configuration file.
 * @param req The HTTP request.
 * @param res The HTTP response.
 */
function sendMines(req, res) {
  res.sendFile(path.join(__dirname, 'data', 'mines.json'));
}

/**
 * @brief Serves the manual timers configuration file.
 * @param req The HTTP request.
 * @param res The HTTP response.
 */
function sendManualTimers(req, res) {
  res.sendFile(path.join(__dirname, 'data', 'manual-timers.json'));
}

app.get('/api/mines', sendMines);
app.get('/api/manual-timers', sendManualTimers);

/**
 * @brief Starts the HTTP server and logs the local URL.
 */
function startServer() {
  app.listen(PORT, () => {
    console.log(`Shift Board running at http://localhost:${PORT}`);
  });
}

startServer();