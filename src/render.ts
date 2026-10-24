import {
  nodes,
  roads,
  plan,
  sampleCourier,
  type World,
  type Road,
} from "./city";
const W = 1280,
  H = 790;
export function iso(x: number, y: number, z = 0) {
  const expanded = x + (x <= 2 ? 0 : x >= 3 ? 0.7 : 0.7 * (x - 2));
  return {
    x: W / 2 + (expanded - y) * 74 - 25,
    y: 125 + (expanded + y) * 36 - z,
  };
}
function polygon(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}
export function drawCity(
  canvas: HTMLCanvasElement,
  w: World,
  baseline: World,
  selected: number,
  ghost: boolean,
  hover: string | null,
  fraction = 0,
) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e7dfca";
  ctx.fillRect(0, 0, W, H);
  const night = w.tick / 60;
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#e2d4ba");
  gradient.addColorStop(1, "#eee8d7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  polygon(
    ctx,
    [iso(-0.5, -0.5), iso(6.7, -0.5), iso(6.7, 6.7), iso(-0.5, 6.7)],
    "#8fa188",
  );
  polygon(
    ctx,
    [iso(2.25, -0.5), iso(2.9, -0.5), iso(2.9, 6.7), iso(2.25, 6.7)],
    "#7caaa9",
  );
  ctx.strokeStyle = "#a9d4c7";
  ctx.lineWidth = 1;
  for (let y = -0.3; y < 7; y += 0.35) {
    const a = iso(2.35, y),
      b = iso(2.8, y + 0.12);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  function line(r: Road, color: string, width: number, dash: number[] = []) {
    const a = iso(nodes[r.a].x, nodes[r.a].y),
      b = iso(nodes[r.b].x, nodes[r.b].y);
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const r of roads) {
    line(r, r.bridge ? "#a58d67" : "#c9c2a9", r.bridge ? 24 : 17);
    line(
      r,
      w.closed.has(r.id) ? "#9b4f3a" : r.id === hover ? "#f2ad68" : "#e8e0ca",
      r.bridge ? 17 : 11,
    );
    if (w.closed.has(r.id)) {
      const a = iso(nodes[r.a].x, nodes[r.a].y),
        b = iso(nodes[r.b].x, nodes[r.b].y),
        x = (a.x + b.x) / 2,
        y = (a.y + b.y) / 2;
      ctx.strokeStyle = "#fff0cc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x + 6, y - 6);
      ctx.lineTo(x - 6, y + 6);
      ctx.stroke();
    }
  }
  const courier = w.couriers[selected];
  const route = plan(courier, w.closed);
  for (let i = 1; i < route.length; i++) {
    const r = roads.find(
      (r) =>
        (r.a === route[i - 1] && r.b === route[i]) ||
        (r.b === route[i - 1] && r.a === route[i]),
    );
    if (r) line(r, courier.color, 4);
  }
  if (ghost) {
    const route = plan(baseline.couriers[selected], baseline.closed);
    for (let i = 1; i < route.length; i++) {
      const r = roads.find(
        (r) =>
          (r.a === route[i - 1] && r.b === route[i]) ||
          (r.b === route[i - 1] && r.a === route[i]),
      );
      if (r) line(r, "#f5f2e8", 3, [5, 7]);
    }
  }
  // Buildings are original deterministic geometry, sorted back-to-front.
  const blocks = Array.from({ length: 36 }, (_, i) => ({
    x: (i % 6) + 0.5,
    y: Math.floor(i / 6) + 0.5,
    i,
  }))
    .filter((b) => b.x !== 2.5)
    .sort((a, b) => a.x + a.y - b.x - b.y);
  for (const b of blocks) {
    const height = 25 + ((b.i * 17) % 4) * 14,
      p = [
        iso(b.x - 0.32, b.y - 0.32),
        iso(b.x + 0.32, b.y - 0.32),
        iso(b.x + 0.32, b.y + 0.32),
        iso(b.x - 0.32, b.y + 0.32),
      ],
      top = p.map((p) => ({ ...p, y: p.y - height }));
    const palette = ["#b27857", "#d1ad77", "#8b9b83", "#c58a6b"][b.i % 4];
    polygon(ctx, [p[1], p[2], top[2], top[1]], "#806e55");
    polygon(ctx, [p[2], p[3], top[3], top[2]], palette);
    polygon(ctx, top, b.i % 3 === 0 ? "#526b60" : "#c1a17a");
    ctx.fillStyle = night > 0.25 ? "#f3cd75" : "#e9ddad";
    for (let k = 0; k < 3; k++)
      ctx.fillRect(p[2].x - 17 + k * 9, p[2].y - height + 13, 4, 6);
    if (b.i % 7 === 0) {
      const t = iso(b.x, b.y, height + 4);
      ctx.fillStyle = "#254838";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const c of w.couriers) {
    for (let i = 0; i < c.parcels.length; i++) {
      const parcel = c.parcels[i],
        n = nodes[parcel.destination],
        p = iso(n.x, n.y, 17);
      ctx.fillStyle = parcel.deliveredAt !== null ? "#365f40" : c.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff3d7";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        parcel.deliveredAt !== null ? "✓" : String(i + 1),
        p.x,
        p.y + 3,
      );
    }
  }
  if (ghost) {
    const p = sampleCourier(baseline.couriers[selected], fraction),
      v = iso(p.x, p.y, 8);
    ctx.strokeStyle = "#f7f2e2";
    ctx.lineWidth = 3;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(v.x - 13, v.y - 8, 26, 16);
    ctx.setLineDash([]);
  }
  for (const c of w.couriers) {
    const p = sampleCourier(c, fraction),
      v = iso(p.x, p.y, 10);
    ctx.fillStyle = "#344333";
    ctx.beginPath();
    ctx.ellipse(v.x, v.y + 13, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.color;
    ctx.fillRect(v.x - 13, v.y - 7, 26, 16);
    ctx.fillStyle = "#f6e8ba";
    ctx.fillRect(v.x + 4, v.y - 4, 6, 6);
    ctx.fillStyle = "#263d30";
    ctx.beginPath();
    ctx.arc(v.x - 7, v.y + 11, 4, 0, Math.PI * 2);
    ctx.arc(v.x + 8, v.y + 11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "11px monospace";
    ctx.fillStyle = "#293e30";
    ctx.textAlign = "center";
    ctx.fillText(c.name + (c.status === "stranded" ? " !" : ""), v.x, v.y - 17);
  }
  const post = iso(0, 3, 35);
  ctx.fillStyle = "#f1dfab";
  ctx.fillRect(post.x - 31, post.y - 10, 62, 22);
  ctx.strokeStyle = "#38553e";
  ctx.strokeRect(post.x - 31, post.y - 10, 62, 22);
  ctx.font = "9px monospace";
  ctx.fillStyle = "#38553e";
  ctx.textAlign = "center";
  ctx.fillText("POST OFFICE", post.x, post.y + 4);
  ctx.textAlign = "left";
  ctx.fillStyle = "#344d3a";
  ctx.font = "12px monospace";
  ctx.fillText("LASTLIGHT / POP. 49 INTERSECTIONS", 35, 40);
  ctx.fillText("CLICK A STREET TO CHANGE ITS EVENING.", 35, H - 35);
  ctx.textAlign = "right";
  ctx.fillText("FICTIONAL CITY · DETERMINISTIC ROUTES", W - 35, H - 35);
  ctx.textAlign = "left";
}
export function hitRoad(x: number, y: number) {
  let nearest: Road | null = null,
    best = 14;
  for (const r of roads) {
    const a = iso(nodes[r.a].x, nodes[r.a].y),
      b = iso(nodes[r.b].x, nodes[r.b].y),
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)),
      ),
      distance = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
    if (distance < best) {
      best = distance;
      nearest = r;
    }
  }
  return nearest;
}
