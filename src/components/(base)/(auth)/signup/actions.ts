"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { authSchema } from "./lib/zod";
import { mensajeErrorEs } from "@/lib/supabase-errors-es";

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
  if (rol !== "admin" && rol !== "super") {
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

    const { name, username, password, rol } = validated.data;

    if (rol === "super" && creador.rol !== "super") {
      return {
        errors: { rol: ["Solo un Super Admin puede asignar el rol Super Admin."] },
      };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      return {
        message:
          "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor. No se puede crear usuarios hasta configurarla.",
      };
    }

    const fakeEmail = `${username}@app.com`;

    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        name,
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
        .insert({
          id: data.user.id,
          nombre: name,
          rol: rol,
          email: fakeEmail,
        });

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
    const raw =
      err instanceof Error ? err.message : "Error desconocido";
    return { message: mensajeErrorEs(raw) };
  }
}
