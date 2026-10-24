import "./style.css";
import { $, saveJSON } from "./utils";
import {
  createWorld,
  advance,
  metrics,
  toggleRoad,
  roads,
  roadMap,
  parseScenario,
  restore,
  type World,
} from "./city";
import { drawCity, hitRoad } from "./render";
$("app").innerHTML =
  `<header><a href="./" class="brand">◈ LASTLIGHT <small>/ TINY CITY LAB</small></a><span>A SMALL CITY WITH AN EVENING TO LOSE</span><button id="save" class="outline">↓ Save this evening</button></header><main><section class="intro"><div><p class="eyebrow">THE POST OFFICE CLOSES IN ONE HOUR.</p><h1>Twelve parcels.<br><em>One uncooperative city.</em></h1></div><p>You don’t drive the vans.<br>You decide which streets they get.</p></section><div class="dashboard"><section class="city-wrap"><div class="city-bar"><span><i></i> LASTLIGHT / DISPATCH DESK</span><output id="clock">18:00</output><span id="weather">THE LIGHT IS STILL GOOD</span></div><canvas id="city" width="1280" height="790" aria-label="Isometric city. Click a street to close or reopen it; road controls beside the canvas provide a keyboard alternative."></canvas><div class="city-bottom"><span id="hover">Choose a street, or try one of the incidents.</span><span>━━━━ YOUR COURIER <b>┄┄</b> THE EVENING THAT COULD HAVE BEEN</span></div><div class="transport"><button id="play" class="primary">▶ Dispatch the vans</button><button id="step">+1 minute</button><button id="reset">↺ Start the evening over</button><label><input id="ghost" type="checkbox" checked> Show the city without closures</label></div></section><aside><p class="eyebrow">THE EVENING’S CAST</p><div id="couriers"></div><div class="metrics"><div><b id="delivered">0 / 12</b><span>AT THE DOOR</span></div><div><b id="late">0</b><span>LATE ARRIVALS</span></div><div><b id="pending">12</b><span>STILL OUT THERE</span></div><div><b id="extra">0</b><span>TRAVEL Δ / VS BASELINE</span></div></div><p class="eyebrow">A LITTLE MUNICIPAL CHAOS</p><div class="incidents"><button id="north">Roadworks on North Bridge</button><button id="bridges">Close all three bridges</button><button id="isolate">The post office is snowed in</button><button id="reopen">Call off the roadworks</button></div><label for="road">Or pick a particular street</label><select id="road"></select><button id="toggle" class="outline">Close selected street</button><p id="report" role="status">Everyone has a route. For now.</p><label class="file-button" for="scenario">↑ Bring back a saved evening</label><input id="scenario" class="sr-only" type="file" accept="application/json,.json"></aside></div><section class="afterword"><div><p class="eyebrow">THE POINT OF THIS LITTLE PLACE</p><h2>A detour is somebody’s<br>whole evening.</h2></div><p>Every parcel has a destination and a deadline. Couriers find the cheapest open route at each intersection. A van already on a closed road finishes that segment; it never teleports. A stranded courier waits until a route reopens.</p><p>The dashed van is the same dispatch in a city where you changed nothing. This is a routing experiment with a fixed synthetic map, not a congestion or real-world traffic forecast.</p></section></main><footer><span>BUILT WITH AI. DIRECTED BY BEN LEVICKI.</span><span>NO MAP API. NO PERFECT CITY. JUST ONE MORE DELIVERY.</span></footer>`;
let world = createWorld(),
  baseline = createWorld(),
  selected = 0,
  playing = false,
  showGhost = true,
  hover: string | null = null,
  accumulator = 0,
  last = performance.now();
