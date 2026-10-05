import type { SupabaseClient } from "@supabase/supabase-js";
import { patchInvProductoStockActual } from "./helpers";

// Sincronizar existencias del catálogo
export async function syncInvProductoCatalogoDesdeLotes(
  supabase: SupabaseClient,
  productoId: string,
): Promise<void> {
  const { data: lotes, error } = await supabase
    .from("inv_lotes")
    .select("cantidad_actual")
    .eq("producto_id", productoId)
    .eq("activo", true);

  if (error) {
    throw new Error(`Error al sincronizar stock del catálogo: ${error.message}`);
  }

  const stock = (lotes ?? []).reduce(
    (sum, row) => sum + (Number(row.cantidad_actual) || 0),
    0,
  );

  const { error: updError } = await supabase
    .from("inv_productos")
    .update(patchInvProductoStockActual(stock))
    .eq("id", productoId);

  if (updError) {
    throw new Error(`Error al actualizar producto del catálogo: ${updError.message}`);
  }
}

// Reactivar producto al ingresar lote
export async function activarProductoCatalogoPorNuevoLote(
  supabase: SupabaseClient,
  productoId: string,
): Promise<void> {
  await syncInvProductoCatalogoDesdeLotes(supabase, productoId);
  const { error } = await supabase.from("inv_productos").update({ activo: true }).eq("id", productoId);
  if (error) {
    throw new Error(`Error al reactivar producto del catálogo: ${error.message}`);
  }
}
