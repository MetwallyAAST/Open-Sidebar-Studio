import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const origin = "http://127.0.0.1:3100";
async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.SEED_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Design your navigation" }),
  ).toBeVisible();
}
test("reference editor, collapse, nested builder, live tokens and responsive drawer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await expect(
    page.locator(".preview-canvas .dynamic-sidebar"),
  ).toHaveAttribute("data-expanded", "true");
  await expect(
    page.locator(".preview-canvas .sidebar-row").first(),
  ).toContainText("Home");
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(page.locator(".preview-canvas .dynamic-sidebar")).toHaveCSS(
    "width",
    "76px",
  );
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(page.locator(".preview-canvas .dynamic-sidebar")).toHaveCSS(
    "width",
    "260px",
  );
  await page
    .getByRole("button", { name: "Desktop collapsed", exact: true })
    .click();
  await expect(
    page.locator(".preview-canvas .dynamic-sidebar"),
  ).toHaveAttribute("data-expanded", "false");
  await expect(page.locator(".preview-canvas .dynamic-sidebar")).toHaveCSS(
    "width",
    "76px",
  );
  await page
    .getByRole("button", { name: "Desktop expanded", exact: true })
    .click();
  await page.getByLabel("Label", { exact: true }).fill("Home preview");
  await expect(
    page.locator(".preview-canvas .sidebar-row").first(),
  ).toContainText("Home preview");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByLabel("Expanded Width", { exact: true }).fill("290");
  await expect(page.locator(".preview-canvas .dynamic-sidebar")).toHaveCSS(
    "width",
    "290px",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Menu builder", exact: true }).click();
  await page.getByRole("button", { name: "Presets", exact: true }).click();
  await page.getByRole("button", { name: "Operations Custom preset" }).click();
  await page.getByRole("button", { name: "All users", exact: true }).click();
  await expect(page.getByLabel("Parent item")).toHaveValue("op-2");
  await page.getByLabel("Parent item").selectOption("");
  await expect(page.getByLabel("Parent item")).toHaveValue("");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(page.locator("dialog")).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-drawer.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .first()
    .click();
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("database persistence, draft isolation, publish, restore, audit and import validation", async ({
  page,
}) => {
  await login(page);
  const request = page.request;
  const headers = { Origin: origin };
  const original = await (await request.get("/api/admin/sidebar")).json();
  let latest = original;
  try {
    const config = structuredClone(original.config);
    config.items[0].label = "Persisted test home";
    let response = await request.put("/api/admin/sidebar", {
      headers,
      data: { config, expectedVersion: original.version },
    });
    expect(response.ok()).toBe(true);
    latest = await response.json();
    const publishedBefore = await (await request.get("/api/sidebar")).json();
    expect(publishedBefore.items[0].label).not.toBe("Persisted test home");
    const stale = await request.put("/api/admin/sidebar", {
      headers,
      data: { config, expectedVersion: original.version },
    });
    expect(stale.status()).toBe(409);
    await page.reload();
    await expect(
      page.locator(".preview-canvas .sidebar-row").first(),
    ).toContainText("Persisted test home");
    response = await request.post("/api/admin/sidebar/publish", {
      headers,
      data: { expectedVersion: latest.version },
    });
    expect(response.ok()).toBe(true);
    latest = await response.json();
    const published = await (await request.get("/api/sidebar")).json();
    expect(published.items[0].label).toBe("Persisted test home");
    const invalid = structuredClone(config);
    invalid.items[0].url = "javascript:alert(1)";
    expect(
      (
        await request.put("/api/admin/sidebar", {
          headers,
          data: { config: invalid, expectedVersion: latest.version },
        })
      ).status(),
    ).toBe(400);
    const revisions = await (await request.get("/api/admin/revisions")).json();
    const initialRevision = revisions.find(
      (r: { snapshot: typeof config }) =>
        r.snapshot.items[0].label === original.config.items[0].label,
    );
    expect(initialRevision).toBeTruthy();
    response = await request.post(
      `/api/admin/revisions/${initialRevision.id}/restore`,
      { headers, data: { expectedVersion: latest.version } },
    );
    expect(response.ok()).toBe(true);
    latest = await response.json();
    expect(latest.config.items[0].label).toBe(original.config.items[0].label);
    const audit = await (await request.get("/api/admin/audit")).json();
    expect(
      audit.some((a: { action: string }) => a.action === "MENU_ITEM_UPDATED"),
    ).toBe(true);
    expect(
      audit.some(
        (a: { action: string }) =>
          a.action === "SIDEBAR_CONFIGURATION_RESTORED",
      ),
    ).toBe(true);
  } finally {
    const current = await (await request.get("/api/admin/sidebar")).json();
    const saved = await (
      await request.put("/api/admin/sidebar", {
        headers,
        data: { config: original.config, expectedVersion: current.version },
      })
    ).json();
    expect(
      (
        await request.post("/api/admin/sidebar/publish", {
          headers,
          data: { expectedVersion: saved.version },
        })
      ).ok(),
    ).toBe(true);
  }
});
test("server authorization, CSRF rejection, protected presets and role filtering", async ({
  page,
  browser,
}) => {
  const anonymous = await browser.newContext();
  const denied = await anonymous.request.get(origin + "/api/admin/sidebar");
  expect(denied.status()).toBe(401);
  await anonymous.close();
  await login(page);
  const headers = { Origin: origin };
  expect(
    (
      await page.request.post("/api/admin/sidebar/publish", {
        headers: { Origin: "https://evil.test" },
        data: { expectedVersion: 1 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.delete("/api/admin/presets/reference", { headers })
    ).status(),
  ).toBe(403);
  const email = `test-${Date.now()}@sidebar.local`;
  const password = "Browser-test-password-4821";
  const created = await page.request.post("/api/admin/users", {
    headers,
    data: { email, name: "Test user", password, roleName: "USER" },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const user = await browser.newContext();
  try {
    expect(
      (
        await user.request.post(origin + "/api/auth/login", {
          headers,
          data: { email, password },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (await user.request.get(origin + "/api/admin/sidebar")).status(),
    ).toBe(403);
    const config = await (
      await user.request.get(origin + "/api/sidebar")
    ).json();
    expect(config.assignments).toEqual({ users: [], groups: [] });
    expect(
      config.items.every((i: { roles: string[] }) => i.roles.length === 0),
    ).toBe(true);
    expect(
      (
        await user.request.post(origin + "/api/admin/users", {
          headers,
          data: {
            email: "escalate@example.com",
            name: "Escalate",
            password,
            roleName: "SUPER_ADMIN",
          },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await user.close();
    const db = new PrismaClient();
    try {
      await db.user.delete({ where: { id } });
    } finally {
      await db.$disconnect();
    }
  }
});
