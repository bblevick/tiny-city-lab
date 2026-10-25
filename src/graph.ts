export interface Point {
  lat: number;
  lon: number;
}
export interface StreetNode extends Point {
  id: number;
  x: number;
  y: number;
}
export interface Road {
  id: string;
  a: number;
  b: number;
  meters: number;
  minutes: number;
  name: string;
  oneway: 0 | 1 | -1;
  kind: string;
}
export interface Shape {
  points: { x: number; y: number }[];
  kind: "building" | "park" | "water";
  height: number;
}
export interface City {
  id: string;
  name: string;
  center: Point;
  bounds: number[];
  nodes: StreetNode[];
  roads: Road[];
  shapes: Shape[];
  adj: Edge[][];
  component: number[];
  sourceDate: string;
}
interface Edge {
  to: number;
  road: number;
}
export const PRESETS = [
  { id: "cleveland", name: "Cleveland · Ohio City", lat: 41.485, lon: -81.708 },
  {
    id: "san-francisco",
    name: "San Francisco · Mission",
    lat: 37.759,
    lon: -122.416,
  },
  {
    id: "manhattan",
    name: "New York · East Village",
    lat: 40.727,
    lon: -73.986,
  },
];
export function boundsFor(lat: number, lon: number) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 75 ||
    Math.abs(lon) > 180
  )
    throw Error(
      "Use a latitude between −75 and 75 and longitude between −180 and 180.",
    );
  const dy = 600 / 111320,
    dx = dy / Math.cos((lat * Math.PI) / 180);
  return [lat - dy, lon - dx, lat + dy, lon + dx];
}
export function queryFor(bounds: number[]) {
  const b = bounds.map((v) => v.toFixed(6)).join(",");
  return `[out:json][timeout:40];(way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|service|primary_link|secondary_link|tertiary_link)$"](${b});way["building"](${b});way["leisure"="park"](${b});way["natural"="water"](${b}););out geom;`;
}
export function distance(a: Point, b: Point) {
  const rad = Math.PI / 180,
    dy = (b.lat - a.lat) * rad,
    dx = (b.lon - a.lon) * rad;
  return (
    6371000 *
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(dy / 2) ** 2 +
            Math.cos(a.lat * rad) *
              Math.cos(b.lat * rad) *
              Math.sin(dx / 2) ** 2,
        ),
      ),
    )
  );
}
export function local(p: Point, center: Point) {
  return {
    x: (p.lon - center.lon) * 111320 * Math.cos((center.lat * Math.PI) / 180),
    y: -(p.lat - center.lat) * 111320,
  };
}
export function geographic(x: number, y: number, center: Point) {
  return {
    lat: center.lat - y / 111320,
    lon: center.lon + x / (111320 * Math.cos((center.lat * Math.PI) / 180)),
  };
}
const allowed =
  /^(primary|secondary|tertiary|residential|unclassified|living_street|service|primary_link|secondary_link|tertiary_link)$/;
