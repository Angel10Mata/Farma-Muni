"use server";

import { createClient } from "@/utils/supabase/server";
import { AppSettingsUpdate, type MargenesPrecio } from "./zod";
import { requireSuper } from "@/lib/auth-guards";
import { modalActionMessage } from "@/components/ui/modal-toast";

// Consultas
export async function getAppSettings(): Promise<AppSettingsUpdate | null> {
  const auth = await requireSuper();
  if (!auth.ok) {
    throw new Error(
      modalActionMessage(auth.code, "No tienes permiso para ver la configuración."),
    );
  }
  const supabase = auth.supabase;
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "id, require_device_authorization, enable_passkeys, farmacia_nombre, farmacia_direccion, farmacia_telefono, dias_credito, margen_ganancia_pct, margen_minimo_pct",
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    ...data,
    margen_ganancia_pct: Number(data.margen_ganancia_pct) || 30,
    margen_minimo_pct: Number(data.margen_minimo_pct) || 10,
  };
}

export async function getMargenesPrecio(): Promise<MargenesPrecio> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { margen_ganancia_pct: 30, margen_minimo_pct: 10 };
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("margen_ganancia_pct, margen_minimo_pct")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { margen_ganancia_pct: 30, margen_minimo_pct: 10 };
  }

  return {
    margen_ganancia_pct: Number(data.margen_ganancia_pct) || 30,
    margen_minimo_pct: Number(data.margen_minimo_pct) || 10,
  };
}

// Mutaciones
export async function updateAppSettings(settings: AppSettingsUpdate): Promise<void> {
  const auth = await requireSuper();
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
        margen_ganancia_pct: settings.margen_ganancia_pct ?? 30,
        margen_minimo_pct: settings.margen_minimo_pct ?? 10,
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
        margen_ganancia_pct: settings.margen_ganancia_pct ?? 30,
        margen_minimo_pct: settings.margen_minimo_pct ?? 10,
      });

    if (error) throw new Error(error.message);
  }
}