import "./style.css";
import { $, saveJSON } from "./utils";
import {
  PRESETS,
  loadPreset,
  loadArea,
  parseOSM,
  nearestNode,
  type City,
  type Point,
} from "./graph";
import {
  createWorld,
  randomStops,
  stopAt,
  advance,
  metrics,
  toggleRoad,
  restore,
  validateScenario,
  type World,
  type Stop,
  type Scenario,
  routeRoads,
} from "./city";
import {
  drawCity,
  hitRoad,
  mapPoint,
  defaultView,
  project,
  W,
  H,
  clearCache,
} from "./render";
$("app").innerHTML =
  `<header><a href="./" class="brand">◈ LASTLIGHT <small>/ TINY CITY LAB</small></a><span>REAL STREETS. YOUR DISPATCH.</span><button id="save" class="outline" disabled>↓ Save this dispatch</button></header>
<main><section class="intro"><div><p class="eyebrow">THE CITY IS REAL. THE EVENING IS YOURS.</p><h1>Somebody’s waiting.<br><em>Find a way through.</em></h1></div><p>Choose a neighborhood. Fill the vans.<br>Then get everybody home.</p></section>
<section class="setup"><div><label for="city-select">01 / THE NEIGHBORHOOD</label><select id="city-select">${PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}<option value="custom" disabled>Custom neighborhood</option></select></div><div><label for="van-count">02 / VANS</label><input id="van-count" type="number" min="1" max="8" value="4"></div><div><label for="parcel-count">03 / PARCELS</label><input id="parcel-count" type="number" min="1" max="60" value="20"></div><div><label for="seed">DISPATCH SEED</label><input id="seed" type="number" min="0" max="999999" value="42"></div><button id="generate" class="primary" disabled>↻ Generate a manifest</button></section>
<details class="custom-area"><summary>Somewhere else? Load a real neighborhood by coordinates.</summary><div class="coordinate-form"><label>Center latitude<input id="area-lat" type="number" step="any" value="41.485"></label><label>Center longitude<input id="area-lon" type="number" step="any" value="-81.708"></label><button id="load-area" class="outline">Load this area from OpenStreetMap</button><button id="cancel-load" class="outline" hidden>Cancel</button></div><p>A bounded 1.2 × 1.2 km neighborhood. Clicking Load sends only this map area to the public <a href="https://wiki.openstreetmap.org/wiki/API_v0.6" target="_blank" rel="noreferrer">OpenStreetMap map service</a>; your parcels stay in the browser. Requests may be slow or unavailable. The three bundled cities need no external service.</p><p id="area-status" role="status"></p></details>
<div class="dashboard"><section class="city-wrap"><div class="city-bar"><span id="map-title">OPENING THE STREET ATLAS…</span><output id="clock">18:00</output><span id="map-date"></span></div><div class="map-tools" role="group" aria-label="Map tool"><button data-tool="pan" aria-pressed="true">↔ Explore</button><button data-tool="stop" aria-pressed="false">＋ Place parcels</button><button data-tool="depot" aria-pressed="false">▣ Move depot</button><button data-tool="close" aria-pressed="false">× Close a road</button><span class="view-buttons"><button id="zoom-in" aria-label="Zoom in">＋</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="fit">Fit</button><button id="tilt" aria-pressed="true">Isometric</button></span></div><canvas id="city" width="1280" height="840" aria-label="Real OpenStreetMap neighborhood and delivery routes. Choose a tool to place parcels, move the depot or close street segments. Equivalent coordinate and road controls are below." tabindex="0"></canvas><div class="city-bottom"><span id="hover">Loading real streets…</span><span>━━━━ SELECTED VAN <b>┄┄</b> WITHOUT CLOSURES</span></div><div class="attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a><label><input id="buildings" type="checkbox" checked> Real building footprints</label></div><div class="transport"><button id="play" class="primary" disabled>▶ Dispatch the vans</button><button id="step" disabled>+1 minute</button><button id="reset" disabled>↺ Reset this dispatch</button><label for="speed">Speed <select id="speed"><option value="30">30×</option><option value="60" selected>60×</option><option value="180">180×</option></select></label><label><input id="ghost" type="checkbox" checked> Baseline</label></div><p id="report" role="status">Reading the street network and preparing a fleet…</p></section>
<aside><p class="eyebrow">THE EVENING’S CAST</p><div id="couriers"></div><div class="metrics"><div><b id="delivered">—</b><span>PARCELS DELIVERED</span></div><div><b id="finish">—</b><span>PLANNED FLEET FINISH / MIN</span></div><div><b id="distance">—</b><span>DRIVEN / KM</span></div><div><b id="extra">—</b><span>DISTANCE Δ / VS BASELINE KM</span></div></div><p class="eyebrow">A LITTLE MUNICIPAL CHAOS</p><label for="road">Street segment</label><select id="road"></select><button id="toggle" class="outline">Close selected segment</button><button id="isolate" class="outline">Block roads around the depot</button><button id="reopen" class="outline">Reopen all streets</button><p class="small">Vans finish a segment they are on, then find a new path. Stops stay assigned to their van. Dashed routes show the same dispatch without closures.</p><label class="file-button" for="scenario">↑ Bring back a saved dispatch</label><input id="scenario" class="sr-only" type="file" accept="application/json,.json"></aside></div>
<section class="manifest"><div><p class="eyebrow">THE PLACES THAT MATTER</p><h2>Your manifest.<br><em>Your part of town.</em></h2><p>Click the map in “Place parcels” mode, or enter coordinates. Stops snap to the nearest mutually reachable street node within 200 m. This is a neighborhood routing experiment, not doorstep navigation.</p><div class="coordinate-form"><label>Latitude<input id="stop-lat" type="number" step="any" placeholder="41.485"></label><label>Longitude<input id="stop-lon" type="number" step="any" placeholder="−81.708"></label><button id="add-coordinate" class="outline">＋ Add parcel here</button></div><div class="manifest-actions"><button id="clear-stops" class="outline">Clear all parcels</button><label class="file-button" for="csv">↑ Import lat/lon CSV</label><input id="csv" class="sr-only" type="file" accept=".csv,text/csv"></div><p class="small">CSV: latitude,longitude with one stop per row; up to 60. Changing stops, depot or van count resets the clock and rebuilds the plan.</p></div><div><div id="manifest-head"></div><ol id="stops"></ol></div></section>
<section class="afterword"><h2>A detour is somebody’s<br>whole evening.</h2><p>Actual street geometry and one-way tags. Local Dijkstra routing and a bounded balanced-insertion heuristic with directed 2-opt. The fleet returns to its depot. Random stops use a repeatable seed; manual stops are yours.</p><p>Assumed speeds: 25 km/h on ordinary roads, 10 km/h on service roads, plus 30 seconds at each stop. No live traffic, turn restrictions, elevation, capacity or guaranteed optimal routes. Building footprints are real; extruded heights are illustrative where missing. Map boundaries can prevent detours that exist outside the loaded area.</p></section></main><footer><span>BUILT WITH AI. DIRECTED BY BEN LEVICKI.</span><span>ONE NEIGHBORHOOD. AS MANY EVENINGS AS YOU NEED.</span></footer>`;
let city: City | null = null,
  world: World | null = null,
  baseline: World | null = null,
  stops: Stop[] = [],
  depot = 0,
  selected = 0,
  playing = false,
  showGhost = true,
  hover: string | null = null,
  tool = "pan",
  view = defaultView(),
  rawCustom: unknown,
  loadNumber = 0,
  controller: AbortController | null = null,
  lastLoad = 0;
