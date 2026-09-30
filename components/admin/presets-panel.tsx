"use client";
import { useEffect, useState } from "react";
import { Layers, Plus } from "lucide-react";
import type { Config } from "@/lib/sidebar/schema";
import { api } from "./api";
type Preset = {
  id: string;
  name: string;
  protected: boolean;
  snapshot: Config;
};
export function PresetsPanel({
  config,
  valid,
  onChange,
  onClose,
  run,
  onError,
}: {
  config: Config;
  valid: boolean;
  onChange: (c: Config) => void;
  onClose: () => void;
  run: (work: () => Promise<void>) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPreset, setNewPreset] = useState("");
  useEffect(() => {
    api<Preset[]>("presets")
      .then(setPresets)
      .catch((e) => onError(e.message));
  }, [onError]);
  return (
    <section className="preset-panel">
      <div>
        <h3>Your presets</h3>
        <p>Reusable starting points. Apply changes to the draft.</p>
      </div>
      {presets.map((p) => (
        <div className="preset-entry" key={p.id}>
          <button
            onClick={() => {
              onChange(structuredClone(p.snapshot));
              onClose();
            }}
          >
            <Layers size={16} />
            <span>
              {p.name}
              <small>
                {p.protected ? "Protected reference" : "Custom preset"}
              </small>
            </span>
          </button>
          <button
            title="Duplicate preset"
            onClick={() =>
              run(async () => {
                await api("presets", "POST", {
                  name: p.name + " copy " + Date.now().toString().slice(-4),
                  config: p.snapshot,
                });
                setPresets(await api("presets"));
              })
            }
          >
            +
          </button>
          {!p.protected && (
            <>
              <button
                title="Rename preset"
                onClick={() =>
                  run(async () => {
                    const name = prompt("Preset name", p.name);
                    if (name) {
                      await api(`presets/${p.id}`, "PATCH", { name });
                      setPresets(await api("presets"));
                    }
                  })
                }
              >
                Edit
              </button>
              <button
                title="Delete preset"
                onClick={() =>
                  run(async () => {
                    if (confirm("Delete this preset?")) {
                      await api(`presets/${p.id}`, "DELETE");
                      setPresets(await api("presets"));
                    }
                  })
                }
              >
                ×
              </button>
            </>
          )}
        </div>
      ))}
      <div className="inline-add">
        <input
          aria-label="Preset name"
          placeholder="Save current as preset…"
          value={newPreset}
          onChange={(e) => setNewPreset(e.target.value)}
        />
        <button
          disabled={!newPreset.trim() || !valid}
          onClick={() =>
            run(async () => {
              await api("presets", "POST", { name: newPreset, config });
              setPresets(await api("presets"));
              setNewPreset("");
            })
          }
        >
          <Plus size={16} />
        </button>
      </div>
    </section>
  );
}
