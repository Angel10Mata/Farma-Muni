"use server";

import { createClient } from "@/utils/supabase/server";
import { AppSettingsUpdate } from "./zod";
import { requireAdmin } from "@/lib/auth-guards";
import { modalActionMessage } from "@/components/ui/modal-toast";

// Consultas
export async function getAppSettings(): Promise<AppSettingsUpdate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "id, require_device_authorization, enable_passkeys, farmacia_nombre, farmacia_direccion, farmacia_telefono, dias_credito",
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Mutaciones
export async function updateAppSettings(settings: AppSettingsUpdate): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    throw new Error(
      modalActionMessage(auth.code, "No se pudieron guardar los ajustes."),
    );
  }

  const supabase = auth.supabase;

  if (settings.id) {
    const { error } = await supabase
      .from("app_settings")
      .update({
        require_device_authorization: settings.require_device_authorization,
        enable_passkeys: settings.enable_passkeys,
        farmacia_nombre: settings.farmacia_nombre ?? null,
        farmacia_direccion: settings.farmacia_direccion ?? null,
        farmacia_telefono: settings.farmacia_telefono ?? null,
        dias_credito: settings.dias_credito ?? 30,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("app_settings")
      .insert({
        require_device_authorization: settings.require_device_authorization,
        enable_passkeys: settings.enable_passkeys,
        farmacia_nombre: settings.farmacia_nombre ?? "FarmaMuni",
        farmacia_direccion: settings.farmacia_direccion ?? null,
        farmacia_telefono: settings.farmacia_telefono ?? null,
        dias_credito: settings.dias_credito ?? 30,
      });

    if (error) throw new Error(error.message);
  }
}