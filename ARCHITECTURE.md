# Zeto Architecture

Zeto is an AI content factory with a versioned API, durable workflow execution, provider abstraction, policy/approval enforcement, multi-platform publishing, monitoring, analytics, and auditable operations.

## Layers

1. **HTTP/API** — `/v1` routes, authentication, authorization, validation, idempotency and correlation IDs.
2. **Application services** — use cases and orchestration without transport or provider details.
3. **Domain/workflows** — content lifecycle, approvals, publication states and workflow state machines.
4. **Repositories** — persistence contracts; PostgreSQL is the production target.
5. **Providers** — AI models, publishing platforms and object storage behind stable interfaces.
6. **Workers** — durable asynchronous execution with retries, cancellation, deadlines and dead-letter handling.
7. **Observability** — structured logs, metrics, traces and immutable audit events.

## Canonical lifecycle

`IDEATE → GENERATE → WRITE → APPROVE → SCHEDULE → PUBLISH → MONITOR → LEARN`

## Critical invariants

- Provider secrets stay server-side.
- Side effects are idempotent.
- Autonomous publishing cannot bypass QA, policy or budget limits.
- All mutations emit audit events.
- Platform-specific behavior lives in adapters.
- Every generated artifact retains provenance and version information.
- Analytics must be reproducible from persisted source data.

## Migration strategy

The current JSON-backed Facebook automation remains functional while behavior is moved behind repository and provider contracts. Migration proceeds by vertical slices rather than a big-bang rewrite. PostgreSQL becomes authoritative only after schema/migration tests and restart/idempotency tests pass.
