/**
 * Lightweight in-memory + JSON-file persistence layer for zfbauto.
 * Stores scheduled posts, post queue, and settings.
 */
const fs = require('fs');
const path = require('path');
const { randomUUID, pbkdf2Sync, randomBytes } = require('crypto');

const crypto = require('./crypto');

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** @returns {Object} The current in-memory database */
const loadDb = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (!db.pages) db.pages = [];
      if (!db.queue) db.queue = [];
      if (!db.schedules) db.schedules = [];
      if (!db.postHistory) db.postHistory = [];
      if (!db.settings) db.settings = {};
      if (!db.users) db.users = [];
      if (!db.sessions) db.sessions = {};

      // Seed default admin user if no users exist
      if (db.users.length === 0) {
        const salt = randomBytes(16).toString('hex');
        const hash = pbkdf2Sync('password', salt, 10000, 64, 'sha512').toString('hex');
        db.users.push({
          id: 'admin-uuid',
          username: 'admin',
          salt,
          hash,
          role: 'admin',
          createdAt: new Date().toISOString()
        });
      }


      // Decrypt settings tokens
      if (db.settings.facebookAccessToken) {
        db.settings.facebookAccessToken = crypto.decrypt(db.settings.facebookAccessToken);
      }
      if (db.settings.facebookUserAccessToken) {
        db.settings.facebookUserAccessToken = crypto.decrypt(db.settings.facebookUserAccessToken);
      }

      // Decrypt pages tokens
      if (db.pages) {
        db.pages.forEach(p => {
          if (p.facebookAccessToken) {
            p.facebookAccessToken = crypto.decrypt(p.facebookAccessToken);
          }
          if (p.facebookUserAccessToken) {
            p.facebookUserAccessToken = crypto.decrypt(p.facebookUserAccessToken);
          }
        });
      }

      // Migrate single page credentials to default page if empty
      if (db.pages.length === 0 && (db.settings.facebookPageId || process.env.FACEBOOK_PAGE_ID)) {
        db.pages.push({
          id: 'default',
          facebookPageId: db.settings.facebookPageId || process.env.FACEBOOK_PAGE_ID,
          facebookAccessToken: db.settings.facebookAccessToken || process.env.FACEBOOK_ACCESS_TOKEN || '',
          name: 'Primary Page',
          enabled: true,
          createdAt: new Date().toISOString()
        });
      }
      return db;
    }
  } catch (e) {
    console.error('Failed to load db.json, resetting:', e.message);
  }
  return {
    queue: [],
    schedules: [],
    postHistory: [],
    pages: [],
    users: [
      {
        id: 'admin-uuid',
        username: 'admin',
        salt: 'seeded-salt',
        hash: 'seeded-hash',
        role: 'admin'
      }
    ],
    sessions: {},
    settings: {
      defaultCron: '0 * * * *',
      schedulerEnabled: true,
      autoPostTemplate: 'Automated post at {TIME} 🤖✨',
      maxQueueSize: 100,
    },
  };
};


