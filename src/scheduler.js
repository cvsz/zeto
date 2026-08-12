const cron = require('node-cron');
const db = require('./db');
const fbController = require('./fbController');
const https = require('https');

const FB_VERSION = process.env.FB_API_VERSION || 'v19.0';

const isConfigured = (context = 'default') => {
  const pageId = fbController.getPageId(context);
  const token = fbController.getAccessToken(context);
  return pageId && token && !token.includes('placeholder');
};

// Active cron job registry: { [scheduleId]: cronJob }
const activeJobs = {};

/**
 * Post a message to the Facebook page.
 */
const postToFacebook = async (message, imageUrl = null, pageIdContext = 'default') => {
  const axios = require('axios');
  const fbAxios = axios.create({
    baseURL: `https://graph.facebook.com/${FB_VERSION}`,
    httpsAgent: process.env.NODE_ENV !== 'production'
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined,
    timeout: 15000,
  });

  const pageId = fbController.getPageId(pageIdContext);
  const token = fbController.getAccessToken(pageIdContext);

  if (imageUrl && !imageUrl.startsWith('data:')) {
    const params = { url: imageUrl, access_token: token };
    if (message) params.message = message;
    const r = await fbAxios.post(`/${pageId}/photos`, null, { params });
    return r.data;
  } else {
    const r = await fbAxios.post(`/${pageId}/feed`, null, {
      params: { message, access_token: token },
    });
    return r.data;
  }
};

/**
 * Auto-post logic: runs single page post
 */
const autoPostToPageSingle = async (scheduleId = null, customMessage = null, pageIdContext = 'default') => {
  const label = scheduleId ? `[schedule:${scheduleId}:${pageIdContext}]` : `[auto:${pageIdContext}]`;
  console.log(`${label} Running auto-post...`);

  // Check token age / trigger auto-refresh if close to expiration
  try {
    let savedUserToken;
    let refreshedAtVal;
    if (pageIdContext && pageIdContext !== 'default') {
      const p = db.pages.getById(pageIdContext);
      savedUserToken = p?.facebookUserAccessToken;
      refreshedAtVal = p?.facebookTokenRefreshedAt;
    } else {
      const settings = db.settings.get();
      savedUserToken = settings.facebookUserAccessToken;
      refreshedAtVal = settings.facebookTokenRefreshedAt;
    }

    if (savedUserToken && refreshedAtVal) {
      const refreshedAt = new Date(refreshedAtVal).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - refreshedAt > thirtyDays) {
        console.log(`[scheduler] Saved token is older than 30 days for ${pageIdContext}. Auto-refreshing...`);
        const fakeReq = { query: { pageId: pageIdContext } };
        const fakeRes = { status: () => ({ json: () => {} }) };
        await fbController.refreshToken(fakeReq, fakeRes);
      }
    }
  } catch (err) {
    console.error('[scheduler] Failed to auto-refresh token during autoPost preflight:', err.message);
  }

  if (!isConfigured(pageIdContext)) {
    console.log(`${label} Skipping: credentials not configured.`);
    return;
  }

  try {
    const pending = db.queue.getPending(pageIdContext);
    if (pending.length > 0) {
      const item = pending[0];
      console.log(`${label} Publishing queued item: ${item.id}`);
      db.queue.updateStatus(item.id, 'publishing');
      const result = await postToFacebook(item.message, item.imageUrl, pageIdContext);
      // Upload to Google Drive if configured (Non-blocking)
      if (item.imageUrl) {
        const { uploadToGoogleDrive } = require('./googleDrive');
        uploadToGoogleDrive(item.imageUrl, `queue-photo-${result.id}.png`).catch(e => {
          console.error('[scheduler] Non-blocking Google Drive upload failure:', e.message);
        });
      }

      db.queue.updateStatus(item.id, 'published', { publishedAt: new Date().toISOString(), postId: result.id });
      db.history.add({ type: item.type, message: item.message, status: 'success', postId: result.id, source: label, pageId: pageIdContext });
      console.log(`${label} Published queued item ${item.id} → FB post ${result.id}`);
      return;
    }

    const settings = db.settings.get();
    const message = customMessage
      || settings.autoPostTemplate.replace('{TIME}', new Date().toLocaleString());

    const result = await postToFacebook(message, null, pageIdContext);
    db.history.add({ type: 'text', message, status: 'success', postId: result.id, source: label, pageId: pageIdContext });
    console.log(`${label} Auto-posted template → FB post ${result.id}`);
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error(`${label} Auto-post failed:`, msg);
    db.history.add({ type: 'auto', status: 'error', error: msg, source: label, pageId: pageIdContext });
  }
};

