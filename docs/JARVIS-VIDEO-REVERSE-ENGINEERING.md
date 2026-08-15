# Z.A.R.V.I.S. Operator Runtime — Reverse-Engineering & Implementation Specification

**Status:** Master spec · Source of truth for **M12 — Z.A.R.V.I.S. Operator Runtime** (`exec-planing.md` references this document).
**Source inspected:** uploaded `videoplayback.mp4`, duration ~251.84 seconds, 640×360, 30fps. Brand surface observed: "Brahma AI".
**Acronym:** Z.A.R.V.I.S. = **Zeto Autonomous Runtime Virtual Intelligence System**.

This document records visible product behavior from the supplied recording and translates it into Zeto requirements. It does not claim hidden implementation details that cannot be observed from the recording. Frame-accurate timestamp evidence is captured in §1.3 as a structured, capture-ready template; per-second entries must be filled from a re-watch of the source recording and must never be fabricated.

---

## 1. Video Evidence

### 1.1 Source metadata

| Property      | Value                          |
| ------------- | ------------------------------ |
| File          | `videoplayback.mp4`            |
| Duration      | ~251.84 s                      |
| Resolution    | 640×360                        |
| Frame rate    | 30 fps                         |
| Brand surface | "Brahma AI" (dark desktop app) |

### 1.2 Observed UI / interaction inventory

The recording shows a dark desktop AI operator application with a persistent command-center layout. Observed capabilities and surfaces:

1. Central animated AI orb / neural status visualization.
2. Mode controls across the top, including chat/voice-oriented and advanced/automation-oriented modes.
3. Left navigation with Dashboard and Settings.
4. Right-side Command Stream showing executed/observed actions and system messages.
5. Right-side Sequence Builder for composing and saving multi-step command sequences.
6. Command input bar with Send action and suggestion/shortcut controls.
7. Runtime telemetry such as CPU, RAM, network status and camera state.
8. Desktop automation demonstrated by opening/controlling another application (presentation software).
9. Browser automation demonstrated by navigating/interacting with a web page.
10. Computer/typing intent shown in command-stream examples.
11. Mobile pairing flow using a QR code and connection information.
12. Initial setup/onboarding flow for initializing the assistant and account/API configuration.
13. Advanced/automation modes surfaced as first-class operating modes.
14. Error/failure messages are visible in the command stream rather than being silently swallowed.

### 1.3 Timeline evidence (capture-ready)

Fill per-segment rows from a re-watch of the source. Each row links observation → requirement so no claim is unverifiable.

| Timecode         | Surface        | Observed behavior            | Requirement link         | Confidence |
| ---------------- | -------------- | ---------------------------- | ------------------------ | ---------- |
| 00:00–00:05      | Command center | Branding + orb initial state | §2.2 S1; §2.3 orb states | High       |
| _(to be filled)_ |                |                              |                          |            |

> **Coverage status:** scaffold only — the scene-by-scene record of the 251.84 s recording is **not yet complete**. Completion requires re-watching the source recording; this section is the capture plan, not a finished transcript.
>
> **Provenance rule:** do not fabricate timecodes or behaviors. Rows marked "to be filled" must be completed from the source recording only.

---

## 2. UI Reconstruction

### 2.1 Screen map

| Screen              | Purpose                                                            | Path / surface       |
| ------------------- | ------------------------------------------------------------------ | -------------------- |
| S1 Command Center   | Primary operator surface (orb, telemetry, input)                   | `/zarvis`            |
| S2 Settings         | Provider/permission/capability configuration                       | Settings nav         |
| S3 Sequence Builder | Compose, save, reorder, run multi-step sequences                   | Right panel + dialog |
| S4 Pairing          | Mobile connect via short-lived QR token                            | Overlay              |
| S5 Onboarding       | First-run setup wizard (providers, permissions, capability checks) | Full-screen flow     |
| S6 Approval Drawer  | Consequential/mutating action approval                             | Slide-over           |
| S7 Incident Overlay | Degraded state, non-color-only alerting                            | Overlay on S1        |

### 2.2 Component hierarchy (S1 Command Center)

