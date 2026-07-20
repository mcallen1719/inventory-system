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

// Keys that make up the full business database (kept in sync to disk)
const DB_KEYS = [
  'printing_db_jobs',
  'printing_db_inventory',
  'printing_db_expenditures',
  'printing_db_miscellaneous',
  'printing_db_sales_reports',
  'printing_db_gpo',
  'printing_db_audit_logs',
  'printing_db_notifications',
  'printing_db_settings',
  'printing_db_staff_accounts',
  'printing_db_staff_notes',
  'printing_db_staff_attendance',
  'printing_db_live_activity'
];

// A simple monotonically increasing version so clients can detect a newer
// shared state and never let an old cached value overwrite newer server data.
let dbVersion = 0;

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send the current authoritative full state to the new client. Connecting
  // clients treat this as the source of truth so that every device (anywhere
  // in the world) sees the exact same data.
  socket.emit('sync-init', { cache: dbCache, version: dbVersion });

  // Listen for updates from a client
  socket.on('sync-update', ({ key, data, version }) => {
    // Only accept updates that are newer than what we already hold for this key.
    if (version !== undefined) {
      const currentVersion = dbCache[`__v_${key}`] || 0;
      if (version <= currentVersion) {
        // Stale update — re-push the authoritative value to this client.
        socket.emit('sync-update', { key, data: dbCache[key], version: currentVersion });
        return;
      }
      dbCache[`__v_${key}`] = version;
    }
    // Update server cache
    dbCache[key] = data;
    dbVersion += 1;
    saveDb();

    // Broadcast to all OTHER connected clients
    socket.broadcast.emit('sync-update', { key, data, version: dbCache[`__v_${key}`] });
  });

  socket.on('live-activity', (activity) => {
    // Broadcast live activity to all OTHER connected clients
    socket.broadcast.emit('live-activity', activity);
  });

  // A client explicitly asks for the full authoritative state (used by the
  // "Sync Now" action so any device can pull the exact shared data).
  socket.on('request-sync', () => {
    socket.emit('sync-init', { cache: dbCache, version: dbVersion });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Return the current authoritative shared state (used by the "Clear All" flow
// and for clients that want to confirm sync).
app.get('/api/sync-state', (_req, res) => {
  res.json({ cache: dbCache, version: dbVersion });
});

// Admin "Clear All Data": wipes the shared store everywhere and notifies every
// connected device so the whole team starts from a blank ledger.
app.post('/api/clear-all', (req, res) => {
  try {
    const user = (req.body && req.body.user) || 'Admin';
    const resetCache = {};
    DB_KEYS.forEach((k) => {
      // Staff accounts and global settings are re-seeded client-side from
      // defaults; everything else is emptied here.
      if (k === 'printing_db_staff_accounts' || k === 'printing_db_settings') {
        delete resetCache[k];
        delete dbCache[k];
        delete dbCache[`__v_${k}`];
      } else {
        resetCache[k] = [];
        dbCache[k] = [];
        dbCache[`__v_${k}`] = 0;
      }
    });
    dbVersion += 1;
    saveDb();
    io.emit('sync-clear', { keys: DB_KEYS, user, version: dbVersion });

    // Record the reset action itself so the audit log is preserved.
    const resetLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      action: 'Purge Database',
      module: 'System Setup',
      details: 'All shared business data was cleared by the administrator. Every connected device was reset to a blank ledger.'
    };
    dbCache['printing_db_audit_logs'] = [resetLog];
    dbCache['__v_printing_db_audit_logs'] = dbVersion;
    saveDb();
    io.emit('sync-update', {
      key: 'printing_db_audit_logs',
      data: dbCache['printing_db_audit_logs'],
      version: dbVersion
    });

    res.json({ success: true, message: 'Shared data cleared across all devices.' });
  } catch (err) {
    console.error('Clear all error:', err);
    res.status(500).json({ error: 'Failed to clear shared data.' });
  }
});

const PORT = process.env.PORT || 3001;

// Serve built frontend in production. Prefer `webapp` over `www`/`dist`
// so a fresh build wins (some environments leave a stale/locked dir).
const candidates = [
  path.join(__dirname, '..', 'webapp'),
  path.join(__dirname, '..', 'www'),
  path.join(__dirname, '..', 'dist')
];
const distPath = candidates.find(p => fs.existsSync(p));
if (distPath) {
  app.use(express.static(distPath));

  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sync Server running on http://0.0.0.0:${PORT}`);
});
