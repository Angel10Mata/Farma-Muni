import type { SupabaseClient } from "@supabase/supabase-js";
import {
  contarLotesPorCategoriaVencimiento,
  esLoteActivoConExistencia,
  lotesPorVencerEn30Dias,
  valorCostoLotesCategoria,
  type ConteoVencimientoLotes,
  type LoteVencimientoCampos,
} from "@/lib/vencimientos-gt";

export type ResumenLotesVencimiento = {
  conteo: ConteoVencimientoLotes;
  valorCosto30Dias: number;
  lotesPorVencer30: number;
};

export async function obtenerResumenLotesVencimiento(
  supabase: SupabaseClient,
): Promise<ResumenLotesVencimiento> {
  const { data, error } = await supabase
    .from("inv_lotes")
    .select("activo, cantidad_actual, fecha_vencimiento, precio_costo");

  if (error) {
    throw error;
  }

  const lotes: LoteVencimientoCampos[] = (data ?? [])
    .map((row) => ({
      activo: Boolean(row.activo),
      cantidad_actual: Number(row.cantidad_actual) || 0,
      fecha_vencimiento: (row.fecha_vencimiento as string | null) ?? null,
      precio_costo: row.precio_costo != null ? Number(row.precio_costo) : 0,
    }))
    .filter(esLoteActivoConExistencia);

  return {
    conteo: contarLotesPorCategoriaVencimiento(lotes),
    valorCosto30Dias: valorCostoLotesCategoria(lotes, "dias_0_30"),
    lotesPorVencer30: lotesPorVencerEn30Dias(lotes),
  };
}