```
Command Center
├── Top Bar
│   ├── Mode Controls (Chat · Voice · Operator · Advanced/Automation)
│   ├── Telemetry Cluster (CPU, RAM, network, camera)
│   └── Connection / Identity pill
├── Left Navigation (Dashboard, Settings)
├── Center Stage
│   ├── Orb Renderer (state-driven)
│   └── Transcript Surface (streaming)
├── Right Column
│   ├── Command Stream
│   └── Sequence Builder
└── Bottom Command Bar
    ├── Text Input
    ├── Push-to-Talk Mic
    ├── Suggestion/Shortcut Chips
    └── Send
```

### 2.3 Orb motion & animation states

| Orb state    | Trigger                                 | Animation                     | Reduced-motion fallback |
| ------------ | --------------------------------------- | ----------------------------- | ----------------------- |
| IDLE         | No active session                       | Slow pulse                    | Static glyph            |
| LISTENING    | Mic active / VAD open                   | Rings expand, waveform        | "LISTENING" label       |
| TRANSCRIBING | Speech being decoded                    | Streaming tick                | Spinner                 |
| THINKING     | Planner running                         | Orbit speed-up                | "THINKING" label        |
| EXECUTING    | Tool running                            | Directed pulse                | Progress bar            |
| VERIFYING    | Postcondition check                     | Scan sweep                    | "VERIFYING" label       |
| SPEAKING     | TTS active                              | Speaking bars                 | Waveform icon           |
| DEGRADED     | Partial failure                         | Amber/red tint, non-color cue | Text + icon             |
| FAILED       | Canonical `FAILED` state (hard failure) | Shake/red flash + message     | Text + icon             |

Every animation is derived from real operator state (§3.3); the orb never fabricates status. Orb visual states are **presentations** of the canonical operator state machine — `ERROR` is not a runtime state; all failures map to canonical `FAILED` and are styled separately.

### 2.4 Responsive, error and empty states

- Breakpoints: desktop ≥1280 (full 3-column), tablet 768–1279 (2-column), mobile <768 (stacked; command stream collapses to drawer).
- Empty states: command stream ("No commands yet"), sequence list ("No saved sequences"), transcript ("Say or type a command").
- Error states: visible in command stream with `error` result and recovery hint; never silently swallowed (video observation 14).

---

## 3. Architecture

### 3.1 Target runtime diagram

```text
User
 │
 ├── Text
 ├── Push-to-Talk
 └── Sequence
       │
       ▼
┌───────────────────────┐
│ Z.A.R.V.I.S. Runtime  │
│ Session / Event Loop  │
└───────────┬───────────┘
            │
      Intent Router
            │
         Planner
            │
      Policy Engine
       ┌────┴────┐
       │         │
   Approved   Approval UI
       │
       ▼
     Executor
       │
 ┌─────┼─────────────┐
 ▼     ▼       ▼     ▼
Browser Desktop File Shell
 │
 ▼
Observer / Verifier
 │
 ▼
Audit + Memory + Events
 │
 ├── Command Stream
 ├── Orb State
 ├── Transcript
 └── Voice Response
```

### 3.2 Layers

1. **Session / event loop** — owns the operator session, correlates all events via `session_id`.
2. **Intent router** — maps text/speech to typed intents; resolves ambiguity.
3. **Planner** — produces typed, inspectable plans (never free-form).
4. **Policy engine** — deny-by-default grants, approval routing, budget/frequency/rate limits, kill switch.
5. **Executor** — runs plan steps through the tool gateway with timeout, cancellation, retry.
6. **Adapters** — Browser/Desktop/File/Shell/Application behind typed contracts (§7).
7. **Observer / verifier** — confirms postconditions before success is reported.
8. **Audit + memory + events** — immutable provenance, bounded memory, canonical event stream.

### 3.3 Operator state machine (transition table)

States: `IDLE, LISTENING, TRANSCRIBING, THINKING, PLANNING, AWAITING_APPROVAL, EXECUTING, VERIFYING, SPEAKING, PAUSED, DEGRADED, FAILED, CANCELLED, EMERGENCY_STOPPED`.

