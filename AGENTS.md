# AGENTS.md — HomeBeacon (app + backend)

Token-hygiene rules for any Hermes agent working in this repo. These load into the cached system prompt tier at session start — keep this file SHORT, and never edit it, SOUL.md, or MEMORY.md mid-session (prefix caching hashes top-to-bottom; one changed line invalidates every cached turn below it).

- Never stream raw `./gradlew`, `fastlane`, `expo`, or `npm` logs into stdout. Redirect to `/tmp/build.log` (`> /tmp/build.log 2>&1`) and inspect only the last 50 lines on failure.
- Read targeted line ranges (`offset`/`limit`) when inspecting large files (`GooglePlayBillingModule.kt`, `subscriptions.ts`, `build.gradle`, `backend/src/index.ts`).
- Before running `fastlane` uploads or Play Developer API promotions, print the exact command and target track (`internal`, `closed`, `production`) in the first line of the step.
- Waits longer than 4 minutes (deploy polling, review waits) will cold-expire the prompt cache: prefer stateless re-check scripts (single curl against a file) over long-lived assumptions about thread context.
- Machine rules live in `docs/WORKER-RULES.md`; regression history in `docs/REGRESSIONS.md`. Regression manifests are mandatory reading on any work round.
