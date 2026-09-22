# Lueri Senior Engineering Learning Path

## Purpose

This repository is now the practical classroom for learning software engineering through a real production system.

The objective is not to memorize syntax or become dependent on an AI coding tool. The objective is to learn how to understand an existing system, reason about architecture and dependencies, identify failure modes and security boundaries, make small reversible changes, prove changes with evidence, review AI-generated work critically, and deploy only after verification.

## Operating rule

> AI can accelerate implementation. The engineer owns the reasoning, evidence, and final decision.

Every substantial change follows:

1. Inspect
2. Explain
3. Plan
4. Test the risky assumption
5. Implement the smallest safe change
6. Verify
7. Try to break it
8. Document the result
9. Deploy through a controlled change

## Curriculum

### Lesson 1 — Production Repository Architecture
Learn frontend/backend boundaries, GitHub Pages, Supabase, PostgreSQL, Edge Functions, Pesapal, Resend, OpenAI/Lucy, and why a feature is a system rather than a file.

Practical: draw the Lueri architecture and trace a Rewards purchase from browser to database.

### Lesson 2 — Requirements Before Code
Learn functional and non-functional requirements, acceptance criteria, invariants, dependencies, assumptions, and what must not change.

Practical: write acceptance criteria for a Rewards membership purchase.

### Lesson 3 — Git as an Engineering Safety System
Learn branches, atomic commits, pull requests, diffs, merge strategy, rollback, and why production work should be reviewable.

Practical: create a feature branch, make one isolated change, inspect the diff, and write a rollback plan.

### Lesson 4 — Senior Debugging
Learn reproduce → isolate → hypothesize → test → fix → regression test, plus evidence from browser, network, server, database and logs.

Practical: diagnose a deliberately broken Lueri feature and submit the root-cause analysis before fixing it.

### Lesson 5 — Payments as a Distributed System
Learn initiation, redirects, callbacks/IPNs, status verification, amount matching, idempotency, duplicate callbacks, retries, reconciliation and failure states.

Practical: trace the full Pesapal membership flow and list its failure modes.

### Lesson 6 — PostgreSQL and Supabase
Learn tables, constraints, transactions, RPCs, SECURITY DEFINER, search_path, RLS, grants, race conditions, indexes and migrations.

Practical: explain why MAX(member_no)+1 is unsafe under concurrency and demonstrate the identity-column approach.

### Lesson 7 — Security Engineering
Learn secrets, least privilege, RLS, authentication vs authorization, IDOR/BOLA, validation, untrusted AI/customer content and server-side payment authority.

Practical: review one public RPC and explain its execution rights and data exposure.

### Lesson 8 — CI/CD and Quality Gates
Learn CI, syntax checks, type checks, security scanning, required status checks and pull-request gates.

Practical: deliberately break JavaScript, run the quality gate, repair it, and prove the gate passes.

### Lesson 9 — Observability and Incident Response
Learn logs, structured errors, metrics, traces, payment observability, incident timelines, rollback and post-incident learning.

Practical: build an incident timeline for a failed payment.

### Lesson 10 — AI-Assisted Engineering Without Vibe Coding
Learn repository-inspection prompts, change plans, constrained implementation, adversarial review, test generation and evidence collection.

Practical: give an AI a controlled Lueri task, review its diff, reject unsafe reasoning, and produce the final evidence report.

## Graduation standard

The certificate is not automatic.

You must complete:
1. Knowledge test.
2. Architecture practical.
3. Debugging practical.
4. Payment-flow practical.
5. Database/security practical.
6. CI/CD practical.
7. Final AI-assisted engineering challenge.
8. A written explanation of what changed, why, how it was verified, and what could still fail.

Pass requirement:
- Knowledge test: 80% minimum.
- Every critical practical must pass.
- A result you cannot explain does not count.
- Failed practicals are diagnosed, corrected and repeated.

The goal is competence, not a piece of paper.

## Evidence standard

Every practical submission must contain:
- objective;
- starting state;
- hypothesis;
- commands/actions;
- evidence;
- result;
- failure encountered, if any;
- root cause;
- fix;
- verification;
- rollback plan;
- lesson learned.

## Final project

You will receive a real Lueri engineering requirement. You must inspect the repository, map dependencies, identify risks, propose an implementation, create a branch, implement the change, write or improve tests, run quality gates, perform adversarial review, document the result, and submit evidence.

Only after the final project passes will the certificate be issued.