| From              | To                                        | Trigger / Guard                                                                                  | Timeout                 | Retry                   | On failure                                             |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------- | ------------------------------------------------------ |
| IDLE              | LISTENING                                 | Push-to-talk start or VAD open; mic permission granted                                           | Listening idle: 15 s    | —                       | → IDLE                                                 |
| LISTENING         | TRANSCRIBING                              | Speech result available                                                                          | STT first-token: 2 s    | STT retry ×2            | → IDLE (no speech)                                     |
| TRANSCRIBING      | THINKING                                  | Utterance finalized                                                                              | —                       | —                       | → DEGRADED                                             |
| THINKING          | PLANNING                                  | Intent resolved                                                                                  | Intent budget: 3 s      | Re-route ×1             | → FAILED                                               |
| PLANNING          | AWAITING_APPROVAL                         | Policy requires human approval                                                                   | Approval wait: 5 min    | —                       | → CANCELLED on reject/timeout                          |
| PLANNING          | EXECUTING                                 | Auto-approved within policy (allowlisted, low risk)                                              | —                       | —                       | → FAILED                                               |
| AWAITING_APPROVAL | EXECUTING                                 | Operator approves / policy override (audited)                                                    | —                       | —                       | → CANCELLED                                            |
| EXECUTING         | VERIFYING                                 | Tool step completes                                                                              | Step timeout (per tool) | Backoff 1 s→30 s, max 3 | → FAILED (non-retryable)                               |
| VERIFYING         | EXECUTING                                 | Postcondition unmet, retry budget left                                                           | Verify timeout: 10 s    | ≤ max attempts          | → FAILED                                               |
| VERIFYING         | SPEAKING                                  | All steps verified                                                                               | —                       | —                       | → DEGRADED                                             |
| SPEAKING          | IDLE                                      | TTS completes                                                                                    | TTS max: 30 s           | —                       | → IDLE                                                 |
| any               | PAUSED                                    | Operator pause (resumable, non-critical)                                                         | —                       | —                       | —                                                      |
| any               | EMERGENCY_STOPPED                         | Emergency stop / kill switch: immediately revoke all ephemeral grants and cancel in-flight tools | —                       | —                       | terminal; requires explicit restart + re-authorization |
| PAUSED            | EXECUTING / VERIFYING / AWAITING_APPROVAL | Resume from checkpoint restores the prior resumable state; grants re-issued only on approval     | —                       | —                       | → EMERGENCY_STOPPED if re-authorization fails          |
| any               | DEGRADED                                  | Partial/soft failure (e.g., one tool unavailable)                                                | Auto-recover ≤ 30 s     | Probe ×3                | → FAILED                                               |
| any               | CANCELLED                                 | Operator reject, plan timeout, or kill switch                                                    | Plan timeout: 15 min    | —                       | terminal                                               |
| any               | FAILED                                    | Hard failure, verification exhausted, or non-retryable error                                     | —                       | —                       | terminal; incident surfaced                            |

**Semantics:** every transition is audited (`from, to, trigger, actor, session_id, plan_id, step_id, ts`). Checkpointing at plan-step granularity enables resume from `PAUSED`/crash (§13). `FAILED`/`CANCELLED`/`EMERGENCY_STOPPED` run cleanup: revoke ephemeral grants, cancel in-flight tools, emit terminal event. `EMERGENCY_STOPPED` additionally latches the kill switch and requires explicit restart and re-authorization before the runtime accepts new sessions — it must never be conflated with ordinary `PAUSED` semantics.

---

## 4. Command & Input Planes

### 4.1 Command taxonomy

| Category    | Examples                                 | Risk        | Approval required      |
| ----------- | ---------------------------------------- | ----------- | ---------------------- |
| Navigation  | "open dashboard", "go to settings"       | None        | No                     |
| Diagnostics | "run health check", "show telemetry"     | None        | No                     |
| Content     | "draft a caption for X"                  | Low         | No                     |
| Publish     | "post to Facebook"                       | High        | Yes (publication)      |
| Sequence    | "run my morning sequence (dry-run)"      | Medium–High | By policy              |
| Automation  | browser/desktop control                  | High        | Yes unless allowlisted |
| System      | pause, emergency stop, credential config | Critical    | Yes (admin)            |

