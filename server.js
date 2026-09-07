const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// API
app.get('/api/mines', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'data', 'mines.json')
    );
});

app.get('/api/manual-timers', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'data', 'manual-timers.json')
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`Shift Board running at http://localhost:${PORT}`);
});