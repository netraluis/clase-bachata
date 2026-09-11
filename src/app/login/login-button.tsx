"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {loading ? "Redirigiendo…" : "Entrar con Google"}
    </button>
  );
}
