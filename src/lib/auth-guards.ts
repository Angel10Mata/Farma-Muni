import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { resolveUserRole } from "@/lib/user-role";

export type AuthGuardFail = { ok: false; code: "UNAUTHORIZED" | "FORBIDDEN" };

export type AuthGuardOk = {
  ok: true;
  user: User;
  role: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export type AuthGuardResult = AuthGuardOk | AuthGuardFail;

export async function requireUser(): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const role = await resolveUserRole(supabase, user);
  return { ok: true, user, role, supabase };
}

export async function requireRole(roles: string[]): Promise<AuthGuardResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }
  if (!roles.includes(auth.role)) {
    return { ok: false, code: "FORBIDDEN" };
  }
  return auth;
}

export async function requireAdmin(): Promise<AuthGuardResult> {
  return requireRole(["super", "admin"]);
}

export async function requireInventario(): Promise<AuthGuardResult> {
  return requireRole(["super", "admin", "inventario"]);
}

export async function requireFinanzas(): Promise<AuthGuardResult> {
  return requireRole(["super", "admin", "finanzas"]);
}

export async function requireVentas(): Promise<AuthGuardResult> {
  return requireRole(["super", "admin", "ventas"]);
}

export async function requireAdminOrSelf(targetUserId: string): Promise<AuthGuardResult> {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }
  if (auth.user.id === targetUserId) {
    return auth;
  }
  return requireAdmin();
}
