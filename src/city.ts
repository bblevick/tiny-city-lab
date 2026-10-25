import {
  type City,
  type Point,
  nearestNode,
  shortestTree,
  pathFrom,
  shortestPath,
  distance,
} from "./graph";
export interface Stop extends Point {
  id: number;
  node: number;
  label: string;
  snapMeters: number;
}
export interface FleetPlan {
  routes: Stop[][];
  minutes: number[];
  unreachable: Stop[];
}
export const COLORS = [
  "#c8683f",
  "#357c80",
  "#997638",
  "#776598",
  "#52713b",
  "#b45c76",
  "#3972a0",
  "#8a583d",
];
export const NAMES = [
  "Miso",
  "Pip",
  "Bea",
  "Sol",
  "Fern",
  "Otto",
  "Nell",
  "Kit",
];
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function stopAt(
  city: City,
  p: Point,
  id: number,
  label = `Parcel ${id}`,
): Stop {
  const s = nearestNode(city, p);
  if (s.node < 0 || s.meters > 200)
    throw Error("Choose a point within 200 m of the connected street network.");
  if (
    !city.bounds.every((v, i) =>
      i === 0
        ? p.lat >= v
        : i === 1
          ? p.lon >= v
          : i === 2
            ? p.lat <= v
            : p.lon <= v,
    )
  )
    throw Error("That stop is outside this loaded neighborhood.");
  return {
    ...p,
    id,
    node: s.node,
    label: label.slice(0, 64),
    snapMeters: s.meters,
  };
}
export function randomStops(
  city: City,
  depot: number,
  count: number,
  seed: number,
) {
  if (!Number.isInteger(count) || count < 1 || count > 60)
    throw Error("Choose 1–60 parcels.");
  const random = seeded(seed),
    pool = city.component.filter(
      (n) => n !== depot && distance(city.nodes[n]!, city.nodes[depot]!) > 40,
    );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool
    .slice(0, count)
    .map((n, i) => ({
      ...city.nodes[n]!,
      node: n,
      id: i + 1,
      label: `Parcel ${i + 1}`,
      snapMeters: 0,
    }));
}
export function planFleet(
  city: City,
  depot: number,
  stops: Stop[],
  vans: number,
  closed = new Set<string>(),
): FleetPlan {
  if (!Number.isInteger(vans) || vans < 1 || vans > 8)
    throw Error("Choose 1–8 vans.");
  const trees = new Map<number, ReturnType<typeof shortestTree>>();
  const cost = (a: number, b: number) => {
    if (!trees.has(a)) trees.set(a, shortestTree(city, a, closed));
    return trees.get(a)!.cost[b]!;
  };
  const duration = (route: Stop[]) => {
    let n = depot,
      total = 0;
    for (const s of route) {
      total += cost(n, s.node) + 0.5;
      n = s.node;
    }
    return total + cost(n, depot);
  };
  const routes: Stop[][] = Array.from({ length: vans }, () => []),
    minutes = Array(vans).fill(0) as number[],
    unreachable = stops.filter(
      (s) => !Number.isFinite(cost(depot, s.node) + cost(s.node, depot)),
    );
  const usable = stops
    .filter((s) => !unreachable.includes(s))
    .sort((a, b) => cost(depot, b.node) - cost(depot, a.node) || a.id - b.id);
  for (const s of usable) {
    let best = Infinity,
      bestVan = 0,
      bestAt = 0,
      bestTime = 0;
    for (let v = 0; v < vans; v++) {
      const route = routes[v]!;
      for (let at = 0; at <= route.length; at++) {
        const next = [...route.slice(0, at), s, ...route.slice(at)],
          time = duration(next),
          score = time + 0.2 * (time - minutes[v]!);
        if (score < best) {
          best = score;
          bestVan = v;
          bestAt = at;
          bestTime = time;
        }
      }
    }
    routes[bestVan]!.splice(bestAt, 0, s);
    minutes[bestVan] = bestTime;
  }
  // Bounded directed 2-opt: every reversed candidate is scored on directed paths.
  for (let v = 0; v < vans; v++) {
    for (let pass = 0; pass < 4; pass++) {
      let improved = false;
      const route = routes[v]!;
      for (let a = 0; a < route.length - 1; a++)
        for (let b = a + 1; b < route.length; b++) {
          const next = [
              ...route.slice(0, a),
              ...route.slice(a, b + 1).reverse(),
              ...route.slice(b + 1),
            ],
            time = duration(next);
          if (time < minutes[v]! - 0.00001) {
            routes[v] = next;
            minutes[v] = time;
            improved = true;
            break;
          }
        }
      if (!improved) break;
    }
  }
  return { routes, minutes, unreachable };
}
export interface Courier {
  id: number;
  name: string;
  color: string;
  node: number;
  to: number | null;
  edge: number | null;
  edgeProgress: number;
  route: number[];
  stops: Stop[];
  index: number;
  service: number;
  distance: number;
  delivered: number[];
  status: "ready" | "moving" | "delivering" | "stranded" | "home";
  completedAt: number | null;
}
export interface Action {
  minute: number;
  road: string;
  closed: boolean;
}
export interface World {
  city: City;
  depot: number;
  stops: Stop[];
  vans: number;
  minute: number;
  closed: Set<string>;
  couriers: Courier[];
  plan: FleetPlan;
  actions: Action[];
}
export function createWorld(
  city: City,
  depot: number,
  stops: Stop[],
  vans: number,
  closed = new Set<string>(),
): World {
  const plan = planFleet(city, depot, stops, vans, closed);
  return {
    city,
    depot,
    stops,
    vans,
    minute: 0,
    closed: new Set(closed),
    actions: [],
    plan,
    couriers: plan.routes.map((route, i) => ({
      id: i,
      name: NAMES[i]!,
      color: COLORS[i]!,
      node: depot,
      to: null,
      edge: null,
      edgeProgress: 0,
      route: [],
      stops: route,
      index: 0,
      service: 0,
      distance: 0,
      delivered: [],
      status: route.length ? "ready" : "home",
      completedAt: route.length ? null : 0,
    })),
  };
}
export function toggleRoad(
  w: World,
  id: string,
  closed = !w.closed.has(id),
  record = true,
) {
  if (!w.city.roads.some((r) => r.id === id))
    throw Error("Unknown street segment");
  closed ? w.closed.add(id) : w.closed.delete(id);
  if (record) w.actions.push({ minute: w.minute, road: id, closed });
  for (const c of w.couriers) c.route = [];
}
export function advance(w: World, minutes = 1 / 60) {
  const dt = Math.min(minutes, 240 - w.minute);
  if (dt <= 0) return;
  for (const c of w.couriers) {
    let left = dt,
      iterations = 0;
    while (left > 1e-9 && iterations++ < 2000) {
      if (c.status === "home") break;
      if (c.service > 0) {
        const used = Math.min(left, c.service);
        c.service -= used;
        left -= used;
        if (c.service < 1e-9) {
          c.service = 0;
          c.delivered.push(c.stops[c.index]!.id);
          c.index++;
        }
        continue;
      }
      if (c.to !== null) {
        const r = w.city.roads[c.edge!]!,
          remaining = r.minutes * (1 - c.edgeProgress),
          used = Math.min(left, remaining);
        c.edgeProgress += used / r.minutes;
        c.distance += (r.meters * used) / r.minutes;
        left -= used;
        c.status = "moving";
        if (c.edgeProgress >= 1 - 1e-9) {
          c.node = c.to;
          c.to = null;
          c.edge = null;
          c.edgeProgress = 0;
        }
        continue;
      }
      const target = c.stops[c.index]?.node ?? w.depot;
      if (c.node === target) {
        if (c.index < c.stops.length) {
          c.service = 0.5;
          c.status = "delivering";
          continue;
        }
        c.status = "home";
        c.completedAt = w.minute + dt - left;
        break;
      }
      if (!c.route.length) {
        const p = shortestPath(w.city, c.node, target, w.closed);
        if (!p) {
          c.status = "stranded";
          break;
        }
        c.route = p.roads;
      }
      const ri = c.route.shift()!,
        r = w.city.roads[ri]!;
      if (w.closed.has(r.id)) {
        c.route = [];
        continue;
      }
      c.edge = ri;
      c.to = r.a === c.node ? r.b : r.a;
      c.edgeProgress = 0;
      c.status = "moving";
    }
  }
  w.minute = Math.min(240, w.minute + dt);
}
export function metrics(w: World) {
  const delivered = w.couriers.reduce((s, c) => s + c.delivered.length, 0);
  return {
    delivered,
    pending: w.stops.length - delivered,
    stranded: w.couriers.filter((c) => c.status === "stranded").length,
    distance: w.couriers.reduce((s, c) => s + c.distance, 0),
    home: w.couriers.filter((c) => c.status === "home").length,
    done:
      w.plan.unreachable.length === 0 &&
      w.couriers.every((c) => c.status === "home"),
  };
}
export function sampleCourier(city: City, c: Courier) {
  const a = city.nodes[c.node]!;
  if (c.to === null) return { x: a.x, y: a.y };
  const b = city.nodes[c.to]!;
  return {
    x: a.x + (b.x - a.x) * c.edgeProgress,
    y: a.y + (b.y - a.y) * c.edgeProgress,
  };
}
export function routeRoads(w: World, c: Courier) {
  const roads: number[] = [];
  let n = c.to ?? c.node;
  if (c.edge !== null) roads.push(c.edge);
  for (const stop of c.stops.slice(c.index)) {
    const path = shortestPath(w.city, n, stop.node, w.closed);
    if (!path) break;
    roads.push(...path.roads);
    n = stop.node;
  }
  const back = shortestPath(w.city, n, w.depot, w.closed);
  if (back) roads.push(...back.roads);
  return roads;
}
export interface Scenario {
  version: 2;
  city: string;
  center: Point;
  depot: Point;
  stops: { lat: number; lon: number; id: number; label: string }[];
  vans: number;
  minute: number;
  actions: Action[];
  raw?: unknown;
}
export function validateScenario(value: unknown): Scenario {
  const s = value as Scenario,
    point = (p: Point) =>
      p &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lon) &&
      Math.abs(p.lat) <= 75 &&
      Math.abs(p.lon) <= 180;
  if (
    !s ||
    s.version !== 2 ||
    !["cleveland", "san-francisco", "manhattan", "custom"].includes(s.city) ||
    !point(s.center) ||
    !point(s.depot) ||
    !Array.isArray(s.stops) ||
    s.stops.length < 1 ||
    s.stops.length > 60 ||
    new Set(s.stops.map((p) => p.id)).size !== s.stops.length ||
    s.stops.some(
      (p) =>
        !point(p) ||
        !Number.isInteger(p.id) ||
        p.id < 1 ||
        typeof p.label !== "string" ||
        p.label.length > 64,
    ) ||
    !Number.isInteger(s.vans) ||
    s.vans < 1 ||
    s.vans > 8 ||
    !Number.isFinite(s.minute) ||
    s.minute < 0 ||
    s.minute > 240 ||
    !Array.isArray(s.actions) ||
    s.actions.length > 500
  )
    throw Error(
      "Use a Lastlight version 2 scenario with 1–60 stops, 1–8 vans and up to 500 road changes.",
    );
  let last = 0;
  for (const a of s.actions) {
    if (
      !a ||
      !Number.isFinite(a.minute) ||
      a.minute < last ||
      a.minute > s.minute ||
      typeof a.road !== "string" ||
      typeof a.closed !== "boolean"
    )
      throw Error("Invalid road-change history");
    last = a.minute;
  }
  return s;
}
export function restore(city: City, s: Scenario) {
  const depot = nearestNode(city, s.depot).node,
    stops = s.stops.map((p) => stopAt(city, p, p.id, p.label));
  if (
    stops.some((p) => p.node === depot) ||
    new Set(stops.map((p) => p.node)).size !== stops.length
  )
    throw Error("Scenario stops overlap after street snapping.");
  const w = createWorld(city, depot, stops, s.vans);
  for (const a of s.actions) {
    while (w.minute < a.minute - 1e-8)
      advance(w, Math.min(1 / 60, a.minute - w.minute));
    toggleRoad(w, a.road, a.closed);
  }
  while (w.minute < s.minute - 1e-8)
    advance(w, Math.min(1 / 60, s.minute - w.minute));
  return w;
}
