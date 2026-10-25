# Lastlight v2 bounded implementation tickets

Implement the next uncompleted ticket only. Read SPEC.md and current code. Preserve interfaces and exact dependency lock. Separate pure routing from UI. Run relevant checks and record actual results; never substitute invented streets or fake external responses for a required real data check.

- [x] C1 — Preserve three actual OSM neighborhoods, source raw data and hashes. Parse directed street geometry and restrict motor access. Check: `npm test` on the source checksum and directed fixture.
- [x] C2 — Add seeded random and coordinate stops, configurable fleet, balanced insertion and bounded directed 2-opt. Check: `npm test` assigns every stop once and returns 1/4/8-van fleets to depot.
- [x] C3 — Draw real footprints/street names in original isometric/north-up atlas; pan/zoom and map tools. Check: `npm run test:e2e`, inspect all three screenshots.
- [x] C4 — Continuous real-distance playback, service stops, closures, stranded recovery, baseline, reset. Check: `npm test` on in-flight segment closure and recovery.
- [x] C5 — Coordinate CSV, version 2 dispatch transfer, custom-area loader, cancellation/error handling. Check: `npm run test:e2e`, real custom download in docs/custom-map-check.json.
- [x] C6 — Refresh media/docs, run final type/unit/browser/build and production-path checks, publish, verify live revision. Commands: `npm run typecheck && npm test && npm run test:e2e && BASE_PATH=/tiny-city-lab/ npm run build`, `npm run demo:capture`.
