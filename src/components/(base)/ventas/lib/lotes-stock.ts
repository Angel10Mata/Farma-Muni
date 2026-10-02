import type { SupabaseClient } from "@supabase/supabase-js";

export async function obtenerCostoProductoOLote(
  supabase: SupabaseClient,
  productoId: string,
  loteId?: string | null,
): Promise<number> {
  if (loteId) {
    const { data: lote } = await supabase
      .from("inv_lotes")
      .select("precio_costo")
      .eq("id", loteId)
      .maybeSingle();
    if (lote) return Math.max(0, Number(lote.precio_costo) || 0);
  }
  const { data: loteFallback } = await supabase
    .from("inv_lotes")
    .select("precio_costo")
    .eq("producto_id", productoId)
    .eq("activo", true)
    .gt("cantidad_actual", 0)
    .order("fecha_vencimiento", { ascending: true })
    .limit(1)
    .maybeSingle();
  return Math.max(0, Number(loteFallback?.precio_costo) || 0);
}

export async function ajustarStockPorVenta(
  supabase: SupabaseClient,
  params: {
    producto_id: string;
    lote_id?: string | null;
    delta: number;
  },
): Promise<void> {
  if (params.lote_id) {
    const { data: lote, error: findError } = await supabase
      .from("inv_lotes")
      .select("cantidad_actual, producto_id")
      .eq("id", params.lote_id)
      .single();

    if (findError || !lote) {
      throw new Error("Lote no encontrado para actualizar stock.");
    }
    if (lote.producto_id !== params.producto_id) {
      throw new Error("El lote no corresponde al producto de la venta.");
    }

    const actual = Number(lote.cantidad_actual) || 0;
    const nuevo = actual + params.delta;
    if (nuevo < 0) {
      throw new Error("Stock insuficiente en el lote seleccionado.");
    }

    const { error: updateError } = await supabase
      .from("inv_lotes")
      .update({ cantidad_actual: nuevo })
      .eq("id", params.lote_id);

    if (updateError) {
      throw new Error(`Error al actualizar stock del lote: ${updateError.message}`);
    }
    return;
  }

  const { data: prod, error: prodError } = await supabase
    .from("inv_productos")
    .select("stock_actual")
    .eq("id", params.producto_id)
    .single();

  if (prodError || !prod) {
    throw new Error("Producto no encontrado para actualizar stock.");
  }

  const nuevoStock = (Number(prod.stock_actual) || 0) + params.delta;
  if (nuevoStock < 0) {
    throw new Error("Stock insuficiente del producto.");
  }

  const { error: stockError } = await supabase
    .from("inv_productos")
    .update({ stock_actual: nuevoStock })
    .eq("id", params.producto_id);

  if (stockError) {
    throw new Error(`Error al actualizar stock: ${stockError.message}`);
  }
}
