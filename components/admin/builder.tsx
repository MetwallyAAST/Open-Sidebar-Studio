"use client";
import { ZodError } from "zod";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  PanelLeft,
  ChevronDown,
  ArrowUpRight,
  Save,
  Upload,
  Download,
  RotateCcw,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Layers,
  Palette,
  Sparkles,
  MousePointer2,
  Type,
  Shield,
  History,
  ScrollText,
  Users,
  Code,
  Plus,
  Ellipsis,
  Menu,
  X,
} from "lucide-react";
import { Preview } from "./preview";
import { PresetsPanel } from "./presets-panel";
import { MenuTree } from "./menu-tree";
import { Inspector } from "./inspector";
import { SettingsPanel, type Tab } from "./settings-panel";
import { configSchema, type Config, type RoleName } from "@/lib/sidebar/schema";
import { referenceConfig } from "@/lib/sidebar/defaults";
import { filterConfig, activeIds } from "@/lib/sidebar/engine";
import { cssTokens } from "@/lib/sidebar/tokens";
import "./builder.css";
const AdminRecords = dynamic(
  () => import("./records").then((m) => m.AdminRecords),
  { loading: () => <p className="loading">Loading records…</p> },
);
const tabs: { name: Tab; icon: typeof Layers }[] = [
  { name: "Menu builder", icon: Layers },
  { name: "Appearance", icon: Palette },
  { name: "Animations", icon: Sparkles },
  { name: "Behavior", icon: MousePointer2 },
  { name: "Themes", icon: SlidersHorizontal },
  { name: "Branding", icon: Type },
  { name: "Permissions", icon: Shield },
  { name: "History", icon: History },
  { name: "Audit log", icon: ScrollText },
  { name: "Users & roles", icon: Users },
  { name: "Developer", icon: Code },
];
import { api } from "./api";
type Draft = { config: Config; version: number; sidebarId: string };
export function Builder({
  initial,
  user,
}: {
  initial: Draft;
  user: {
    id: string;
    name: string;
    role: RoleName;
    permissions: string[];
    groups: string[];
  };
}) {
  const [draft, setDraft] = useState(initial);
  const [config, setConfig] = useState(initial.config);
  const [past, setPast] = useState<Config[]>([]);
  const [future, setFuture] = useState<Config[]>([]);
  const [tab, setTab] = useState<Tab>("Menu builder");
  const [selected, setSelected] = useState<string | null>("reference-0");
  const [mode, setMode] = useState<
    "expanded" | "collapsed" | "tablet" | "mobile"
  >("expanded");
  const [path, setPath] = useState("/app/home");
  const [previewRole, setPreviewRole] = useState<RoleName>(user.role);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [presetPanel, setPresetPanel] = useState(false);
  const [sidebarList, setSidebarList] = useState<
    { id: string; name: string; priority: number }[]
  >([]);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(config) !== JSON.stringify(draft.config);
  const validation = configSchema.safeParse(config);
  const editable = user.permissions.includes("sidebar:write");
  useEffect(() => {
    api<typeof sidebarList>("sidebars")
      .then(setSidebarList)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  const change = (next: Config) => {
    if (!editable) return;
    setPast((p) => [...p.slice(-29), config]);
    setFuture([]);
    setConfig(next);
    setMessage("");
  };
  const accepted = (next: Draft) => {
    setDraft(next);
    setConfig(next.config);
    setPast([]);
    setFuture([]);
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof ZodError
          ? e.issues[0].message
          : e instanceof Error
            ? e.message
            : "Operation failed",
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const result = await api<Draft>("sidebar", "PUT", {
      config: configSchema.parse(config),
      expectedVersion: draft.version,
      sidebarId: draft.sidebarId,
    });
    accepted(result);
    setMessage("Draft saved");
    return result;
  };
  const publish = () =>
    run(async () => {
      const saved = dirty ? await save() : draft;
      const result = await api<Draft>("sidebar/publish", "POST", {
        expectedVersion: saved.version,
        sidebarId: saved.sidebarId,
      });
      accepted(result);
      setMessage("Published. Your application is up to date.");
    });
  const restore = (id: string) =>
    run(async () => {
      if (dirty && !confirm("Replace your unsaved changes with this revision?"))
        return;
      const result = await api<Draft>(`revisions/${id}/restore`, "POST", {
        expectedVersion: draft.version,
        sidebarId: draft.sidebarId,
      });
      accepted(result);
      setMessage("Revision restored to draft. Publish when ready.");
    });
  const download = () => {
    const blob = new Blob(
      [JSON.stringify(configSchema.parse(config), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sidebar-configuration-v1.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const filtered = validation.success
    ? filterConfig(validation.data, {
        id: user.id,
        role: previewRole,
        groups: user.groups,
      })
    : null;
  const navigate = (next: string) => {
    if (next.startsWith("/")) setPath(next);
  };
  return (
    <div className="studio">
      <header className="studio-header">
        <Link href="/admin" className="studio-brand">
          <span className="studio-mark">
            <PanelLeft size={20} />
          </span>
          <span>
            Sidebar<span className="brand-studio">Studio</span>
          </span>
          <span className="studio-beta">WORKSPACE</span>
        </Link>
        <div className="header-center">
          <span className="workspace-avatar">S</span>
          <span>Your workspace</span>
          <ChevronDown size={12} />
        </div>
        <div className="header-right">
          <Link href="/app/home" target="_blank">
            View application <ArrowUpRight size={14} />
          </Link>
          <span className="header-divider" />
          <span className="user-avatar" title={user.name}>
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>
      </header>
      <div className="studio-title">
        <div>
          <div className="breadcrumb">
            Workspace <span>/</span> Navigation
          </div>
          <h1>
            Design your navigation<span className="draft-tag">Draft</span>
          </h1>
          <p>A familiar starting point. A sidebar that’s entirely yours.</p>
        </div>
        <div className="title-actions">
          <span className={`save-status ${dirty ? "unsaved" : ""}`}>
            <i />
            {dirty
              ? "Unsaved changes"
              : message
                ? "All changes saved"
                : "Draft up to date"}
          </span>
          <button
            className="secondary"
            disabled={busy || !dirty || !editable || !validation.success}
            onClick={() =>
              run(async () => {
                await save();
              })
            }
          >
            <Save size={15} />
            Save draft
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              !user.permissions.includes("sidebar:publish") ||
              !validation.success
            }
            onClick={publish}
          >
            {busy ? "Working…" : "Publish changes"}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
      <nav className="studio-tabs" aria-label="Editor panels">
        {tabs
          .filter(
            (t) =>
              t.name !== "Users & roles" ||
              user.permissions.includes("access:manage"),
          )
          .map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => {
                setTab(name);
                setMobilePanel(true);
              }}
            >
              <Icon size={15} />
              {name}
            </button>
          ))}
      </nav>
      {(error || message || !validation.success) && (
        <div
          role={error || !validation.success ? "alert" : "status"}
          className={`studio-notice ${error || !validation.success ? "error" : ""}`}
        >
          <span>
            {error ||
              (!validation.success
                ? validation.error.issues[0].message
                : message)}
          </span>
          <button
            aria-label="Dismiss notification"
            onClick={() => {
              setError("");
              setMessage("");
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="builder-toolbar">
        <div>
          <button
            className="mobile-controls icon-button"
            aria-label="Toggle controls"
            onClick={() => setMobilePanel(!mobilePanel)}
          >
            <Menu size={17} />
          </button>
          <span className="preset-dot" />
          <select
            aria-label="Sidebar configuration"
            value={draft.sidebarId}
            onChange={(e) =>
              run(async () => {
                if (
                  dirty &&
                  !confirm("Discard unsaved changes and switch sidebar?")
                )
                  return;
                accepted(
                  await api<Draft>("sidebar?sidebarId=" + e.target.value),
                );
              })
            }
          >
            {sidebarList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="version-tag">v{draft.version}</span>
          <button
            className="quiet presets-link"
            onClick={() => setPresetPanel(!presetPanel)}
          >
            Presets
            <ChevronDown size={12} />
          </button>
        </div>
        <div>
          <button
            className="icon-button"
            title="Undo"
            disabled={!past.length}
            onClick={() => {
              setFuture((f) => [config, ...f]);
              setConfig(past[past.length - 1]);
              setPast((p) => p.slice(0, -1));
            }}
          >
            <Undo2 size={15} />
          </button>
          <button
            className="icon-button"
            title="Redo"
            disabled={!future.length}
            onClick={() => {
              setPast((p) => [...p, config]);
              setConfig(future[0]);
              setFuture((f) => f.slice(1));
            }}
          >
            <Redo2 size={15} />
          </button>
          <span className="header-divider" />
          <button
            className="quiet"
            onClick={() => {
              if (confirm("Reset the entire draft to the Reference Design?")) {
                change(structuredClone(referenceConfig));
                setSelected(null);
              }
            }}
          >
            <RotateCcw size={13} />
            Reset to reference
          </button>
          <div className="more-menu">
            <button
              className="icon-button"
              aria-label="More actions"
              onClick={() => setMore(!more)}
            >
              <Ellipsis size={19} />
            </button>
            {more && (
              <div className="dropdown">
                <button
                  onClick={() => {
                    try {
                      download();
                    } catch (e) {
                      setError(String(e));
                    }
                    setMore(false);
                  }}
                >
                  <Download size={14} /> Export JSON
                </button>
                <button
                  onClick={() => {
                    input.current?.click();
                    setMore(false);
                  }}
                >
                  <Upload size={14} /> Import JSON
                </button>
                <button
                  onClick={() =>
                    run(async () => {
                      if (
                        !confirm(
                          "Discard the draft and restore the published version?",
                        )
                      )
                        return;
                      accepted(
                        await api<Draft>("sidebar/discard", "POST", {
                          expectedVersion: draft.version,
                          sidebarId: draft.sidebarId,
                        }),
                      );
                      setMore(false);
                      setMessage("Draft reset to published version");
                    })
                  }
                >
                  <RotateCcw size={14} /> Discard draft
                </button>
                {user.permissions.includes("access:manage") && (
                  <button
                    onClick={() =>
                      run(async () => {
                        const name = prompt(
                          "Name for the new audience-specific sidebar",
                        );
                        if (!name) return;
                        const created = await api<{ id: string }>(
                          "sidebars",
                          "POST",
                          { name, priority: 10 },
                        );
                        setSidebarList(await api("sidebars"));
                        accepted(
                          await api<Draft>("sidebar?sidebarId=" + created.id),
                        );
                        setMore(false);
                        setTab("Permissions");
                      })
                    }
                  >
                    <Plus size={14} /> Add sidebar variant
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <input
        type="file"
        ref={input}
        hidden
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            void run(async () => {
              if (file.size > 1_000_000)
                throw new Error("Import must be smaller than 1 MB");
              const parsed = configSchema.parse(JSON.parse(await file.text()));
              change(parsed);
              setMessage("Imported into preview. Save draft to persist.");
            });
          e.target.value = "";
        }}
      />
      {presetPanel && (
        <PresetsPanel
          config={config}
          valid={validation.success}
          onChange={change}
          onClose={() => {
            setPresetPanel(false);
            setSelected(null);
          }}
          run={run}
          onError={setError}
        />
      )}
      <div
        className={`builder-layout ${mobilePanel ? "show-controls" : ""} ${showInspector ? "show-inspector" : ""}`}
      >
        <div className="builder-controls">
          <button
            className="mobile-close"
            onClick={() => setMobilePanel(false)}
          >
            Close controls <X size={14} />
          </button>
          {tab === "Menu builder" ? (
            <MenuTree
              config={config}
              onChange={change}
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
                setShowInspector(true);
                setMobilePanel(false);
              }}
              onError={setError}
            />
          ) : ["History", "Audit log", "Users & roles"].includes(tab) ? (
            <AdminRecords
              tab={tab}
              sidebarId={draft.sidebarId}
              onRestore={restore}
              onPreview={(snapshot) => {
                change(snapshot);
                setMessage(
                  "Previewing a historical revision. Save or restore to keep it.",
                );
              }}
              onError={setError}
            />
          ) : tab === "Developer" ? (
            <section className="settings-panel">
              <h2>Developer tools</h2>
              <p className="panel-note">
                Inspection only. Public readers receive server-filtered
                configuration.
              </p>
              <button
                className="secondary"
                onClick={() =>
                  run(async () => {
                    await navigator.clipboard.writeText(
                      JSON.stringify(config, null, 2),
                    );
                    setMessage("Configuration copied");
                  })
                }
              >
                Copy configuration
              </button>
              <details open>
                <summary>CSS variables</summary>
                <pre>{JSON.stringify(cssTokens(config), null, 2)}</pre>
              </details>
              <details>
                <summary>Menu tree</summary>
                <pre>
                  {JSON.stringify(
                    config.items.map(
                      ({ id, parentId, sectionId, label, order }) => ({
                        id,
                        parentId,
                        sectionId,
                        label,
                        order,
                      }),
                    ),
                    null,
                    2,
                  )}
                </pre>
              </details>
              <details>
                <summary>Permission resolution</summary>
                <pre>
                  {JSON.stringify(
                    {
                      role: previewRole,
                      visible: filtered?.items.map((i) => i.label),
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
              <details>
                <summary>Active route resolution</summary>
                <pre>
                  {JSON.stringify(
                    { path, active: [...activeIds(config.items, path)] },
                    null,
                    2,
                  )}
                </pre>
              </details>
              <details>
                <summary>Generated configuration</summary>
                <pre>{JSON.stringify(config, null, 2)}</pre>
              </details>
            </section>
          ) : (
            <SettingsPanel tab={tab} config={config} onChange={change} />
          )}
        </div>
        <Preview
          config={config}
          filtered={filtered}
          sidebarId={draft.sidebarId}
          valid={validation.success}
          mode={mode}
          setMode={setMode}
          path={path}
          setPath={setPath}
          previewRole={previewRole}
          setPreviewRole={setPreviewRole}
          change={change}
          navigate={navigate}
          onInspector={() => setShowInspector(!showInspector)}
        />
        <div className="inspector-wrap">
          <button
            className="mobile-close"
            onClick={() => setShowInspector(false)}
          >
            Close inspector <X size={14} />
          </button>
          <Inspector
            config={config}
            selected={selected}
            onChange={change}
            onSelect={(id) => {
              setSelected(id);
              if (!id) setShowInspector(false);
            }}
            onError={setError}
          />
        </div>
      </div>
      <footer className="studio-footer">
        <span>
          <Shield size={12} /> Drafts are private. Publish when you’re ready.
        </span>
        <span>
          Reference Sidebar <i /> Configuration v1
        </span>
      </footer>
    </div>
  );
}
