import { type City, geographic, type Point } from "./graph";
import { type World, sampleCourier, routeRoads } from "./city";
export const W = 1280,
  H = 840;
export interface View {
  zoom: number;
  panX: number;
  panY: number;
  tilt: boolean;
  buildings: boolean;
}
export const defaultView = (): View => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  tilt: true,
  buildings: true,
});
export function project(x: number, y: number, view: View, z = 0) {
  const scale = 0.58 * view.zoom;
  return {
    x: W / 2 + view.panX + (view.tilt ? (x - y) * 0.7071 : x) * scale,
    y:
      H / 2 +
      view.panY +
      (view.tilt ? (x + y) * 0.4384 : y) * scale -
      z * scale,
  };
}
export function unproject(x: number, y: number, view: View) {
  const scale = 0.58 * view.zoom,
    a = (x - W / 2 - view.panX) / scale,
    b = (y - H / 2 - view.panY) / scale;
  return view.tilt
    ? { x: (a / 0.7071 + b / 0.4384) / 2, y: (b / 0.4384 - a / 0.7071) / 2 }
    : { x: a, y: b };
}
export function mapPoint(city: City, x: number, y: number, view: View): Point {
  const p = unproject(x, y, view);
  return geographic(p.x, p.y, city.center);
}
function polygon(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  fill: string,
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}
let cache: HTMLCanvasElement | null = null,
  cacheKey = "",
  cityRef: City | null = null;
let routeKey = "",
  liveRoute: number[] = [],
  ghostRoute: number[] = [];
