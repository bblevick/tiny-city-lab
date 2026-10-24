import { describe, it, expect } from "vitest";
import {
  roads,
  nodes,
  createWorld,
  advance,
  metrics,
  shortestPath,
  toggleRoad,
  restore,
  parseScenario,
} from "../src/city";
describe("the evening", () => {
  it("all parcels arrive in the unchanged city", () => {
    const w = createWorld();
    for (let i = 0; i < 60; i++) advance(w);
    expect(metrics(w)).toMatchObject({ delivered: 12, late: 0, pending: 0 });
  });
  it("river crossings require bridges and closures cannot shorten shortest paths", () => {
    const bridges = roads.filter((r) => r.bridge).map((r) => r.id);
    expect(shortestPath(0, 6, new Set(bridges))).toBe(null);
    const before = shortestPath(21, 6, new Set())!.cost;
    for (const bridge of bridges) {
      const p = shortestPath(21, 6, new Set([bridge]));
      expect(p === null || p.cost >= before).toBe(true);
    }
  });
  it("stranded couriers recover when the road reopens", () => {
    const w = createWorld(),
      around = roads.filter((r) => r.a === 21 || r.b === 21);
    around.forEach((r) => toggleRoad(w, r.id, true));
    advance(w);
    expect(metrics(w).stranded).toBe(4);
    expect(metrics(w).delivered).toBe(0);
    around.forEach((r) => toggleRoad(w, r.id, false));
    for (let i = 0; i < 59; i++) advance(w);
    expect(metrics(w).delivered).toBe(12);
  });
  it("exports and replays exact road history", () => {
    const w = createWorld();
    advance(w);
    toggleRoad(w, roads.find((r) => r.bridge)!.id, true);
    for (let i = 0; i < 19; i++) advance(w);
    const restored = restore(
      parseScenario({
        version: 1,
        city: "lastlight-v1",
        tick: w.tick,
        actions: w.actions,
      }),
    );
    expect(restored).toEqual(w);
    expect(() =>
      parseScenario({
        version: 1,
        city: "lastlight-v1",
        tick: 2,
        actions: [{ tick: 3, road: "bad", closed: true }],
      }),
    ).toThrow();
  });
  it("routing never traverses a closed street", () => {
    const closed = new Set(
      roads.filter((_, i) => i % 6 === 0).map((r) => r.id),
    );
    for (const n of nodes) {
      const route = shortestPath(0, n.id, closed);
      if (route)
        for (let i = 1; i < route.path.length; i++)
          expect(
            closed.has(
              [route.path[i - 1], route.path[i]]
                .sort((a, b) => a - b)
                .join("-"),
            ),
          ).toBe(false);
    }
  });
});
