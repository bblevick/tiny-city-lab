import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  parseOSM,
  shortestPath,
  nearestNode,
  PRESETS,
  type City,
} from "../src/graph";
import {
  randomStops,
  planFleet,
  createWorld,
  advance,
  metrics,
  toggleRoad,
  restore,
  validateScenario,
  stopAt,
} from "../src/city";
function fixture() {
  const geometry = Array.from({ length: 20 }, (_, i) => ({
    lat: 41.485 + Math.sin((i * Math.PI) / 10) * 0.002,
    lon: -81.708 + Math.cos((i * Math.PI) / 10) * 0.002,
  }));
  return {
    elements: [
      {
        type: "way",
        id: 1,
        nodes: [...geometry.map((_, i) => i + 1), 1],
        geometry: [...geometry, geometry[0]],
        tags: { highway: "residential", name: "Circle Street", oneway: "yes" },
      },
    ],
  };
}
const city = () => parseOSM(fixture(), PRESETS[0]!);
function complete(w: ReturnType<typeof createWorld>) {
  for (let i = 0; i < 14400 && !metrics(w).done; i++) advance(w);
  return metrics(w);
}
describe("real street dispatch", () => {
  it("respects directed way order and private access", () => {
    const c = city();
    const forward = shortestPath(c, 0, 1)!,
      back = shortestPath(c, 1, 0)!;
    expect(forward.roads.length).toBe(1);
    expect(back.roads.length).toBe(19);
    expect(shortestPath(c, 0, 1, new Set([c.roads[0]!.id]))).toBeNull();
    const raw = fixture();
    raw.elements.push({
      ...raw.elements[0]!,
      id: 2,
      tags: {
        highway: "residential",
        name: "Private shortcut",
        oneway: "yes",
        access: "private",
      } as any,
    });
    expect(parseOSM(raw, PRESETS[0]!).roads.length).toBe(c.roads.length);
  });
  it("random manifests repeat by seed and snapping is bounded", () => {
    const c = city(),
      a = randomStops(c, 0, 12, 42);
    expect(a).toEqual(randomStops(c, 0, 12, 42));
    expect(a).not.toEqual(randomStops(c, 0, 12, 43));
    expect(new Set(a.map((s) => s.node)).size).toBe(12);
    expect(a.some((s) => s.node === 0)).toBe(false);
    expect(() => stopAt(c, { lat: 0, lon: 0 }, 1)).toThrow();
    expect(() => randomStops(c, 0, 61, 1)).toThrow();
  });
  it("allocates every parcel once for variable fleet sizes and returns every van", () => {
    const c = city(),
      stops = randomStops(c, 0, 12, 42);
    for (const vans of [1, 4, 8]) {
      const p = planFleet(c, 0, stops, vans);
      expect(p.routes).toHaveLength(vans);
      expect(
        p.routes
          .flat()
          .map((s) => s.id)
          .sort((a, b) => a - b),
      ).toEqual(stops.map((s) => s.id).sort((a, b) => a - b));
      const w = createWorld(c, 0, stops, vans);
      expect(complete(w)).toMatchObject({
        delivered: 12,
        pending: 0,
        home: vans,
        done: true,
      });
      expect(w.couriers.every((v) => v.node === 0)).toBe(true);
      expect(
        Math.max(...w.couriers.map((v) => v.completedAt ?? 0)),
      ).toBeCloseTo(Math.max(...p.minutes), 2);
    }
  });
  it("finishes its current segment before a closure strands it and recovers", () => {
    const c = city(),
      w = createWorld(c, 0, randomStops(c, 0, 4, 42), 1);
    advance(w, 0.01);
    const van = w.couriers[0]!,
      to = van.to;
    expect(to).not.toBeNull();
    c.roads.forEach((r) => toggleRoad(w, r.id, true));
    advance(w, 3);
    expect(van.node).toBe(to);
    expect(van.status).toBe("stranded");
    expect(metrics(w).pending).toBe(4);
    [...w.closed].forEach((id) => toggleRoad(w, id, false));
    expect(complete(w).done).toBe(true);
  });
  it("round-trips the actual manifest, fleet, clock and intervention history", () => {
    const c = city(),
      w = createWorld(c, 0, randomStops(c, 0, 6, 7), 3);
    for (let i = 0; i < 60; i++) advance(w);
    toggleRoad(w, c.roads[3]!.id, true);
    for (let i = 0; i < 60; i++) advance(w);
    toggleRoad(w, c.roads[3]!.id, false);
    const s = validateScenario({
      version: 2,
      city: c.id,
      center: c.center,
      depot: c.nodes[0],
      stops: w.stops,
      vans: 3,
      minute: w.minute,
      actions: w.actions,
    });
    const other = restore(c, s);
    const rounded = (v: unknown) =>
      JSON.parse(
        JSON.stringify(v, (_, x) =>
          typeof x === "number" ? Math.round(x * 1e8) / 1e8 : x,
        ),
      );
    expect(rounded(other.couriers)).toEqual(rounded(w.couriers));
    expect(other.minute).toBeCloseTo(w.minute, 8);
    expect(() => validateScenario({ ...s, vans: 9 })).toThrow();
    expect(() => validateScenario({ ...s, version: 1 })).toThrow();
    expect(() =>
      validateScenario({ ...s, stops: [s.stops[0], s.stops[0]] }),
    ).toThrow();
  });
  it("preserves provenance for three actual OSM snapshots and finds connected delivery paths", () => {
    for (const meta of PRESETS) {
      const path = new URL(`../public/cities/${meta.id}.json`, import.meta.url),
        raw = readFileSync(path),
        source = JSON.parse(
          readFileSync(
            new URL(`../data/${meta.id}-provenance.json`, import.meta.url),
            "utf8",
          ),
        );
      expect(createHash("sha256").update(raw).digest("hex")).toBe(
        source.normalizedSHA256,
      );
      const c = parseOSM(JSON.parse(raw.toString()), meta),
        depot = nearestNode(c, c.center).node;
      expect(c.component.length).toBeGreaterThan(100);
      expect(c.shapes.length).toBeGreaterThan(50);
      const stops = randomStops(c, depot, 20, 42),
        plan = planFleet(c, depot, stops, 4);
      expect(plan.unreachable).toEqual([]);
      expect(plan.routes.flat()).toHaveLength(20);
      expect(complete(createWorld(c, depot, stops, 4))).toMatchObject({
        done: true,
        delivered: 20,
        home: 4,
      });
    }
  });
});
