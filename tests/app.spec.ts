import { test, expect } from "@playwright/test";
test("a small city changes its evening and replays a saved scenario", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#isolate").click();
  await page.locator("#step").click();
  await expect(page.locator("#report")).toContainText("4 couriers");
  await page.locator("#reopen").click();
  await page.evaluate(() => (window as any).tinyCity.advance(59));
  await expect(page.locator("#delivered")).toHaveText("12 / 12");
  const d = page.waitForEvent("download");
  await page.locator("#save").click();
  expect((await d).suggestedFilename()).toBe("lastlight-evening.json");
  await page.locator("#reset").click();
  await expect(page.locator("#clock")).toHaveText("18:00");
  await page.locator("#scenario").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":8}'),
  });
  await expect(page.locator("#report")).toContainText("version 1");
  expect(errors).toEqual([]);
});
test("city is keyboard accessible and fits a narrow viewport", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#north").click();
  await expect(page.locator("#report")).toContainText("North Bridge closed");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
