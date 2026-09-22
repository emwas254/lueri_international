# Lueri Engineering Session — 22 September 2026

## Scope

Repository: emwas254/lueri_international

Default branch inspected: main

Supabase project inspected: ylifvexqamxvwzvhmwex

## What was inspected

- GitHub repository structure;
- GitHub Actions workflows;
- JavaScript frontend;
- Rewards flow;
- checkout flow;
- corporate signup/payment flow;
- Pesapal initiation;
- Pesapal IPN handling;
- delivery payment initiation;
- Lucy Edge Function;
- Supabase tables;
- Supabase migrations;
- Supabase security and performance advisors.

## Important findings

### Existing engineering controls

The repository already has CodeQL, JavaScript syntax checks, Dependabot for GitHub Actions, a production-readiness checklist, server-side Pesapal initiation, server-side payment-status verification, amount matching before payment grant, atomic payment claiming and RLS on customer-facing tables.

These are foundations, not proof that every production path is correct.

### Rewards has recently undergone rapid changes

Recent commits show repeated work around Rewards language switching, payment buttons, tier purchase routing, effective-tier display and cache busting.

That makes regression testing especially important.

### A real concurrency weakness was found

The production register_member function allocated member numbers with MAX(member_no) + 1.

Two concurrent registrations could calculate the same next number.

The database already has an identity column for member_no, so the safer implementation is to let PostgreSQL allocate the value atomically.

### A Supabase security-advisor issue was found

public.get_plan(text) was SECURITY DEFINER without an explicit search_path.

It has now been pinned to search_path = public.

### Additional Supabase advisor findings remain

Current advisor output includes:
- SECURITY DEFINER functions callable by public roles;
- four RLS-enabled tables with no policies;
- multiple RLS policies that can be consolidated or optimized;
- repeated auth-function evaluation in some policies;
- unused-index notices.

These should not be "fixed" blindly. Some public RPCs are intentional application entry points. Each requires contract review and regression testing before changing permissions.

### Supabase is moving toward explicit API exposure

Supabase's 2026 changes emphasize explicit grants for public-schema Data API exposure and stronger review of AI-created database changes. citeturn1search2turn1search6

That reinforces the engineering rule used in this project:

> Database access must be intentional, reviewable and tested.

## Change made during this session

Migration:
20260922123525_harden_member_number_allocation_and_plan_search_path

Changes:
1. synchronized members_member_no_seq to the current maximum member number;
2. changed register_member to use the existing PostgreSQL identity allocation instead of MAX()+1;
3. added unique-violation handling for duplicate phone registration;
4. pinned get_plan to search_path = public.

## Verification performed

Database verification confirmed:
- maximum member number: 1008;
- identity sequence last value: 1008;
- get_plan search path: public;
- get_plan('gold') returned a valid Gold plan and price;
- the new register_member definition is installed.

## What was deliberately not changed

We did not revoke every SECURITY DEFINER function reported by the advisor simply to make the dashboard look cleaner.

That would be cargo-cult security.

Some functions are deliberately used as public or authenticated application entry points. They require individual contract review and regression testing before permissions are changed.

## Engineering lesson

A senior engineer does not ask:

"How do I make the warning disappear?"

The better question is:

"What is the actual risk, what behavior is intentional, and what evidence proves the proposed change is safe?"

That is the standard this curriculum will teach.
