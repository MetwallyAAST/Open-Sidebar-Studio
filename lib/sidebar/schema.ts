import { z } from "zod";

export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "EDITOR",
  "USER",
] as const;
export const roleSchema = z.enum(ROLES);
export type RoleName = z.infer<typeof roleSchema>;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().max(200);
export const safeUrl = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      (/^\/(?!\/)/.test(v) && !/[\\\s\u0000-\u001f]/.test(v)) ||
      (() => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      })(),
    "Use a local path or HTTPS URL",
  );
export const colorSchema = z
  .string()
  .max(90)
  .refine(
    (v) =>
      /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(v) ||
      /^(?:rgb|hsl)a?\(\s*[\d.%+\-\s,\/]+\)$/i.test(v),
    "Use HEX, RGB, or HSL",
  );
const n = (min: number, max: number) => z.number().finite().min(min).max(max);
const roles = z
  .array(roleSchema)
  .max(5)
  .refine((v) => new Set(v).size === v.length, "Duplicate role");
export const appearanceSchema = z
  .object({
    expandedWidth: n(160, 500),
    collapsedWidth: n(48, 120),
    minWidth: n(48, 400),
    maxWidth: n(200, 600),
    itemHeight: n(28, 80),
    headerHeight: n(40, 120),
    footerHeight: n(0, 160),
    iconSize: n(12, 36),
    radius: n(0, 50),
    itemRadius: n(0, 30),
    itemSpacing: n(0, 24),
    sectionSpacing: n(0, 48),
    paddingX: n(0, 40),
    paddingY: n(0, 40),
    background: colorSchema,
    text: colorSchema,
    mutedText: colorSchema,
    activeText: colorSchema,
    activeBackground: colorSchema,
    hoverBackground: colorSchema,
    accent: colorSchema,
    iconColor: colorSchema,
    activeIconColor: colorSchema,
    borderColor: colorSchema,
    badgeBackground: colorSchema,
    badgeText: colorSchema,
    opacity: n(0.1, 1),
    blur: n(0, 60),
    saturation: n(0, 200),
    borderOpacity: n(0, 1),
    shadow: n(0, 1),
    shadowBlur: n(0, 100),
    glow: z.boolean(),
    glowIntensity: n(0, 50),
    glass: z.boolean(),
    fontSize: n(10, 22),
    fontFamily: z.enum(["Arial", "Inter", "system-ui"]),
  })
  .strict()
  .refine(
    (v) =>
      v.minWidth <= v.collapsedWidth &&
      v.collapsedWidth < v.expandedWidth &&
      v.expandedWidth <= v.maxWidth,
    "Widths must satisfy minimum ≤ collapsed < expanded ≤ maximum",
  );
export const animationsSchema = z
  .object({
    openDuration: n(0, 2000),
    closeDuration: n(0, 2000),
    menuDuration: n(0, 1500),
    hoverDuration: n(0, 1000),
    iconDuration: n(0, 1000),
    textFade: n(0, 1500),
    textSlide: n(0, 40),
    submenuDuration: n(0, 1500),
    indicatorDuration: n(0, 1500),
    easing: z.enum([
      "linear",
      "ease",
      "ease-in",
      "ease-out",
      "ease-in-out",
      "spring",
    ]),
    stiffness: n(20, 800),
    damping: n(5, 100),
    mass: n(0.1, 5),
    hoverAnimation: z.boolean(),
    iconAnimation: z.boolean(),
  })
  .strict();
export const behaviorSchema = z
  .object({
    defaultExpanded: z.boolean(),
    desktop: z.enum(["click", "hover", "auto"]),
    tablet: z.enum(["collapsed", "overlay", "expanded"]),
    mobile: z.literal("drawer"),
    remember: z.boolean(),
    position: z.enum(["left", "right"]),
    layout: z.enum(["fixed", "sticky", "overlay"]),
    tooltipDelay: n(0, 2000),
    submenu: z.enum(["multiple", "single"]),
    closeOnSelect: z.boolean(),
    closeOnOutside: z.boolean(),
    closeOnEscape: z.boolean(),
    scrollbar: z.enum(["thin", "hidden", "auto"]),
    zIndex: n(1, 9999).int(),
    overlayOpacity: n(0, 1),
    autoCollapseDelay: n(100, 10000),
    tabletBreakpoint: n(700, 1400),
    mobileBreakpoint: n(320, 699),
    themeMode: z.enum(["light", "dark", "system"]),
    showProfile: z.boolean(),
    showSearch: z.boolean(),
    showWindowDots: z.boolean(),
    showNotifications: z.boolean(),
  })
  .strict();
