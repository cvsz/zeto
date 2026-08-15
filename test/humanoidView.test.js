"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHumanoidState } = require("../src/humanoidView");

function fakeDb() {
  return {
    queue: {
      getAll: () => [{ id: "1" }, { id: "2" }],
      getPending: () => [{ id: "1" }],
      getPendingReview: () => [{ id: "2" }],
    },
    schedules: { getAll: () => [{ id: "s1", enabled: true }] },
    history: { getAll: () => [{ id: "h1", status: "published" }] },
    pages: { getAll: () => [{ id: "p1", enabled: true }] },
    settings: {
      get: () => ({ maxQueueSize: 10, aiAutoPoster: { enabled: true } }),
    },
  };
}

test("buildHumanoidState derives live operator telemetry", () => {
  const state = buildHumanoidState({
    db: fakeDb(),
    scheduler: { getStatus: () => ({ running: true }) },
    now: new Date("2026-08-15T00:00:00.000Z"),
    processInfo: { uptime: 123 },
  });

  assert.equal(state.identity.product, "Zeto");
  assert.equal(state.identity.view, "humanoid");
  assert.equal(state.identity.mode, "AUTO-PILOT");
  assert.equal(state.factory.queued, 2);
  assert.equal(state.factory.awaitingApproval, 1);
  assert.equal(state.neural.focus, "APPROVAL");
  assert.equal(state.neural.load, 20);
  assert.equal(state.runtime.uptimeSeconds, 123);
});
