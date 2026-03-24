"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  message: string | null;
  errorType: "invalid" | "connection" | null;
  fields?: {
    email?: string;
    password?: string;
  };
} | null;

export async function login(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      message:
        error.status === 400 ? "Credenciales inválidas" : "Error de conexión",
      errorType: error.status === 400 ? "invalid" : "connection",
      fields: {
        email,
        password,
      },
    };
  }

  redirect("/kore");
}
