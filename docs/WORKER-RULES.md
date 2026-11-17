# Backend Worker Rules — HomeBeacon

These rules apply to every future round of backend work in this repo.
Violating them is how prior fixes (`/api/v1/checkin` aliases, wellness-score
counting, etc.) were silently lost. Do not skip them.

## Rule 1 — Work from git HEAD, not memory or stale files

- Before editing any source file, run `git log -1` to confirm you are on the
  current HEAD state.
- If a previous round left `.backup`, `.broken`, `.old`, or similar scratch
  files in the tree, delete them after confirming they are not tracked.
- Never copy-paste code from an old branch, a previous deliverable, or another
  repo without re-verifying the current schema and route mounts.
- If you must restore a deleted route, check the **current** `src/index.ts`
  mount section and `src/routes/` directory; do not assume the old file still
  exists or is still imported.

## Rule 2 — Run the REGRESSIONS.md smoke checks before every commit

- `docs/REGRESSIONS.md` contains the MUST-SURVIVE checklist.
- Before you `git commit`, run the smoke commands at the bottom of
  `docs/REGRESSIONS.md`.
- Paste the full smoke-test output into the deliverable or PR description.
- If any check prints `FAIL`, stop. Fix the regression before committing.
- Smoke checks must pass on the **exact** set of files you are about to commit,
  not on a mental model of what should work.

## Rule 3 — Grep for callers before removing or disabling any route or feature

- Any PR that removes, comments out, renames, or disables a route, table,
  handler, or exported function must include an explicit `grep` for callers.
- Search both repos (`wellness-check-code` backend and `HomeBeacon-Expo` app)
  before concluding something is unused.
- Examples of forbidden silent removals:
  - commenting out a `router.use('/api/v1/activity', ...)` line because it
    "looks broken";
  - deleting `/api/v1/checkin` because the legacy `/api/checkin` still exists;
  - changing the `type` string stored in `activity_events` from `'checkin'`
    to `'check_in'` without updating every consumer.
- If a route must change, create a v2 alias and keep v1 working for at least
  one release cycle.

## Rule 4 — Keep v1 aliases stable

- The mobile app depends on `/api/v1/*` endpoints. The legacy `/api/*`
  endpoints must also keep working where they existed before.
- Adding a new endpoint is fine; removing or renaming an existing v1 endpoint
  requires a migration plan and both-repo grep.

## Rule 5 — Database type strings are part of the public API

- Values stored in `activity_events.type` and similar enum columns are
  consumed by queries, the mobile app, WebSocket events, and wellness scoring.
- Changing a type string is a breaking change. If you must change it, update
  **all** consumers and add a migration for existing rows.

## Pre-Commit Checklist

```bash
# 1. Confirm HEAD
git log -1 --oneline

# 2. Confirm no stale scratch files are about to be committed
git status

# 3. Run regression smoke checks
bash docs/REGRESSIONS.md  # (copy the smoke-script block and run it)

# 4. Grep callers for any removed/disabled route or feature
grep -R "<oldRouteOrName>" src/ ../HomeBeacon-Expo/src/
```

Commit only after all four steps pass.
