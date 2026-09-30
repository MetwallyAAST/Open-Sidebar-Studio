"use client";
import { useState } from "react";
import { PanelLeft, ArrowRight } from "lucide-react";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-shell">
      <div className="login-card">
        <span className="studio-mark">
          <PanelLeft size={24} />
        </span>
        <p className="eyebrow">SIDEBAR STUDIO</p>
        <h1>
          Make room for
          <br />
          better navigation.
        </h1>
        <p className="muted">Sign in to your navigation workspace.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const form = new FormData(event.currentTarget);
            try {
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: form.get("email"),
                  password: form.get("password"),
                }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              window.location.assign(
                new URL("/admin", window.location.origin).href,
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not sign in");
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Open workspace"}
            <ArrowRight size={17} />
          </button>
        </form>
        <small>Secure access · Changes stay in draft until published</small>
      </div>
      <div className="login-art">
        <div className="login-orbit" />
        <h2>
          Every detail.
          <br />
          Entirely yours.
        </h2>
        <p>One navigation system. Endless possibilities.</p>
      </div>
    </main>
  );
}
