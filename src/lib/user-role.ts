import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// RESOLUCIÓN Y ROLES ADMIN

export async function resolveUserRole(
  supabase: SupabaseClient,
  user: User,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.rol) return profile.rol;

  const appRol = user.app_metadata?.rol;
  if (typeof appRol === "string" && appRol.trim()) {
    return appRol;
  }

  return "user";
}

export function isFinanzasRole(role: string): boolean {
  return ["super", "admin", "finanzas"].includes(role);
}

export async function requireFinanzasPageAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await resolveUserRole(supabase, user);
  if (!isFinanzasRole(role)) {
    redirect("/farmamuni");
  }

  return { supabase, user, role };
}

export function isAdminRole(role: string): boolean {
  return ["super", "admin"].includes(role);
}

export function isSuperRole(role: string): boolean {
  return role === "super";
}

// GUARD PÁGINAS ADMIN (SERVER)

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

export async function requireSuperPageAccess() {
  const ctx = await requireAdminPageAccess();
  if (!isSuperRole(ctx.role)) {
    redirect("/farmamuni/admin");
  }
  return ctx;
}
