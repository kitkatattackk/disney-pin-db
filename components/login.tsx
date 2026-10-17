"use client";
import { useState } from "react";
import { Icon } from "./icons";
export function Login() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setPassword("");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <div className="brand-mark">
        <Icon name="scan" size={32} />
      </div>
      <p className="eyebrow">YOUR PERSONAL PIN COMPANION</p>
      <h1>
        Welcome to
        <br />
        <em>Pinfolio.</em>
      </h1>
      <p className="auth-intro">Sign in to your personal collection.</p>
      <form onSubmit={login}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
        <button className="button primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
          <Icon name="arrow" size={18} />
        </button>
      </form>
      {message && (
        <p role="alert" className="notice error">
          {message}
        </p>
      )}
      <p className="fine-print">Private access · No email links needed</p>
    </main>
  );
}
