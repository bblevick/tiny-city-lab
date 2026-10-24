# Build log

## October 24, 2026 — user-requested expansion to five projects

- User explicitly requested tiny-city-lab alongside the original three, and specifically requested real LLM fine-tuning in Visual Model Lab.
- Implemented Tiny City Lab — Lastlight with the original free/local constraints and its own repository, dependency lock and Pages workflow.
- TypeScript, Canvas 2D, Vite; no map API or application backend.
- Fixed synthetic world, shortest-path couriers and a bounded hour. No congestion, road capacity, collision physics, real addresses, external map services or city-scale planning claims.

Routing tests establish valid open paths, no-closure completion, stranding/recovery and exact scenario replay. Corrected courier interpolation across the expanded river gap and labeled travel difference as signed delta rather than implying that stranded vehicles improved performance.
