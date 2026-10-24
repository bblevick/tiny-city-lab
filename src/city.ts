export interface Node {
  id: number;
  x: number;
  y: number;
}
export interface Road {
  id: string;
  a: number;
  b: number;
  cost: number;
  name: string;
  bridge: boolean;
}
export const nodes: Node[] = Array.from({ length: 49 }, (_, id) => ({
  id,
  x: id % 7,
  y: Math.floor(id / 7),
}));
export const nodeId = (x: number, y: number) => y * 7 + x;
export function roadId(a: number, b: number) {
  return [a, b].sort((x, y) => x - y).join("-");
}
export const roads: Road[] = [];
for (const node of nodes) {
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
  ]) {
    const x = node.x + dx,
      y = node.y + dy;
    if (x > 6 || y > 6) continue;
    const bridge = node.x === 2 && dx === 1;
    if (bridge && ![1, 3, 5].includes(y)) continue;
    const b = nodeId(x, y);
    roads.push({
      id: roadId(node.id, b),
      a: node.id,
      b,
      cost: bridge ? 2 : 1,
      bridge,
      name: bridge
        ? `${{ 1: "North", 3: "Market", 5: "South" }[y]} Bridge`
        : `${dx ? "Lantern" : "Orchard"} ${node.x + 1} / ${node.y + 1}`,
    });
  }
}
export const roadMap = new Map(roads.map((r) => [r.id, r]));
export function shortestPath(start: number, end: number, closed: Set<string>) {
  const distance = new Map<number, number>([[start, 0]]),
    previous = new Map<number, number>(),
    open = new Set(nodes.map((n) => n.id));
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const id of open) {
      const d = distance.get(id) ?? Infinity;
      if (d < best) {
        current = id;
        best = d;
      }
    }
    if (current < 0) break;
    open.delete(current);
    if (current === end) {
      const path = [end];
      while (path[0] !== start) path.unshift(previous.get(path[0])!);
      return { path, cost: best };
    }
    for (const r of roads) {
      if (closed.has(r.id) || (r.a !== current && r.b !== current)) continue;
      const next = r.a === current ? r.b : r.a;
      if (!open.has(next)) continue;
      const candidate = best + r.cost;
      if (candidate < (distance.get(next) ?? Infinity)) {
        distance.set(next, candidate);
        previous.set(next, current);
      }
    }
  }
  return null;
}
export interface Parcel {
  destination: number;
  deadline: number;
  deliveredAt: number | null;
}
export interface Courier {
  id: string;
  name: string;
  color: string;
  node: number;
  to: number | null;
  remaining: number;
  duration: number;
  travel: number;
  parcels: Parcel[];
  index: number;
  route: number[];
  status: "ready" | "moving" | "stranded" | "done";
}
export interface Action {
  tick: number;
  road: string;
  closed: boolean;
}
export interface World {
  tick: number;
  closed: Set<string>;
  couriers: Courier[];
  actions: Action[];
}
const depot = nodeId(0, 3);
const dispatches = [
  {
    name: "Miso",
    color: "#d27442",
    stops: [
      [6, 0],
      [6, 3],
      [6, 6],
    ],
  },
  {
    name: "Pip",
    color: "#537d6d",
    stops: [
      [0, 0],
      [2, 0],
      [4, 1],
    ],
  },
  {
    name: "Bea",
    color: "#a58040",
    stops: [
      [1, 6],
      [4, 6],
      [5, 4],
    ],
  },
  {
    name: "Sol",
    color: "#7b739b",
    stops: [
      [3, 2],
      [5, 2],
      [3, 5],
    ],
  },
];
export function createWorld(): World {
  return {
    tick: 0,
    closed: new Set(),
    actions: [],
    couriers: dispatches.map((d, i) => {
      let node = depot,
        arrival = 0;
      const parcels = d.stops.map(([x, y]) => {
        const destination = nodeId(x, y);
        arrival += shortestPath(node, destination, new Set())!.cost;
        node = destination;
        return { destination, deadline: arrival + 5, deliveredAt: null };
      });
      return {
        id: String(i),
        name: d.name,
        color: d.color,
        node: depot,
        to: null,
        remaining: 0,
        duration: 0,
        travel: 0,
        parcels,
        index: 0,
        route: [],
        status: "ready",
      };
    }),
  };
}
export function plan(c: Courier, closed: Set<string>) {
  if (c.index >= c.parcels.length) return [];
  return (
    shortestPath(c.to ?? c.node, c.parcels[c.index].destination, closed)
      ?.path ?? []
  );
}
export function toggleRoad(
  w: World,
  id: string,
  closed = !w.closed.has(id),
  record = true,
) {
  if (!roadMap.has(id)) throw Error("Unknown road");
  closed ? w.closed.add(id) : w.closed.delete(id);
  if (record) w.actions.push({ tick: w.tick, road: id, closed });
  for (const c of w.couriers) c.route = plan(c, w.closed);
}
export function advance(w: World) {
  if (w.tick >= 60) return;
  for (const c of w.couriers) {
    if (c.index >= c.parcels.length) {
      c.status = "done";
      continue;
    }
    if (c.to === null) {
      const route = shortestPath(
        c.node,
        c.parcels[c.index].destination,
        w.closed,
      );
      if (!route) {
        c.status = "stranded";
        c.route = [];
        continue;
      }
      c.route = route.path;
      if (route.path.length === 1) {
        c.parcels[c.index].deliveredAt = w.tick;
        c.index++;
        continue;
      }
      c.to = route.path[1];
      c.duration = roadMap.get(roadId(c.node, c.to))!.cost;
      c.remaining = c.duration;
    }
    c.status = "moving";
    c.remaining--;
    c.travel++;
    if (c.remaining === 0) {
      c.node = c.to!;
      c.to = null;
      const parcel = c.parcels[c.index];
      if (c.node === parcel.destination) {
        parcel.deliveredAt = w.tick + 1;
        c.index++;
      }
      c.route = plan(c, w.closed);
      if (c.index === c.parcels.length) c.status = "done";
    }
  }
  w.tick++;
}
export function metrics(w: World) {
  const parcels = w.couriers.flatMap((c) => c.parcels),
    delivered = parcels.filter((p) => p.deliveredAt !== null);
  return {
    delivered: delivered.length,
    onTime: delivered.filter((p) => p.deliveredAt! <= p.deadline).length,
    late: delivered.filter((p) => p.deliveredAt! > p.deadline).length,
    pending: parcels.length - delivered.length,
    stranded: w.couriers.filter((c) => c.status === "stranded").length,
    travel: w.couriers.reduce((n, c) => n + c.travel, 0),
  };
}
export function sampleCourier(c: Courier, fraction = 0) {
  const a = nodes[c.node];
  if (c.to === null) return { x: a.x, y: a.y };
  const b = nodes[c.to],
    progress = Math.max(
      0,
      Math.min(1, (c.duration - c.remaining + fraction) / c.duration),
    );
  return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress };
}
export interface Scenario {
  version: 1;
  city: "lastlight-v1";
  tick: number;
  actions: Action[];
}
export function parseScenario(value: unknown): Scenario {
  const s = value as Scenario;
  if (
    !s ||
    s.version !== 1 ||
    s.city !== "lastlight-v1" ||
    !Number.isInteger(s.tick) ||
    s.tick < 0 ||
    s.tick > 60 ||
    !Array.isArray(s.actions) ||
    s.actions.length > 500
  )
    throw Error(
      "Use a Lastlight version 1 scenario of up to 60 minutes and 500 road changes.",
    );
  let tick = -1;
  for (const a of s.actions) {
    if (
      !a ||
      !Number.isInteger(a.tick) ||
      a.tick < tick ||
      a.tick > s.tick ||
      !roadMap.has(a.road) ||
      typeof a.closed !== "boolean"
    )
      throw Error("Invalid road history");
    tick = a.tick;
  }
  return { ...s, actions: s.actions.map((a) => ({ ...a })) };
}
export function restore(s: Scenario) {
  const w = createWorld();
  for (let t = 0; t <= s.tick; t++) {
    for (const a of s.actions.filter((a) => a.tick === t))
      toggleRoad(w, a.road, a.closed);
    if (t < s.tick) advance(w);
  }
  return w;
}
