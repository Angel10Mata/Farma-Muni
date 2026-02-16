"use server";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { authSchema } from "./schemas";

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

export async function signup(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
          username: ["Usuario ya está registrado, por favor eliga otro"],
        },
      };
    }
    return { message: error.message };
  }

  if (data.user) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: data.user.id,
        nombre: name,
        rol: rol,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return {
        message: "Error al crear perfil de usuario: " + profileError.message,
      };
    }
  }

  return { success: true };
}
