const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const os = require('os');
const db = require('./db');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// File upload handling (temp dir, max 10MB)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── Auth Middleware & Role Checks ────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  // Allow login endpoint without auth
  if (req.path === '/auth/login' || req.path === '/api/auth/login') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const token = authHeader.substring(7);
  const session = db.sessions.get(token);
  if (!session) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session token' } });
  }

  req.user = session;
  next();
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Access denied: insufficient permissions' } });
    }
    next();
  };
};

// Mount Auth globally for all /api endpoints
app.use('/api', authMiddleware);

// ── Controllers ───────────────────────────────────────────────────────────────
const fb = require('./fbController');
const scheduler = require('./scheduler');

// ── Routes ────────────────────────────────────────────────────────────────────

// Health
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'zfbauto',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    scheduler: scheduler.getStatus(),
  });
});

// Auth Endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: { message: 'Username and password are required' } });
  }
  const user = db.users.getByUsername(username);
  if (!user || !db.users.verifyPassword(user, password)) {
    return res.status(401).json({ ok: false, error: { message: 'Invalid username or password' } });
  }
  const token = db.sessions.create(user.id, user.role);
  return res.status(200).json({
    ok: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    db.sessions.remove(token);
  }
  return res.status(200).json({ ok: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: { message: 'Not logged in' } });
  }
  return res.status(200).json({ ok: true, data: { role: req.user.role } });
});

// Facebook API
app.post('/api/facebook/post-message', requireRole(['admin', 'editor']), fb.postMessage);
app.post('/api/facebook/post-photo', requireRole(['admin', 'editor']), upload.single('image'), fb.postPhoto);
app.get('/api/facebook/posts', requireRole(['admin', 'editor', 'viewer']), fb.getPosts);
app.delete('/api/facebook/posts/:postId', requireRole(['admin', 'editor']), fb.deletePost);
app.get('/api/facebook/insights', requireRole(['admin', 'editor', 'viewer']), fb.getInsights);
app.get('/api/facebook/insights/history', requireRole(['admin', 'editor', 'viewer']), fb.getInsightsHistory);
app.get('/api/facebook/posts/top', requireRole(['admin', 'editor', 'viewer']), fb.getTopPosts);
app.get('/api/facebook/config', requireRole(['admin', 'editor', 'viewer']), fb.getConfig);
app.post('/api/facebook/exchange-token', requireRole(['admin']), fb.exchangeToken);
app.post('/api/facebook/refresh-token', requireRole(['admin']), fb.refreshToken);

// Queue
app.get('/api/queue', requireRole(['admin', 'editor', 'viewer']), fb.getQueue);
app.get('/api/queue/pending-review', requireRole(['admin', 'editor', 'viewer']), fb.getPendingReview);
app.post('/api/queue', requireRole(['admin', 'editor']), fb.addToQueue);
app.delete('/api/queue', requireRole(['admin', 'editor']), fb.clearQueue);
app.delete('/api/queue/:id', requireRole(['admin', 'editor']), fb.removeFromQueue);
app.post('/api/queue/:id/publish', requireRole(['admin', 'editor']), fb.publishQueueItem);
app.post('/api/queue/:id/approve', requireRole(['admin', 'editor']), fb.approveQueueItem);

// Post History
app.get('/api/history', requireRole(['admin', 'editor', 'viewer']), fb.getHistory);

// Schedules
app.get('/api/schedules', requireRole(['admin', 'editor', 'viewer']), fb.getSchedules);
app.post('/api/schedules', requireRole(['admin', 'editor']), fb.addSchedule);
app.patch('/api/schedules/:id', requireRole(['admin', 'editor']), fb.updateSchedule);
app.delete('/api/schedules/:id', requireRole(['admin', 'editor']), fb.removeSchedule);

// Settings
app.get('/api/settings', requireRole(['admin', 'editor', 'viewer']), fb.getSettings);
app.patch('/api/settings', requireRole(['admin']), fb.updateSettings);

