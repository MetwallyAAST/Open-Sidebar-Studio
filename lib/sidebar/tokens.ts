import type { CSSProperties } from "react";
import type { Appearance, Config } from "./schema";
export function appearanceFor(
  config: Config,
  mode: "light" | "dark",
): Appearance {
  const theme = config.themes.find((t) => t.id === config.activeTheme);
  return mode === "dark"
    ? config.appearance
    : (theme?.light ?? config.appearance);
}
export function cssTokens(
  config: Config,
  mode: "light" | "dark" = "dark",
): CSSProperties {
  const a = appearanceFor(config, mode);
  const b = config.behavior;
  const m = config.animations;
  const tokens: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(a))
    tokens[`--sidebar-${key.replace(/[A-Z]/g, (x) => "-" + x.toLowerCase())}`] =
      typeof value === "boolean" ? (value ? 1 : 0) : value;
  for (const key of [
    "expandedWidth",
    "collapsedWidth",
    "minWidth",
    "maxWidth",
    "itemHeight",
    "headerHeight",
    "footerHeight",
    "iconSize",
    "radius",
    "itemRadius",
    "itemSpacing",
    "sectionSpacing",
    "paddingX",
    "paddingY",
    "blur",
    "shadowBlur",
    "glowIntensity",
    "fontSize",
  ] as const)
    tokens[`--sidebar-${key.replace(/[A-Z]/g, (x) => "-" + x.toLowerCase())}`] =
      `${a[key]}px`;
  tokens["--sidebar-surface"] =
    `color-mix(in srgb, ${a.background} ${a.opacity * 100}%, transparent)`;
  tokens["--sidebar-border"] =
    `color-mix(in srgb, ${a.borderColor} ${a.borderOpacity * 100}%, transparent)`;
  tokens["--sidebar-shadow-value"] =
    `0 18px ${a.shadowBlur}px rgb(0 0 0 / ${a.shadow})`;
  tokens["--sidebar-backdrop"] = a.glass
    ? `blur(${a.blur}px) saturate(${a.saturation}%)`
    : "none";
  tokens["--sidebar-glow-value"] = a.glow
    ? `0 0 ${a.glowIntensity}px ${a.accent}`
    : "none";
  tokens["--sidebar-easing"] =
    m.easing === "spring" ? "cubic-bezier(.2,.8,.2,1)" : m.easing;
  for (const [key, value] of Object.entries(m))
    if (key.endsWith("Duration") || key === "textFade")
      tokens[`--${key}`] = `${value}ms`;
  tokens["--text-slide"] = `${m.textSlide}px`;
  tokens["--tooltip-delay"] = `${b.tooltipDelay}ms`;
  tokens["--sidebar-z-index"] = b.zIndex;
  tokens["--overlay-opacity"] = b.overlayOpacity;
  return tokens as CSSProperties;
}