const canvas = $<HTMLCanvasElement>("city");
const report = (s: string) => {
  $("report").textContent = s;
};
function number(id: string, min: number, max: number) {
  const input = $<HTMLInputElement>(id),
    v = Number(input.value);
  if (!input.value.trim() || !Number.isFinite(v) || v < min || v > max)
    throw Error(
      `${input.labels?.[0]?.textContent?.trim() || id}: use ${min}–${max}.`,
    );
  return v;
}
function guarded(fn: () => void) {
  try {
    fn();
  } catch (e) {
    report((e as Error).message);
  }
}
function paint() {
  if (world && baseline)
    drawCity(canvas, world, baseline, selected, showGhost, hover, view);
}
function rebuild() {
  if (!city) return;
  const vans = number("van-count", 1, 8);
  if (!Number.isInteger(vans)) throw Error("Use a whole number of vans.");
  const closed =
    world?.city === city ? new Set(world.closed) : new Set<string>();
  world = createWorld(city, depot, stops, vans);
  baseline = createWorld(city, depot, stops, vans);
  for (const id of closed) toggleRoad(world, id, true);
  selected = Math.min(selected, vans - 1);
  playing = false;
  clearCache();
  update();
  manifest();
}
function manifest() {
  if (!city) return;
  $("manifest-head").textContent =
    `${stops.length} PARCELS · DEPOT ${city.nodes[depot]!.lat.toFixed(5)}, ${city.nodes[depot]!.lon.toFixed(5)}`;
  $("stops").replaceChildren(
    ...stops.map((s) => {
      const li = document.createElement("li"),
        info = document.createElement("span"),
        remove = document.createElement("button"),
        node = city!.nodes[s.node]!;
      const road = city!.adj[s.node]![0];
      info.textContent = `${s.label} · ${road ? city!.roads[road.road]!.name : "Street node"} · ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}${s.snapMeters > 1 ? ` · snapped ${Math.round(s.snapMeters)} m` : ""}`;
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${s.label}`);
      remove.onclick = () => {
        stops = stops.filter((p) => p.id !== s.id);
        rebuild();
        report("Parcel removed. The dispatch has been replanned.");
      };
      li.append(info, remove);
      li.title = `Routed node: ${node.lat}, ${node.lon}`;
      return li;
    }),
  );
}
function update() {
  if (!world || !baseline || !city) return;
  const m = metrics(world),
    b = metrics(baseline);
  $("clock").textContent =
    `${18 + Math.floor(world.minute / 60)}:${String(Math.floor(world.minute % 60)).padStart(2, "0")}`;
  $("delivered").textContent = `${m.delivered} / ${stops.length}`;
  $("finish").textContent = Math.max(...world.plan.minutes).toFixed(1);
  $("distance").textContent = (m.distance / 1000).toFixed(2);
  $("extra").textContent = ((m.distance - b.distance) / 1000).toFixed(2);
  $("play").textContent = playing
    ? "Ⅱ Hold the evening"
    : "▶ Dispatch the vans";
  for (const id of ["play", "step", "save", "reset", "generate"])
    $<HTMLButtonElement>(id).disabled =
      !city || (stops.length === 0 && ["play", "save"].includes(id));
  $("couriers").replaceChildren(
    ...world.couriers.map((c, i) => {
      const button = document.createElement("button");
      button.className = "courier";
      button.style.setProperty("--courier", c.color);
      button.setAttribute("aria-pressed", String(i === selected));
      const name = document.createElement("b"),
        dot = document.createElement("span"),
        status = document.createElement("span");
      dot.className = "courier-dot";
      name.textContent = c.name;
      status.textContent = `${c.delivered.length}/${c.stops.length} · ${c.status}`;
      button.append(dot, name, status);
      button.onclick = () => {
        selected = i;
        update();
      };
      return button;
    }),
  );
  $("toggle").textContent = world.closed.has($<HTMLSelectElement>("road").value)
    ? "Reopen selected segment"
    : "Close selected segment";
  if (m.done && world.minute > 0) {
    playing = false;
    report(
      `Everybody is home. ${m.delivered} parcels delivered in ${world.minute.toFixed(1)} simulated minutes. Baseline: ${b.delivered} delivered.`,
    );
  } else if (m.stranded) {
    report(
      `${m.stranded} van${m.stranded === 1 ? " is" : "s are"} waiting for an open path. Reopen roads to continue. ${m.pending} parcels still out there.`,
    );
  } else if (world.minute >= 240) {
    playing = false;
    report(
      `Four-hour limit reached: ${m.delivered} delivered, ${m.pending} pending. Some paths may require leaving the loaded area.`,
    );
  }
  paint();
}
function applyCity(next: City, raw?: unknown) {
  city = next;
  rawCustom = raw;
  world = null;
  depot = nearestNode(city, city.center).node;
  stops = randomStops(
    city,
    depot,
    number("parcel-count", 1, 60),
    number("seed", 0, 999999),
  );
  view = defaultView();
  selected = 0;
  hover = null;
  $("map-title").textContent = city.name.toUpperCase();
  $("map-date").textContent = `OSM ${city.sourceDate.slice(0, 10)}`;
  $<HTMLSelectElement>("road").replaceChildren(
    ...city.roads.map((r) => {
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = `${r.name} · ${Math.round(r.meters)} m${r.oneway ? " · one way" : ""}`;
      return o;
    }),
  );
  rebuild();
  report(
    `${city.name}: real streets loaded. ${stops.length} parcels assigned across ${world!.vans} vans. Explore, place parcels, or dispatch.`,
  );
  $("hover").textContent =
    "Drag to explore · wheel to zoom · choose a tool to change this evening.";
}
async function preset(id: string) {
  const seq = ++loadNumber;
  controller?.abort();
  playing = false;
  $("area-status").textContent = "";
  report("Loading the real street atlas…");
  try {
    const next = await loadPreset(id);
    if (seq === loadNumber) applyCity(next);
  } catch (e) {
    report((e as Error).message);
  }
}
$("city-select").onchange = () =>
  void preset($<HTMLSelectElement>("city-select").value);
$("load-area").onclick = async () => {
  if (Date.now() - lastLoad < 30000) {
    $("area-status").textContent =
      "Wait 30 seconds between custom map requests, or use a bundled city.";
    return;
  }
  try {
    const lat = number("area-lat", -75, 75),
      lon = number("area-lon", -180, 180),
      seq = ++loadNumber;
    lastLoad = Date.now();
    playing = false;
    controller?.abort();
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 55000);
    $<HTMLButtonElement>("load-area").disabled = true;
    $("cancel-load").hidden = false;
    $("area-status").textContent =
      "Reading real streets and building footprints. This can take up to 55 seconds…";
    try {
      const result = await loadArea(lat, lon, controller.signal);
      if (seq === loadNumber) {
        applyCity(result.city, result.raw);
        $<HTMLSelectElement>("city-select").value = "custom";
        $("area-status").textContent =
          "Loaded. Routing and parcel placement now run locally.";
      }
    } finally {
      clearTimeout(timeout);
      $<HTMLButtonElement>("load-area").disabled = false;
      $("cancel-load").hidden = true;
    }
  } catch (e) {
    $("area-status").textContent =
      (e as Error).name === "AbortError"
        ? "Map request cancelled or timed out. Bundled cities still work."
        : (e as Error).message;
  }
};
$("cancel-load").onclick = () => controller?.abort();
$("generate").onclick = () =>
  guarded(() => {
    if (!city) return;
    const count = number("parcel-count", 1, 60),
      seed = number("seed", 0, 999999);
    if (!Number.isInteger(count) || !Number.isInteger(seed))
      throw Error("Parcels and seed must be whole numbers.");
    stops = randomStops(city, depot, count, seed);
    rebuild();
    report(
      `Manifest generated with seed ${seed}. Change the seed for different places, or place your own parcels.`,
    );
  });
$("van-count").onchange = () =>
  guarded(() => {
    rebuild();
    report("Fleet resized and routes replanned. The clock is back at 18:00.");
  });
function add(p: Point) {
  if (!city) return;
  if (stops.length >= 60)
    throw Error("This dispatch is limited to 60 parcels.");
  const s = stopAt(city, p, Math.max(0, ...stops.map((s) => s.id)) + 1);
  if (s.node === depot || stops.some((p) => p.node === s.node))
    throw Error(
      "That street node already has a parcel or the depot. Choose another nearby point.",
    );
  stops = [...stops, s];
  rebuild();
  report(
    `Parcel ${s.id} added, snapped ${Math.round(s.snapMeters)} m to the street network. Routes replanned.`,
  );
}
$("add-coordinate").onclick = () =>
  guarded(() =>
    add({
      lat: number("stop-lat", -75, 75),
      lon: number("stop-lon", -180, 180),
    }),
  );
$("clear-stops").onclick = () => {
  stops = [];
  rebuild();
  report(
    "The manifest is empty. Place parcels on the map or enter coordinates.",
  );
};
$<HTMLInputElement>("csv").onchange = async () => {
  try {
    const f = $<HTMLInputElement>("csv").files?.[0];
    if (!f || !city) return;
    if (f.size > 50000) throw Error("CSV exceeds 50 KB.");
    const rows = (await f.text()).trim().split(/\r?\n/);
    if (!/^(latitude|lat),(longitude|lon)$/i.test(rows.shift()?.trim() ?? ""))
      throw Error("CSV header must be latitude,longitude.");
    if (rows.length < 1 || rows.length > 60)
      throw Error("Import 1–60 coordinate rows.");
    const parsed = rows.map((row, i) => {
      const parts = row.split(",").map((s) => s.trim());
      if (
        parts.length !== 2 ||
        parts.some((s) => !s || !Number.isFinite(Number(s)))
      )
        throw Error(`Invalid coordinates on row ${i + 2}.`);
      return stopAt(
        city!,
        { lat: Number(parts[0]), lon: Number(parts[1]) },
        i + 1,
      );
    });
    if (
      parsed.some((s) => s.node === depot) ||
      new Set(parsed.map((s) => s.node)).size !== parsed.length
    )
      throw Error(
        "Some rows snap to the depot or duplicate street nodes. Choose distinct nearby locations.",
      );
    stops = parsed;
    rebuild();
    report(
      `${stops.length} coordinate stops imported. No parcel locations were sent to a service.`,
    );
  } catch (e) {
    report((e as Error).message);
  } finally {
    $<HTMLInputElement>("csv").value = "";
  }
};
function close(id: string, value?: boolean) {
  if (!world) return;
  if (world.actions.length >= 500)
    throw Error("Reached 500 road changes. Reset this dispatch to continue.");
  toggleRoad(world, id, value);
  clearCache();
  const road = city!.roads.find((r) => r.id === id)!;
  report(
    `${road.name} ${world.closed.has(id) ? "closed" : "reopened"}. Vans replan after their current segment.`,
  );
  update();
}
$("road").onchange = update;
$("toggle").onclick = () =>
  guarded(() => close($<HTMLSelectElement>("road").value));
$("isolate").onclick = () =>
  guarded(() => {
    if (!world || !city) return;
    city.roads
      .filter((r) => r.a === depot || r.b === depot)
      .forEach((r) => close(r.id, true));
  });
$("reopen").onclick = () =>
  guarded(() => {
    if (world) [...world.closed].forEach((id) => close(id, false));
  });
$("play").onclick = () => {
  if (!world) return;
  if (metrics(world).done || world.minute >= 240) {
    report("Reset this dispatch to play again.");
    return;
  }
  playing = !playing;
  update();
};
$("step").onclick = () => {
  if (!world || !baseline) return;
  playing = false;
  for (let i = 0; i < 60; i++) {
    if (metrics(world).done) break;
    advance(world);
    advance(baseline);
  }
  update();
};
$("reset").onclick = () => {
  if (!city) return;
  world = null;
  rebuild();
  report("Same parcels, same fleet. A fresh evening with every street open.");
};
$<HTMLInputElement>("ghost").onchange = () => {
  showGhost = $<HTMLInputElement>("ghost").checked;
  paint();
};
$<HTMLInputElement>("buildings").onchange = () => {
  view.buildings = $<HTMLInputElement>("buildings").checked;
  paint();
};
function zoom(factor: number, x = W / 2, y = H / 2) {
  if (!city) return;
  const point = mapPoint(city, x, y, view),
    n = {
      x:
        (point.lon - city.center.lon) *
        111320 *
        Math.cos((city.center.lat * Math.PI) / 180),
      y: -(point.lat - city.center.lat) * 111320,
    };
  view.zoom = Math.max(0.6, Math.min(5, view.zoom * factor));
  const p = project(n.x, n.y, view);
  view.panX += x - p.x;
  view.panY += y - p.y;
  paint();
}
$("zoom-in").onclick = () => zoom(1.3);
$("zoom-out").onclick = () => zoom(1 / 1.3);
$("fit").onclick = () => {
  view = { ...defaultView(), tilt: view.tilt, buildings: view.buildings };
  paint();
};
$("tilt").onclick = () => {
  view.tilt = !view.tilt;
  $("tilt").textContent = view.tilt ? "Isometric" : "North up";
  $("tilt").setAttribute("aria-pressed", String(view.tilt));
  paint();
};
document.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach(
  (b) =>
    (b.onclick = () => {
      tool = b.dataset.tool!;
      document
        .querySelectorAll("[data-tool]")
        .forEach((e) =>
          e.setAttribute(
            "aria-pressed",
            String((e as HTMLElement).dataset.tool === tool),
          ),
        );
      $("hover").textContent =
        tool === "stop"
          ? "Click a real street to add a parcel."
          : tool === "depot"
            ? "Click to move the depot. This resets the dispatch."
            : tool === "close"
              ? "Click a street segment to close or reopen it."
              : "Drag to pan. Wheel or + / − to zoom.";
    }),
);
const coords = (e: PointerEvent | WheelEvent) => {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * W) / r.width,
    y: ((e.clientY - r.top) * H) / r.height,
  };
};
let drag: {
  x: number;
  y: number;
  px: number;
  py: number;
  moved: boolean;
} | null = null;
canvas.onpointerdown = (e) => {
  if (!city) return;
  const p = coords(e);
  drag = { ...p, px: view.panX, py: view.panY, moved: false };
  canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove = (e) => {
  if (!city) return;
  const p = coords(e);
  if (drag) {
    if (Math.hypot(p.x - drag.x, p.y - drag.y) > 5) drag.moved = true;
    if (drag.moved) {
      view.panX = drag.px + p.x - drag.x;
      view.panY = drag.py + p.y - drag.y;
      paint();
      return;
    }
  }
  const r = hitRoad(city, p.x, p.y, view);
  hover = tool === "close" ? (r?.id ?? null) : null;
  const geo = mapPoint(city, p.x, p.y, view);
  $("hover").textContent =
    `${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)}${r ? " · " + r.name : ""}`;
  canvas.style.cursor = tool === "pan" ? "grab" : "crosshair";
  paint();
};
canvas.onpointerup = (e) => {
  const previous = drag;
  drag = null;
  if (!city || !previous || previous.moved) return;
  const p = coords(e),
    geo = mapPoint(city, p.x, p.y, view);
  guarded(() => {
    if (tool === "stop") add(geo);
    else if (tool === "depot") {
      const s = stopAt(city!, geo, 1);
      depot = s.node;
      stops = stops.filter((p) => p.node !== depot);
      rebuild();
      report("Depot moved. The fleet has new routes home.");
    } else if (tool === "close") {
      const road = hitRoad(city!, p.x, p.y, view);
      if (road) {
        $<HTMLSelectElement>("road").value = road.id;
        close(road.id);
      }
    }
  });
};
canvas.onpointercancel = () => {
  drag = null;
};
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const p = coords(e);
    zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  },
  { passive: false },
);
canvas.onkeydown = (e) => {
  if (
    ["+", "=", "-", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.key,
    )
  ) {
    e.preventDefault();
    if (e.key === "+" || e.key === "=") zoom(1.3);
    else if (e.key === "-") zoom(1 / 1.3);
    else {
      view.panX +=
        e.key === "ArrowLeft" ? 40 : e.key === "ArrowRight" ? -40 : 0;
      view.panY += e.key === "ArrowUp" ? 40 : e.key === "ArrowDown" ? -40 : 0;
      paint();
    }
  }
};
$("save").onclick = () => {
  if (!world || !city) return;
  saveJSON(
    {
      version: 2,
      city: city.id,
      center: city.center,
      depot: city.nodes[depot],
      stops: stops.map(({ lat, lon, id, label }) => ({ lat, lon, id, label })),
      vans: world.vans,
      minute: world.minute,
      actions: world.actions,
      ...(city.id === "custom" ? { raw: rawCustom } : {}),
    },
    "lastlight-dispatch.json",
  );
};
$<HTMLInputElement>("scenario").onchange = async () => {
  try {
    const f = $<HTMLInputElement>("scenario").files?.[0];
    if (!f) return;
    if (f.size > 12000000) throw Error("Dispatch exceeds 12 MB.");
    const s = validateScenario(JSON.parse(await f.text())),
      seq = ++loadNumber;
    controller?.abort();
    playing = false;
    const next =
      s.city === "custom"
        ? parseOSM(s.raw, {
            id: "custom",
            name: `${s.center.lat.toFixed(4)}, ${s.center.lon.toFixed(4)}`,
            lat: s.center.lat,
            lon: s.center.lon,
          })
        : await loadPreset(s.city);
    if (seq !== loadNumber) return;
    const restored = restore(next, s);
    city = next;
    rawCustom = s.raw;
    world = restored;
    depot = world.depot;
    stops = world.stops;
    baseline = createWorld(city, depot, stops, s.vans);
    while (baseline.minute < s.minute - 1e-8)
      advance(baseline, Math.min(1 / 60, s.minute - baseline.minute));
    selected = 0;
    $<HTMLInputElement>("van-count").value = String(s.vans);
    $<HTMLSelectElement>("city-select").value = s.city;
    $("map-title").textContent = city.name.toUpperCase();
    $("map-date").textContent = `OSM ${city.sourceDate.slice(0, 10)}`;
    $<HTMLSelectElement>("road").replaceChildren(
      ...city.roads.map((r) => {
        const o = document.createElement("option");
        o.value = r.id;
        o.textContent = r.name + " · " + Math.round(r.meters) + " m";
        return o;
      }),
    );
    view = defaultView();
    clearCache();
    update();
    manifest();
    report(
      "Dispatch restored with its parcels, fleet and exact road-change history.",
    );
  } catch (e) {
    report((e as Error).message);
  } finally {
    $<HTMLInputElement>("scenario").value = "";
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    playing = false;
    update();
  }
});
document.addEventListener("keydown", (e) => {
  if (
    (e.target as HTMLElement).matches(
      "input,select,button,a,textarea,summary",
    ) ||
    e.target === canvas
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    $("play").click();
  }
  if (e.key.toLowerCase() === "r") $("reset").click();
});
let last = performance.now(),
  ui = 0;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
function tick(now: number) {
  const dt = Math.min(100, now - last);
  last = now;
  if (playing && world && baseline) {
    const sim =
      ((dt / 1000) * Number($<HTMLSelectElement>("speed").value)) / 60;
    advance(world, sim);
    advance(baseline, sim);
    ui += dt;
    if (ui >= 200) {
      update();
      ui = 0;
    }
    if (!reduced.matches) paint();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
(window as any).tinyCity = {
  get world() {
    return world;
  },
  get baseline() {
    return baseline;
  },
  get city() {
    return city;
  },
  get stops() {
    return stops;
  },
  get view() {
    return view;
  },
  advance: (minutes: number) => {
    playing = false;
    if (world && baseline)
      for (let i = 0; i < Math.ceil(minutes * 60); i++) {
        if (metrics(world).done) break;
        advance(world);
        advance(baseline);
      }
    update();
  },
  close: (id: string) => guarded(() => close(id)),
  reset: () => $("reset").click(),
  project: (node: number) => {
    const n = city!.nodes[node]!;
    return project(n.x, n.y, view);
  },
};
void preset("cleveland");
