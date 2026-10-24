# Tiny City Lab — Lastlight — bounded tickets

Implement only the next uncompleted ticket. Read SPEC.md and current code, preserve interfaces, use the locked stack, and report actual checks and concrete blockers. Do not replace required execution with a mock.

## [x] C1 — Synthetic city and weighted graph

Create the seeded 7×7 map and three bridge crossings; test shortest paths and disconnected river banks.

Prerequisite: the preceding ticket. Verify with `npm run typecheck && npm test && npm run test:e2e && npm run build`; use the specific device/trainer checks from SPEC.md where applicable.

## [x] C2 — Deterministic couriers

Implement segment travel, deadlines, late/pending accounting, stranding and recovery; unchanged dispatch must deliver all twelve on time.

Prerequisite: the preceding ticket. Verify with `npm run typecheck && npm test && npm run test:e2e && npm run build`; use the specific device/trainer checks from SPEC.md where applicable.

## [x] C3 — Isometric scene

Render original building geometry, river, bridge barriers, route overlay, courier names and parcel markers. Keep rendering separate from graph state.

Prerequisite: the preceding ticket. Verify with `npm run typecheck && npm test && npm run test:e2e && npm run build`; use the specific device/trainer checks from SPEC.md where applicable.

## [x] C4 — Interventions and baseline

Expose clickable roads and accessible incident/road controls. Advance an unaltered baseline on the same clock and show its route/van.

Prerequisite: the preceding ticket. Verify with `npm run typecheck && npm test && npm run test:e2e && npm run build`; use the specific device/trainer checks from SPEC.md where applicable.

## [x] C5 — Portable evenings

Validate ordered scenarios and replay exact history; keep pause, reset, import errors, keyboard controls and narrow layout usable.

Prerequisite: the preceding ticket. Verify with `npm run typecheck && npm test && npm run test:e2e && npm run build`; use the specific device/trainer checks from SPEC.md where applicable.

## [x] C6 — Portfolio release

Capture the real 50-second demonstration, three screenshots, source-independent notices, browser checks and Pages deployment.

Prerequisite: the preceding ticket. Verify with `npm run typecheck && npm test && npm run test:e2e && npm run build`; use the specific device/trainer checks from SPEC.md where applicable.
