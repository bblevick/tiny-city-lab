# Build log

## October 24, 2026 — user-requested expansion to five projects

- User explicitly requested tiny-city-lab alongside the original three, and specifically requested real LLM fine-tuning in Visual Model Lab.
- Implemented Tiny City Lab — Lastlight with the original free/local constraints and its own repository, dependency lock and Pages workflow.
- TypeScript, Canvas 2D, Vite; no map API or application backend.
- Fixed synthetic world, shortest-path couriers and a bounded hour. No congestion, road capacity, collision physics, real addresses, external map services or city-scale planning claims.

Routing tests establish valid open paths, no-closure completion, stranding/recovery and exact scenario replay. Corrected courier interpolation across the expanded river gap and labeled travel difference as signed delta rather than implying that stranded vehicles improved performance.

## October 24, 2026 — real-city revision requested by Ben

Ben found the fixed town too limited and requested real locations, random/manual parcel stops and configurable vans. Replaced the fictional graph and grid buildings with three actual OSM snapshots and an original renderer of real street geometry/building footprints. Added directed routing, balanced fleet allocation, depot returns, parcel service times, random seed, manual/CSV stops, custom-area downloads, pan/zoom and north-up mode.

Overpass endpoints were unavailable from this environment (HTTP 406/timeouts). Used bounded official OSM map extracts instead; the first dense San Francisco extract exceeded the service's node limit, so bounded all neighborhoods to 1.2 km. Preserved actual raw XML and normalized hashes. A live browser custom request succeeded, returning 1,324 road nodes. No invented fallback map.

A replay assertion exposed approximately 1e-13 floating-point differences. Validate numerical equality to 1e-8, preserving route/state/history semantics rather than falsely claiming identical bytes. Six unit cases and eight Chromium/WebKit checks passed locally before release capture.