const saveDb = (db) => {
  try {
    // Deep clone DB to avoid mutating in-memory plaintext state
    const clone = JSON.parse(JSON.stringify(db));

    // Encrypt settings tokens
    if (clone.settings) {
      if (clone.settings.facebookAccessToken) {
        clone.settings.facebookAccessToken = crypto.encrypt(clone.settings.facebookAccessToken);
      }
      if (clone.settings.facebookUserAccessToken) {
        clone.settings.facebookUserAccessToken = crypto.encrypt(clone.settings.facebookUserAccessToken);
      }
    }

    // Encrypt pages tokens
    if (clone.pages) {
      clone.pages.forEach(p => {
        if (p.facebookAccessToken) {
          p.facebookAccessToken = crypto.encrypt(p.facebookAccessToken);
        }
        if (p.facebookUserAccessToken) {
          p.facebookUserAccessToken = crypto.encrypt(p.facebookUserAccessToken);
        }
      });
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(clone, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save db.json:', e.message);
  }
};

// In-memory state (loaded once on startup)
let _db = loadDb();

module.exports = {
  randomUUID,

  /** Pages management */
  pages: {
    getAll: () => _db.pages || [],
    getById: (id) => (_db.pages || []).find(p => p.id === id || p.facebookPageId === id),
    add: (page) => {
      if (!_db.pages) _db.pages = [];
      const entry = {
        id: randomUUID(),
        enabled: true,
        createdAt: new Date().toISOString(),
        ...page
      };
      _db.pages.push(entry);
      saveDb(_db);
      return entry;
    },
    update: (id, updates) => {
      const page = (_db.pages || []).find(p => p.id === id || p.facebookPageId === id);
      if (!page) return null;
      Object.assign(page, updates, { updatedAt: new Date().toISOString() });
      saveDb(_db);
      return page;
    },
    remove: (id) => {
      if (!_db.pages) return null;
      const idx = _db.pages.findIndex(p => p.id === id || p.facebookPageId === id);
      if (idx === -1) return null;
      const removed = _db.pages.splice(idx, 1)[0];

      // Clean up queue, schedules, history linked to this page
      _db.queue = _db.queue.filter(q => q.pageId !== id && q.pageId !== removed.facebookPageId);
      _db.schedules = _db.schedules.filter(s => s.pageId !== id && s.pageId !== removed.facebookPageId);
      _db.postHistory = _db.postHistory.filter(h => h.pageId !== id && h.pageId !== removed.facebookPageId);

      saveDb(_db);
      return removed;
    }
  },

  /** Queue operations */
  queue: {
    getAll: (pageId = null) => {
      if (pageId) {
        return (_db.queue || []).filter(q => q.pageId === pageId || (!q.pageId && pageId === 'default'));
      }
      return _db.queue || [];
    },
    add: (item) => {
      const entry = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        pageId: item.pageId || 'default',
        ...item
      };
      _db.queue.unshift(entry);
      if (_db.queue.length > (_db.settings.maxQueueSize || 100)) {
        _db.queue = _db.queue.slice(0, _db.settings.maxQueueSize || 100);
      }
      saveDb(_db);
      return entry;
    },
    remove: (id) => {
      const idx = _db.queue.findIndex(q => q.id === id);
      if (idx === -1) return null;
      const removed = _db.queue.splice(idx, 1)[0];
      saveDb(_db);
      return removed;
    },
    updateStatus: (id, status, meta = {}) => {
      const item = _db.queue.find(q => q.id === id);
      if (!item) return null;
      item.status = status;
      item.updatedAt = new Date().toISOString();
      Object.assign(item, meta);
      saveDb(_db);
      return item;
    },
    getPending: (pageId = null) => {
      const pending = (_db.queue || []).filter(q => q.status === 'pending');
      if (pageId) {
        return pending.filter(q => q.pageId === pageId || (!q.pageId && pageId === 'default'));
      }
      return pending;
    },
    getPendingReview: (pageId = null) => {
      const pending = (_db.queue || []).filter(q => q.status === 'pending_review');
      if (pageId) {
        return pending.filter(q => q.pageId === pageId || (!q.pageId && pageId === 'default'));
      }
      return pending;
    },
    approve: (id, editedMessage = null) => {
      const item = _db.queue.find(q => q.id === id);
      if (!item) return null;
      item.status = 'pending';
      if (editedMessage) {
        item.message = editedMessage;
      }
      item.updatedAt = new Date().toISOString();
      saveDb(_db);
      return item;
    },
    clear: (pageId = null) => {
      if (pageId) {
        _db.queue = (_db.queue || []).filter(q => q.pageId !== pageId && (q.pageId || pageId !== 'default'));
      } else {
        _db.queue = [];
      }
      saveDb(_db);
    },
  },

  /** Post history */
  history: {
    getAll: (pageId = null, limit = 50) => {
      const hist = _db.postHistory || [];
      if (pageId) {
        return hist.filter(h => h.pageId === pageId || (!h.pageId && pageId === 'default')).slice(0, limit);
      }
      return hist.slice(0, limit);
    },
    add: (entry) => {
      _db.postHistory.unshift({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        pageId: entry.pageId || 'default',
        ...entry
      });
      if (_db.postHistory.length > 500) _db.postHistory = _db.postHistory.slice(0, 500);
      saveDb(_db);
    },
  },

  /** Schedule rules */
  schedules: {
    getAll: (pageId = null) => {
      if (pageId) {
        return (_db.schedules || []).filter(s => s.pageId === pageId || (!s.pageId && pageId === 'default'));
      }
      return _db.schedules || [];
    },
    add: (item) => {
      const entry = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        enabled: true,
        pageId: item.pageId || 'default',
        ...item
      };
      _db.schedules.push(entry);
      saveDb(_db);
      return entry;
    },
    update: (id, updates) => {
      const item = _db.schedules.find(s => s.id === id);
      if (!item) return null;
      Object.assign(item, updates, { updatedAt: new Date().toISOString() });
      saveDb(_db);
      return item;
    },
    remove: (id) => {
      const idx = _db.schedules.findIndex(s => s.id === id);
      if (idx === -1) return null;
      const removed = _db.schedules.splice(idx, 1)[0];
      saveDb(_db);
      return removed;
    },
  },

  /** Settings */
  settings: {
    get: () => _db.settings,
    update: (updates) => {
      Object.assign(_db.settings, updates);
      saveDb(_db);
      return _db.settings;
    },
  },

  /** Users management */
  users: {
    getAll: () => _db.users || [],
    getByUsername: (username) => (_db.users || []).find(u => u.username.toLowerCase() === username.toLowerCase()),
    add: (username, password, role = 'editor') => {
      if (!_db.users) _db.users = [];
      const salt = randomBytes(16).toString('hex');
      const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      const entry = {
        id: randomUUID(),
        username,
        salt,
        hash,
        role,
        createdAt: new Date().toISOString()
      };
      _db.users.push(entry);
      saveDb(_db);
      return entry;
    },
    verifyPassword: (user, password) => {
      const hash = pbkdf2Sync(password, user.salt, 10000, 64, 'sha512').toString('hex');
      return user.hash === hash;
    }
  },

  /** Sessions management */
  sessions: {
    create: (userId, role) => {
      if (!_db.sessions) _db.sessions = {};
      const token = randomBytes(32).toString('hex');
      _db.sessions[token] = {
        userId,
        role,
        createdAt: new Date().toISOString()
      };
      saveDb(_db);
      return token;
    },
    get: (token) => {
      if (!_db.sessions) return null;
      return _db.sessions[token] || null;
    },
    remove: (token) => {
      if (!_db.sessions || !_db.sessions[token]) return false;
      delete _db.sessions[token];
      saveDb(_db);
      return true;
    }
  },

  /** Reload from disk (if external edits) */
  reload: () => {
    _db = loadDb();
    return _db;
  },
};


