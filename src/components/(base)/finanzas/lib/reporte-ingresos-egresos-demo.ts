import { DEMO_FINANZAS_MOVIMIENTOS } from "@/lib/demo/fixtures";
import type { TransaccionFinanciera } from "./zod";
import {
  calcularRangoPeriodoAnterior,
  construirReporteIngresosEgresos,
  normalizarTipoMovimientoFinanza,
  type ReferenciasFinanzas,
  type ReporteIngresosEgresos,
} from "./reporte-ingresos-egresos";

function enRango(iso: string, desde: string, hasta: string): boolean {
  const t = new Date(iso).getTime();
  const d0 = new Date(desde).getTime();
  const d1 = new Date(hasta).getTime();
  return t >= d0 && t <= d1;
}

function filtrarDemo(
  movimientos: readonly TransaccionFinanciera[],
  desde: string,
  hasta: string,
): TransaccionFinanciera[] {
  return movimientos
    .filter((m) => enRango(m.created_at, desde, hasta))
    .map((m) => ({
      ...m,
      tipo_movimiento: normalizarTipoMovimientoFinanza(m.tipo_movimiento),
    }));
}

function referenciasDemo(
  movimientos: readonly TransaccionFinanciera[],
): ReferenciasFinanzas {
  const recibosPorVenta = new Map<string, string>();
  const facturasPorCompra = new Map<string, string>();
  let recibo = 1200;
  let factura = 1000;
  for (const mov of movimientos) {
    if (mov.venta_id && !recibosPorVenta.has(mov.venta_id)) {
      recibosPorVenta.set(mov.venta_id, `R-2026-${recibo}`);
      recibo += 1;
    }
    if (mov.compra_id && !facturasPorCompra.has(mov.compra_id)) {
      facturasPorCompra.set(mov.compra_id, `FAC-${factura}`);
      factura += 1;
    }
  }
  return { recibosPorVenta, facturasPorCompra };
}

export function construirReporteIngresosEgresosDemo(
  desde: string,
  hasta: string,
  generadoPor: string,
): ReporteIngresosEgresos {
  const anterior = calcularRangoPeriodoAnterior(desde, hasta);
  const movActual = filtrarDemo(DEMO_FINANZAS_MOVIMIENTOS, desde, hasta);
  const movAnterior =
    anterior
      ? filtrarDemo(DEMO_FINANZAS_MOVIMIENTOS, anterior.desde, anterior.hasta)
      : [];

  const refs = referenciasDemo([...movActual, ...movAnterior]);

  return construirReporteIngresosEgresos({
    movimientos: movActual,
    movimientosAnterior: movAnterior,
    desde,
    hasta,
    desdeAnterior: anterior?.desde ?? desde,
    hastaAnterior: anterior?.hasta ?? hasta,
    referencias: refs,
    generadoPor,
  });
}
