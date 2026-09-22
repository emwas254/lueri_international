# Lueri Engineering Change Protocol

This is the standard operating procedure for changes to the Lueri production system.

## 1. Inspect before editing

Determine:
- where the behavior originates;
- which files participate;
- which database tables/RPCs/functions participate;
- which external services participate;
- current production behavior;
- recent changes touching the area.

## 2. State the invariant

Write what must remain true.

Examples:
- A successful payment must be confirmed server-side.
- A failed payment must never activate membership.
- A repeated IPN must not double-activate membership.
- A language change must not destroy navigation or payment state.
- A customer must not receive another customer's private data.

## 3. Map failure modes

At minimum consider invalid input, missing data, duplicate requests, network failure, provider failure, timeout, browser refresh, late callback, duplicate callback, concurrency, unauthorized access, mobile layout, alternate language/RTL and rollback.

## 4. Make the smallest safe change

Prefer one concern per change, one feature branch, one clear commit or small logical commit series, and no unrelated cleanup.

Do not rewrite working code merely because a new AI model prefers another style.

## 5. Verify at the correct layer

Verify browser behavior, network request, server function, database state, external-provider state, logs and automated checks.

## 6. Attack your own fix

Ask: "How can I make this fail?"

Test duplicate submission, stale state, malformed input, wrong plan, wrong amount, expired session, direct API calls, refresh, second browser tab, mobile viewport and Arabic/RTL where relevant.

## 7. Record evidence

Every production-worthy change must leave a trail:
- what changed;
- why;
- tests run;
- results;
- known limitations;
- rollback path.

## 8. Deployment rule

Production changes should move through:

feature branch → CI → pull request → review → merge → deployment → smoke test

GitHub documents protected branches and required status checks as mechanisms for enforcing merge gates. citeturn2search1turn2search2

## 9. AI rule

AI-generated code is a proposal until verified.

Never accept invented APIs, invented database columns, assumed payment behavior, unverified security claims, or tests that do not exercise the actual failure mode.

The engineer owns the result.