export const brandingSchema = z
  .object({
    name: text,
    subtitle: text,
    logo: safeUrl,
    compactLogo: safeUrl,
    logoSize: n(16, 72),
    alignment: z.enum(["left", "center"]),
    showName: z.boolean(),
    url: safeUrl,
    profileName: text,
    profileSubtitle: text,
    profileImage: safeUrl,
  })
  .strict();
export const sectionSchema = z
  .object({
    id,
    name: text.min(1),
    label: text,
    hideLabel: z.boolean(),
    order: n(0, 10000).int(),
    enabled: z.boolean(),
    collapsible: z.boolean(),
    defaultExpanded: z.boolean(),
    footer: z.boolean(),
    roles,
  })
  .strict();
export const itemSchema = z
  .object({
    id,
    sectionId: id,
    parentId: id.nullable(),
    label: text.min(1),
    name: text.min(1),
    description: z.string().max(1000),
    icon: z.string().max(60),
    url: safeUrl,
    newTab: z.boolean(),
    order: n(0, 10000).int(),
    activeMatch: z.enum(["exact", "prefix", "glob"]),
    activePattern: z
      .string()
      .max(200)
      .regex(/^[\w\-/*.:]*$/),
    tooltip: text,
    badge: text,
    badgeColor: colorSchema,
    badgeProvider: z.enum(["static", "unread", "pendingOrders"]),
    className: z.enum(["", "muted", "emphasis"]),
    visible: z.boolean(),
    enabled: z.boolean(),
    archived: z.boolean(),
    roles,
    action: z.enum(["navigate", "logout"]),
  })
  .strict();
export const configSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: text.min(1),
    roles,
    assignments: z
      .object({ users: z.array(id).max(100), groups: z.array(id).max(100) })
      .strict(),
    branding: brandingSchema,
    behavior: behaviorSchema,
    appearance: appearanceSchema,
    animations: animationsSchema,
    themes: z
      .array(
        z
          .object({
            id,
            name: text.min(1),
            light: appearanceSchema,
            dark: appearanceSchema,
          })
          .strict(),
      )
      .min(1)
      .max(20),
    activeTheme: id,
    sections: z.array(sectionSchema).min(1).max(30),
    items: z.array(itemSchema).max(300),
  })
  .strict()
  .superRefine((c, ctx) => {
    const err = (message: string) => ctx.addIssue({ code: "custom", message });
    if (new Set(c.sections.map((s) => s.id)).size !== c.sections.length)
      err("Duplicate section ID");
    if (new Set(c.items.map((i) => i.id)).size !== c.items.length)
      err("Duplicate item ID");
    if (
      new Set(c.themes.map((t) => t.id)).size !== c.themes.length ||
      !c.themes.some((t) => t.id === c.activeTheme)
    )
      err("Invalid theme reference");
    const map = new Map(c.items.map((i) => [i.id, i]));
    for (const item of c.items) {
      if (!c.sections.some((s) => s.id === item.sectionId))
        err("Missing section");
      let p = item;
      const seen = new Set([p.id]);
      let depth = 0;
      while (p.parentId) {
        const parent = map.get(p.parentId);
        if (!parent || parent.sectionId !== item.sectionId) {
          err("Invalid parent or cross-section nesting");
          break;
        }
        if (seen.has(parent.id)) {
          err("Menu cycle");
          break;
        }
        if (++depth > 7) {
          err("Maximum nesting depth is eight");
          break;
        }
        seen.add(parent.id);
        p = parent;
      }
    }
  });
export type Config = z.infer<typeof configSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type Identity = { id: string; role: RoleName; groups: string[] };
