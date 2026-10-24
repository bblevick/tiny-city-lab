# Tiny City Lab — Lastlight

Twelve parcels. One uncooperative city. Close the roads and change somebody’s evening.

[Open the live demo](https://bblevick.github.io/tiny-city-lab/) · [50-second walkthrough](docs/media/demo.mp4) · [Specification](SPEC.md) · [Verification](docs/VERIFICATION.md)

![Tiny City Lab — Lastlight](docs/media/overview.png)

## Run locally

Node 24 LTS and npm. No API keys or hosted application service.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npx playwright install chromium webkit
npm run test:e2e
npm run build
npm run preview
```

TypeScript, Canvas 2D, Vite; no map API or application backend.

## How it works

`World` contains a minute counter, closed road IDs, four couriers, parcel deadlines and an ordered road-change history. `shortestPath` is deterministic Dijkstra on 49 intersections. Ordinary roads cost one simulated minute; bridges cost two. `advance` takes exactly one simulated minute. `sampleCourier` interpolates only the current segment.

The depot is node 21. Four named couriers each have three destinations. Deadlines are the unaltered earliest arrival plus five minutes. A road closed while a van is already on it does not teleport the van: it finishes the segment, then replans. Stranded couriers wait and retry. Simulation ends at 60 minutes and reports delivered, late, and undelivered separately. Travel delta is signed; less travel can reflect stranding, not improvement.

A parallel baseline dispatch advances in the same clock without any closures. The dashed comparison is a counterfactual of this fixed simulation, not a predictive traffic model. The clock runs one city minute per 350 ms while playing; Step advances exactly one minute. Reset restores the original city.

`Scenario` version 1 stores city `lastlight-v1`, tick (0–60) and ordered `{tick,road,closed}` actions. Import caps: 100 KB and 500 changes. Unknown roads, invalid order and future events are rejected. Restoring replays every intervention from tick zero. Browser capture helpers live at `window.tinyCity`.

## Recreate the demonstration

Install FFmpeg and Playwright Chromium, then run `npm run demo:capture`. This records the real interface into docs/media/demo.mp4 (50 seconds). Raw captures stay in ignored .artifacts/. The local media port is 4204.

## How this was built with AI

Ben requested this project, selected the local/free constraints, and asked for a distinct identity and a smaller-model handoff. Codex generated and iterated the code, fixtures, tests and media from those directions. The artifacts preserve actual checks and limitations; they do not imply every line was hand-written by Ben.

See [TASKS.md](TASKS.md) for bounded implementation tickets and [BUILD_LOG.md](BUILD_LOG.md) for observed fixes and evidence.

## Limits

Fixed synthetic world, shortest-path couriers and a bounded hour. No congestion, road capacity, collision physics, real addresses, external map services or city-scale planning claims.

Original code is [MIT licensed](LICENSE). Third-party models/libraries retain their terms; see [notices](THIRD_PARTY_NOTICES.md). GitHub Actions checks and deploys a static build with the repository base path. Local LLM training is never part of the hosted deployment or Linux CI.
