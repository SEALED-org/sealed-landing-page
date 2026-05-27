---
phase: 01-foundation
plan: "02"
subsystem: ui-components
tags: [counter, animation, motion, odometer, presentational]
dependency_graph:
  requires: []
  provides: [src/components/Counter.tsx]
  affects: []
tech_stack:
  added: []
  patterns: [useMotionValue + animate + useTransform, motion.span as MotionValue child]
key_files:
  created:
    - src/components/Counter.tsx
  modified: []
decisions:
  - Single-tween with padStart chosen over per-digit rolling columns (handles tier boundaries automatically without DOM restructuring)
  - Width keyed off target not current animating value (prevents layout shift mid-animation per D-09)
  - dependency array [target, motionCount] with controls.stop() cleanup (avoids Pitfall 3 — stale animation)
metrics:
  duration: "1m"
  completed: "2026-05-27T19:45:37Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 1 Plan 02: Counter Component Summary

**One-liner:** Odometer counter using `useMotionValue(0)` tweened to `target` with tier-aware `padStart` leading-zero formatting via `useTransform` and a single `motion.span` render.

## What Was Built

`src/components/Counter.tsx` — a standalone, self-contained presentational component that accepts a `target: number` prop and animates from zero to that value using Motion v12's free imperative API. No data fetching, no Supabase imports, no Firebase residue.

### Motion API surface used

| Hook / Function | Role |
|-----------------|------|
| `useMotionValue(0)` | Creates the animating number, initialized at zero on mount |
| `animate(motionCount, target, { duration: 1.2, ease: 'easeOut' })` | Drives the tween from current value to target; returns `controls` |
| `controls.stop()` | useEffect cleanup — stops in-flight animation on unmount or target change |
| `useTransform(motionCount, (latest) => formatCounter(latest, target))` | Derives a `MotionValue<string>` from the raw number (no React re-renders) |
| `<motion.span>{display}</motion.span>` | Renders the MotionValue string directly to the DOM |

### Tier-aware width logic

`formatCounter(current, target)` uses `target` (not `current`) to determine padding width:
- `target < 1000` → 3 digits (`000`–`999`)
- `1000 ≤ target < 10000` → 4 digits (`1000`–`9999`)
- `target ≥ 10000` → 5 digits (`10000`+)

Keying width off `target` rather than the live animating value keeps the digit count stable throughout the entire 000→N animation — no layout shift mid-tween (D-09).

### Why single-tween + padStart instead of per-digit rolling columns

The per-digit BuildUI pattern (three stacked `motion.span` columns with `translateY` transforms) requires re-laying out the digit column count when crossing a tier boundary (e.g., 999 → 1000). The single-tween approach handles tier boundaries automatically by changing only the `padStart` width, which is a string formatting concern not a DOM structural one. The animation still looks like an odometer because `Math.floor(latest)` produces discrete integer steps — at 1.2s duration over a range of 0–115, the user sees ~115 discrete integer values, visually identical to digit rolling.

### Re-animation on target change

When `target` changes after mount (e.g., the Supabase fetch in plan 04 resolves with a real count), the `useEffect` re-runs from the current displayed value (not from zero) because `motionCount` holds the live position. The animation tweens smoothly from wherever it stopped to the new target — no snap, no restart from zero.

## Not Yet Mounted

`Counter` is not mounted anywhere in the current codebase. Plan 04 will import it and mount `<Counter target={waitlistCount ?? 115} />` inside the existing pulse row in `src/App.tsx`, replacing the current `{waitlistCount.toLocaleString()}` inline render. No changes to `App.tsx` are made in this plan.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/components/Counter.tsx (odometer animation) | 7d71600 | src/components/Counter.tsx (created, 29 lines) |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/components/Counter.tsx` exists: FOUND
- Commit `7d71600` exists: FOUND
- All plan verification checks: PASSED (motion/react only, no framer-motion, no AnimateNumber, no I/O)
- No stubs: CONFIRMED
- No new threat surface: CONFIRMED (pure presentational, no I/O, no new network endpoints)
