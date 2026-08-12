/**
 * AI Auto-Poster for zfbauto
 * ──────────────────────────────────────────────────────────────────────────────
 * Posts AI-generated "learn how to" content to Facebook every ~3 hours with
 * randomized timing to appear organic (±0-30 min jitter per cycle).
 */

const db = require('./db');
const { generateContent } = require('./contentGenerator');
const fbController = require('./fbController');
const https = require('https');

const FB_VERSION = process.env.FB_API_VERSION || 'v19.0';

// ── Jitter ─────────────────────────────────────────────────────────────────────
const JITTER_MAX_MS = 30 * 60 * 1000; // 30 minutes
const randomJitter = () => Math.floor(Math.random() * JITTER_MAX_MS);

// ── Post to Facebook ──────────────────────────────────────────────────────────
async function postToFacebook(message, imageUrl, pageIdContext = 'default') {
  const axios = require('axios');
  const fbAxios = axios.create({
    baseURL: `https://graph.facebook.com/${FB_VERSION}`,
    httpsAgent: process.env.NODE_ENV !== 'production'
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined,
    timeout: 20000,
  });

  const token = fbController.getAccessToken(pageIdContext);
  const pageId = fbController.getPageId(pageIdContext);

  if (imageUrl && !imageUrl.startsWith('data:')) {
    const params = { url: imageUrl, access_token: token };
    if (message) params.message = message;
    const res = await fbAxios.post(`/${pageId}/photos`, null, { params });
    return res.data;
  } else {
    const res = await fbAxios.post(`/${pageId}/feed`, null, {
      params: { message, access_token: token },
    });
    return res.data;
  }
}

// ── AI Auto-Post job ──────────────────────────────────────────────────────────

/**
 * Run one AI generation + Facebook post cycle.
 */
