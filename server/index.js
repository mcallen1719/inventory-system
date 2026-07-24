import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io',
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'db.json');

// Parse .env before reading Supabase config so local dev works
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
        process.env[key] = value.trim();
      }
    });
  } catch (err) {
    console.error('Failed to parse .env file:', err);
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const SYNC_KEYS = [
  'printing_db_jobs',
  'printing_db_general_orders',
  'printing_db_inventory',
  'printing_db_expenditures',
  'printing_db_daily_misc',
  'printing_db_daily_sales',
  'printing_db_audit_logs',
  'printing_db_notifications',
  'printing_db_settings',
  'printing_db_staff_accounts',
  'printing_db_staff_notes',
  'printing_db_staff_attendance',
  'printing_db_deleted_jobs',
  'printing_db_live_activity',
  'printing_db_reported_activities'
];

// In-memory cache backed by db.json
let dbCache = {};
if (fs.existsSync(DB_FILE)) {
  try {
    dbCache = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    console.log('Loaded db.json from disk.');
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
}

const persist = () => {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2)); } catch (err) { console.error('db.json write failed', err); }
};

function getServerState() {
  const state = {};
  for (const key of SYNC_KEYS) {
    if (dbCache[key] !== undefined) state[key] = dbCache[key];
  }
  return state;
}

async function persistToSupabase(key, data) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('app_state').upsert({ key, data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`Supabase upsert failed for ${key}:`, e);
    return false;
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  console.log('Client origin:', socket.handshake.headers.origin || 'unknown');
  const state = getServerState();
  console.log('Sending full sync with keys:', Object.keys(state).length);
  socket.emit('db_full_sync', state);

  socket.on('db_update', async (payload) => {
    const { key, data } = payload;
    if (!key || !SYNC_KEYS.includes(key)) return;
    dbCache[key] = data;
    persist();
    const ok = await persistToSupabase(key, data);
    if (ok) console.log(`Synced ${key} to Supabase`);
    socket.broadcast.emit('db_update', { key, data });
  });

  socket.on('db_request_all', () => {
    socket.emit('db_full_sync', getServerState());
  });

  socket.on('db_clear_all', async () => {
    if (!supabase) return;
    try {
      await supabase.from('app_state').delete().neq('key', '');
      await supabase.from('live_activity').delete().neq('id', '');
      SYNC_KEYS.forEach(k => { if (k === 'printing_db_staff_accounts' || k === 'printing_db_settings') return; dbCache[k] = []; });
      persist();
      io.emit('db_clear_done');
    } catch (e) {
      console.error('Clear all failed:', e);
    }
  });

  socket.on('live_activity', (activity) => {
    dbCache['printing_db_live_activity'] = [activity, ...(dbCache['printing_db_live_activity'] || [])].slice(0, 50);
    persist();
    io.emit('live_activity', activity);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  });
});

app.get('/api/sync-state', (_req, res) => {
  res.json({ cache: getServerState() });
});

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
  console.log(`Sync server running on http://0.0.0.0:${PORT}`);
  console.log('Supabase:', supabase ? `ENABLED (${SUPABASE_URL})` : 'DISABLED');
  console.log('db.json:', fs.existsSync(DB_FILE) ? 'FOUND' : 'MISSING');
});
