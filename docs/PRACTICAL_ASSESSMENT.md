# Lueri Senior Engineering Practical Assessment

## Rules

You may use documentation and AI tools.

You may not submit an answer you cannot explain.

For each task, submit your reasoning and evidence.

## Practical 1 — Architecture

Produce a one-page architecture map for Lueri.

Include:
- browser;
- GitHub Pages/custom domain;
- Supabase;
- PostgreSQL;
- Edge Functions;
- Pesapal;
- Resend;
- OpenAI/Lucy;
- customer journey.

Trace:
Rewards membership → checkout → payment → IPN → membership activation.

Pass condition: every arrow has a clear explanation.

## Practical 2 — Root-Cause Debugging

You are told: "The Rewards page freezes when the language changes."

Do not edit code immediately.

Submit:
1. reproduction steps;
2. likely causes;
3. evidence collected;
4. root cause;
5. smallest safe fix;
6. regression test.

Pass condition: root cause is demonstrated with evidence.

## Practical 3 — Payment Failure Analysis

Analyze:
A. Customer closes the browser after paying.
B. Pesapal sends the same IPN twice.
C. Pesapal reports KES 5,000 while Lueri expected KES 15,000.
D. Payment succeeds but membership activation temporarily fails.
E. Callback arrives before the frontend is ready.

For each, state expected database state, customer-facing behavior, server behavior, retry behavior and whether membership should activate.

## Practical 4 — Database Concurrency

Explain why MAX(member_no)+1 is unsafe.

Explain why PostgreSQL identity allocation is safer.

Identify what evidence you would inspect before changing a production sequence.

## Practical 5 — Security Review

Review one customer-facing RPC.

Answer:
- Who can execute it?
- Is it SECURITY DEFINER?
- What tables can it read/write?
- What information does it return?
- Does it validate inputs?
- Does it leak unnecessary PII?
- Is search_path pinned?
- What RLS assumptions does it make?

## Practical 6 — CI/CD

Break a JavaScript file locally.

Run the repository quality gate.

Submit:
- failing output;
- root cause;
- corrected code;
- passing output.

Explain why CI is stronger when attached to pull requests rather than being an informal checklist.

## Practical 7 — AI Engineering

Give an AI coding agent this requirement:

"Improve the Rewards checkout without changing payment authority."

Require the agent to produce a plan before implementation.

Submit:
- prompt;
- AI plan;
- your review;
- implementation;
- diff;
- tests;
- adversarial test;
- final explanation.

You fail this practical if you simply accept AI output without independent verification.

## Final challenge

You will receive one Lueri production-style bug.

You must:
1. reproduce it;
2. inspect the system;
3. form a hypothesis;
4. gather evidence;
5. implement a minimal fix;
6. write a regression test;
7. run CI;
8. perform adversarial testing;
9. document rollback;
10. explain the result in plain English.

Certificate threshold: 80% knowledge score plus all critical practicals passed.
