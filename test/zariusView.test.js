"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildZariusState } = require("../src/zariusView");

// Mirrors the PostgreSQL-backed facade contract: every data access is async.
function fakeDb() {
  return {
    queue: {
      getAll: async () => [{ id: "1" }, { id: "2" }],
      getPending: async () => [{ id: "1" }],
      getPendingReview: async () => [{ id: "2" }],
    },
    schedules: { getAll: async () => [{ id: "s1", enabled: true }] },
    history: { getAll: async () => [{ id: "h1", status: "published" }] },
    pages: { getAll: async () => [{ id: "p1", enabled: true }] },
    settings: {
      get: async () => ({
        maxQueueSize: 10,
        aiAutoPoster: { enabled: true },
      }),
    },
  };
}

test("buildZariusState derives live operator telemetry", async () => {
  const state = await buildZariusState({
    db: fakeDb(),
    scheduler: { getStatus: () => ({ running: true }) },
    now: new Date("2026-08-15T00:00:00.000Z"),
    processInfo: { uptime: 123 },
  });

  assert.equal(state.identity.product, "Zeto");
  assert.equal(state.identity.view, "zarius");
  assert.equal(state.identity.mode, "AUTO-PILOT");
  assert.equal(state.factory.queued, 2);
  assert.equal(state.factory.awaitingApproval, 1);
  assert.equal(state.neural.focus, "APPROVAL");
  assert.equal(state.neural.load, 20);
  assert.equal(state.runtime.uptimeSeconds, 123);
});