async function runAiAutoPost(opts = {}) {
  const pageIdContext = opts.pageId || 'default';
  const settings = db.settings.get();
  const aiSettings = settings.aiAutoPoster || {};

  const options = {
    tag:       opts.tag      || aiSettings.topicTag  || undefined,
    format:    opts.format   || aiSettings.postFormat || undefined,
    withImage: opts.withImage !== undefined ? opts.withImage : (aiSettings.withImage !== false),
    provider:  opts.provider || aiSettings.provider   || 'auto',
    dryRun:    opts.dryRun   || false,
    pageId:    pageIdContext
  };

  console.log(`[ai-autoposter:${pageIdContext}] Generating content...`, { tag: options.tag, format: options.format, provider: options.provider });

  let generated;
  try {
    generated = await generateContent(options);
    console.log(`[ai-autoposter:${pageIdContext}] Generated (${generated.provider}): topic=${generated.topic.tag}, format=${generated.format}`);
  } catch (e) {
    const msg = `Content generation failed: ${e.message}`;
    console.error(`[ai-autoposter:${pageIdContext}]`, msg);
    db.history.add({ type: 'ai-auto', status: 'error', error: msg, source: `[ai-autoposter:${pageIdContext}]`, pageId: pageIdContext });
    throw e;
  }

  if (options.dryRun) {
    console.log(`[ai-autoposter:${pageIdContext}] DRY RUN — not posting`);
    return { dryRun: true, generated };
  }

  // Check if approval flow is active
  const requireApproval = aiSettings.requireApproval !== false;

  if (requireApproval) {
    console.log(`[ai-autoposter:${pageIdContext}] Route to queue pending_review: approval flow is active.`);
    const queued = db.queue.add({
      message: generated.message,
      imageUrl: generated.imageUrl || null,
      type: generated.imageUrl ? 'photo' : 'text',
      source: 'ai-autoposter-approval',
      topic: generated.topic,
      format: generated.format,
      aiProvider: generated.provider,
      status: 'pending_review',
      pageId: pageIdContext
    });

    db.history.add({
      type: 'ai-auto',
      message: generated.message.substring(0, 120),
      status: 'pending_review',
      source: `[ai-autoposter:${pageIdContext}]`,
      topic: generated.topic.tag,
      queueId: queued.id,
      pageId: pageIdContext
    });

    // Send Line / Discord Notifications (Non-blocking)
    const { sendNotification } = require('./notification');
    const previewMessage = `📢 [zfbauto:${pageIdContext}] New AI content generated & awaiting approval!\n\nTopic: ${generated.topic.emoji} ${generated.topic.th}\nFormat: ${generated.format}\nProvider: ${generated.provider}\n\n"${generated.message.substring(0, 150)}..."\n\nApprove via dashboard: https://${process.env.PRIMARY_DOMAIN || 'localhost'}/settings`;
    sendNotification(previewMessage, generated.imageUrl).catch(err => {
      console.error(`[ai-autoposter:${pageIdContext}] Notification delivery failed:`, err.message);
    });

    return { queued: true, pendingApproval: true, queueId: queued.id, generated };
  }

  if (!fbController.isConfigured(pageIdContext)) {
    console.log(`[ai-autoposter:${pageIdContext}] Not posting — Facebook credentials not configured. Saving to queue instead.`);
    const queued = db.queue.add({
      message: generated.message,
      imageUrl: generated.imageUrl || null,
      type: generated.imageUrl ? 'photo' : 'text',
      source: 'ai-autoposter',
      topic: generated.topic,
      format: generated.format,
      aiProvider: generated.provider,
      status: 'pending',
      pageId: pageIdContext
    });
    db.history.add({
      type: 'ai-auto',
      message: generated.message.substring(0, 120),
      status: 'queued',
      source: `[ai-autoposter:${pageIdContext}]`,
      topic: generated.topic.tag,
      queueId: queued.id,
      pageId: pageIdContext
    });
    return { queued: true, queueId: queued.id, generated };
  }

  // Post to Facebook
  try {
    const result = await postToFacebook(generated.message, generated.imageUrl, pageIdContext);
    console.log(`[ai-autoposter:${pageIdContext}] Posted to Facebook! Post ID: ${result.id}`);

    if (generated.imageUrl) {
      const { uploadToGoogleDrive } = require('./googleDrive');
      uploadToGoogleDrive(generated.imageUrl, `ai-photo-${result.id}.png`).catch(e => {
        console.error(`[ai-autoposter:${pageIdContext}] Non-blocking Google Drive upload failure:`, e.message);
      });
    }

    db.history.add({
      type: 'ai-auto',
      message: generated.message.substring(0, 120),
      status: 'success',
      postId: result.id,
      source: `[ai-autoposter:${pageIdContext}]`,
      topic: generated.topic.tag,
      format: generated.format,
      aiProvider: generated.provider,
      hasImage: !!generated.imageUrl,
      pageId: pageIdContext
    });

    return { posted: true, postId: result.id, generated };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.error(`[ai-autoposter:${pageIdContext}] Facebook post failed:`, msg);

    const queued = db.queue.add({
      message: generated.message,
      imageUrl: generated.imageUrl || null,
      type: generated.imageUrl ? 'photo' : 'text',
      source: 'ai-autoposter-retry',
      topic: generated.topic,
      error: msg,
      pageId: pageIdContext
    });

    db.history.add({
      type: 'ai-auto',
      message: generated.message.substring(0, 120),
      status: 'error',
      error: msg,
      source: `[ai-autoposter:${pageIdContext}]`,
      queueId: queued.id,
      pageId: pageIdContext
    });

    throw new Error(msg);
  }
}

// ── Cron schedule calculation ──────────────────────────────────────────────────

const AI_AUTOPOSTER_CRON = '0 0,3,6,9,12,15,18,21 * * *'; // every 3h on the hour

/**
 * The actual job wrapper — applies jitter before posting.
 */
async function aiAutoPostWithJitter(opts = {}) {
  const settings = db.settings.get();
  const aiSettings = settings.aiAutoPoster || {};

  if (!aiSettings.enabled) {
    console.log('[ai-autoposter] Disabled in settings — skipping.');
    return;
  }

  const jitter = randomJitter();
  console.log(`[ai-autoposter] Waiting ${Math.round(jitter / 60000)}m jitter before posting...`);

  await new Promise(resolve => setTimeout(resolve, jitter));

  const pages = db.pages.getAll();
  const enabledPages = pages.filter(p => p.enabled !== false);
  if (enabledPages.length === 0) {
    try {
      await runAiAutoPost({ ...opts, pageId: 'default' });
    } catch (e) {}
    return;
  }

  for (const page of enabledPages) {
    try {
      await runAiAutoPost({ ...opts, pageId: page.id });
    } catch (e) {
      console.error(`[ai-autoposter] Failed for page ${page.id}:`, e.message);
    }
  }
}

module.exports = {
  runAiAutoPost,
  aiAutoPostWithJitter,
  AI_AUTOPOSTER_CRON,
};
