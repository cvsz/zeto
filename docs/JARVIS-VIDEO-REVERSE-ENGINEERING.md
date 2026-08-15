# JARVIS/Brahma AI Video Reverse-Engineering Notes

Source inspected: uploaded `videoplayback.mp4`, duration ~251.84 seconds, 640x360, 30fps.

This document records visible product behavior from the supplied video and translates it into Zeto requirements. It does not claim hidden implementation details that cannot be observed from the recording.

## Visible UI / interaction inventory

The recording shows a dark desktop AI operator application branded `Brahma AI` with a persistent command-center layout.

Observed capabilities and surfaces:

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

## Zeto translation: M12 — Z.A.R.V.I.S. Operator Runtime

### Operator state machine

`IDLE -> LISTENING -> TRANSCRIBING -> THINKING -> PLANNING -> AWAITING_APPROVAL -> EXECUTING -> VERIFYING -> SPEAKING -> IDLE`

Exceptional states: `PAUSED`, `DEGRADED`, `FAILED`, `CANCELLED`.

### Frontend

- Z.A.R.V.I.S. card integrated with the existing Z.A.R.I.U.S. (Zeto Autonomous Runtime Intelligence & Unified System) operator view.
- Animated orb/zarius renderer driven by real operator state.
- Push-to-talk with explicit microphone permission and visible recording state.
- Streaming transcript and response surface.
- Command Stream with timestamp, actor, tool, target, result, duration and correlation ID.
- Sequence Builder for reusable workflows with reorder/edit/save/run/dry-run.
- Modes: Chat, Voice, Operator, Advanced/Automation, with policy-derived availability.
- Runtime telemetry: CPU/RAM/network plus worker/queue/model/tool health.
- Approval drawer for consequential or mutating actions.
- Cancel/pause/emergency-stop controls.
- Mobile pairing panel using short-lived QR pairing tokens.
- Setup/onboarding wizard for providers, permissions and capability checks.
- Accessibility: keyboard operation, reduced-motion fallback, captions/transcript, non-visual state labels.

### Voice plane

- Browser microphone capture.
- VAD and push-to-talk modes.
- Streaming STT adapter.
- Barge-in/interruption support.
- Streaming TTS adapter.
- Provider-neutral STT/TTS interfaces with local-provider option.
- No raw audio persistence by default; retention requires explicit policy.

### Agent/orchestration plane

- Intent router.
- Planner producing typed, inspectable plans.
- Skill registry with versioned manifests.
- Agent registry and bounded delegation.
- Tool gateway enforcing grants and schemas.
- Executor with timeout, cancellation and retry policy.
- Observer/verifier that confirms postconditions before reporting success.
- Memory boundary for session/workspace/user-approved durable memory.
- Full provenance and audit trail for plans, tool calls and results.

### Computer-use plane

Implement behind explicit adapters, never direct ungoverned shell/browser access:

- `BrowserTool`: navigate, inspect DOM/accessibility tree, click, type, upload, download metadata, screenshot.
- `DesktopTool`: enumerate allowed applications/windows, focus, keyboard/mouse actions, screen observation.
- `FileTool`: sandboxed read/write with workspace roots and path policy.
- `ShellTool`: allowlisted commands, sandbox/container boundary, resource/time limits.
- `ApplicationTool`: typed adapters for supported applications where APIs are preferable to coordinate clicking.

Every action carries `session_id`, `plan_id`, `step_id`, `tool`, `target`, `risk`, `approval`, `idempotency_key`, `started_at`, `finished_at`, `result`, and verification evidence.

### Safety / security boundary

- Deny-by-default tool permissions.
- Explicit grants scoped by user/workspace/session.
- Approval required for destructive, external side-effect, credential, financial, publication and privilege-changing actions.
- Domain/application allowlists for autonomous execution.
- Secret redaction in UI, logs, screenshots and model context.
- Prompt-injection defense for browser/screen content: observed content is untrusted data, never authority to grant tools or change policy.
- Sandboxed shell/filesystem execution.
- Rate, cost and step limits.
- Emergency stop that cancels active plans and revokes ephemeral grants.
- Pairing QR tokens are short-lived, single-use and bound to an authenticated operator session.

### Backend contracts

Minimum resources:

- `/v1/operator/sessions`
- `/v1/operator/sessions/:id/events`
- `/v1/operator/sessions/:id/commands`
- `/v1/operator/sessions/:id/cancel`
- `/v1/operator/plans/:id`
- `/v1/operator/plans/:id/approve`
- `/v1/operator/plans/:id/reject`
- `/v1/operator/sequences`
- `/v1/operator/sequences/:id/run`
- `/v1/operator/skills`
- `/v1/operator/agents`
- `/v1/operator/tools`
- `/v1/operator/pairing`
- `/v1/operator/telemetry`

Use SSE/WebSocket for transcript, command-stream, plan-step, telemetry and speech state updates.

### Persistence

Add durable entities:

`operator_commands`, `operator_events`, `operator_plans`, `operator_plan_steps`, `operator_sequences`, `operator_sequence_steps`, `skill_manifests`, `agent_manifests`, `tool_grants`, `tool_executions`, `verification_evidence`, `voice_sessions`, `pairing_tokens`.

### Testing / release evidence

- State-machine unit tests.
- Planner schema/property tests.
- Tool permission and approval-bypass tests.
- Prompt-injection tests using malicious browser/page content.
- Browser/desktop provider-fake tests.
- Cancellation/timeout/retry/idempotency tests.
- Voice interruption and reconnect tests.
- Sequence replay and partial-failure tests.
- QR token expiry/replay tests.
- Audit completeness tests.
- E2E: voice/text command -> plan -> approval -> tool execution -> verification -> spoken/UI result.
- Soak tests for long operator sessions and streaming reconnect.

## Implementation order

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

## Definition of Done

M12 is complete only when the visual operator is backed by real state, all tool execution passes through policy/approval, failures are visible and recoverable, actions are auditable and verifiable, tests cover permission bypass/prompt injection/cancellation/replay, and the full voice/text-to-action workflow passes staging release gates.
