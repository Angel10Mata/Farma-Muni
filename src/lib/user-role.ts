import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function resolveUserRole(
  supabase: SupabaseClient,
  user: User,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  const metadata = user.user_metadata || {};
  const fallback = metadata.rol || user.role || "user";

  if (profile?.rol) return profile.rol;
  if (typeof fallback === "string" && fallback !== "authenticated") {
    return fallback;
  }

  return "user";
}

export function isAdminRole(role: string): boolean {
  return ["super", "admin"].includes(role);
}

/** Guard para páginas bajo /farmamuni/admin (server-only). */
export async function requireAdminPageAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await resolveUserRole(supabase, user);
  if (!isAdminRole(role)) {
    redirect("/farmamuni");
  }

  return { supabase, user, role };
}
