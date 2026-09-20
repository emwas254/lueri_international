# Security Policy

## Reporting a vulnerability

Lueri International is a production commercial application. Please do not disclose suspected security vulnerabilities in public issues, discussions, or pull requests.

Report security issues privately through the official Lueri business contact channel. Include a clear description, affected URL/component, reproduction steps where safe, impact, and supporting evidence that contains no credentials or personal data.

Do not include passwords, API keys, access tokens, payment credentials, or customer personal data in a report.

## Credential handling

Secrets must never be committed to this repository. Production credentials belong in the appropriate secret-management system or server-side environment.

If a credential is ever committed or suspected to be exposed, treat it as compromised: revoke or rotate it immediately, then investigate repository history.

## Scope

Security review should cover authentication and authorization, Supabase Row Level Security, payment initiation and callbacks, personal data and uploaded files, AI assistant tool access, client-side injection, rate limiting, third-party integrations, GitHub Actions, and deployment credentials.

The main branch is the production source branch and should only receive reviewed and tested changes.
