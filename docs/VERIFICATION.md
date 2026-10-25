# Lastlight v2 verification — October 24, 2026

Apple M4, 24 GB RAM, Node 24.22.1. Six unit cases verify directed/private access, random manifest repeatability and snap bounds, assignment and depot return for 1/4/8 vans, current-segment closure/stranding/recovery, version 2 numerical replay, and checksummed real snapshots for all three cities. Eight Chromium/WebKit browser checks cover cities/fleet/manifest, placement, imports, closure/recovery, transfer, view controls, narrow layout and custom service failure.

A real browser custom-area request returned 1,324 street nodes and 40 parcel assignments, with no page errors: `custom-map-check.json`. This is a real external download, distinct from the error-path browser test. The three bundled neighborhoods need no external application requests. Actual source snapshots and their hashes are preserved.

Three updated full-page screenshots show Cleveland, Manhattan, and San Francisco in `docs/media/`. The updated 50-second video records the actual UI. Its script is reproducible. Final production/public checks are recorded in their JSON evidence files after the build/deployment.

No performance or live navigation guarantee. Native iPad hardware has not been tested. The version 1 headless scheduling measurement is historical and is not a measurement of v2; do not quote it as current performance.
