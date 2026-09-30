"use client";
import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "./sidebar";
import type { Config } from "@/lib/sidebar/schema";
import { ArrowUpRight } from "lucide-react";
export function Application({
  config,
  path,
  name,
  canEdit,
}: {
  config: Config;
  path: string;
  name: string;
  canEdit: boolean;
}) {
  const [current, setCurrent] = useState(path);
  const label =
    config.items.find((i) => i.url === current)?.label || "Workspace";
  return (
    <main className={`published-app ${config.behavior.position}`}>
      <Sidebar config={config} path={current} onNavigate={setCurrent} />
      <section className="application-content">
        <div className="app-topline">
          <span>YOUR WORKSPACE</span>
          {canEdit && (
            <Link href="/admin">
              Open Studio <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
        <p className="eyebrow">WELCOME BACK, {name.toUpperCase()}</p>
        <h1>{label}</h1>
        <p>Your navigation, exactly how you designed it.</p>
        <div className="app-summary">
          <span className="live-dot" />
          Published navigation · {config.name}
        </div>
        <div className="content-cards">
          <article>
            <span>Navigation</span>
            <strong>{config.items.length}</strong>
            <p>Items available to your account</p>
          </article>
          <article>
            <span>Organized spaces</span>
            <strong>{config.sections.length}</strong>
            <p>Sections, configured in Studio</p>
          </article>
        </div>
        <p className="application-note">
          This is the host application example. Connect these navigation routes
          to your application’s pages and protect those resources independently.
        </p>
      </section>
    </main>
  );
}
