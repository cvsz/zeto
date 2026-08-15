"use strict";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildHumanoidState({
  db,
  scheduler,
  now = new Date(),
  processInfo = {},
}) {
  const queue = db.queue.getAll();
  const pending = db.queue.getPending();
  const review = db.queue.getPendingReview();
  const schedules = db.schedules.getAll();
  const history = db.history.getAll(null, 50);
  const pages = db.pages.getAll();
  const settings = db.settings.get() || {};
  const schedulerStatus = scheduler.getStatus();

  const failed = history.filter(
    (item) => item.status === "failed" || item.success === false,
  ).length;
  const published = history.filter(
    (item) => item.status === "published" || item.success === true,
  ).length;
  const enabledSchedules = schedules.filter(
    (item) => item.enabled !== false,
  ).length;
  const enabledPages = pages.filter((item) => item.enabled !== false).length;
  const autopilotEnabled = Boolean(settings.aiAutoPoster?.enabled);

  const pressure = pending.length + review.length * 2 + failed * 3;
  const confidence = clamp(100 - pressure * 4, 0, 100);
  const alertLevel =
    failed > 2
      ? "critical"
      : review.length > 5 || pending.length > 20
        ? "warning"
        : "nominal";

  return {
    generatedAt: now.toISOString(),
    identity: {
      product: "Zeto",
      view: "humanoid",
      mode: autopilotEnabled ? "AUTO-PILOT" : "OPERATOR",
      state: alertLevel === "critical" ? "DEGRADED" : "ONLINE",
    },
    neural: {
      confidence,
      load: clamp(
        Math.round(
          (queue.length / Math.max(Number(settings.maxQueueSize) || 100, 1)) *
            100,
        ),
        0,
        100,
      ),
      alertLevel,
      focus:
        review.length > 0
          ? "APPROVAL"
          : pending.length > 0
            ? "PUBLISHING"
            : "MONITORING",
    },
    factory: {
      queued: queue.length,
      pending: pending.length,
      awaitingApproval: review.length,
      schedules: schedules.length,
      enabledSchedules,
      pages: pages.length,
      enabledPages,
      publishedRecent: published,
      failedRecent: failed,
    },
    modules: [
      { id: "M01", name: "Strategy", state: "ready" },
      {
        id: "M02-M05",
        name: "Generation",
        state: autopilotEnabled ? "active" : "ready",
      },
      {
        id: "M10",
        name: "QA & Approval",
        state: review.length ? "attention" : "ready",
      },
      {
        id: "M06",
        name: "Publishing",
        state: schedulerStatus?.running === false ? "paused" : "active",
      },
      { id: "M07", name: "Monitoring", state: "ready" },
      { id: "M08", name: "Analytics", state: "ready" },
      {
        id: "M09",
        name: "Orchestration",
        state: autopilotEnabled ? "active" : "operator",
      },
    ],
    runtime: {
      uptimeSeconds: Math.floor(processInfo.uptime ?? process.uptime()),
      node: process.version,
      pid: process.pid,
      scheduler: schedulerStatus,
    },
  };
}

module.exports = { buildHumanoidState };