/**
 * Auto-post logic: orchestrates autoPost for all active pages
 */
const autoPostToPage = async (scheduleId = null, customMessage = null, pageIdContext = null) => {
  let targetPageId = pageIdContext;
  if (scheduleId && !targetPageId) {
    const s = db.schedules.getAll().find(item => item.id === scheduleId);
    if (s) targetPageId = s.pageId;
  }

  if (targetPageId) {
    return autoPostToPageSingle(scheduleId, customMessage, targetPageId);
  }

  const pages = db.pages.getAll();
  const enabledPages = pages.filter(p => p.enabled !== false);
  if (enabledPages.length === 0) {
    return autoPostToPageSingle(scheduleId, customMessage, 'default');
  }

  for (const page of enabledPages) {
    await autoPostToPageSingle(scheduleId, customMessage, page.id);
  }
};

/**
 * Register a cron job for a custom schedule entry from DB.
 */
const registerSchedule = (schedule) => {
  if (activeJobs[schedule.id]) {
    activeJobs[schedule.id].stop();
    delete activeJobs[schedule.id];
  }
  if (!schedule.enabled) return;
  if (!cron.validate(schedule.cron)) {
    console.warn(`[scheduler] Invalid cron for schedule ${schedule.id}: "${schedule.cron}"`);
    return;
  }
  activeJobs[schedule.id] = cron.schedule(schedule.cron, () => {
    autoPostToPage(schedule.id, schedule.message || null, schedule.pageId || 'default');
  });
  console.log(`[scheduler] Registered schedule "${schedule.name}" (${schedule.cron}) for page ${schedule.pageId || 'default'}`);
};

/**
 * Stop and remove a cron job by schedule ID.
 */
const unregisterSchedule = (scheduleId) => {
  if (activeJobs[scheduleId]) {
    activeJobs[scheduleId].stop();
    delete activeJobs[scheduleId];
    console.log(`[scheduler] Unregistered schedule ${scheduleId}`);
  }
};

/**
 * Register the AI Auto-Poster 3-hour job.
 */
const registerAiAutoPoster = () => {
  let aiAutoPoster;
  try { aiAutoPoster = require('./aiAutoPoster'); } catch (e) {
    console.error('[scheduler] Could not load aiAutoPoster:', e.message);
    return;
  }

  const { aiAutoPostWithJitter, AI_AUTOPOSTER_CRON } = aiAutoPoster;

  if (activeJobs['__ai_autoposter__']) {
    activeJobs['__ai_autoposter__'].stop();
    delete activeJobs['__ai_autoposter__'];
  }

  if (!cron.validate(AI_AUTOPOSTER_CRON)) {
    console.warn('[scheduler] Invalid AI autoposter cron:', AI_AUTOPOSTER_CRON);
    return;
  }

  activeJobs['__ai_autoposter__'] = cron.schedule(AI_AUTOPOSTER_CRON, () => {
    aiAutoPostWithJitter();
  });

  console.log(`[scheduler] AI Auto-Poster registered (${AI_AUTOPOSTER_CRON}) — posts every 3h with random jitter.`);
};

/**
 * Initialize all scheduler jobs from DB and settings.
 */
