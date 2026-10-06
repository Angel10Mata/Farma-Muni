import { DEMO_VENTAS_HISTORIAL, DEMO_VENTA_DETALLE } from "@/lib/demo/fixtures";
import { ventaEstaAnulada, ventaPerteneceMesCalendarioGt } from "./helpers";
import { construirReporteVentasMes } from "./reporte-ventas-mes";

export function construirReporteVentasMesDemo(year: number, month: number) {
  const ventas = DEMO_VENTAS_HISTORIAL.filter((v) =>
    ventaPerteneceMesCalendarioGt(v.created_at, year, month),
  );

  const anulacionesPorVentaId: Record<string, { autor: string; motivo: string }> =
    {};
  for (const v of ventas) {
    if (ventaEstaAnulada(v)) {
      anulacionesPorVentaId[v.id] = {
        autor: "Admin Sistema",
        motivo: "Corrección de facturación (demo)",
      };
    }
  }

  const activasIds = new Set(
    ventas.filter((v) => !ventaEstaAnulada(v)).map((v) => v.id),
  );
  const detalles = DEMO_VENTA_DETALLE.filter((d) => activasIds.has(d.venta_id));

  return construirReporteVentasMes(
    ventas,
    anulacionesPorVentaId,
    detalles,
    year,
    month,
  );
}
