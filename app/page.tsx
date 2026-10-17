"use client";
import { useEffect, useState } from "react";
import { Login } from "@/components/login";
import { PinApp } from "@/components/pin-app";
export default function Home() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal })
      .then(async (r) => {
        if (r.ok) setUser((await r.json()).user);
        setReady(true);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setReady(true);
      });
    return () => controller.abort();
  }, []);
  if (!ready)
    return (
      <main className="auth-screen">
        <p>Opening your collection…</p>
      </main>
    );
  return user ? <PinApp key={user.id} user={user} /> : <Login />;
}
