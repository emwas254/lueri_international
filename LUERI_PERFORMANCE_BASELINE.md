# LUERI_PERFORMANCE_BASELINE.md
URL: https://lueriinternational.com/ · Source: PageSpeed Insights (supplied by user, screenshots)

## MOBILE
Performance 89 · Accessibility 96 · Best Practices 96 · SEO 100
FCP 2.7s · LCP 2.7s
CLS / TBT / INP / Speed Index: **not visible in supplied screenshots — not recorded, not assumed.**

Insights (red = flagged, orange = moderate):
- 🔴 Render-blocking requests — est. savings **2,080 ms**
- 🔴 Forced reflow (no ms estimate given)
- 🔴 Network dependency tree (no ms estimate given)
- 🟠 Use efficient cache lifetimes — est. savings 49 KiB
- 🟠 Improve image delivery — est. savings 22 KiB

## DESKTOP
Overall score: **not visible in supplied screenshot** (only the insights panel was captured).
Insights:
- 🔴 Render-blocking requests — est. savings **470 ms**
- 🔴 Forced reflow
- 🔴 Network dependency tree
- 🟠 Use efficient cache lifetimes — 49 KiB
- 🟠 Improve image delivery — 22 KiB

---

# Recommendations mapped to actual code

**Change 1 — Fonts stylesheet was render-blocking**
Reason: matches the 2,080ms/470ms "render-blocking requests" finding directly — `<link ... rel="stylesheet">` for Google Fonts sits in `<head>` before first paint on both pages.
Evidence: PageSpeed insight above.
Files: `index.html`, `corporate.html`.
Risk: low (standard preload+swap pattern, `<noscript>` fallback preserves fonts if JS disabled).
Expected benefit: should materially cut the 2,080ms figure — can't confirm exact new number without re-running PageSpeed.
Priority: **P1** — implemented.

**Change 2 — Missing `fonts.gstatic.com` preconnect**
Reason: contributes to "network dependency tree" (googleapis→gstatic is a 2-hop chain); the site only preconnected to `fonts.googleapis.com`, not the actual font-file origin.
Files: `index.html`, `corporate.html`.
Risk: none.
Priority: **P2** — implemented alongside Change 1 since it's the same root cause.

**Change 3 — Oversized logo images**
Reason: directly matches "Improve image delivery — 22 KiB." Static audit found both logo PNGs served at their native 240×242px while displayed at 34px height (site CSS: `.mark-img{height:34px}`).
Evidence: PageSpeed insight + confirmed via CSS inspection.
Files: `assets/logo-mark.png`, `assets/logo-mark-dark.png` — resized to 96px height (≈3x the 34px display size, covers retina) using Pillow, same filenames, same format, no HTML changes needed.
Measured result (local, not PageSpeed-verified): 22,874B → 7,432B and 27,636B → 9,288B. Combined savings ≈ **33.8 KB**, exceeding PageSpeed's 22 KiB estimate.
Risk: low — visually re-inspect after deploy to confirm no blur at 34px display (96px source should be safely sharp).
Priority: **P1** — implemented.

**Change 4 — "Use efficient cache lifetimes" (49 KiB)**
This is HTTP response-header configuration (`Cache-Control`/`Expires` on static assets), not something fixable from this repo — no `_headers`, `wrangler.toml`, or equivalent cache-control config file exists in the repository to edit.
Decision: **not implemented — genuine infrastructure item.** Needs a Cloudflare dashboard change (Cache Rules / Page Rules for `/assets/*`), which I don't have access to. Documented, not faked.
Priority: **P2, blocked on Cloudflare dashboard access.**

**Change 5 — "Forced reflow" / "Network dependency tree"**
PageSpeed flagged these as issues but gave no ms/KiB estimate and the screenshots don't show the expanded detail (which specific script/line triggers the reflow). Implementing a fix here without that detail would be guessing — exactly what this phase's rule prohibits.
Decision: **not implemented — insufficient evidence.** If you can expand those two rows in PageSpeed and screenshot the detail, I'll act on it.
Priority: **P3, deferred pending more detail.**

---

# Regression check (static, no live browser available)
- `index.html`/`corporate.html`: diffs reviewed, scoped to the font-loading block, one preconnect line, and image files — no unrelated lines touched.
- Booking form, mobile menu, corporate form, WhatsApp CTA: code paths untouched by this diff.
- Cannot claim live browser verification — no browser environment here. **You should load both pages after deploy and confirm fonts still render correctly and no console errors appear** (the preload+swap pattern is standard but worth a visual check).

# BEFORE vs AFTER
**AFTER measurements not available** — re-running PageSpeed requires you to test the live deployed site after you push these changes. I have not claimed any score improvement; only the two things I could directly measure locally are reported (image byte savings above). Send new PageSpeed screenshots post-deploy and I'll complete the before/after comparison honestly.

# Production Assessment
**Performance acceptable with minor issues.** 89/100 mobile is a solid baseline, not broken. The two implemented fixes target the two largest flagged items (render-blocking fonts, oversized images) with low risk. The remaining items (cache headers, forced reflow) are either infra-only or under-evidenced — correctly left alone rather than guessed at.
