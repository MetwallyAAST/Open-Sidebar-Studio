"use client";
import { useEffect, useState } from "react";
import type { Config } from "@/lib/sidebar/schema";
import { ROLES } from "@/lib/sidebar/schema";
import { api } from "./api";
import type { Tab } from "./settings-panel";
type Revision = {
  id: string;
  action: string;
  version: number;
  createdAt: string;
  actor: { name: string } | null;
  snapshot: Config;
};
type Audit = {
  id: string;
  action: string;
  target: string;
  createdAt: string;
  actor: { name: string } | null;
  before: unknown;
  after: unknown;
};
type User = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  enabled: boolean;
  groups: { groupId: string; group: { name: string } }[];
};
type Group = { id: string; name: string };
type Role = { name: string; permissions: { permissionName: string }[] };
export function AdminRecords({
  tab,
  sidebarId,
  onRestore,
  onPreview,
  onError,
}: {
  tab: Tab;
  sidebarId: string;
  onRestore: (id: string) => void;
  onPreview: (c: Config) => void;
  onError: (e: string) => void;
}) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (tab === "History") {
          const rows = await api<Revision[]>(
            "revisions?sidebarId=" + sidebarId,
          );
          if (!cancelled) setRevisions(rows);
        }
        if (tab === "Audit log") {
          const rows = await api<Audit[]>("audit?offset=" + offset);
          if (!cancelled) setAudit(rows);
        }
        if (tab === "Users & roles") {
          const [u, g, r] = await Promise.all([
            api<User[]>("users"),
            api<Group[]>("groups"),
            api<Role[]>("roles"),
          ]);
          if (!cancelled) {
            setUsers(u);
            setGroups(g);
            setRoles(r);
          }
        }
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, sidebarId, offset, onError]);
  const run = async (work: () => Promise<void>) => {
    try {
      await work();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Action failed");
    }
  };
  return (
    <section className="records-panel">
      <div className="panel-heading">
        <div>
          <h2>{tab}</h2>
          <p>
            {tab === "History"
              ? "Every change has a history."
              : tab === "Audit log"
                ? "Accountability, built in."
                : "People and their permissions."}
          </p>
        </div>
      </div>
      {loading && <p>Loading…</p>}
      {tab === "History" &&
        revisions.map((r) => (
          <article className="record" key={r.id}>
            <span className="record-version">v{r.version}</span>
            <strong>{r.action.replaceAll("_", " ").toLowerCase()}</strong>
            <p>
              {r.actor?.name || "System"} ·{" "}
              {new Date(r.createdAt).toLocaleString()}
            </p>
            <div>
              <button onClick={() => onPreview(r.snapshot)}>Preview</button>
              <button onClick={() => onRestore(r.id)}>Restore to draft</button>
            </div>
          </article>
        ))}
      {tab === "Audit log" && (
        <>
          {audit.map((r) => (
            <details className="record" key={r.id}>
              <summary>{r.action.replaceAll("_", " ")}</summary>
              <p>
                {r.actor?.name || "System"} ·{" "}
                {new Date(r.createdAt).toLocaleString()}
              </p>
              <small>Target: {r.target}</small>
              <pre>
                {JSON.stringify({ before: r.before, after: r.after }, null, 2)}
              </pre>
            </details>
          ))}
          <div className="move-buttons">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              Previous
            </button>
            <button
              disabled={audit.length < 50}
              onClick={() => setOffset(offset + 50)}
            >
              Next 50
            </button>
          </div>
        </>
      )}
      {tab === "Users & roles" && (
        <>
          <h3 className="inspector-group">People</h3>
          {users.map((u) => (
            <article className="record" key={u.id}>
              <strong>{u.name}</strong>
              <p>{u.email}</p>
              <button
                className="quiet copy-id"
                onClick={() =>
                  run(async () => navigator.clipboard.writeText(u.id))
                }
              >
                Copy user ID
              </button>
              <label className="field">
                <span>Role</span>
                <select
                  value={u.roleName}
                  onChange={(e) =>
                    run(async () => {
                      await api("users/" + u.id, "PATCH", {
                        roleName: e.target.value,
                      });
                      setUsers(await api("users"));
                    })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="toggle-field field">
                <span>Account enabled</span>
                <input
                  type="checkbox"
                  checked={u.enabled}
                  onChange={(e) =>
                    run(async () => {
                      await api("users/" + u.id, "PATCH", {
                        enabled: e.target.checked,
                      });
                      setUsers(await api("users"));
                    })
                  }
                />
              </label>
              {groups.map((g) => (
                <label className="group-check" key={g.id}>
                  <input
                    type="checkbox"
                    checked={u.groups.some((x) => x.groupId === g.id)}
                    onChange={(e) =>
                      run(async () => {
                        const ids = u.groups.map((x) => x.groupId);
                        await api("users/" + u.id, "PATCH", {
                          groups: e.target.checked
                            ? [...ids, g.id]
                            : ids.filter((id) => id !== g.id),
                        });
                        setUsers(await api("users"));
                      })
                    }
                  />
                  {g.name}
                </label>
              ))}
              <button
                className="quiet"
                onClick={() =>
                  run(async () => {
                    const password = prompt(
                      "New password (minimum 16 characters). This revokes existing sessions.",
                    );
                    if (password)
                      await api("users/" + u.id, "PATCH", { password });
                  })
                }
              >
                Reset password
              </button>
            </article>
          ))}
          <details className="settings-group">
            <summary>Add user</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const values = Object.fromEntries(new FormData(form));
                void run(async () => {
                  await api("users", "POST", values);
                  setUsers(await api("users"));
                  form.reset();
                });
              }}
            >
              <label className="field">
                <span>Name</span>
                <input name="name" required />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" required />
              </label>
              <label className="field">
                <span>Temporary password</span>
                <input
                  name="password"
                  type="password"
                  minLength={16}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select name="roleName" defaultValue="USER">
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <button className="secondary">Create user</button>
            </form>
          </details>
          <h3 className="inspector-group">Groups</h3>
          {groups.map((g) => (
            <div className="record" key={g.id}>
              <strong>{g.name}</strong>
              <button
                className="quiet"
                onClick={() =>
                  run(async () => navigator.clipboard.writeText(g.id))
                }
              >
                Copy group ID
              </button>
            </div>
          ))}
          <form
            className="inline-add"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = new FormData(form).get("name");
              void run(async () => {
                await api("groups", "POST", { name });
                setGroups(await api("groups"));
                form.reset();
              });
            }}
          >
            <input
              aria-label="Group name"
              name="name"
              required
              placeholder="New group name"
            />
            <button>Add</button>
          </form>
          <h3 className="inspector-group">Role capabilities</h3>
          {roles.map((r) => (
            <article className="record" key={r.name}>
              <strong>{r.name}</strong>
              <p>
                {r.permissions.map((p) => p.permissionName).join(", ") ||
                  "Published application access only"}
              </p>
            </article>
          ))}
          <p className="panel-note">
            Role capabilities are server-owned. Assign roles to users and
            configure navigation visibility in the Permissions panel.
          </p>
        </>
      )}
    </section>
  );
}