export function clearCache() {
  cacheKey = "";
  routeKey = "";
  cityRef = null;
}
function line(
  ctx: CanvasRenderingContext2D,
  city: City,
  index: number,
  view: View,
  color: string,
  width: number,
  dash: number[] = [],
) {
  const r = city.roads[index]!,
    a = project(city.nodes[r.a]!.x, city.nodes[r.a]!.y, view),
    b = project(city.nodes[r.b]!.x, city.nodes[r.b]!.y, view);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
}
function background(city: City, view: View) {
  const key = JSON.stringify(view);
  if (cache && key === cacheKey && cityRef === city) return cache;
  cache = document.createElement("canvas");
  cache.width = W;
  cache.height = H;
  cacheKey = key;
  cityRef = city;
  const ctx = cache.getContext("2d")!;
  ctx.fillStyle = "#e4e5d3";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(650, 380, 40, 650, 380, 800);
  grad.addColorStop(0, "#eeeddd");
  grad.addColorStop(1, "#d2d9c2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  for (const s of city.shapes.filter((s) => s.kind !== "building"))
    polygon(
      ctx,
      s.points.map((p) => project(p.x, p.y, view)),
      s.kind === "water" ? "#8db8b6" : "#b5c69e",
    );
  for (let i = 0; i < city.roads.length; i++) {
    const r = city.roads[i]!,
      major = ["primary", "secondary", "tertiary"].includes(r.kind);
    line(ctx, city, i, view, major ? "#c5bda7" : "#d5d1bd", major ? 8 : 5);
    line(ctx, city, i, view, "#faf5e5", major ? 5 : 3);
  }
  if (view.buildings) {
    const shapes = city.shapes
      .filter((s) => s.kind === "building")
      .sort((a, b) => {
        const p = a.points[0]!,
          q = b.points[0]!;
        return view.tilt ? p.x + p.y - (q.x + q.y) : p.y - q.y;
      });
    for (const s of shapes) {
      const height = view.tilt ? s.height : 0,
        base = s.points.map((p) => project(p.x, p.y, view)),
        top = s.points.map((p) => project(p.x, p.y, view, height));
      if (view.tilt)
        for (let i = 1; i < base.length; i++) {
          const a = base[i - 1]!,
            b = base[i]!;
          if (b.x > a.x)
            polygon(
              ctx,
              [a, b, top[i]!, top[i - 1]!],
              i % 2 ? "#939d83" : "#b2b396",
            );
        }
      polygon(ctx, top, "#c5c8ae");
      ctx.strokeStyle = "#aab59a";
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
  }
  // Labels are derived from actual named OSM streets, spaced to avoid a wall of text.
  const used: string[] = [],
    occupied: { x: number; y: number }[] = [];
  for (const r of [...city.roads].sort((a, b) => b.meters - a.meters)) {
    if (r.name.startsWith("Unnamed") || used.includes(r.name) || r.meters < 45)
      continue;
    const a = city.nodes[r.a]!,
      b = city.nodes[r.b]!,
      p = project((a.x + b.x) / 2, (a.y + b.y) / 2, view);
    if (
      p.x < 70 ||
      p.x > W - 70 ||
      p.y < 65 ||
      p.y > H - 70 ||
      occupied.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 85)
    )
      continue;
    used.push(r.name);
    occupied.push(p);
    ctx.save();
    ctx.translate(p.x, p.y);
    const pa = project(a.x, a.y, view),
      pb = project(b.x, b.y, view);
    let angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
    ctx.rotate(angle);
    ctx.font = '10px "Trebuchet MS"';
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#efeddf";
    ctx.strokeText(r.name, 0, -5);
    ctx.fillStyle = "#68745c";
    ctx.fillText(r.name, 0, -5);
    ctx.restore();
    if (used.length >= 32) break;
  }
  return cache;
}
export function drawCity(
  canvas: HTMLCanvasElement,
  w: World,
  baseline: World,
  selected: number,
  ghost: boolean,
  hover: string | null,
  view: View,
) {
  if (canvas.width !== W) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext("2d")!,
    city = w.city;
  ctx.drawImage(background(city, view), 0, 0);
  const c = w.couriers[selected]!,
    bc = baseline.couriers[selected]!,
    key = [
      selected,
      c.node,
      c.to,
      c.index,
      bc.node,
      bc.to,
      bc.index,
      [...w.closed].join(","),
    ].join("|");
  if (key !== routeKey) {
    routeKey = key;
    liveRoute = routeRoads(w, c);
    ghostRoute = routeRoads(baseline, bc);
  }
  if (ghost)
    for (const i of ghostRoute)
      line(ctx, city, i, view, "#55747a88", 4, [5, 6]);
  for (const i of liveRoute) line(ctx, city, i, view, c.color, 4);
  for (const id of w.closed) {
    const i = city.roads.findIndex((r) => r.id === id);
    if (i >= 0) {
      line(ctx, city, i, view, "#ac463c", 6, [5, 3]);
      const r = city.roads[i]!,
        a = city.nodes[r.a]!,
        b = city.nodes[r.b]!,
        p = project((a.x + b.x) / 2, (a.y + b.y) / 2, view);
      ctx.fillStyle = "#a03e31";
      ctx.font = "bold 17px monospace";
      ctx.fillText("×", p.x - 5, p.y + 5);
    }
  }
  if (hover) {
    const i = city.roads.findIndex((r) => r.id === hover);
    if (i >= 0) line(ctx, city, i, view, "#e6a357", 6);
  }
  const delivered = new Set(w.couriers.flatMap((c) => c.delivered));
  for (const s of w.stops) {
    const owner = w.couriers.find((c) => c.stops.some((p) => p.id === s.id)),
      n = city.nodes[s.node]!,
      p = project(n.x, n.y, view),
      done = delivered.has(s.id);
    ctx.fillStyle = done ? "#536e41" : (owner?.color ?? "#a43c31");
    ctx.strokeStyle = "#fff8e8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, done ? 6 : 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!done) {
      ctx.fillStyle = "#fff9e9";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(s.id), p.x, p.y + 3);
    }
  }
  if (ghost) {
    const p = sampleCourier(city, bc),
      v = project(p.x, p.y, view);
    ctx.strokeStyle = "#54777e";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(v.x - 11, v.y - 7, 22, 14);
    ctx.setLineDash([]);
  }
  for (const van of w.couriers) {
    const p = sampleCourier(city, van),
      v = project(p.x, p.y, view),
      active = van.id === selected;
    ctx.fillStyle = "#2b413344";
    ctx.beginPath();
    ctx.ellipse(v.x, v.y + 7, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = van.color;
    ctx.strokeStyle = "#fff5dd";
    ctx.lineWidth = active ? 3 : 1;
    ctx.fillRect(v.x - 10, v.y - 7, 20, 13);
    ctx.strokeRect(v.x - 10, v.y - 7, 20, 13);
    ctx.fillStyle = "#eee6bf";
    ctx.fillRect(v.x + 3, v.y - 4, 5, 6);
    if (active) {
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#314c3e";
      ctx.textAlign = "center";
      ctx.fillText(
        van.name + (van.status === "stranded" ? " · WAITING" : ""),
        v.x,
        v.y - 14,
      );
    }
  }
  const depot = city.nodes[w.depot]!,
    p = project(depot.x, depot.y, view);
  ctx.fillStyle = "#2e4e3b";
  ctx.fillRect(p.x - 13, p.y - 13, 26, 26);
  ctx.fillStyle = "#f6ebcc";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("D", p.x, p.y + 5);
  ctx.fillStyle = "#39533f";
  ctx.textAlign = "left";
  ctx.font = "11px monospace";
  ctx.fillText("REAL STREETS / " + city.name.toUpperCase(), 26, 32);
  ctx.font = "9px monospace";
  ctx.fillStyle = "#6b765f";
  ctx.fillText(
    `${city.nodes.length.toLocaleString()} STREET NODES · ${city.roads.length.toLocaleString()} SEGMENTS · N ↗`,
    26,
    50,
  );
  // Geographic scale bar uses the same projection as the street geometry.
  const a = project(0, 0, view),
    b = project(200, 0, view),
    length = Math.hypot(b.x - a.x, b.y - a.y);
  ctx.strokeStyle = "#52634b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(27, H - 30);
  ctx.lineTo(27 + length, H - 30);
  ctx.stroke();
  ctx.fillText("200 m", 27, H - 39);
  ctx.textAlign = "right";
  ctx.fillText(
    view.tilt
      ? "REAL FOOTPRINTS · ILLUSTRATIVE BUILDING HEIGHTS"
      : "NORTH UP · REAL STREET GEOMETRY",
    W - 24,
    H - 25,
  );
}
export function hitRoad(city: City, x: number, y: number, view: View) {
  let nearest: number | null = null,
    best = 13;
  for (let i = 0; i < city.roads.length; i++) {
    const r = city.roads[i]!,
      a = project(city.nodes[r.a]!.x, city.nodes[r.a]!.y, view),
      b = project(city.nodes[r.b]!.x, city.nodes[r.b]!.y, view),
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)),
      ),
      distance = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
    if (distance < best) {
      best = distance;
      nearest = i;
    }
  }
  return nearest === null ? null : city.roads[nearest]!;
}
