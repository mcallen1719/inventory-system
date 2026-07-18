import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins for local dev
    methods: ["GET", "POST"]
  }
});

const DB_FILE = path.join(__dirname, 'db.json');

// Simple in-memory cache of the database to serve connecting clients quickly
let dbCache = {};

// Load existing db if present
if (fs.existsSync(DB_FILE)) {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    dbCache = JSON.parse(data);
    console.log('Loaded database from disk.');
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
}

// Helper to save to disk periodically or on update
const saveDb = () => {
  fs.writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), (err) => {
    if (err) console.error('Error saving db.json:', err);
  });
};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send the current full state to the new client
  socket.emit('sync-init', dbCache);

  // Listen for updates from a client
  socket.on('sync-update', ({ key, data }) => {
    // Update server cache
    dbCache[key] = data;
    saveDb();

    // Broadcast to all OTHER connected clients
    socket.broadcast.emit('sync-update', { key, data });
  });

  socket.on('live-activity', (activity) => {
    // Broadcast live activity to all OTHER connected clients
    socket.broadcast.emit('live-activity', activity);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Africa's Talking SMS send endpoint
app.post('/api/sms/send', async (req, res) => {
  try {
    const { to, message, username, apiKey, senderId } = req.body;

    if (!to || !message || !username || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields: to, message, username, apiKey' });
    }

    const recipients = Array.isArray(to) ? to : [to];
    const formattedNumbers = recipients.map(num => {
      const trimmed = String(num).trim();
      if (!trimmed) return trimmed;
      if (trimmed.startsWith('+')) return trimmed;
      if (trimmed.startsWith('233')) return `+${trimmed}`;
      return `+233${trimmed.replace(/^0+/, '')}`;
    }).filter(Boolean);

    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < formattedNumbers.length; i += BATCH_SIZE) {
      batches.push(formattedNumbers.slice(i, i + BATCH_SIZE));
    }

    const results = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('to', batch.join(','));
      formData.append('message', message);
      if (senderId) {
        formData.append('senderId', senderId);
      }

    const response = await fetch('https://api.africastalking.com/restless/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey
      },
      body: formData.toString()
    });

    const text = await response.text();
    console.log(`Africa Talking batch ${i + 1}/${batches.length} raw response:`, text);

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    const batchResult = {
      batch,
      status: response.status,
      raw: text,
      parsed
    };
    results.push(batchResult);

    if (!response.ok) {
      console.error(`Batch ${i + 1} failed with status ${response.status}:`, text);
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.json({ success: true, totalRecipients: formattedNumbers.length, batches: results.length, results });
  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({ error: 'Failed to send SMS', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;

// Serve built frontend in production
if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sync Server running on http://0.0.0.0:${PORT}`);
});
