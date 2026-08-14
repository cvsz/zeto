# Security Policy

## Supported security posture

Zeto treats publishing credentials, AI provider credentials, sessions, generated media, approval decisions and audit records as sensitive production data.

## Mandatory controls

- Secrets are server-side only and must never be committed or embedded in frontend bundles.
- Provider credentials use least privilege and are rotated when exposure is suspected.
- Mutating endpoints require authentication, authorization and audit records.
- Publishing and generation side effects must support idempotency.
- Uploads require MIME/type and size validation; remote media fetches must defend against SSRF.
- Autonomous publishing requires QA/policy approval, budget and frequency limits, plus a kill switch.
- Production traffic uses TLS and sensitive persisted data uses encryption appropriate to the deployment environment.

## Reporting

Do not open public issues containing credentials, tokens, exploit payloads against live systems or personal data. Use GitHub private vulnerability reporting when enabled for this repository, or contact the repository owner through a private channel.

## Release gates

A release is blocked by known critical/high vulnerabilities that affect the deployed configuration, credential leakage, approval bypass, or publication duplication defects.