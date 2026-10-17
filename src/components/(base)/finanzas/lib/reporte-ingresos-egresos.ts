import {
  formatFechaCalendarioGt,
  formatFechaHoraTablaCompactGt,
  normalizarFechaCalendario,
} from "@/lib/fechas-gt";
import {
  esIngresoFinanza,
  montoAbsolutoMovimiento,
} from "./finanzas-graficas-helpers";
import {
  CATEGORIA_LABELS,
  CATEGORIAS_EGRESO,
  CATEGORIAS_INGRESO,
  type CategoriaMovimiento,
  type TipoMovimiento,
  type TransaccionFinanciera,
} from "./zod";

export type ResumenPeriodoFinanzas = {
  totalIngresos: number;
  totalEgresos: number;
  resultado: number;
};

export type CambioPeriodoFinanzas = {
  monto: number;
  porcentaje: number | null;
};

export type ComparacionPeriodosFinanzas = {
  actual: ResumenPeriodoFinanzas;
  anterior: ResumenPeriodoFinanzas;
  cambioIngresos: CambioPeriodoFinanzas;
  cambioEgresos: CambioPeriodoFinanzas;
  cambioResultado: CambioPeriodoFinanzas;
};

export type FilaCategoriaInforme = {
  categoria: CategoriaMovimiento;
  etiqueta: string;
  monto: number;
};

export type FilaDetalleInforme = {
  fechaIso: string;
  fecha: string;
  tipo: string;
  tipoClave: TipoMovimiento;
  categoria: string;
  descripcion: string;
  referencia: string;
  monto: number;
};

export type ReporteIngresosEgresos = {
  periodoLabel: string;
  periodoAnteriorLabel: string;
  desde: string;
  hasta: string;
  resumen: ResumenPeriodoFinanzas;
  comparacion: ComparacionPeriodosFinanzas;
  ingresosPorCategoria: FilaCategoriaInforme[];
  egresosPorCategoria: FilaCategoriaInforme[];
  detalle: FilaDetalleInforme[];
  generadoPor: string;
};

export type ReferenciasFinanzas = {
  recibosPorVenta: ReadonlyMap<string, string>;
  facturasPorCompra: ReadonlyMap<string, string>;
};

export function normalizarTipoMovimientoFinanza(tipo: string): TipoMovimiento {
  const t = tipo.trim().toLowerCase();
  return t === "ingreso" ? "ingreso" : "egreso";
}

export function etiquetaPeriodoInformeFinanzas(desde: string, hasta: string): string {
  const d0 = normalizarFechaCalendario(desde);
  const d1 = normalizarFechaCalendario(hasta);
  if (!d0 || !d1) return "Período seleccionado";
  if (d0 === d1) return formatFechaCalendarioGt(d0);
  return `${formatFechaCalendarioGt(d0)} – ${formatFechaCalendarioGt(d1)}`;
}

export function calcularRangoPeriodoAnterior(
  desde: string,
  hasta: string,
): { desde: string; hasta: string } | null {
  const t0 = new Date(desde).getTime();
  const t1 = new Date(hasta).getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 < t0) return null;
  const duracion = t1 - t0;
  const hastaAnterior = t0 - 1;
  const desdeAnterior = hastaAnterior - duracion;
  return {
    desde: new Date(desdeAnterior).toISOString(),
    hasta: new Date(hastaAnterior).toISOString(),
  };
}

function cambioEntrePeriodos(actual: number, anterior: number): CambioPeriodoFinanzas {
  const monto = actual - anterior;
  if (anterior === 0) {
    return { monto, porcentaje: actual === 0 ? 0 : null };
  }
  return { monto, porcentaje: (monto / anterior) * 100 };
}

export function resumenDesdeMovimientos(
  movimientos: readonly TransaccionFinanciera[],
): ResumenPeriodoFinanzas {
  let totalIngresos = 0;
  let totalEgresos = 0;
  for (const mov of movimientos) {
    const monto = montoAbsolutoMovimiento(mov.monto);
    if (esIngresoFinanza(mov.tipo_movimiento)) {
      totalIngresos += monto;
    } else {
      totalEgresos += monto;
    }
  }
  return {
    totalIngresos,
    totalEgresos,
    resultado: totalIngresos - totalEgresos,
  };
}

