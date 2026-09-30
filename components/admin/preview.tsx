"use client";
import {
  Monitor,
  PanelLeft,
  Tablet,
  Smartphone,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { type Config, type RoleName, ROLES } from "@/lib/sidebar/schema";
type Mode = "expanded" | "collapsed" | "tablet" | "mobile";
export function Preview({
  config,
  filtered,
  sidebarId,
  valid,
  mode,
  setMode,
  path,
  setPath,
  previewRole,
  setPreviewRole,
  change,
  navigate,
  onInspector,
}: {
  config: Config;
  filtered: Config | null;
  sidebarId: string;
  valid: boolean;
  mode: Mode;
  setMode: (m: Mode) => void;
  path: string;
  setPath: (p: string) => void;
  previewRole: RoleName;
  setPreviewRole: (r: RoleName) => void;
  change: (c: Config) => void;
  navigate: (p: string) => void;
  onInspector: () => void;
}) {
  return (
    <section className="preview-area">
      <div className="preview-toolbar">
        <span>
          <i className="live-dot" />
          LIVE PREVIEW
        </span>
        <div className="device-modes">
          {(
            [
              { id: "expanded", icon: Monitor, label: "Desktop expanded" },
              {
                id: "collapsed",
                icon: PanelLeft,
                label: "Desktop collapsed",
              },
              { id: "tablet", icon: Tablet, label: "Tablet" },
              { id: "mobile", icon: Smartphone, label: "Mobile" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={mode === id ? "active" : ""}
              aria-label={label}
              aria-pressed={mode === id}
              title={label}
              onClick={() => setMode(id)}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label="Toggle preview theme"
          onClick={() =>
            change({
              ...config,
              behavior: {
                ...config.behavior,
                themeMode:
                  config.behavior.themeMode === "dark" ? "light" : "dark",
              },
            })
          }
        >
          {config.behavior.themeMode === "dark" ? (
            <Moon size={15} />
          ) : (
            <Sun size={15} />
          )}
        </button>
      </div>
      <div className={`preview-canvas ${mode}`}>
        <div className="canvas-topline">
          <span className="canvas-symbol">
            S<span> / </span>
          </span>
          <span>YOUR SPACE, REIMAGINED</span>
        </div>
        <div className="preview-sidebar-wrap">
          {filtered ? (
            <Sidebar
              config={filtered}
              path={path}
              mode={mode}
              preview
              onNavigate={navigate}
              key={`${sidebarId}-${mode}`}
            />
          ) : (
            <div className="preview-denied">
              {valid
                ? "This sidebar is not visible to the selected account."
                : "Fix the validation error to resume preview."}
            </div>
          )}
        </div>
        <span className="canvas-caption">
          THE REFERENCE COLLECTION <i /> 01 — DARK GLASS
        </span>
      </div>
      <div className="preview-footer">
        <span>
          {mode === "collapsed"
            ? config.appearance.collapsedWidth
            : config.appearance.expandedWidth}
          px <span>sidebar</span>
        </span>
        <label>
          Preview as{" "}
          <select
            aria-label="Preview role"
            value={previewRole}
            onChange={(e) => setPreviewRole(e.target.value as RoleName)}
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button className="mobile-controls quiet" onClick={() => onInspector()}>
          Inspector
        </button>
      </div>
      <label className="preview-route">
        <span>Current route</span>
        <input
          aria-label="Preview route"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <Check size={13} />
      </label>
    </section>
  );
}
