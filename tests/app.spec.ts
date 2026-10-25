import { test, expect } from "@playwright/test";
async function ready(page: any) {
  await page.goto("/");
  await expect(page.locator("#map-title")).toContainText("CLEVELAND");
  await expect(page.locator("#delivered")).toHaveText("0 / 20");
}
test("real neighborhoods, variable manifest and fleet complete street-following trips", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await page.locator("#van-count").fill("6");
  await page.locator("#van-count").dispatchEvent("change");
  await expect(page.locator(".courier")).toHaveCount(6);
  await page.locator("#parcel-count").fill("32");
  await page.locator("#seed").fill("131");
  await page.locator("#generate").click();
  await expect(page.locator("#stops li")).toHaveCount(32);
  await page.evaluate(() => (window as any).tinyCity.advance(120));
  await expect(page.locator("#delivered")).toHaveText("32 / 32");
  await expect(page.locator("#report")).toContainText("Everybody is home");
  await page.locator("#reset").click();
  await expect(page.locator("#clock")).toHaveText("18:00");
  await page.locator("#city-select").selectOption("manhattan");
  await expect(page.locator("#map-title")).toContainText("EAST VILLAGE");
  await expect(page.locator("#stops li")).toHaveCount(32);
  await page.locator("#city-select").selectOption("san-francisco");
  await expect(page.locator("#map-title")).toContainText("MISSION");
  expect(errors).toEqual([]);
});
test("custom parcels, depot controls, road closures, replay and invalid inputs", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#isolate").click();
  await page.locator("#step").click();
  await expect(page.locator("#report")).toContainText("waiting");
  await page.locator("#reopen").click();
  await page.locator("#reset").click();
  await page.locator("#clear-stops").click();
  const p = await page.evaluate(() => {
    const a = (window as any).tinyCity,
      c = a.city;
    return c.nodes[
      c.component.find(
        (n: number) =>
          n !== a.world.depot && Math.hypot(c.nodes[n].x, c.nodes[n].y) < 400,
      )
    ];
  });
  await page.locator("#stop-lat").fill(String(p.lat));
  await page.locator("#stop-lon").fill(String(p.lon));
  await page.locator("#add-coordinate").click();
  await expect(page.locator("#stops li")).toHaveCount(1);
  await page.locator("#add-coordinate").click();
  await expect(page.locator("#report")).toContainText("already has");
  await page
    .locator("#scenario")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.locator("#report")).toContainText("version 2");
  await page.locator("#parcel-count").fill("12");
  await page.locator("#generate").click();
  await page.locator("#step").click();
  await page.locator("#toggle").click();
  const state = await page.evaluate(() => {
    const w = (window as any).tinyCity.world;
    return {
      version: 2,
      city: w.city.id,
      center: w.city.center,
      depot: w.city.nodes[w.depot],
      stops: w.stops,
      vans: w.vans,
      minute: w.minute,
      actions: w.actions,
    };
  });
  await page.locator("#reset").click();
  await page
    .locator("#scenario")
    .setInputFiles({
      name: "dispatch.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(state)),
    });
  await expect(page.locator("#report")).toContainText("Dispatch restored");
  await expect(page.locator("#clock")).toHaveText("18:01");
  expect(
    await page.evaluate(() => (window as any).tinyCity.world.closed.size),
  ).toBe(1);
  const download = page.waitForEvent("download");
  await page.locator("#save").click();
  expect((await download).suggestedFilename()).toBe("lastlight-dispatch.json");
});
test("map placement, view controls and mobile layout work without external services", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4176")) external.push(r.url());
  });
  await ready(page);
  await page.locator('[data-tool="stop"]').click();
  const p = await page.evaluate(() => {
    const a = (window as any).tinyCity,
      c = a.city,
      n = c.component.find(
        (n: number) =>
          n !== a.world.depot &&
          !a.stops.some((s: any) => s.node === n) &&
          Math.hypot(c.nodes[n].x, c.nodes[n].y) < 300,
      );
    return a.project(n);
  });
  const box = (await page.locator("#city").boundingBox())!;
  await page
    .locator("#city")
    .click({
      position: { x: (p.x * box.width) / 1280, y: (p.y * box.height) / 840 },
    });
  await expect(page.locator("#stops li")).toHaveCount(21);
  await page.locator("#zoom-in").click();
  await page.locator("#tilt").click();
  await expect(page.locator("#tilt")).toHaveText("North up");
  await page.locator("#fit").click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(external).toEqual([]);
});
test("custom map failures preserve a working atlas and explain the problem", async ({
  page,
}) => {
  await ready(page);
  await page.route("https://api.openstreetmap.org/**", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.locator(".custom-area summary").click();
  await page.locator("#load-area").click();
  await expect(page.locator("#area-status")).toContainText("503");
  await expect(page.locator("#map-title")).toContainText("CLEVELAND");
  await page.locator("#step").click();
  await expect(page.locator("#clock")).toHaveText("18:01");
});