### 4.2 Command stream event

```json
{
  "id": "evt_...",
  "session_id": "...",
  "plan_id": "...",
  "step_id": "...",
  "ts": "ISO-8601",
  "actor": "operator|zarvis|policy|system",
  "intent": "publish",
  "tool": "facebook_publish",
  "target": "https://...",
  "risk": "high",
  "approval": "approved|denied|not_required",
  "result": "ok|error|blocked|cancelled",
  "duration_ms": 0,
  "correlation_id": "..."
}
```

### 4.3 Sequence Builder

```json
{
  "id": "seq_...",
  "name": "morning-brief",
  "mode": "chat|operator|automation",
  "steps": [
    { "id": "s1", "intent": "fetch_queue", "args": {} },
    { "id": "s2", "intent": "summarize", "args": { "input": "s1.result" } },
    { "id": "s3", "intent": "speak", "args": { "text": "s2.result" } }
  ],
  "dryRun": false
}
```

Execution semantics: sequential steps; step outputs addressable (`s<N>.result`); each step idempotent via `idempotency_key`; partial failure stops and offers resume; save/run/dry-run supported; replay after failure is allowed only with operator confirmation for high-risk steps.

---

## 5. Voice Plane

- Browser microphone capture; VAD and push-to-talk modes; streaming STT adapter; barge-in/interruption support; streaming TTS adapter; provider-neutral STT/TTS interfaces with local-provider option.
- **Latency budgets:** STT first-token ≤ 2 s; TTS first-audio ≤ 1.5 s; end-to-end voice command → plan start ≤ 5 s (P95).
- **Fallback matrix:**

| Failure               | Fallback                                     |
| --------------------- | -------------------------------------------- |
| STT provider down     | Secondary STT provider, then text-only input |
| TTS provider down     | Secondary TTS, then silent text reply        |
| Mic permission denied | Text-only with visible notice                |
| Barge-in unreliable   | Disable barge-in for the session             |

- No raw audio persistence by default; retention requires explicit policy.

---

## 6. Agent & Orchestration Plane

### 6.1 Intent router

Classify utterances to typed intents with confidence; below threshold → clarifying question; unsupported intent → visible "cannot do" message with suggestions (never silent).

### 6.2 Planner

```json
{
  "plan_id": "...",
  "session_id": "...",
  "intent": "...",
  "steps": [
    {
      "step_id": "p1",
      "tool": "browser_navigate",
      "args": {},
      "risk": "low",
      "depends_on": []
    }
  ],
  "policy_verdict": "approved|approval_required|denied",
  "estimated_cost": 0,
  "created_at": "ISO-8601"
}
```

### 6.3 Skill manifest (registry)

```json
{
  "skill_id": "queue-brief",
  "version": "1.0.0",
  "description": "...",
  "capabilities": ["queue.read", "speak"],
  "entry": { "intent": "queue_brief" },
  "permissions": ["queue:read"],
  "max_cost_per_run": 0.1,
  "approval": "none"
}
```

### 6.4 Agent registry & delegation

Bounded delegation: parent agent may hand a sub-task to a registered child agent only within policy; child executes under inherited grants, emits its own provenance chain, and returns typed results. Delegation depth and fan-out are capped.

### 6.5 Tool gateway

Deny-by-default; explicit grants scoped by user/workspace/session; tool schemas enforced (zod-style validation); every call carries `session_id, plan_id, step_id, risk, approval, idempotency_key`.

### 6.6 Executor

Timeout, cancellation and retry per §3.3; graceful cancel propagates to adapters; orphaned tool calls are reconciled on session resume.

### 6.7 Observer / verifier

Each step declares postconditions; verifier confirms them before success; failure evidence stored with the step.

### 6.8 Memory boundaries

