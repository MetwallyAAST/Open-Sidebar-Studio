"use client";
import { useState } from "react";
import { RotateCcw, Plus, Sun, Moon, Check, Trash2 } from "lucide-react";
import type { Config, Appearance } from "@/lib/sidebar/schema";
import { referenceConfig } from "@/lib/sidebar/defaults";
import { Fields, Field } from "./fields";
import { RolePicker } from "./inspector";
export type Tab =
  | "Menu builder"
  | "Appearance"
  | "Animations"
  | "Behavior"
  | "Themes"
  | "Branding"
  | "Permissions"
  | "History"
  | "Audit log"
  | "Users & roles"
  | "Developer";
export function SettingsPanel({
  tab,
  config,
  onChange,
}: {
  tab: Tab;
  config: Config;
  onChange: (c: Config) => void;
}) {
  const [light, setLight] = useState(false);
  const [themeName, setThemeName] = useState("");
  const theme = config.themes.find((t) => t.id === config.activeTheme)!;
  const appearance = light ? theme.light : config.appearance;
  const setAppearance = (a: Appearance) =>
    onChange({
      ...config,
      ...(!light ? { appearance: a } : {}),
      themes: config.themes.map((t) =>
        t.id === config.activeTheme
          ? { ...t, [light ? "light" : "dark"]: a }
          : t,
      ),
    });
  const reset = () => {
    if (tab === "Appearance")
      setAppearance(referenceConfig.themes[0][light ? "light" : "dark"]);
    if (tab === "Animations")
      onChange({ ...config, animations: referenceConfig.animations });
    if (tab === "Behavior")
      onChange({ ...config, behavior: referenceConfig.behavior });
    if (tab === "Branding")
      onChange({ ...config, branding: referenceConfig.branding });
  };
  return (
    <section className="settings-panel">
      <div className="panel-heading">
        <div>
          <h2>{tab}</h2>
          <p>Small adjustments. Your signature.</p>
        </div>
        <button
          className="icon-button"
          aria-label={`Reset ${tab}`}
          title={`Reset ${tab}`}
          onClick={reset}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      {tab === "Appearance" && (
        <>
          <div className="segmented">
            <button
              className={!light ? "selected" : ""}
              onClick={() => setLight(false)}
            >
              <Moon size={13} /> Dark tokens
            </button>
            <button
              className={light ? "selected" : ""}
              onClick={() => setLight(true)}
            >
              <Sun size={13} /> Light tokens
            </button>
          </div>
          <p className="panel-note">
            Preview uses your selected theme mode in Behavior.
          </p>
          <Group title="Dimensions & spacing">
            <Fields
              value={appearance}
              defaults={referenceConfig.appearance}
              keys={[
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
                "fontSize",
                "fontFamily",
              ]}
              options={{ fontFamily: ["Arial", "Inter", "system-ui"] }}
              onChange={setAppearance}
            />
          </Group>
          <Group title="Colors">
            <Fields
              value={appearance}
              defaults={referenceConfig.appearance}
              keys={[
                "background",
                "text",
                "mutedText",
                "activeText",
                "activeBackground",
                "hoverBackground",
                "accent",
                "iconColor",
                "activeIconColor",
                "borderColor",
                "badgeBackground",
                "badgeText",
              ]}
              onChange={setAppearance}
            />
          </Group>
          <Group title="Glass & effects">
            <Fields
              value={appearance}
              defaults={referenceConfig.appearance}
              keys={[
                "glass",
                "opacity",
                "blur",
                "saturation",
                "borderOpacity",
                "shadow",
                "shadowBlur",
                "glow",
                "glowIntensity",
              ]}
              onChange={setAppearance}
            />
          </Group>
        </>
      )}
      {tab === "Animations" && (
        <>
          <div className="panel-callout">
            Transitions follow the reference. Reduced-motion preferences always
            take priority.
          </div>
          <Fields
            value={config.animations}
            defaults={referenceConfig.animations}
            keys={
              Object.keys(config.animations) as (keyof Config["animations"])[]
            }
            options={{
              easing: [
                "linear",
                "ease",
                "ease-in",
                "ease-out",
                "ease-in-out",
                "spring",
              ],
            }}
            onChange={(animations) => onChange({ ...config, animations })}
          />
        </>
      )}
      {tab === "Behavior" && (
        <Fields
          value={config.behavior}
          defaults={referenceConfig.behavior}
          keys={Object.keys(config.behavior) as (keyof Config["behavior"])[]}
          options={{
            desktop: ["click", "hover", "auto"],
            tablet: ["collapsed", "overlay", "expanded"],
            mobile: ["drawer"],
            position: ["left", "right"],
            layout: ["fixed", "sticky", "overlay"],
            submenu: ["multiple", "single"],
            scrollbar: ["thin", "hidden", "auto"],
            themeMode: ["light", "dark", "system"],
          }}
          onChange={(behavior) => onChange({ ...config, behavior })}
        />
      )}
      {tab === "Branding" && (
        <>
          <Fields
            value={config.branding}
            defaults={referenceConfig.branding}
            keys={Object.keys(config.branding) as (keyof Config["branding"])[]}
            options={{ alignment: ["left", "center"] }}
            onChange={(branding) => onChange({ ...config, branding })}
          />
          <p className="panel-note">
            Logos and profile images accept HTTPS URLs or local asset paths.
          </p>
        </>
      )}
      {tab === "Permissions" && (
        <>
          <div className="panel-callout">
            Permissions are enforced by the server. Item and section rules can
            further restrict this sidebar.
          </div>
          <RolePicker
            value={config.roles}
            onChange={(roles) => onChange({ ...config, roles })}
          />
          <label className="field">
            <span>Individual user IDs</span>
            <textarea
              value={config.assignments.users.join("\n")}
              onChange={(e) =>
                onChange({
                  ...config,
                  assignments: {
                    ...config.assignments,
                    users: e.target.value.split(/\s+/).filter(Boolean),
                  },
                })
              }
              placeholder="One user ID per line"
            />
          </label>
          <label className="field">
            <span>Group IDs</span>
            <textarea
              value={config.assignments.groups.join("\n")}
              onChange={(e) =>
                onChange({
                  ...config,
                  assignments: {
                    ...config.assignments,
                    groups: e.target.value.split(/\s+/).filter(Boolean),
                  },
                })
              }
              placeholder="One group ID per line"
            />
          </label>
          <p className="panel-note">
            No assignment means all users with an allowed role. Copy IDs from
            Users & roles. Higher-priority sidebar variants take precedence.
          </p>
        </>
      )}
      {tab === "Themes" && (
        <>
          <p className="panel-note">
            Each theme stores independent light and dark tokens. Reference Glass
            can always be restored.
          </p>
          {config.themes.map((t) => (
            <article
              className={`theme-card ${t.id === config.activeTheme ? "selected" : ""}`}
              key={t.id}
            >
              <div
                className="theme-swatch"
                style={{ background: t.dark.background }}
              >
                <i style={{ background: t.dark.activeBackground }} />
                <span style={{ color: t.dark.text }}>Aa</span>
              </div>
              <Field
                name="themeName"
                value={t.name}
                onChange={(name) =>
                  onChange({
                    ...config,
                    themes: config.themes.map((x) =>
                      x.id === t.id ? { ...x, name: String(name) } : x,
                    ),
                  })
                }
              />
              <div className="theme-actions">
                <button
                  onClick={() =>
                    onChange({
                      ...config,
                      activeTheme: t.id,
                      appearance: t.dark,
                    })
                  }
                >
                  {t.id === config.activeTheme ? (
                    <Check size={13} />
                  ) : (
                    <Plus size={13} />
                  )}{" "}
                  Apply
                </button>
                <button
                  title="Reset theme"
                  onClick={() =>
                    onChange({
                      ...config,
                      themes: config.themes.map((x) =>
                        x.id === t.id
                          ? {
                              ...x,
                              light: referenceConfig.themes[0].light,
                              dark: referenceConfig.appearance,
                            }
                          : x,
                      ),
                      ...(t.id === config.activeTheme
                        ? { appearance: referenceConfig.appearance }
                        : {}),
                    })
                  }
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  title="Delete theme"
                  disabled={
                    config.themes.length === 1 || t.id === config.activeTheme
                  }
                  onClick={() =>
                    onChange({
                      ...config,
                      themes: config.themes.filter((x) => x.id !== t.id),
                    })
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))}
          <div className="inline-add">
            <input
              aria-label="New theme name"
              placeholder="New theme name"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
            />
            <button
              disabled={!themeName.trim()}
              onClick={() => {
                const id = crypto.randomUUID();
                onChange({
                  ...config,
                  themes: [
                    ...config.themes,
                    {
                      id,
                      name: themeName,
                      light: theme.light,
                      dark: config.appearance,
                    },
                  ],
                });
                setThemeName("");
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="settings-group" open>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
