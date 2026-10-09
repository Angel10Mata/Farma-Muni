import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isAdminRole, resolveUserRole } from "@/lib/user-role";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ApiSessionOk = {
  ok: true;
  supabase: SupabaseServer;
  user: User;
  role: string;
};

export type ApiSessionFail = {
  ok: false;
  response: NextResponse;
};

export type ApiSessionResult = ApiSessionOk | ApiSessionFail;

export async function requireApiSession(): Promise<ApiSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = await resolveUserRole(supabase, user);
  return { ok: true, supabase, user, role };
}

export async function requireApiAdmin(): Promise<ApiSessionResult> {
  const session = await requireApiSession();
  if (!session.ok) {
    return session;
  }
  if (!isAdminRole(session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return session;
}
