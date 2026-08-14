# Zeto Execution Plan

> Repository target: `cvsz/zeto`
>
> Current repository during migration: `cvsz/zfbauto`
>
> Current application baseline: v1.1.0 Facebook Page automation dashboard.

## 1. Mission

Evolve the existing Facebook automation dashboard into **Zeto**, a production-grade AI Content Factory that executes the complete lifecycle:

```text
IDEATE → GENERATE → WRITE → APPROVE → SCHEDULE → PUBLISH → MONITOR → LEARN
```

The implementation follows the ProMaster/P-MASTER operating model:

```text
ROLE → INPUTS → MODES → CONSTRAINTS → OUTPUT → SELF-CHECK
```

Every major AI module must support three lifecycle modes:

- `PRODUCTION` — create the requested artifact.
- `OPS` — operate the feature continuously and safely.
- `OPTIMIZE` — learn from metrics and improve future outputs.

The existing Facebook functionality is the first production publishing adapter, not a disposable prototype.

---

## 2. Baseline

Current implemented capabilities:

- Dashboard and KPI overview.
- Rich-text/photo Facebook publishing.
- Local post queue.
- Cron-based scheduler.
- Facebook Page feed management.
- Publish history/audit-style activity records.
- Settings UI and server-side configuration.
- Analytics visualization entry point.
- AI Generator UI entry point.
- Express backend and static SPA frontend.
- JSON-backed persistence.

Current technical constraints:

- Persistence is local JSON instead of a transactional database.
- No durable distributed job queue.
- No formal approval state machine.
- No unified `/v1` API boundary.
- No model-provider abstraction/fallback router.
- No full observability stack.
- No production test suite.
- No policy engine covering all generated assets.
- Facebook is the only implemented publishing adapter.

---

## 3. Naming and Repository Migration

### Required repository migration

Target repository identity:

```text
cvsz/zfbauto  →  cvsz/zeto
```

Migration checklist:

- [ ] Rename GitHub repository to `zeto`.
- [x] Rename package from `@zeaz/zfbauto` to `@zeaz/zeto`.
- [x] Update README product identity to Zeto.
- [x] Add this execution plan.
- [ ] Replace remaining UI labels containing `zfbauto` or `FB Auto` when they refer to the product rather than the Facebook adapter.
- [ ] Update clone URLs and documentation links after GitHub rename.
- [ ] Update CI/CD repository references, deployment targets, badges, webhooks, GitHub App configuration, and environment integrations.
- [ ] Preserve redirects from the old GitHub repository URL where GitHub provides them.
- [ ] Verify branch protection and secrets after rename.

Product naming rule:

- **Zeto** = product/platform.
- **Facebook Adapter** = one publishing integration inside Zeto.
- Do not use `zfbauto` as a new code namespace after migration.

---

## 4. Target Architecture

```mermaid
flowchart LR
    UI[Zeto Dashboard] --> API[/v1 API Gateway]
    API --> AUTH[Auth & Policy]
    API --> IDEAS[Strategy / M01]
    API --> GEN[Generation / M02-M05]
    API --> QA[QA & Approval / M10]
    API --> PUB[Calendar & Publish / M06]
    API --> MON[Monitoring / M07]
    API --> BI[Analytics / M08]
    API --> ORCH[Orchestrator / M09]

    ORCH --> QUEUE[Durable Job Queue]
    QUEUE --> WORKERS[Worker Pool]

    GEN --> MODELS[AI Model Router]
    MODELS --> IMG[Image Providers]
    MODELS --> VIDEO[Video Providers]
    MODELS --> AUDIO[Audio Providers]
    MODELS --> LLM[LLM Providers]

    PUB --> ADAPTERS[Publishing Adapters]
    ADAPTERS --> FB[Facebook]
    ADAPTERS --> IG[Instagram]
    ADAPTERS --> TT[TikTok]
    ADAPTERS --> YT[YouTube]
    ADAPTERS --> X[X]
    ADAPTERS --> LI[LinkedIn]

    API --> DB[(PostgreSQL)]
    WORKERS --> DB
    WORKERS --> OBJ[(Object Storage)]
    API --> OBS[Logs / Metrics / Traces / Audit]
```

Architecture principles:

