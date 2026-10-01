# Main branch protection guidance

The production branch is `main`. Changes should arrive through pull requests; direct commits to `main` should be disabled in GitHub repository settings.

Recommended required checks:
- Repository Hygiene / JavaScript syntax
- Secret-pattern scan
- HTML/link validation
- Deno check, lint and tests for Supabase changes
- Lighthouse CI for performance-sensitive changes

Recommended repository settings:
- Require a pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution.
- Disable force-pushes and branch deletion on `main`.
- Keep payment/database/webhook changes behind explicit owner approval and passing regression tests.
