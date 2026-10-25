# Lastlight v2 — a real neighborhood dispatch desk

Design thesis: a warm illustrated street atlas where real urban geometry carries a personal, configurable delivery run. Preserve sage/ivory/rust, restrained editorial typography, and named vans. The signature is the dashed unchanged dispatch over the actual streets. Avoid a generic map dashboard.

## Behavior

Three bundled real OSM neighborhoods: Cleveland/Ohio City, San Francisco/Mission, New York/East Village. Original raw XML, normalized way geometry, source URLs/retrieval dates, SHA-256. Attribution visible on map; databases ODbL, original code MIT. No external calls during bundled use.

Choose 1–8 vans and 1–60 random parcels with a seed. Add manual map stops, coordinate stops, or latitude/longitude CSV. Move depot, remove stops, clear manifest. All edits restart the simulation and plan; road closure set is retained until reset. Duplicate snapped stops and depot overlap rejected. Stops snap within 200 m to the largest strongly connected component. No geocoding claims.

Optional custom neighborhood: explicitly load a 1.2 km square by latitude/longitude. Sends only bounds to public OSM map API; timeout 55 seconds, cooldown 30 seconds, response cap 10 MB. Parsing caps: 70,000 OSM raw elements, 15,000 normalized ways, 20,000 road nodes, 30,000 segments. Failure leaves the prior map usable. No geolocation or automatic live queries.

## Architecture

`graph.ts`: data parsing, access filtering, directed adjacency, largest strongly connected component, heap Dijkstra, nearest-node snapping. `city.ts`: seeded manifests, balanced insertion + directed 2-opt, continuous progress, closures, metrics, scenario validation/replay. `render.ts`: cached original Canvas base map, real building footprints, route overlays, vans, geographic projection, hit testing. `main.ts`: forms, pointer/touch tools, pan/zoom, playback, imports/exports.

`City` holds center/bounds/nodes/roads/shapes/adj/component. `Stop` preserves requested coordinates and snapped node/distance. `World` holds a city, depot, manifest, fleet, elapsed simulated minutes, closure set, couriers and action history. `planFleet` assigns every reachable parcel exactly once and includes return to depot; not guaranteed optimal. Closed roads reroute paths without reassigning parcels. Active segment completes before replanning. Reopening resumes stranded vans. Distance delta can be negative due to stranding.

25 km/h standard streets, 10 km/h service/living streets; 30 s per delivery. Tagged one-way direction and roundabouts respected; private/no motor access excluded. No traffic, turn restrictions, capacities, grade, full-city scale or real ETA claims. At most 4 simulated hours. Stop/play/step/reset; visibility hiding pauses. Reduced motion uses discrete visual updates.

## Transfer and controls

Version 2 JSON: city ID, center, depot coordinates, stop ID/label/coordinates, vans, elapsed minutes, ordered `{minute,road,closed}` interventions, and raw normalized OSM for custom maps. 12 MB, 60 stops, 500 changes. Validate bounds, uniqueness and road IDs; legacy v1 explicitly rejected. Replay numerically equivalent within 1e-8 rather than claiming identical floating-point bytes. CSV: `latitude,longitude`, 1–60 rows, 50 KB; atomic rejection with row feedback.

Map tools: explore, place parcel, move depot, close segment. Pointer drag pans; wheel/buttons zoom; north-up/isometric; buildings toggle; keyboard map pan/zoom, coordinate entry and segment selector. Responsive layout; visible loading/errors/status. Export dispatch JSON, actual 50-second demo, three screenshots. No backend or keys for normal use.

## Verification

Type check, six meaningful unit cases including all actual snapshots and variable fleet completion, four browser cases in Chromium/WebKit, custom real map download evidence, base-path production check, clean install/build, inspected screenshots and refreshed walkthrough. Publish verified Pages revision. No unsupported navigation/optimality claims.