1. Provider secrets remain server-side.
2. All mutating operations are authenticated, authorized, auditable, and idempotent.
3. Publishing is adapter-based; platform-specific logic never leaks into core workflow state.
4. AI generation is provider-agnostic with explicit fallback chains and cost limits.
5. Human approval remains available even when `AUTO_PILOT=true`.
6. Every async job has retry, timeout, cancellation, ownership, and failure-state semantics.
7. Every generated artifact records provenance.
8. APIs are versioned under `/v1`.

---

## 5. Core Domain Model

Minimum production entities:

```text
brands
brand_kits
users
roles
provider_credentials
ideas
assets
asset_variants
captions
posts
schedules
publications
metrics_daily
mentions
sentiment_scores
competitors
workflows
workflow_runs
workflow_steps
approvals
model_routes
cost_events
alerts
audit_events
```

Required canonical integration objects:

### Asset

```json
{
  "id": "asset_id",
  "type": "image|video|audio|caption",
  "prompt_hash": "sha256",
  "seed": "provider_seed",
  "brand_delta_e": 0,
  "lufs": -14,
  "ar": "9:16",
  "tags": [],
  "score": 0,
  "status": "draft|review|approved|blocked|published",
  "version": 1
}
```

### Post

```json
{
  "id": "post_id",
  "asset_ids": [],
  "caption": "",
  "hashtags": [],
  "platform": "facebook",
  "slot": "ISO-8601",
  "status": "queued|live|failed",
  "permalink": "",
  "retry_count": 0
}
```

### Digest

```json
{
  "date": "YYYY-MM-DD",
  "volume": 0,
  "vol_delta": 0,
  "sentiment": 0,
  "rising": [],
  "replies": [],
  "opportunities": [],
  "alerts": []
}
```

---

## 6. Module Delivery Matrix

| Module | Capability | Primary production output | Ops responsibility | Optimization loop |
|---|---|---|---|---|
| M01 | Strategy & Ideation | Scored ideas, pillars, hooks | Daily idea standup | Recalibrate idea scoring |
| M02 | AI Image | Image prompts + variants | Batch generation | Style-token performance |
| M03 | AI Video | Reel/avatar/B-roll specs | Render queue | Retention-curve tuning |
| M04 | AI Music & Audio | Jingles, loops, stings, sonic logo | Audio library ops | Track/watch-time correlation |
| M05 | Captions/Hooks/Hashtags | Platform-ready copy | Daily caption packs | Hook/CTA analysis |
| M06 | Calendar & Auto-Post | Content calendar | Idempotent publisher | Best-time recompute |
| M07 | Monitoring & Sentiment | Alerts/digests/replies | Social listening | Threshold tuning |
| M08 | Analytics Dashboard | KPI/dashboard views | Daily factory report | Weekly executive review |
| M09 | Automation & API | End-to-end workflows | Pipeline health | Cost/latency optimization |
| M10 | QA/Brand Safety | 12-point score + approval | Approval routing | Calibration of policy weights |

---

## 7. Delivery Phases

## Phase 0 — Rebrand and Engineering Baseline

### Goals

Make Zeto the canonical product identity and establish a trustworthy engineering baseline before feature expansion.

### Deliverables

