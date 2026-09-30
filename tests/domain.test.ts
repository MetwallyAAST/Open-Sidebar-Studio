import { test } from "node:test";
import assert from "node:assert/strict";
import { configSchema, safeUrl, colorSchema } from "../lib/sidebar/schema";
import { referenceConfig, operationsConfig } from "../lib/sidebar/defaults";
import {
  activeIds,
  filterConfig,
  moveItem,
  routeMatches,
  duplicateItem,
} from "../lib/sidebar/engine";
test("reference and nested presets validate", () => {
  assert.equal(configSchema.parse(referenceConfig).items.length, 10);
  configSchema.parse(operationsConfig);
});
test("unsafe imports and URLs rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "//evil.com",
    "/\\evil.com",
    "data:text/html,test",
  ])
    assert.equal(safeUrl.safeParse(url).success, false);
  assert.equal(colorSchema.safeParse("red;display:none").success, false);
  assert.equal(
    configSchema.safeParse({ ...referenceConfig, schemaVersion: 2 }).success,
    false,
  );
});
test("cycles, orphan parents and invalid widths rejected", () => {
  const c = structuredClone(operationsConfig);
  c.items[2].parentId = "op-3";
  assert.equal(configSchema.safeParse(c).success, false);
  c.items[2].parentId = "missing";
  assert.equal(configSchema.safeParse(c).success, false);
  c.items[2].parentId = null;
  c.appearance.collapsedWidth = 100;
  c.appearance.minWidth = 120;
  assert.equal(configSchema.safeParse(c).success, false);
});
test("role filtering removes inaccessible descendants and audience", () => {
  const c = structuredClone(operationsConfig);
  c.items[2].roles = ["ADMIN"];
  const result = filterConfig(c, { id: "u", role: "USER", groups: [] })!;
  assert.equal(
    result.items.some((i) => i.id === "op-3"),
    false,
  );
  assert.equal(
    result.items.some((i) => i.label === "Security"),
    false,
  );
  c.assignments.users = ["other"];
  assert.equal(filterConfig(c, { id: "u", role: "USER", groups: [] }), null);
});
test("exact, prefix and glob activation opens ancestors", () => {
  const i = operationsConfig.items[3];
  assert(routeMatches(i, "/app/all-users?test=1"));
  assert(activeIds(operationsConfig.items, "/app/all-users").has("op-2"));
  assert(
    !routeMatches(
      { ...i, url: "/app/user", activeMatch: "prefix" },
      "/app/users",
    ),
  );
  assert(
    routeMatches(
      { ...i, activePattern: "/app/*/edit", activeMatch: "glob" },
      "/app/5/edit",
    ),
  );
});
test("reorder, reparent, duplicate retain valid tree", () => {
  const c = moveItem(operationsConfig, "op-2", "main", null, 0);
  assert.equal(c.items.find((i) => i.id === "op-3")!.sectionId, "main");
  assert.throws(() => moveItem(c, "op-2", "main", "op-3", 0));
  assert.equal(duplicateItem(c, "op-2").items.length, c.items.length + 4);
});
test("wildcards do not use exponential regular-expression backtracking", () => {
  const item = {
    ...referenceConfig.items[0],
    activeMatch: "glob" as const,
    activePattern: "/" + "a*".repeat(70) + "z",
  };
  assert.equal(routeMatches(item, "/" + "a".repeat(4000) + "x"), false);
  assert(
    routeMatches(
      { ...item, activeMatch: "prefix", activePattern: "/app/*" },
      "/app",
    ),
  );
  assert(
    routeMatches(
      { ...item, activeMatch: "prefix", activePattern: "/" },
      "/any/route",
    ),
  );
  assert(
    routeMatches(
      { ...item, activePattern: "/app/*/edit" },
      "/app/customer/edit",
    ),
  );
});