const initJobs = () => {
  const settings = db.settings.get();

  // Default hourly queue-drain job
  if (settings.schedulerEnabled) {
    const defaultCron = settings.defaultCron || '0 * * * *';
    if (cron.validate(defaultCron)) {
      activeJobs['__default__'] = cron.schedule(defaultCron, () => autoPostToPage());
      console.log(`[scheduler] Default auto-post job initialized (${defaultCron}).`);
    }
  }

  // AI Content Auto-Poster (every 3h)
  const aiSettings = settings.aiAutoPoster || {};
  if (aiSettings.enabled !== false) {
    registerAiAutoPoster();
  } else {
    console.log('[scheduler] AI Auto-Poster is disabled in settings.');
  }

  // Custom schedules from DB
  const schedules = db.schedules.getAll();
  for (const schedule of schedules) {
    registerSchedule(schedule);
  }

  // Set up token auto-refresh check job (checks daily at 02:00)
  activeJobs['__token_refresh__'] = cron.schedule('0 2 * * *', async () => {
    console.log('[scheduler] Running scheduled token refresh check for all pages...');
    const pages = [{ id: 'default' }, ...db.pages.getAll()];
    for (const page of pages) {
      try {
        let savedUserToken;
        let refreshedAtVal;
        if (page.id !== 'default') {
          savedUserToken = page.facebookUserAccessToken;
          refreshedAtVal = page.facebookTokenRefreshedAt;
        } else {
          const currentSettings = db.settings.get();
          savedUserToken = currentSettings.facebookUserAccessToken;
          refreshedAtVal = currentSettings.facebookTokenRefreshedAt;
        }
        if (savedUserToken && refreshedAtVal) {
          const refreshedAt = new Date(refreshedAtVal).getTime();
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          if (Date.now() - refreshedAt > thirtyDays) {
            console.log(`[scheduler] Saved token is older than 30 days for page ${page.id}. Auto-refreshing...`);
            const fakeReq = { query: { pageId: page.id } };
            const fakeRes = { status: () => ({ json: () => {} }) };
            await fbController.refreshToken(fakeReq, fakeRes);
          }
        }
      } catch (err) {
        console.error(`[scheduler] Daily token refresh job error for page ${page.id}:`, err.message);
      }
    }
  });

  console.log(`[scheduler] Initialized ${Object.keys(activeJobs).length} cron job(s).`);
};

/**
 * Restart the default job with a new cron expression.
 */
const restartDefaultJob = (cronExpr) => {
  if (activeJobs['__default__']) {
    activeJobs['__default__'].stop();
    delete activeJobs['__default__'];
  }
  if (cronExpr && cron.validate(cronExpr)) {
    activeJobs['__default__'] = cron.schedule(cronExpr, () => autoPostToPage());
    console.log(`[scheduler] Default job restarted: ${cronExpr}`);
    return true;
  }
  return false;
};

/**
 * Toggle the AI auto-poster on/off at runtime.
 */
const setAiAutoPosterEnabled = (enabled) => {
  if (enabled) {
    registerAiAutoPoster();
  } else {
    if (activeJobs['__ai_autoposter__']) {
      activeJobs['__ai_autoposter__'].stop();
      delete activeJobs['__ai_autoposter__'];
      console.log('[scheduler] AI Auto-Poster disabled.');
    }
  }
  db.settings.update({ aiAutoPoster: { ...(db.settings.get().aiAutoPoster || {}), enabled } });
};

/**
 * Get status of all active jobs.
 */
const getStatus = () => ({
  activeJobs: Object.keys(activeJobs),
  count: Object.keys(activeJobs).length,
  aiAutoPosterActive: !!activeJobs['__ai_autoposter__'],
});

module.exports = {
  initJobs,
  autoPostToPage,
  registerSchedule,
  unregisterSchedule,
  registerAiAutoPoster,
  setAiAutoPosterEnabled,
  restartDefaultJob,
  getStatus,
};