| Store    | Scope                         | Consent           | Retention        |
| -------- | ----------------------------- | ----------------- | ---------------- |
| Working  | Current session context       | Implicit          | Session end      |
| Episodic | Prior session summaries       | Explicit opt-in   | Configurable TTL |
| Durable  | User-approved facts/sequences | Explicit approval | Until revoked    |

---

## 7. Computer-Use Plane

All adapters are typed and sandboxed — never raw uncontrolled shell/browser access.

| Tool              | Capabilities                                                                        | Guardrails                               |
| ----------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| `BrowserTool`     | navigate, inspect DOM/a11y tree, click, type, upload, download metadata, screenshot | Origin allowlist, session-scoped profile |
| `DesktopTool`     | enumerate apps/windows, focus, keyboard/mouse, screen observation                   | App allowlist, no stealth                |
| `FileTool`        | sandboxed read/write                                                                | Workspace roots, path policy             |
| `ShellTool`       | allowlisted commands                                                                | Sandbox/container, resource+time limits  |
| `ApplicationTool` | typed adapters                                                                      | API-over-coordinates preference          |

**Observation → action loop:** observe (a11y tree/screen) → decide (policy-checked) → act → verify → record evidence. Observed browser/screen content is **untrusted data**: it can never grant tools or change policy (prompt-injection defense).

**Tool contract (request/response):**

```json
{
  "request": {
    "session_id": "",
    "plan_id": "",
    "step_id": "",
    "tool": "",
    "action": "",
    "args": {},
    "risk": "",
    "approval": "",
    "idempotency_key": "",
    "timeout_ms": 0
  },
  "response": {
    "ok": true,
    "result": {},
    "evidence": [],
    "duration_ms": 0,
    "verification": "passed|failed|pending"
  }
}
```

---

## 8. Safety & Security Boundary

### 8.1 Mandatory controls (unchanged from observed baseline)

- Deny-by-default tool permissions; explicit grants scoped by user/workspace/session.
- Approval required for destructive, external side-effect, credential, financial, publication and privilege-changing actions.
- Domain/application allowlists for autonomous execution.
- Secret redaction in UI, logs, screenshots and model context.
- Prompt-injection defense: observed content is untrusted data, never authority.
- Sandboxed shell/filesystem execution; rate, cost and step limits.
- Emergency stop transitions to the terminal `EMERGENCY_STOPPED` state: cancels active plans, revokes ephemeral grants immediately, and requires explicit restart and re-authorization before new sessions are accepted.
- Pairing QR tokens short-lived, single-use, bound to an authenticated operator session.

### 8.2 Threat model / risk matrix

| Threat                                  | Vector                            | Control                                              | Residual risk |
| --------------------------------------- | --------------------------------- | ---------------------------------------------------- | ------------- |
| Prompt injection via web/screen content | Malicious page instructs tools    | Content = untrusted data; no tool grant from content | Low           |
| Tool permission bypass                  | Step requests unlisted capability | Deny-by-default + schema validation + audit          | Low           |
| Plan replay / duplicate side effect     | Re-executed step                  | `idempotency_key` per step; transactional claims     | Low           |
| Secret leakage                          | Logs/screenshots/context          | Redaction pipeline; secret scan in CI                | Low           |
| Approval bypass                         | Policy override abuse             | Overrides audited; admin-only; 4-eyes for critical   | Medium        |
| Pairing token theft                     | QR interception                   | Single-use, short TTL, session-bound                 | Low           |
| Unbounded cost/run                      | Long/looping plans                | Cost/step/rate limits; plan timeout                  | Low           |
| Compromised provider credential         | Exfiltrated token                 | Least-privilege, per-env rotation, audit             | Medium        |

---

## 9. Backend API Contracts

Transport: SSE/WebSocket for transcript, command-stream, plan-step, telemetry and speech state updates. REST for commands and queries.

