import { test, expect } from "@playwright/test";
test("create, keyboard reorder, save, publish, export and validated import", async ({
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
    await page
      .getByRole("button", { name: "Add item to Menu", exact: true })
      .click();
    await page
      .getByLabel("Label", { exact: true })
      .fill("Browser workflow item");
    await page.getByLabel("Url", { exact: true }).fill("/app/browser-workflow");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.locator(".studio-notice[role=status]")).toContainText(
      "Draft saved",
    );
    await page.reload();
    await expect(
      page
        .locator(".tree-item-select")
        .filter({ hasText: "Browser workflow item" }),
    ).toBeVisible();
    const before = await (await page.request.get("/api/sidebar")).json();
    expect(
      before.items.some(
        (i: { label: string }) => i.label === "Browser workflow item",
      ),
    ).toBe(false);
    const handle = page.getByRole("button", {
      name: "Move Continue watching",
      exact: true,
    });
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
      "reference-2",
    );
    await page.keyboard.press("Space");
    await page
      .getByRole("button", { name: "Publish changes", exact: true })
      .click();
    await expect(page.locator(".studio-notice[role=status]")).toContainText(
      "Published.",
    );
    const after = await (await page.request.get("/api/sidebar")).json();
    const moved = after.items.find(
      (i: { id: string }) => i.id === "reference-1",
    );
    const previous = initial.config.items.find(
      (i: { id: string }) => i.id === "reference-1",
    );
    expect(
      moved.order !== previous.order || moved.parentId !== previous.parentId,
    ).toBe(true);
    expect(
      after.items.some(
        (i: { label: string }) => i.label === "Browser workflow item",
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "More actions" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    expect((await download).suggestedFilename()).toBe(
      "sidebar-configuration-v1.json",
    );
    const invalid = structuredClone(initial.config);
    invalid.items[0].url = "javascript:alert(1)";
    await page.locator("input[type=file]").setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(invalid)),
    });
    await expect(page.locator(".studio-notice[role=alert]")).toContainText(
      "Use a local path or HTTPS URL",
    );
    await page.locator("input[type=file]").setInputFiles({
      name: "good.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(initial.config)),
    });
    await expect(page.locator(".studio-notice[role=status]")).toContainText(
      "Imported into preview",
    );
  } finally {
    const current = await (await page.request.get("/api/admin/sidebar")).json();
    const saved = await (
      await page.request.put("/api/admin/sidebar", {
        headers,
        data: { config: initial.config, expectedVersion: current.version },
      })
    ).json();
    await page.request.post("/api/admin/sidebar/publish", {
      headers,
      data: { expectedVersion: saved.version },
    });
  }
});
