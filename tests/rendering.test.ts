import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cssTokens } from "../lib/sidebar/tokens";
import { referenceConfig } from "../lib/sidebar/defaults";
import { SidebarIcon } from "../lib/sidebar/icons";
test("theme tokens preserve reference dimensions and glass controls", () => {
  const tokens = cssTokens(referenceConfig) as Record<string, string>;
  assert.equal(tokens["--sidebar-expanded-width"], "260px");
  assert.equal(tokens["--sidebar-collapsed-width"], "76px");
  assert.match(tokens["--sidebar-backdrop"], /blur\(22px\)/);
  const off = structuredClone(referenceConfig);
  off.appearance.glass = false;
  assert.equal(
    (cssTokens(off) as Record<string, string>)["--sidebar-backdrop"],
    "none",
  );
});
test("dynamic icons resolve safely and empty icon has no svg", () => {
  assert.match(
    renderToStaticMarkup(createElement(SidebarIcon, { name: "House" })),
    /<svg/,
  );
  assert.match(
    renderToStaticMarkup(createElement(SidebarIcon, { name: "not-an-icon" })),
    /<svg/,
  );
  assert.doesNotMatch(
    renderToStaticMarkup(createElement(SidebarIcon, { name: "" })),
    /<svg/,
  );
});