| Endpoint                             | Method   | Request                               | Response / events                              |
| ------------------------------------ | -------- | ------------------------------------- | ---------------------------------------------- |
| `/v1/operator/sessions`              | POST     | `{ mode, capabilities }`              | `{ session_id, pairing_token? }`               |
| `/v1/operator/sessions/:id/events`   | SSE      | —                                     | `event` stream (catalog §10)                   |
| `/v1/operator/sessions/:id/commands` | POST     | `{ text?, audio_ref?, sequence_id? }` | `{ command_id, plan_id }`                      |
| `/v1/operator/sessions/:id/cancel`   | POST     | `{ reason }`                          | `{ status: "cancelling" }`                     |
| `/v1/operator/plans/:id`             | GET      | —                                     | plan object (§6.2)                             |
| `/v1/operator/plans/:id/approve`     | POST     | `{ decision }`                        | updated plan                                   |
| `/v1/operator/plans/:id/reject`      | POST     | `{ reason }`                          | updated plan                                   |
| `/v1/operator/sequences`             | GET/POST | sequence object (§4.3)                | sequence list                                  |
| `/v1/operator/sequences/:id/run`     | POST     | `{ dry_run }`                         | `{ run_id }`                                   |
| `/v1/operator/skills`                | GET      | —                                     | skill manifests (§6.3)                         |
| `/v1/operator/agents`                | GET      | —                                     | agent registry                                 |
| `/v1/operator/tools`                 | GET      | —                                     | tool catalog + grants                          |
| `/v1/operator/pairing`               | POST     | —                                     | short-lived QR token                           |
| `/v1/operator/telemetry`             | SSE      | —                                     | CPU/RAM/network/worker/queue/model/tool health |

---

## 10. Event Catalog (canonical)

| Event                                              | Actor          | Payload (key)                  | Consumers                 |
| -------------------------------------------------- | -------------- | ------------------------------ | ------------------------- |
| `session.started` / `session.ended`                | system         | session_id, mode               | audit, telemetry          |
| `input.received`                                   | operator       | type (text/voice/sequence)     | transcript, orb           |
| `transcript.partial` / `transcript.final`          | STT            | text, confidence               | transcript, orb           |
| `intent.resolved`                                  | router         | intent, confidence             | planner, audit            |
| `plan.created` / `plan.approved` / `plan.rejected` | planner/policy | plan_id, verdict               | UI, audit                 |
| `step.started` / `step.finished` / `step.failed`   | executor       | plan_id, step_id, tool, result | command stream, telemetry |
| `tool.require_approval`                            | policy         | step_id, risk                  | approval drawer           |
| `verification.passed` / `verification.failed`      | verifier       | step_id, evidence              | command stream            |
| `speech.started` / `speech.ended`                  | TTS            | text                           | orb, transcript           |
| `pairing.issued` / `pairing.consumed`              | system         | token_id                       | pairing UI                |
| `incident.raised` / `incident.resolved`            | monitor        | level, scope                   | incident overlay, SLOs    |
| `emergency.stop`                                   | operator       | reason                         | all subscribers           |

---

## 11. Persistence Model

Entities: `operator_commands, operator_events, operator_plans, operator_plan_steps, operator_sequences, operator_sequence_steps, skill_manifests, agent_manifests, tool_grants, tool_executions, verification_evidence, voice_sessions, pairing_tokens`.

| Entity                                              | Key relations                   | Indexes                    | Retention                      |
| --------------------------------------------------- | ------------------------------- | -------------------------- | ------------------------------ |
| `operator_plans`                                    | 1:N `operator_plan_steps`       | `session_id, created_at`   | 90 d                           |
| `operator_plan_steps`                               | N:1 plan; 1:N `tool_executions` | `plan_id, (status)`        | 90 d                           |
| `operator_events`                                   | N:1 session                     | `session_id, ts, (type)`   | 180 d (audit immutable)        |
| `tool_executions`                                   | N:1 step                        | `(idempotency_key)` unique | 90 d                           |
| `verification_evidence`                             | 1:1 step/execution              | `step_id`                  | 90 d                           |
| `pairing_tokens`                                    | 1:1 session                     | `(token_hash)` unique      | TTL 5 min                      |
| `voice_sessions`                                    | 1:1 session                     | `session_id`               | 24 h (no raw audio by default) |
| `skill_manifests`, `agent_manifests`, `tool_grants` | registry                        | `(id, version)`            | indefinite (versioned)         |