- Repository rename to `cvsz/zeto`.
- Replace stale product-name references.
- Keep Facebook-specific names only inside Facebook adapter code.
- Add `AGENTS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and ADR directory.
- Add `.env.example` documentation for every supported environment variable.
- Add ESLint/prettier/format checks.
- Replace placeholder test script with a real test runner.
- Add unit/integration/API test structure.
- Add GitHub Actions for lint, tests, dependency audit, secret scanning, and container build.
- Pin production runtime and dependency policy.

### Exit criteria

- Clean install from a fresh checkout.
- Lint passes.
- Tests pass.
- Container starts and `/health` reports healthy.
- No committed secrets.
- README and runtime branding use Zeto consistently.

---

## Phase 1 — Persistence, API Boundary, and Workflow Foundation

### Goals

Replace local-only storage with durable state and define stable application boundaries.

### Deliverables

- PostgreSQL adapter and migrations.
- Repository/data-access layer separated from HTTP handlers.
- `/v1` API namespace.
- Request validation and typed schemas.
- Durable job abstraction.
- Workflow and approval state machines.
- Audit-event writer.
- Idempotency key support for mutating endpoints.
- Correlation/request IDs.
- Object-storage abstraction for generated media.

### Minimum schema

Implement the entities listed in Section 5 with foreign keys, timestamps, unique constraints, indexes, and retention strategy.

### Exit criteria

- No business logic depends directly on JSON files.
- Queue/schedule/publication state survives restarts.
- Duplicate publish commands do not create duplicate posts.
- Every mutation produces an audit event.

---

## Phase 2 — Prompt Compiler + M01-M05 Generation Plane

### Goals

Implement the content creation side of the factory.

### Deliverables

#### ProMaster Compiler

Inputs:

```text
brand
niche
voice
colors
fonts
platforms
goals
timezone
budget_per_asset
stack
image_model
video_model
audio_model
```

Compiler requirements:

- Resolve all placeholders before execution.
- Preserve P-MASTER structure.
- Produce machine-readable JSON outputs where required.
- Preserve approval gates unless explicitly configured otherwise.
- Append brand-kit policy to every asset generation request.

#### M01 Strategy & Ideation

- 90-day strategy generation.
- Content pillars.
- Persona/pain mapping.
- Idea scoring.
- Hook bank.
- Daily/weekly optimization routines.

#### M02 AI Image

- Prompt/negative-prompt generator.
- Aspect-ratio policy.
- Variant seeds.
- Prompt hash and palette provenance.
- Brand-delta validation.

#### M03 AI Video

- Reel, avatar, and B-roll templates.
- Timecoded shot lists.
- Caption and CTA requirements.
- Provider-independent render jobs.

#### M04 AI Audio

- Generated licensed audio only.
- LUFS metadata and validation.
- Mood/BPM/use-case tagging.
- Licensing provenance.

#### M05 Captions

- Per-platform rewriting.
- Hook/CTA/hashtag generation.
- Alt text and SEO description.
- Character-limit validation.

### Model Router

Implement task-based routing:

```text
Task → Preferred Model → Fallback 1 → Fallback 2 → Failure Queue
```

Each route records:

- model/provider,
- latency,
- input/output usage,
- estimated cost,
- retry count,
- quality score,
- fallback reason.

### Exit criteria

- One idea can generate a complete draft asset pack.
- All artifacts have provenance and versioning.
- Cost caps are enforceable before generation.
- Provider failure triggers bounded fallback rather than losing the workflow.

---

## Phase 3 — M10 QA, Brand Safety, and Human Approval

### Goals

No generated artifact reaches autonomous publishing without enforceable policy evaluation.

### 12-point QA scorer

Score these dimensions:

1. Brand palette.
2. Font policy.
3. Logo rule.
4. Claim substantiation.
5. Platform policy.
6. Copyright/music clearance.
7. Text length.
8. Safe margins.
9. Alt text.
10. Hashtag risk.
11. Sentiment/reputation risk.
12. CTA presence.

Routing policy:

```text
score < 70    → BLOCK
score 70-89   → HUMAN REVIEW
score >= 90   → AUTO-PASS only when AUTO_PILOT=true
```

Humans always retain override authority.

### Exit criteria

- Every asset has a visible score breakdown.
- Every block includes reasons and remediation hints.
- Approval decisions are immutable audit records.
- Publishing checks approval state transactionally.

---

## Phase 4 — M06 Calendar, Scheduling, and Production Publishing

### Goals

Turn the current scheduler into a durable publishing subsystem.

### Deliverables

- Calendar service with timezone-safe slots.
- Publication state machine.
- Idempotent publishing.
- Retry policy with exponential backoff and jitter.
- Dead-letter/failure queue.
- Manual retry/cancel operations.
- Publication IDs and permalinks persisted.
- Evergreen content recycling rules.
- Best-time recommendations from historical metrics.

### Facebook adapter hardening

- Encapsulate Meta Graph API logic behind `PublishingProvider` interface.
- Validate permissions/token state.
- Normalize API errors.
- Respect rate limits.
- Add token-expiry diagnostics.
- Add publish/delete/read tests with provider fakes.

### Exit criteria

- Restarting Zeto cannot duplicate a scheduled publication.
- Failed jobs are inspectable and retryable.
- All publication attempts have audit and provider-response metadata.

---

## Phase 5 — M07 Monitoring, Sentiment, Competitor Intelligence

### Goals

Close the operational feedback loop.

### Deliverables

- Mention ingestion adapters.
- Comment classification: `question|complaint|praise|spam|lead`.
- Sentiment score normalized to 0-100.
- Configurable alert rules.
- Reply-draft generation.
- Escalation workflow and SLA timers.
- Lead handoff interface.
- Competitor metrics model.

Default alert classes:

- volume spike,
- sentiment deterioration,
- viral negative content,
- competitor pricing mention,
- creator/influencer mention,
- overdue critical reply.

### Exit criteria

- Alerts are deduplicated.
- Every complaint has a draft response or escalation record.
- Alert precision/recall can be measured for future threshold tuning.

---

## Phase 6 — M08 Analytics and Control Room

### Goals

Create a measurable operating system for the factory.

### Required dashboard areas

- Followers/reach/engagement deltas.
- Best publishing times.
- Idea → Generating → Review → Scheduled → Live kanban.
- Mention feed with sentiment.
- 30-day trends.
- Platform performance cards.
- Production queue status.
- Alerts.
- Approvals.
- Cost per asset.
- Model latency/failure rate.

Each metric/chart must define:

- SQL/query source,
- period,
- prior-period comparison,
- empty-state behavior,
- mobile behavior.

### Exit criteria

- Every displayed KPI is reproducible from persisted data.
- Dashboard never fabricates unavailable data.
- Daily Factory Report and weekly executive summary can be generated from the same source metrics.

---

## Phase 7 — M09 Orchestration and AUTO-PILOT

### Goals

Operate the factory as a reliable event-driven workflow.

### Canonical chain

```text
M01[OPS]
  → M02-M05[PRODUCTION]
  → M10[QA]
  → approval gate
  → M06[publish]
  → M07[monitor]
  → M08[report]
  → M01-M05[OPTIMIZE]
