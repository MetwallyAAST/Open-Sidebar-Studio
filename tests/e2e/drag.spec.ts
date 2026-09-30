import { test, expect, type Locator, type Page } from "@playwright/test";
async function drag(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  if (!from) throw new Error("Missing drag source");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2 + 10,
    from.y + from.height / 2 + 10,
    { steps: 3 },
  );
  const to = await target.boundingBox();
  if (!to) throw new Error("Missing drop target");
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 20,
  });
  await page.mouse.up();
}
test("pointer drag reorders items and sections, then persists them", async ({
  page,
}) => {
  const headers = { Origin: "http://127.0.0.1:3100" };
  await page.request.post("/api/auth/login", {
    headers,
    data: {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    },
  });
  const initial = await (await page.request.get("/api/admin/sidebar")).json();
  try {
    await page.goto("/admin");
    await expect(page.getByLabel("Sidebar configuration")).toContainText(
      "Reference Sidebar",
    );
    await drag(
      page,
      page.getByRole("button", { name: "Move Home", exact: true }),
      page.locator(".tree-item-select").filter({ hasText: "Games" }),
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.locator(".studio-notice")).toContainText("Draft saved");
    let current = await (await page.request.get("/api/admin/sidebar")).json();
    expect(
      current.config.items.find((i: { id: string }) => i.id === "reference-0")
        .order,
    ).toBeGreaterThan(0);
    await drag(
      page,
      page.getByRole("button", { name: "Move section Menu", exact: true }),
      page
        .locator(".tree-section")
        .filter({
          has: page.getByRole("button", {
            name: "Move section General",
            exact: true,
          }),
        }),
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.locator(".studio-notice")).toContainText("Draft saved");
    current = await (await page.request.get("/api/admin/sidebar")).json();
    expect(
      current.config.sections.find((s: { id: string }) => s.id === "menu")
        .order,
    ).toBeGreaterThan(0);
  } finally {
    const current = await (await page.request.get("/api/admin/sidebar")).json();
    await page.request.put("/api/admin/sidebar", {
      headers,
      data: { config: initial.config, expectedVersion: current.version },
    });
  }
});
