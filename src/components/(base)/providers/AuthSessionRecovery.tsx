"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { isStaleRefreshTokenError } from "@/lib/supabase-session";

export function AuthSessionRecovery() {
  useEffect(() => {
    const supabase = createClient();

    const clearStaleSession = async () => {
      const { error } = await supabase.auth.getUser();
      if (!isStaleRefreshTokenError(error)) return;
      await supabase.auth.signOut({ scope: "local" });
      const path = window.location.pathname;
      if (path.startsWith("/farmamuni") || path === "/esperando-acceso") {
        window.location.replace("/login");
      }
    };

    void clearStaleSession();
  }, []);

  return null;
}
