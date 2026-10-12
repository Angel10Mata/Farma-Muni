import { fechaCalendarioGt, normalizarFechaCalendario } from "@/lib/fechas-gt";

export type LoteAsignadoVenta = {
  lote_id: string;
  cantidad: number;
  stock_lote: number;
  precio_venta: number;
  precio_costo: number;
  codigo_barras: string;
  numero_lote: string | null;
  fecha_vencimiento: string | null;
};

export type LoteVendibleRow = {
  id: string;
  codigo_barras: string;
  numero_lote: string | null;
  cantidad_actual: number;
  precio_costo: number;
  fecha_vencimiento: string | null;
  created_at?: string | null;
  ubicacion?: string | null;
};

export function fechaHoyVentaGt(): string {
  return fechaCalendarioGt();
}

export function loteVendiblePorFecha(
  fechaVencimiento: string | null | undefined,
  hoy = fechaHoyVentaGt(),
): boolean {
  if (!fechaVencimiento) return true;
  const fecha = normalizarFechaCalendario(fechaVencimiento);
  if (!fecha) return true;
  return fecha >= hoy;
}

export function filtrarLotesVendiblesFefo(lotes: LoteVendibleRow[], hoy = fechaHoyVentaGt()) {
  return lotes.filter((l) => loteVendiblePorFecha(l.fecha_vencimiento, hoy));
}

export function asignarCantidadFefo(
  lotes: LoteVendibleRow[],
  cantidad: number,
  precioVentaComercial: number,
): { ok: true; asignaciones: LoteAsignadoVenta[] } | { ok: false; cantidad_disponible: number } {
  let restante = cantidad;
  const asignaciones: LoteAsignadoVenta[] = [];
  const precioVenta = Math.max(0, Number(precioVentaComercial) || 0);

  for (const lote of lotes) {
    if (restante <= 0) break;
    const disp = Number(lote.cantidad_actual) || 0;
    if (disp <= 0) continue;
    const tomar = Math.min(disp, restante);
    asignaciones.push({
      lote_id: lote.id,
      cantidad: tomar,
      stock_lote: disp,
      precio_venta: precioVenta,
      precio_costo: Number(lote.precio_costo) || 0,
      codigo_barras: lote.codigo_barras,
      numero_lote: lote.numero_lote ?? null,
      fecha_vencimiento: lote.fecha_vencimiento ?? null,
    });
    restante -= tomar;
  }

  const asignado = cantidad - restante;
  if (restante > 0) {
    return { ok: false, cantidad_disponible: asignado };
  }
  return { ok: true, asignaciones };
}
