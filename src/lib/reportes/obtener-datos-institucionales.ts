"use server";

import { createClient } from "@/utils/supabase/server";
import {
  datosDesdeAppSettings,
  datosInstitucionalesPorDefecto,
  type DatosInstitucionales,
} from "./identidad";

export async function obtenerDatosInstitucionales(): Promise<DatosInstitucionales> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("farmacia_nombre, farmacia_direccion, farmacia_telefono")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return datosInstitucionalesPorDefecto();
    }
    return datosDesdeAppSettings(data);
  } catch {
    return datosInstitucionalesPorDefecto();
  }
}
