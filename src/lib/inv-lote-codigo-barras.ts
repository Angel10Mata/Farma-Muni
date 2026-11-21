import type { SupabaseClient } from "@supabase/supabase-js";

const LOTE_DUPLICATE_MSG = "Ya existe un lote con ese código de barras";

export async function detalleCodigoBarrasDuplicado(
  supabase: SupabaseClient,
  codigoBarras: string,
): Promise<string> {
  const codigo = codigoBarras.trim();
  const { data, error } = await supabase
    .from("inv_lotes")
    .select("numero_lote, inv_productos(nombre)")
    .eq("codigo_barras", codigo)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return LOTE_DUPLICATE_MSG;
  }

  const rawProd = data.inv_productos;
  const prod = Array.isArray(rawProd) ? rawProd[0] : rawProd;
  const nombreComercial =
    (prod as { nombre?: string } | null)?.nombre?.trim() || "otro producto";
  const numeroLote = String(data.numero_lote ?? "").trim() || "—";
  return `El código de barras ya pertenece a ${nombreComercial}, lote ${numeroLote}.`;
}
