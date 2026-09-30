"use client";
import { useState } from "react";
import {
  Copy,
  Trash2,
  Archive,
  RotateCcw,
  Search,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  type Config,
  type Item,
  type Section,
  ROLES,
} from "@/lib/sidebar/schema";
import { descendants, duplicateItem, moveItem } from "@/lib/sidebar/engine";
import { iconRegistry, SidebarIcon } from "@/lib/sidebar/icons";
import { referenceConfig, newItem } from "@/lib/sidebar/defaults";
import { Field, Fields } from "./fields";
export function RolePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: Config["roles"]) => void;
}) {
  return (
    <div className="role-picker">
      <p>
        Visible to <small>None selected = everyone</small>
      </p>
      {ROLES.map((role) => (
        <label key={role}>
          <input
            type="checkbox"
            checked={value.includes(role)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? ([...value, role] as Config["roles"])
                  : (value.filter((r) => r !== role) as Config["roles"]),
              )
            }
          />
          {role.replace("_", " ")}
        </label>
      ))}
    </div>
  );
}
export function Inspector({
  config,
  selected,
  onChange,
  onSelect,
  onError,
}: {
  config: Config;
  selected: string | null;
  onChange: (c: Config) => void;
  onSelect: (s: string | null) => void;
  onError: (s: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  const section = selected?.startsWith("section:")
    ? config.sections.find((s) => "section:" + s.id === selected)
    : undefined;
  const item = config.items.find((i) => i.id === selected);
  const patch = (v: Item) =>
    onChange({
      ...config,
      items: config.items.map((i) => (i.id === v.id ? v : i)),
    });
  const changeSection = (v: Section) =>
    onChange({
      ...config,
      sections: config.sections.map((s) => (s.id === v.id ? v : s)),
    });
  const move = (sectionId: string, parentId: string | null, index: number) => {
    if (!item) return;
    try {
      onChange(moveItem(config, item.id, sectionId, parentId, index));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Move failed");
    }
  };
  if (section)
    return (
      <aside className="inspector">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SECTION</p>
            <h2>{section.label}</h2>
          </div>
        </div>
        <Fields
          value={section}
          defaults={
            referenceConfig.sections.find((s) => s.id === section.id) ?? {
              ...section,
              label: "New section",
              hideLabel: false,
              enabled: true,
              collapsible: false,
              defaultExpanded: true,
              footer: false,
              roles: [],
            }
          }
          keys={[
            "name",
            "label",
            "hideLabel",
            "enabled",
            "collapsible",
            "defaultExpanded",
            "footer",
            "order",
          ]}
          onChange={changeSection}
        />
        <RolePicker
          value={section.roles}
          onChange={(roles) => changeSection({ ...section, roles })}
        />
        <button
          className="danger quiet"
          onClick={() => {
            if (!confirm("Delete this section and all its items?")) return;
            onChange({
              ...config,
              sections: config.sections.filter((s) => s.id !== section.id),
              items: config.items.filter((i) => i.sectionId !== section.id),
            });
            onSelect(null);
          }}
          disabled={config.sections.length === 1}
        >
          <Trash2 size={14} /> Delete section and items
        </button>
      </aside>
    );
  if (!item)
    return (
      <aside className="inspector inspector-empty">
        <div className="empty-icon">
          <SlidersIcon />
        </div>
        <h2>
          A little attention
          <br />
          to every detail.
        </h2>
        <p>Select a menu item or section to edit its properties.</p>
        <span>Changes appear instantly in your preview.</span>
      </aside>
    );
  const excluded = descendants(config.items, item.id);
  const siblingIndex = config.items
    .filter(
      (i) => i.sectionId === item.sectionId && i.parentId === item.parentId,
    )
    .toSorted((a, b) => a.order - b.order)
    .findIndex((i) => i.id === item.id);
  return (
    <aside className="inspector">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ITEM PROPERTIES</p>
          <h2>{item.label}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close inspector"
          onClick={() => onSelect(null)}
        >
          <X size={16} />
        </button>
      </div>
      <div className="inspector-actions">
        <button
          onClick={() => {
            try {
              onChange(duplicateItem(config, item.id));
            } catch (e) {
              onError(String(e));
            }
          }}
        >
          <Copy size={13} /> Duplicate
        </button>
        <button onClick={() => patch({ ...item, archived: !item.archived })}>
          {item.archived ? <RotateCcw size={13} /> : <Archive size={13} />}{" "}
          {item.archived ? "Restore" : "Archive"}
        </button>
        <button
          className="danger"
          aria-label="Delete item"
          onClick={() => {
            if (!confirm("Delete this item and all nested children?")) return;
            onChange({
              ...config,
              items: config.items.filter((i) => !excluded.has(i.id)),
            });
            onSelect(null);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <h3 className="inspector-group">General</h3>
      <Fields
        value={item}
        defaults={
          referenceConfig.items.find((i) => i.id === item.id) ??
          newItem(item.sectionId, item.id)
        }
        keys={["label", "name", "description", "tooltip"]}
        onChange={patch}
      />
      <label className="field">
        <span>Icon</span>
        <button className="icon-choice" onClick={() => setPicker(!picker)}>
          <SidebarIcon name={item.icon} size={17} />
          {item.icon || "No icon"}
          <Search size={13} />
        </button>
      </label>
      {picker && (
        <div className="icon-picker">
          <input
            aria-label="Search icons"
            placeholder="Search icons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div>
            {Object.keys(iconRegistry)
              .filter((n) => n.toLowerCase().includes(search.toLowerCase()))
              .map((name) => (
                <button
                  className={item.icon === name ? "selected" : ""}
                  key={name}
                  title={name}
                  aria-label={`Choose ${name} icon`}
                  onClick={() => {
                    patch({ ...item, icon: name });
                    setPicker(false);
                  }}
                >
                  <SidebarIcon name={name} size={19} />
                </button>
              ))}
          </div>
          <button
            className="quiet"
            onClick={() => {
              patch({ ...item, icon: "" });
              setPicker(false);
            }}
          >
            Remove icon
          </button>
        </div>
      )}
      <h3 className="inspector-group">Destination</h3>
      <Fields
        value={item}
        defaults={
          referenceConfig.items.find((i) => i.id === item.id) ??
          newItem(item.sectionId, item.id)
        }
        keys={["url", "newTab", "activeMatch", "activePattern", "action"]}
        options={{
          activeMatch: ["exact", "prefix", "glob"],
          action: ["navigate", "logout"],
        }}
        onChange={patch}
      />
      <h3 className="inspector-group">Structure</h3>
      <label className="field">
        <span>Section</span>
        <select
          value={item.sectionId}
          onChange={(e) => move(e.target.value, null, config.items.length)}
        >
          {config.sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Parent item</span>
        <select
          value={item.parentId || ""}
          onChange={(e) =>
            move(item.sectionId, e.target.value || null, config.items.length)
          }
        >
          <option value="">Section root</option>
          {config.items
            .filter(
              (i) => i.sectionId === item.sectionId && !excluded.has(i.id),
            )
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
        </select>
      </label>
      <div className="move-buttons">
        <button
          onClick={() =>
            move(item.sectionId, item.parentId, Math.max(0, siblingIndex - 1))
          }
        >
          <ArrowUp size={13} /> Move up
        </button>
        <button
          onClick={() => move(item.sectionId, item.parentId, siblingIndex + 1)}
        >
          <ArrowDown size={13} /> Move down
        </button>
      </div>
      <h3 className="inspector-group">Badge</h3>
      <Fields
        value={item}
        defaults={
          referenceConfig.items.find((i) => i.id === item.id) ??
          newItem(item.sectionId, item.id)
        }
        keys={["badge", "badgeColor", "badgeProvider"]}
        options={{ badgeProvider: ["static", "unread", "pendingOrders"] }}
        onChange={patch}
      />
      <h3 className="inspector-group">Visibility & permissions</h3>
      <Field
        name="visible"
        value={item.visible}
        onChange={(v) => patch({ ...item, visible: Boolean(v) })}
      />
      <Field
        name="enabled"
        value={item.enabled}
        onChange={(v) => patch({ ...item, enabled: Boolean(v) })}
      />
      <Field
        name="className"
        value={item.className}
        options={["", "muted", "emphasis"]}
        onChange={(v) => patch({ ...item, className: v as Item["className"] })}
      />
      <RolePicker
        value={item.roles}
        onChange={(roles) => patch({ ...item, roles })}
      />
    </aside>
  );
}
function SlidersIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="3" fill="#fff" />
      <circle cx="15" cy="17" r="3" fill="#fff" />
    </svg>
  );
}