function acumularPorCategorias<T extends string>(
  movimientos: readonly TransaccionFinanciera[],
  categorias: readonly T[],
  tipo: TipoMovimiento,
): FilaCategoriaInforme[] {
  const map = new Map<T, number>();
  for (const cat of categorias) {
    map.set(cat, 0);
  }
  for (const mov of movimientos) {
    if (normalizarTipoMovimientoFinanza(mov.tipo_movimiento) !== tipo) continue;
    const cat = mov.categoria as T;
    if (!map.has(cat)) continue;
    map.set(cat, (map.get(cat) ?? 0) + montoAbsolutoMovimiento(mov.monto));
  }
  return categorias.map((cat) => ({
    categoria: cat as CategoriaMovimiento,
    etiqueta: CATEGORIA_LABELS[cat as CategoriaMovimiento],
    monto: map.get(cat) ?? 0,
  }));
}

function referenciaMovimiento(
  mov: TransaccionFinanciera,
  refs: ReferenciasFinanzas,
): string {
  if (mov.venta_id) {
    const recibo = refs.recibosPorVenta.get(mov.venta_id);
    if (recibo) return recibo;
  }
  if (mov.compra_id) {
    const factura = refs.facturasPorCompra.get(mov.compra_id);
    if (factura) return factura;
  }
  return "—";
}

export function construirReporteIngresosEgresos(input: {
  movimientos: readonly TransaccionFinanciera[];
  movimientosAnterior: readonly TransaccionFinanciera[];
  desde: string;
  hasta: string;
  desdeAnterior: string;
  hastaAnterior: string;
  referencias: ReferenciasFinanzas;
  generadoPor: string;
}): ReporteIngresosEgresos {
  const normalizados = input.movimientos.map((m) => ({
    ...m,
    tipo_movimiento: normalizarTipoMovimientoFinanza(m.tipo_movimiento),
  }));
  const normalizadosAnterior = input.movimientosAnterior.map((m) => ({
    ...m,
    tipo_movimiento: normalizarTipoMovimientoFinanza(m.tipo_movimiento),
  }));

  const resumen = resumenDesdeMovimientos(normalizados);
  const resumenAnterior = resumenDesdeMovimientos(normalizadosAnterior);

  const detalle = [...normalizados]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .map((mov) => {
      const tipoClave = mov.tipo_movimiento;
      const cat = mov.categoria as CategoriaMovimiento;
      return {
        fechaIso: mov.created_at,
        fecha: formatFechaHoraTablaCompactGt(mov.created_at),
        tipo: tipoClave === "ingreso" ? "Ingreso" : "Egreso",
        tipoClave,
        categoria: CATEGORIA_LABELS[cat] ?? mov.categoria,
        descripcion: mov.descripcion,
        referencia: referenciaMovimiento(mov, input.referencias),
        monto: montoAbsolutoMovimiento(mov.monto),
      };
    });

  return {
    periodoLabel: etiquetaPeriodoInformeFinanzas(input.desde, input.hasta),
    periodoAnteriorLabel: etiquetaPeriodoInformeFinanzas(
      input.desdeAnterior,
      input.hastaAnterior,
    ),
    desde: input.desde,
    hasta: input.hasta,
    resumen,
    comparacion: {
      actual: resumen,
      anterior: resumenAnterior,
      cambioIngresos: cambioEntrePeriodos(
        resumen.totalIngresos,
        resumenAnterior.totalIngresos,
      ),
      cambioEgresos: cambioEntrePeriodos(
        resumen.totalEgresos,
        resumenAnterior.totalEgresos,
      ),
      cambioResultado: cambioEntrePeriodos(
        resumen.resultado,
        resumenAnterior.resultado,
      ),
    },
    ingresosPorCategoria: acumularPorCategorias(
      normalizados,
      CATEGORIAS_INGRESO,
      "ingreso",
    ),
    egresosPorCategoria: acumularPorCategorias(
      normalizados,
      CATEGORIAS_EGRESO,
      "egreso",
    ),
    detalle,
    generadoPor: input.generadoPor,
  };
}

export function formatearCambioPorcentaje(porcentaje: number | null): string {
  if (porcentaje === null) return "N/D";
  const signo = porcentaje > 0 ? "+" : "";
  return `${signo}${porcentaje.toFixed(1)}%`;
}
