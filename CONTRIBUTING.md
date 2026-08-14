# Contributing to Zeto

## Development workflow

1. Create a focused branch from `main`.
2. Keep changes aligned with one execution-plan vertical slice.
3. Add or update tests for changed behavior.
4. Run `npm run lint`, `npm test`, `npm audit --audit-level=high`, and container build checks.
5. Document migrations, operational impact and rollback steps in the pull request.

## Pull request requirements

- Explain the execution-plan phase and exit criteria addressed.
- Include verification evidence.
- Call out security, data migration and backward-compatibility risks.
- Do not merge known failing required checks.
- Do not commit credentials, `.env` files, tokens, generated private data or production exports.

## Coding boundaries

Keep HTTP concerns, domain/application logic, repositories, providers, workflows and observability separated as described in `ARCHITECTURE.md` and `AGENTS.md`.