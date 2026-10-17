"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function Callback() {
  const [message, setMessage] = useState("Completing sign-in…");
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setMessage(error.message);
      else if (data.session) window.location.replace("/");
      else
        setMessage(
          "Sign-in could not be completed. Return to the app to request another email.",
        );
    });
  }, []);
  return (
    <main className="auth-screen">
      <h1>Pinfolio</h1>
      <p>{message}</p>
      <Link href="/">Return to sign-in</Link>
    </main>
  );
}
