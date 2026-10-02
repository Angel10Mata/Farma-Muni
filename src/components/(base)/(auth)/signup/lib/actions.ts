"use server";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { authSchema, INITIAL_USER_PASSWORD } from "./zod";
import { mensajeErrorEs } from "@/lib/supabase-errors-es";
import { mensajeSiServiceRoleKeyInvalida } from "@/lib/supabase-service-role-env";
import { canAssignRole, canCreateUsers } from "@/components/(base)/(users)/usuarios/lib/permissions";

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

export type ActionState = {
  success?: boolean;
  message?: string;
  errors?: {
    [key: string]: string[];
  };
} | null;

async function obtenerRolCreador(): Promise<
  { ok: true; rol: string } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Debes iniciar sesión para crear usuarios." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  const rol = profile?.rol ?? user.user_metadata?.rol ?? "user";
  if (!canCreateUsers(rol)) {
    return {
      ok: false,
      message: "No tienes permiso para crear usuarios.",
    };
  }
  return { ok: true, rol };
}

export async function signup(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const creador = await obtenerRolCreador();
    if (!creador.ok) {
      return { message: creador.message };
    }

    const rawData = {
      name: formData.get("name"),
      username: formData.get("username"),
      password: formData.get("password"),
      rol: formData.get("rol"),
    };

    const validated = authSchema.safeParse(rawData);

    if (!validated.success) {
      return {
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { name, username, rol } = validated.data;
    const password = INITIAL_USER_PASSWORD;

    if (!canAssignRole(creador.rol, rol)) {
      return {
        errors: {
          rol: ["No tienes permisos para asignar este rol."],
        },
      };
    }

    const serviceKeyError = mensajeSiServiceRoleKeyInvalida();
    if (serviceKeyError) {
      return { message: serviceKeyError };
    }

    const fakeEmail = `${username}@app.com`;

    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        nombre: name,
        username,
        rol,
      },
    });

    if (error) {
      if (error.message.includes("already registered") || error.status === 422) {
        return {
          errors: {
            username: ["Usuario ya está registrado, por favor elige otro."],
          },
        };
      }
      return { message: mensajeErrorEs(error.message) };
    }

    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            nombre: name,
            rol,
            email: fakeEmail,
          },
          { onConflict: "id" },
        );

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        return {
          message:
            "Error al crear perfil de usuario: " +
            mensajeErrorEs(profileError.message),
        };
      }
    }

    revalidatePath("/farmamuni/admin/usuarios");

    return { success: true };
  } catch (err: unknown) {
    console.error("Signup error:", err);
    const raw = err instanceof Error ? err.message : "Error desconocido";
    return { message: mensajeErrorEs(raw) };
  }
}
