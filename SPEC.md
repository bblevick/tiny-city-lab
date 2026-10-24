# Tiny City Lab — Lastlight — implementation specification

## Goal

Twelve parcels. One uncooperative city. Close the roads and change somebody’s evening. A recruiter can inspect the demo without an account and reproduce the implementation. Preserve the local/free constraint and observable evidence.

## Interfaces and behavior

`World` contains a minute counter, closed road IDs, four couriers, parcel deadlines and an ordered road-change history. `shortestPath` is deterministic Dijkstra on 49 intersections. Ordinary roads cost one simulated minute; bridges cost two. `advance` takes exactly one simulated minute. `sampleCourier` interpolates only the current segment.

The depot is node 21. Four named couriers each have three destinations. Deadlines are the unaltered earliest arrival plus five minutes. A road closed while a van is already on it does not teleport the van: it finishes the segment, then replans. Stranded couriers wait and retry. Simulation ends at 60 minutes and reports delivered, late, and undelivered separately. Travel delta is signed; less travel can reflect stranding, not improvement.

A parallel baseline dispatch advances in the same clock without any closures. The dashed comparison is a counterfactual of this fixed simulation, not a predictive traffic model. The clock runs one city minute per 350 ms while playing; Step advances exactly one minute. Reset restores the original city.

`Scenario` version 1 stores city `lastlight-v1`, tick (0–60) and ordered `{tick,road,closed}` actions. Import caps: 100 KB and 500 changes. Unknown roads, invalid order and future events are rejected. Restoring replays every intervention from tick zero. Browser capture helpers live at `window.tinyCity`.

## Design thesis

A small city at closing time: sage buildings, ochre windows, brass street signs and named couriers. The signature is the dashed van that lives in the unaltered evening. Avoid generic map tiles and traffic-dashboard chrome.

## Exclusions and limits

Fixed synthetic world, shortest-path couriers and a bounded hour. No congestion, road capacity, collision physics, real addresses, external map services or city-scale planning claims.

## Acceptance

Type checking, meaningful unit tests, Chromium/WebKit browser tests, narrow layout, production-path smoke check, clean-checkout build, three inspected screenshots and a 50-second demo. Native Safari controls and live MLX execution are recorded separately from browser automation. Public URLs must be checked after deployment.