interface Way {
  type: string;
  id: number;
  nodes?: number[];
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}
export function parseOSM(
  raw: unknown,
  meta: { id: string; name: string; lat: number; lon: number },
): City {
  const data = raw as {
    elements: Way[];
    osm3s?: { timestamp_osm_base: string };
    remark?: string;
  };
  if (
    !data ||
    !Array.isArray(data.elements) ||
    data.elements.length > 15000 ||
    data.remark
  )
    throw Error(
      "Map response is incomplete or too large. Try another nearby area.",
    );
  const bounds = boundsFor(meta.lat, meta.lon),
    center = { lat: meta.lat, lon: meta.lon },
    nodes: StreetNode[] = [],
    roads: Road[] = [],
    shapes: Shape[] = [],
    ids = new Map<number, number>();
  const inside = (p: Point) =>
    p.lat >= bounds[0]! &&
    p.lat <= bounds[2]! &&
    p.lon >= bounds[1]! &&
    p.lon <= bounds[3]!;
  const node = (id: number, p: Point) => {
    let i = ids.get(id);
    if (i === undefined) {
      i = nodes.length;
      ids.set(id, i);
      nodes.push({ ...p, ...local(p, center), id });
    }
    return i;
  };
  for (const way of data.elements) {
    const t = way.tags ?? {},
      g = way.geometry;
    if (
      way.type !== "way" ||
      !g ||
      g.length > 4000 ||
      g.some(
        (p) =>
          !p ||
          !Number.isFinite(p.lat) ||
          !Number.isFinite(p.lon) ||
          Math.abs(p.lat) > 90 ||
          Math.abs(p.lon) > 180,
      )
    )
      continue;
    if (
      allowed.test(t.highway ?? "") &&
      way.nodes?.length === g.length &&
      !["no", "private"].includes(
        t.motor_vehicle ?? t.vehicle ?? t.access ?? "yes",
      ) &&
      t.area !== "yes"
    ) {
      const one: 0 | 1 | -1 =
        t.oneway === "-1"
          ? -1
          : ["yes", "1", "true"].includes(t.oneway ?? "") ||
              (!t.oneway && t.junction === "roundabout")
            ? 1
            : 0;
      for (let k = 1; k < g.length; k++) {
        const p = g[k - 1]!,
          q = g[k]!;
        if (!inside(p) || !inside(q) || way.nodes[k - 1] === way.nodes[k])
          continue;
        const meters = distance(p, q);
        if (meters < 0.1 || meters > 2000) continue;
        const a = node(way.nodes[k - 1]!, p),
          b = node(way.nodes[k]!, q);
        roads.push({
          id: `${way.id}-${k}`,
          a,
          b,
          meters,
          minutes:
            meters /
            (t.highway === "service" || t.highway === "living_street"
              ? 10000 / 60
              : 25000 / 60),
          name: t.name || t.ref || "Unnamed " + t.highway,
          kind: t.highway!,
          oneway: one,
        });
      }
    } else if (t.building || t.leisure === "park" || t.natural === "water") {
      if (g.length < 4 || !g.some(inside)) continue;
      const height =
        Number.parseFloat(t.height ?? "") ||
        Number.parseFloat(t["building:levels"] ?? "") * 3 ||
        9;
      shapes.push({
        points: g.map((p) => local(p, center)),
        kind: t.building
          ? "building"
          : t.natural === "water"
            ? "water"
            : "park",
        height: Math.min(60, Math.max(3, height)),
      });
    }
  }
  if (nodes.length < 20 || nodes.length > 20000 || roads.length > 30000)
    throw Error(
      "Not enough connected streets, or this area is too dense. Try another center.",
    );
  const adj: Edge[][] = nodes.map(() => []);
  roads.forEach((r, i) => {
    if (r.oneway !== -1) adj[r.a]!.push({ to: r.b, road: i });
    if (r.oneway !== 1) adj[r.b]!.push({ to: r.a, road: i });
  });
  const component = largestComponent(adj);
  if (component.length < 15)
    throw Error(
      "This area has too few mutually reachable streets for a delivery fleet.",
    );
  return {
    id: meta.id,
    name: meta.name,
    center,
    bounds,
    nodes,
    roads,
    shapes,
    adj,
    component,
    sourceDate: data.osm3s?.timestamp_osm_base ?? "Unknown",
  };
}
function largestComponent(adj: Edge[][]) {
  const seen = new Set<number>(),
    order: number[] = [],
    rev: number[][] = adj.map(() => []);
  adj.forEach((edges, i) => edges.forEach((e) => rev[e.to]!.push(i)));
  for (let i = 0; i < adj.length; i++) {
    if (seen.has(i)) continue;
    const stack: [number, number][] = [[i, 0]];
    seen.add(i);
    while (stack.length) {
      const top = stack[stack.length - 1]!,
        edge = adj[top[0]]![top[1]++];
      if (edge) {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          stack.push([edge.to, 0]);
        }
      } else {
        order.push(top[0]);
        stack.pop();
      }
    }
  }
  seen.clear();
  let largest: number[] = [];
  for (const i of order.reverse()) {
    if (seen.has(i)) continue;
    const group: number[] = [],
      stack = [i];
    seen.add(i);
    while (stack.length) {
      const n = stack.pop()!;
      group.push(n);
      for (const next of rev[n]!)
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
    }
    if (group.length > largest.length) largest = group;
  }
  return largest.sort((a, b) => a - b);
}
class Heap {
  data: [number, number][] = [];
  push(value: [number, number]) {
    const d = this.data;
    d.push(value);
    let i = d.length - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (d[p]![0] <= value[0]) break;
      d[i] = d[p]!;
      i = p;
    }
    d[i] = value;
  }
  pop() {
    const d = this.data,
      first = d[0]!,
      last = d.pop()!;
    if (d.length) {
      let i = 0;
      while (i * 2 + 1 < d.length) {
        let c = i * 2 + 1;
        if (c + 1 < d.length && d[c + 1]![0] < d[c]![0]) c++;
        if (d[c]![0] >= last[0]) break;
        d[i] = d[c]!;
        i = c;
      }
      d[i] = last;
    }
    return first;
  }
}
export interface Tree {
  cost: Float64Array;
  previous: Int32Array;
  via: Int32Array;
}
export function shortestTree(
  city: City,
  start: number,
  closed = new Set<string>(),
): Tree {
  const cost = new Float64Array(city.nodes.length).fill(Infinity),
    previous = new Int32Array(cost.length).fill(-1),
    via = new Int32Array(cost.length).fill(-1),
    heap = new Heap();
  cost[start] = 0;
  heap.push([0, start]);
  while (heap.data.length) {
    const [d, n] = heap.pop();
    if (d !== cost[n]) continue;
    for (const e of city.adj[n]!) {
      const r = city.roads[e.road]!;
      if (closed.has(r.id)) continue;
      const v = d + r.minutes;
      if (v < cost[e.to]!) {
        cost[e.to] = v;
        previous[e.to] = n;
        via[e.to] = e.road;
        heap.push([v, e.to]);
      }
    }
  }
  return { cost, previous, via };
}
export function pathFrom(tree: Tree, start: number, end: number) {
  if (!Number.isFinite(tree.cost[end])) return null;
  const nodes = [end],
    roads: number[] = [];
  let n = end;
  while (n !== start) {
    roads.unshift(tree.via[n]!);
    n = tree.previous[n]!;
    if (n < 0) return null;
    nodes.unshift(n);
  }
  return { nodes, roads, minutes: tree.cost[end]! };
}
export function shortestPath(
  city: City,
  start: number,
  end: number,
  closed = new Set<string>(),
) {
  return pathFrom(shortestTree(city, start, closed), start, end);
}
export function nearestNode(city: City, p: Point, choices = city.component) {
  let best = -1,
    meters = Infinity;
  for (const i of choices) {
    const d = distance(p, city.nodes[i]!);
    if (d < meters) {
      best = i;
      meters = d;
    }
  }
  return { node: best, meters };
}
export async function loadPreset(id: string) {
  const meta = PRESETS.find((p) => p.id === id);
  if (!meta) throw Error("Unknown city");
  const r = await fetch(import.meta.env.BASE_URL + `cities/${id}.json`);
  if (!r.ok) throw Error("The bundled map could not load. Try reloading.");
  return parseOSM(await r.json(), meta);
}
export function normalizeMap(value: unknown) {
  const data = value as {
    elements: {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      nodes?: number[];
      tags?: Record<string, string>;
    }[];
  };
  if (!data || !Array.isArray(data.elements) || data.elements.length > 70000)
    throw Error("Map response is invalid or too dense.");
  const nodes = new Map(
    data.elements
      .filter((n) => n.type === "node")
      .map((n) => [n.id, { lat: n.lat!, lon: n.lon! }]),
  );
  return {
    osm3s: { timestamp_osm_base: new Date().toISOString() },
    elements: data.elements
      .filter((w) => w.type === "way" && w.nodes?.every((id) => nodes.has(id)))
      .map((w) => ({ ...w, geometry: w.nodes!.map((id) => nodes.get(id)!) })),
  };
}
export async function loadArea(lat: number, lon: number, signal: AbortSignal) {
  const b = boundsFor(lat, lon),
    box = [b[1], b[0], b[3], b[2]].map((v) => v!.toFixed(6)).join(",");
  const r = await fetch(
    "https://api.openstreetmap.org/api/0.6/map.json?bbox=" + box,
    { signal },
  );
  if (!r.ok)
    throw Error(
      `The public map service returned ${r.status}. Try a less dense neighborhood; bundled cities still work.`,
    );
  const text = await r.text();
  if (text.length > 10000000)
    throw Error("Map exceeds 10 MB. Try a less dense area.");
  const raw = normalizeMap(JSON.parse(text));
  return {
    city: parseOSM(raw, {
      id: "custom",
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      lat,
      lon,
    }),
    raw,
  };
}