const canvas = $<HTMLCanvasElement>("city");
function report(message: string) {
  $("report").textContent = message;
}
function update() {
  const m = metrics(world),
    b = metrics(baseline);
  $("clock").textContent =
    `${18 + Math.floor(world.tick / 60)}:${String(world.tick % 60).padStart(2, "0")}`;
  $("weather").textContent =
    world.tick < 20
      ? "THE LIGHT IS STILL GOOD"
      : world.tick < 40
        ? "WINDOWS BEGIN TO GLOW"
        : "THE LAST LIGHT IS LEAVING";
  $("delivered").textContent = `${m.delivered} / 12`;
  $("late").textContent = String(m.late);
  $("pending").textContent = String(m.pending);
  $("extra").textContent = String(m.travel - b.travel);
  $("play").textContent = playing
    ? "Ⅱ Hold the evening"
    : "▶ Dispatch the vans";
  $("couriers").replaceChildren(
    ...world.couriers.map((c, i) => {
      const button = document.createElement("button");
      button.className = "courier";
      button.setAttribute("aria-pressed", String(i === selected));
      button.style.setProperty("--courier", c.color);
      button.innerHTML = `<span class="courier-dot"></span><b>${c.name}</b><span>${c.index}/3 delivered · ${c.status}</span>`;
      button.onclick = () => {
        selected = i;
        update();
      };
      return button;
    }),
  );
  const id = $<HTMLSelectElement>("road").value;
  $("toggle").textContent = world.closed.has(id)
    ? "Reopen selected street"
    : "Close selected street";
  if (world.tick === 60) {
    playing = false;
    report(
      `The hour is over: ${m.delivered} delivered, ${m.late} late, ${m.pending} undelivered. The unaltered city delivered ${b.delivered}.`,
    );
  } else if (m.stranded)
    report(
      `${m.stranded} courier${m.stranded === 1 ? " is" : "s are"} waiting for a route. Reopen a road to give them another chance.`,
    );
  drawCity(
    canvas,
    world,
    baseline,
    selected,
    showGhost,
    hover,
    accumulator / 350,
  );
}
function step() {
  advance(world);
  advance(baseline);
  if (world.tick === 60) playing = false;
  update();
}
function close(id: string, closed?: boolean) {
  if (world.actions.length >= 500) {
    report(
      "This evening has reached its 500-change limit. Start over or load another.",
    );
    return;
  }
  toggleRoad(world, id, closed);
  report(
    `${roadMap.get(id)!.name} ${world.closed.has(id) ? "closed" : "reopened"}. Couriers replan at their next intersection.`,
  );
  update();
}
$<HTMLSelectElement>("road").replaceChildren(
  ...roads.map((r) => {
    const o = document.createElement("option");
    o.value = r.id;
    o.textContent = r.name;
    return o;
  }),
);
$<HTMLSelectElement>("road").value = roads.find((r) => r.bridge)!.id;
$("road").onchange = update;
$("toggle").onclick = () => close($<HTMLSelectElement>("road").value);
$("north").onclick = () =>
  close(roads.find((r) => r.bridge && r.name === "North Bridge")!.id, true);
$("bridges").onclick = () =>
  roads.filter((r) => r.bridge).forEach((r) => close(r.id, true));
$("isolate").onclick = () =>
  roads
    .filter((r) => r.a === 21 || r.b === 21)
    .forEach((r) => close(r.id, true));
$("reopen").onclick = () => [...world.closed].forEach((id) => close(id, false));
$("play").onclick = () => {
  if (world.tick === 60) {
    report("Start a new evening to dispatch again.");
    return;
  }
  playing = !playing;
  update();
};
$("step").onclick = () => {
  playing = false;
  accumulator = 0;
  step();
};
$("reset").onclick = () => {
  world = createWorld();
  baseline = createWorld();
  playing = false;
  accumulator = 0;
  report("A fresh evening. Everyone has a route.");
  update();
};
$<HTMLInputElement>("ghost").onchange = () => {
  showGhost = $<HTMLInputElement>("ghost").checked;
  update();
};
canvas.onpointermove = (e) => {
  const r = canvas.getBoundingClientRect(),
    road = hitRoad(
      ((e.clientX - r.left) / r.width) * 1280,
      ((e.clientY - r.top) / r.height) * 790,
    );
  hover = road?.id ?? null;
  $("hover").textContent = road
    ? `${road.name} · ${world.closed.has(road.id) ? "closed — click to reopen" : "open — click to close"}`
    : "Choose a street, or try one of the incidents.";
  canvas.style.cursor = road ? "pointer" : "default";
};
canvas.onclick = (e) => {
  const r = canvas.getBoundingClientRect(),
    road = hitRoad(
      ((e.clientX - r.left) / r.width) * 1280,
      ((e.clientY - r.top) / r.height) * 790,
    );
  if (road) close(road.id);
};
$("save").onclick = () =>
  saveJSON(
    {
      version: 1,
      city: "lastlight-v1",
      tick: world.tick,
      actions: world.actions,
    },
    "lastlight-evening.json",
  );
$<HTMLInputElement>("scenario").onchange = async () => {
  try {
    const file = $<HTMLInputElement>("scenario").files?.[0];
    if (!file) return;
    if (file.size > 100000) throw Error("Scenario exceeds 100 KB");
    const scenario = parseScenario(JSON.parse(await file.text()));
    world = restore(scenario);
    baseline = createWorld();
    for (let i = 0; i < scenario.tick; i++) advance(baseline);
    playing = false;
    accumulator = 0;
    report("Your saved evening is back, with its exact road history.");
    update();
  } catch (e) {
    report((e as Error).message);
  } finally {
    $<HTMLInputElement>("scenario").value = "";
  }
};
document.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,select,button,a")) return;
  if (e.code === "Space") {
    e.preventDefault();
    $("play").click();
  }
  if (e.key.toLowerCase() === "r") $("reset").click();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    playing = false;
    update();
  }
});
update();
function tick(now: number) {
  const delta = Math.min(100, now - last);
  last = now;
  if (playing) {
    accumulator += delta;
    while (accumulator >= 350 && world.tick < 60) {
      accumulator -= 350;
      step();
    }
  }
  drawCity(
    canvas,
    world,
    baseline,
    selected,
    showGhost,
    hover,
    playing ? accumulator / 350 : 0,
  );
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
  advance: (n: number) => {
    playing = false;
    for (let i = 0; i < n; i++) step();
  },
  close: (id: string) => close(id),
  reset: () => $("reset").click(),
};
