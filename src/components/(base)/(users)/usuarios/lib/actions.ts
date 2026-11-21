"use server";

import { createClient } from "@/utils/supabase/server";
import {
  createClient as createSupabaseAdmin,
  type AdminUserAttributes,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { ProfileFormValues } from "./zod";
import {
  requireAdmin,
  requireAdminOrSelf,
} from "@/lib/auth-guards";

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

async function assertCanManageTargetUser(
  actorRole: string,
  targetUserId: string,
  targetRoleInForm?: string,
): Promise<{ ok: true } | { code: "FORBIDDEN" }> {
  const admin = getAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("rol")
    .eq("id", targetUserId)
    .maybeSingle();

  const targetRol = target?.rol ?? "user";
  if (targetRol === "super" && actorRole !== "super") {
    return { code: "FORBIDDEN" };
  }
  if (targetRoleInForm === "super" && actorRole !== "super") {
    return { code: "FORBIDDEN" };
  }
  return { ok: true };
}

export async function getProfileById(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getUserUsername(userId: string) {
  const supabaseAdmin = getAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    return "";
  }

  return (
    data.user.user_metadata?.username || data.user.email?.split("@")[0] || ""
  );
}

export async function updateProfile(
  userId: string,
  formData: Partial<ProfileFormValues>,
) {
  const auth = await requireAdminOrSelf(userId);
  if (!auth.ok) return { code: auth.code };

  const isSelf = auth.user.id === userId;

  if (!isSelf) {
    const allowed = await assertCanManageTargetUser(
      auth.role,
      userId,
      formData.rol,
    );
    if ("code" in allowed) return { code: allowed.code };
  }

  const supabase = auth.supabase;
  const supabaseAdmin = getAdminClient();

  const rawData: Record<string, unknown> = {
    nombre: formData.nombre,
    email: formData.email,
    telefono: formData.telefono,
    dpi: formData.dpi,
    nit: formData.nit,
    direccion: formData.direccion,
    fecha_nacimiento: formData.fecha_nacimiento,
    genero: formData.genero,
    contacto_emergencia: formData.contacto_emergencia,
    telefono_emergencia: formData.telefono_emergencia,
  };

  if (!isSelf && formData.rol) {
    rawData.rol = formData.rol;
  }

  const profileData = Object.fromEntries(
    Object.entries(rawData).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const metadataUpdates: Record<string, string> = {};

  if (formData.telefono) metadataUpdates.phone = formData.telefono;
  if (formData.nombre) metadataUpdates.nombre = formData.nombre;
  if (!isSelf && formData.rol) metadataUpdates.rol = formData.rol;

  if (Object.keys(metadataUpdates).length > 0) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: metadataUpdates,
      },
    );

    if (authError) {
      console.error("Error updating auth metadata:", authError);
    }
  }

  return { success: true };
}

export async function updateUserCredentials(
  userId: string,
  username?: string,
  password?: string,
) {
  if (!username && !password) return { success: true };

  const auth = await requireAdminOrSelf(userId);
  if (!auth.ok) return { code: auth.code };

  if (auth.user.id !== userId) {
    const allowed = await assertCanManageTargetUser(auth.role, userId);
    if ("code" in allowed) return { code: allowed.code };
  }

  const supabaseAdmin = getAdminClient();
  const authUpdates: AdminUserAttributes = {};

  if (password) {
    authUpdates.password = password;
  }

  if (username) {
    authUpdates.email = `${username}@app.com`;
    authUpdates.email_confirm = true;
    authUpdates.user_metadata = {
      username: username,
    };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    authUpdates,
  );

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

export async function toggleUserStatus(userId: string, isBanned: boolean) {
  const auth = await requireAdmin();
  if (!auth.ok) return { code: auth.code };

  const allowed = await assertCanManageTargetUser(auth.role, userId);
  if ("code" in allowed) return { code: allowed.code };

  const supabaseAdmin = getAdminClient();

  const banDuration = isBanned ? "876600h" : "none";

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: banDuration,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/farmamuni/admin/usuarios");
  return { success: true };
}