// Pages
app.get('/api/pages', requireRole(['admin', 'editor', 'viewer']), fb.getPages);
app.post('/api/pages', requireRole(['admin']), fb.addPage);
app.patch('/api/pages/:id', requireRole(['admin']), fb.updatePage);
app.delete('/api/pages/:id', requireRole(['admin']), fb.deletePage);

// ── AI Content Generator API ────────────────────────────────────────────────
const { generateContent, getTopics, getFormats } = require('./contentGenerator');
const { runAiAutoPost } = require('./aiAutoPoster');

/**
 * GET /api/ai/topics
 */
app.get('/api/ai/topics', requireRole(['admin', 'editor', 'viewer']), (req, res) => {
  return res.status(200).json({ ok: true, data: getTopics() });
});

/**
 * GET /api/ai/formats
 */
app.get('/api/ai/formats', requireRole(['admin', 'editor', 'viewer']), (req, res) => {
  return res.status(200).json({ ok: true, data: getFormats() });
});

/**
 * POST /api/ai/generate
 */
app.post('/api/ai/generate', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { tag, format, withImage, provider } = req.body;
    const content = await generateContent({ tag, format, withImage: withImage !== false, provider: provider || 'auto' });
    return res.status(200).json({ ok: true, data: content });
  } catch (e) {
    return res.status(500).json({ ok: false, error: { code: 'GENERATION_ERROR', message: e.message } });
  }
});

/**
 * POST /api/ai/generate-and-post
 */
app.post('/api/ai/generate-and-post', requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { tag, format, withImage, provider, dryRun } = req.body;
    const result = await runAiAutoPost({ tag, format, withImage, provider, dryRun });
    return res.status(200).json({ ok: true, data: result });
  } catch (e) {
    return res.status(500).json({ ok: false, error: { code: 'POST_ERROR', message: e.message } });
  }
});

/**
 * PATCH /api/ai/settings
 */
app.patch('/api/ai/settings', requireRole(['admin']), (req, res) => {
  const allowed = ['enabled', 'topicTag', 'postFormat', 'withImage', 'provider', 'intervalHours'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  const current = db.settings.get();
  const aiSettings = { ...(current.aiAutoPoster || {}), ...updates };
  db.settings.update({ aiAutoPoster: aiSettings });

  if ('enabled' in updates) {
    scheduler.setAiAutoPosterEnabled(updates.enabled);
  }

  return res.status(200).json({ ok: true, data: aiSettings });
});

/**
 * GET /api/ai/settings
 */
app.get('/api/ai/settings', requireRole(['admin', 'editor', 'viewer']), (req, res) => {
  const settings = db.settings.get();
  return res.status(200).json({ ok: true, data: settings.aiAutoPoster || { enabled: true } });
});

// ── Google Drive Media Library API ───────────────────────────────────────────
const googleDrive = require('./googleDrive');

/**
 * GET /api/google-drive/images
 */
app.get('/api/google-drive/images', requireRole(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const files = await googleDrive.listFilesFromGoogleDrive(limit);
    return res.status(200).json({ ok: true, data: files });
  } catch (e) {
    return res.status(500).json({ ok: false, error: { message: e.message } });
  }
});

// Scheduler control
app.post('/api/scheduler/trigger', requireRole(['admin']), async (req, res) => {
  try {
    await scheduler.autoPostToPage();
    return res.status(200).json({ ok: true, message: 'Manual trigger executed' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: { message: e.message } });
  }
});

app.post('/api/scheduler/restart', requireRole(['admin']), (req, res) => {
  const { cron } = req.body;
  const ok = scheduler.restartDefaultJob(cron);
  if (ok) return res.status(200).json({ ok: true, message: `Default job restarted with ${cron}` });
  return res.status(400).json({ ok: false, error: { message: 'Invalid cron expression' } });
});

// Catch-all: serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, error: { code: 'FILE_TOO_LARGE', message: 'File too large (max 10MB)' } });
  }
  return res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`✅ zfbauto server listening on http://localhost:${port}`);
  scheduler.initJobs();
});