```

### Orchestration requirements

- Durable workflow run IDs.
- Step-level ownership and status.
- Retry and compensation policies.
- Cancellation.
- Timeout handling.
- Idempotent side effects.
- Artifact passing through typed JSON contracts.
- Stuck-job detection.
- Per-run cost accounting.
- Human-intervention checkpoints.

### AUTO-PILOT guardrails

`AUTO_PILOT=true` never means unrestricted execution.

Autonomous actions must still obey:

- QA score threshold,
- approved platform permissions,
- budget cap,
- posting frequency cap,
- claim/copyright rules,
- emergency kill switch,
- audit logging.

### Exit criteria

- A workflow can run end-to-end without manual data copying.
- Any failed step is resumable without replaying successful side effects.
- The operator can stop all autonomous publishing immediately.

---

## Phase 8 — Multi-Platform Publishing

### Goals

Generalize Zeto beyond Facebook without compromising the Facebook production path.

Suggested adapter sequence:

1. Instagram.
2. YouTube.
3. TikTok.
4. X.
5. LinkedIn.

Each adapter must implement a shared contract for:

- auth validation,
- capability discovery,
- publish,
- media upload,
- delete where supported,
- publication status,
- metrics ingestion,
- normalized errors,
- rate-limit metadata.

### Exit criteria

- Core workflow code contains no platform-specific branching beyond adapter capability checks.
- Platform-specific validation occurs before queue acceptance.

---

## Phase 9 — Production Hardening and Final Release

### Reliability

- Health/readiness endpoints.
- Graceful shutdown.
- Worker heartbeats.
- DB connection-pool limits.
- Request/job timeouts.
- Exponential retry with bounded attempts.
- Dead-letter queues.
- Disaster-recovery documentation.
- Backup/restore verification.

### Security

- Secret manager integration.
- Least-privilege provider credentials.
- Encryption at rest/in transit.
- CSRF/session policy as applicable.
- Input validation and output encoding.
- Upload MIME/size validation.
- SSRF protection for remote media URLs.
- Rate limiting.
- Dependency and container scanning.
- Security event audit trail.

### Observability

- Structured JSON logs.
- Metrics for HTTP, jobs, providers, publishing, generation cost, and approvals.
- Distributed traces for workflow runs.
- Alerting on availability, error rate, stuck jobs, queue depth, and provider degradation.

### Release gates

- Unit tests.
- Integration tests.
- API contract tests.
- Workflow state-machine tests.
- Provider-fake tests.
- End-to-end smoke tests.
- Migration tests.
- Security checks.
- Performance/load baseline.
- Rollback test.

### Final release exit criteria

- Zero known critical/high security defects.
- CI green on protected main branch.
- Database migrations are forward-safe and rollback strategy is documented.
- Publishing duplication tests pass.
- Approval bypass tests pass.
- Provider-secret leakage tests pass.
- Full end-to-end factory workflow passes in staging.
- Operational runbook and incident procedures exist.

---

## 8. API Design

Target all new APIs under `/v1`.

Suggested resource groups:

```text
/v1/brands
/v1/ideas
/v1/assets
/v1/captions
/v1/posts
/v1/schedules
/v1/publications
/v1/metrics
/v1/mentions
/v1/competitors
/v1/workflows
/v1/approvals
/v1/providers
/v1/model-routes
/v1/alerts
/v1/audit-events
```

API requirements:

- JSON schema validation.
- Stable error envelope.
- Pagination.
- Idempotency keys for side-effecting operations.
- Request IDs.
- Explicit authorization checks.
- OpenAPI generation.
- No provider secret values in responses.

---

## 9. Background Job Contract

Every job must include:

```json
{
  "id": "job_id",
  "workflow_run_id": "run_id",
  "type": "generate|qa|publish|monitor|report",
  "attempt": 1,
  "max_attempts": 3,
  "timeout_ms": 120000,
  "idempotency_key": "key",
  "owner": "module_or_service",
  "payload": {},
  "created_at": "ISO-8601"
}
```

Job states:

```text
queued → running → succeeded
               ↘ retry_wait → running
               ↘ failed
               ↘ cancelled
