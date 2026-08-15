# Changelog

All notable changes follow Keep a Changelog. Zeto uses semantic versioning.

## [Unreleased]

### Added

- Production execution plan and initial engineering baseline.
- Engineering agent guide, architecture boundaries, security, and contribution policies.
- Node test runner, lint, formatting, CI, container, and secret-scanning gates.
- Architecture, security, contribution, and environment documentation.
- PostgreSQL 16 schema and migration runner for all planned core entities.
- Transactional idempotency, immutable audit/approval records, durable job claiming, and approval-gated publications.
- Authenticated `/v1` brand API with validation, pagination, request IDs, and OpenAPI contract.
- ProMaster compiler and the `zato` content-brand policy for Niche Content with a white/light-purple palette.
- M01-M05 asset-pack contracts, 12-point QA scoring, model fallback/cost routing, M06 calendar/retry primitives, M07 monitoring rules, and AUTO-PILOT guardrails.
- Production Compose stack, readiness checks, graceful shutdown, and operations runbook.
- Durable workflow runs with ordered artifact handoff, worker ownership, heartbeats, retries, cancellation, idempotent starts, and cost accounting.
- Facebook publishing-provider contract with normalized errors, token-expiry diagnostics, capabilities, rate-limit metadata, and provider fakes.
- Persisted daily analytics, prior-period KPI reports, mention classification, sentiment, and complaint escalation SLAs.
- Protected Prometheus metrics for HTTP, jobs, publications, approvals, provider failures, and generation cost.
- SSRF controls, image signature checks, guaranteed temporary-file cleanup, and executable backup/restore verification.
- Z.A.R.V.I.S. (Zeto Autonomous Runtime Virtual Intelligence System) operator view with live queue/approval/publishing state and the JARVIS reverse-engineering baseline.
- Master Z.A.R.V.I.S. Operator Runtime specification (`docs/JARVIS-VIDEO-REVERSE-ENGINEERING.md`) with video evidence, state-transition table, command/voice/agent/computer-use contracts, event catalog, persistence model, SLOs and acceptance matrix.
- Timeline evidence in the M12 spec populated from automated frame extraction + OCR of the source recording (`media/zarvis-ref.mp4`, SHA-256 `9f93ebdd…`), replacing the scaffold-only placeholder.
- Arin AI assistant: push-to-talk voice companion with dashboard commands, speech recognition, and voice replies.

### Changed

- Product and runtime identity migrated from the legacy name to Zeto.
- Production encryption configuration now fails closed without an explicit key.
- Legacy JSON operational persistence has been replaced by encrypted PostgreSQL-backed state.

## [1.1.0] - 2026-08-11

- Facebook automation dashboard baseline imported for the Zeto migration.
