# Zeto Engineering Agent Guide

## Mission
Implement `exec-planing.md` incrementally with production-grade quality. Prefer small vertical slices that leave `main` deployable.

## Required checks
- Never expose provider credentials to browser code.
- Keep publishing platform logic behind adapters.
- Mutations must be authenticated, authorized, auditable, and idempotent where relevant.
- Preserve human approval gates for autonomous publishing.
- Add or update tests with every behavioral change.
- Do not fabricate analytics data; expose explicit empty states.

## Change workflow
1. Read the relevant execution-plan phase.
2. Inspect current behavior and interfaces.
3. Implement the smallest complete vertical slice.
4. Add tests and operational documentation.
5. Run lint, tests, dependency audit, and container build.
6. Open a PR with risks, migrations, rollback notes, and verification evidence.

## Architecture boundaries
- `src/http/`: HTTP transport and validation only.
- `src/services/`: domain/application orchestration.
- `src/repositories/`: persistence contracts and implementations.
- `src/providers/`: external AI/publishing/object-storage adapters.
- `src/workflows/`: workflow and approval state machines.
- `src/observability/`: logs, metrics, tracing and audit plumbing.

Legacy modules may remain temporarily, but new code should follow these boundaries and migrate legacy logic behind them.