```

---

## 10. Testing Strategy

### Unit

- Scoring logic.
- Schedule calculations.
- Retry policy.
- Provider normalization.
- P-MASTER compiler validation.
- Cost-cap decisions.

### Integration

- PostgreSQL repositories.
- Queue and worker behavior.
- Approval transactions.
- Object storage.
- Adapter fakes.

### Contract

- `/v1` request/response schemas.
- Publishing provider interface.
- Model provider interface.
- Webhook signatures.

### End-to-end

Critical scenarios:

1. Idea → approved asset → scheduled Facebook publication.
2. Rejected QA artifact never publishes.
3. Publish retry succeeds without duplicate publication.
4. Provider failure uses fallback model.
5. Budget cap blocks generation.
6. AUTO-PILOT respects approval/QA policy.
7. Restart resumes queued workflows safely.
8. Monitoring alert creates escalation.

---

## 11. Delivery Rules

For each vertical slice:

1. Add/update design documentation.
2. Add tests first or in the same change.
3. Implement domain logic.
4. Implement API/UI integration.
5. Add metrics/logging/audit hooks.
6. Run lint/tests/security checks.
7. Update changelog.
8. Merge only when the slice is independently deployable.

Prefer small production-complete vertical slices over large unfinished framework commits.

---

## 12. Priority Order

```text
P0  Repository rename + baseline CI/tests
P0  PostgreSQL + durable workflow state
P0  Approval/QA safety boundary
P0  Idempotent Facebook publishing
P1  Prompt compiler + M01/M02/M05
P1  Model routing/fallback/cost accounting
P1  M06 calendar and publication operations
P1  M08 operational analytics
P2  M03 video + M04 audio
P2  M07 listening/sentiment
P2  M09 full AUTO-PILOT orchestration
P3  Additional social-platform adapters
P3  Advanced optimization loops
```

---

## 13. Definition of Done

A Zeto capability is complete only when:

- code is implemented,
- input/output contracts are validated,
- failures are handled,
- security boundaries are enforced,
- tests cover success and failure paths,
- logs/metrics/audit events exist,
- documentation is updated,
- upgrade/migration impact is known,
- the capability is deployable without hidden manual steps.

The final product is not considered complete merely because UI screens exist; each module must have a real backend path, durable state, policy enforcement, tests, and observable production behavior.
