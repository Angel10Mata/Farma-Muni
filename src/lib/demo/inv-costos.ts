import type { InvCostosComercial } from "@/lib/precios";
import { margenPct } from "@/lib/precios";
import { loteVendiblePorFecha } from "@/components/(base)/ventas/lib/lotes-venta";
import { DEMO_COMERCIALES_INVENTARIO, DEMO_LOTES_INVENTARIO } from "./fixtures";

export function demoInvCostosComercial(productoId: string): InvCostosComercial | null {
  const comercial = DEMO_COMERCIALES_INVENTARIO.find((c) => c.producto_id === productoId);
  if (!comercial) return null;

  const lotes = DEMO_LOTES_INVENTARIO.filter(
    (l) =>
      l.producto_id === productoId &&
      l.activo &&
      (Number(l.cantidad_actual) || 0) > 0 &&
      loteVendiblePorFecha(
        l.fecha_vencimiento != null ? String(l.fecha_vencimiento) : null,
      ),
  );

  let existencia = 0;
  let valor = 0;
  let costoMin: number | null = null;
  let costoMax: number | null = null;

  for (const l of lotes) {
    const qty = Number(l.cantidad_actual) || 0;
    const costo = Number(l.precio_costo) || 0;
    existencia += qty;
    valor += qty * costo;
    if (costoMin === null || costo < costoMin) costoMin = costo;
    if (costoMax === null || costo > costoMax) costoMax = costo;
  }

  const costoPromedio =
    existencia > 0 ? Math.round((valor / existencia) * 10000) / 10000 : null;
  const precioVenta = comercial.precio_venta;

  return {
    producto_id: productoId,
    existencia_vendible: existencia,
    costo_promedio: costoPromedio,
    costo_minimo: costoMin,
    costo_maximo: costoMax,
    precio_venta: precioVenta,
    margen_actual_pct:
      costoPromedio != null && costoPromedio > 0
        ? margenPct(precioVenta, costoPromedio)
        : null,
  };
}