Audit events are append-only; all others are mutable operational state. Retention is configurable per deployment.

---

## 12. Observability & SLOs

**Metrics:** operator sessions, commands/sec, intent-resolution rate, plan completion rate, tool success/failure/retry counts, approval latency, voice latency, cost/run, pairing success, incident count.
**Traces:** one trace per command: input → intent → plan → step → tool → verify → response, with `session_id`/`plan_id`/`step_id` as span attributes.
**SLOs (target):**

| SLO                             | Target     |
| ------------------------------- | ---------- |
| Command → plan start (text)     | ≤ 2 s P95  |
| Voice first-token               | ≤ 2 s P95  |
| Tool success rate (allowlisted) | ≥ 99%      |
| Plan completion (no incident)   | ≥ 98%      |
| Approval decision latency       | ≤ 30 s P95 |
| Operator surface availability   | ≥ 99.9%    |
| Secret leakage incidents        | 0          |

---

## 13. Recovery Model

- **Crash:** session state reconstructible from `operator_events`; in-flight steps reconciled via `idempotency_key`; non-terminal plans marked for resume.
- **Reconnect:** SSE/WebSocket resume with last `sequence_id`; UI replays command stream from persisted events.
- **Checkpoint:** plan-step granularity; resume from last verified step; unverified steps re-verify before continuation.
- **Pause vs emergency stop:** `PAUSED` resumes to the prior resumable state (`EXECUTING`/`VERIFYING`/`AWAITING_APPROVAL`); `EMERGENCY_STOPPED` is terminal and requires explicit restart + re-authorization.
- **Dead-letter:** steps failing past retry budget land in dead-letter with incident raised; operator may retry, cancel, or quarantine.
- **Backup/restore:** covered by `scripts/backup.sh` + `scripts/verify-backup.sh`; operator tables included in restore drills.

---

## 14. Testing & Release Evidence

- State-machine unit tests (every transition in §3.3).
- Planner schema/property tests.
- Tool permission and approval-bypass tests.
- Prompt-injection tests using malicious browser/page content.
- Browser/desktop provider-fake tests.
- Cancellation/timeout/retry/idempotency tests.
- Voice interruption and reconnect tests.
- Sequence replay and partial-failure tests.
- QR token expiry/replay tests.
- Audit completeness tests.
- E2E: voice/text command → plan → approval → tool execution → verification → spoken/UI result.
- Soak tests for long operator sessions and streaming reconnect.

### 14.1 Acceptance matrix (measurable)

| Gate          | Exit criterion                                                          |
| ------------- | ----------------------------------------------------------------------- |
| State machine | All §3.3 transitions covered by tests; timeout/retry/cancel paths green |
| Policy        | Bypass attempts blocked (test suite); approval matrix enforced          |
| Security      | Prompt-injection + secret-leakage suites green; trivy/gitleaks clean    |
| Voice         | Latency SLOs met in staging; fallback matrix exercised                  |
| E2E           | Full voice/text → verified action flow passes in staging                |
| Recovery      | Crash mid-plan resumes without duplicate side effects                   |
| Soak          | 12 h operator session, zero unrecoverable failures                      |

---

## 15. Implementation Order

1. M12 contracts + operator state machine + event stream.
2. Z.A.R.V.I.S. card and Command Stream wired to real events.
3. Sequence Builder persistence and execution.
4. Skill/tool registries and policy gateway.
5. Browser automation adapter + verifier.
6. Desktop/application adapter + verifier.
7. Voice STT/TTS + push-to-talk + barge-in.
8. Mobile pairing.
9. Advanced autonomous mode with bounded budgets and approvals.
10. Full security/E2E/soak/recovery evidence and production rollout.

---

## 16. Definition of Done

M12 is complete only when the visual operator is backed by real state, all tool execution passes through policy/approval, failures are visible and recoverable, actions are auditable and verifiable, tests cover permission bypass/prompt injection/cancellation/replay, and the full voice/text-to-action workflow passes the §14.1 acceptance matrix and staging release gates.
