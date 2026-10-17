import { fechaCalendarioGt } from "@/lib/fechas-gt";
import {
  CATEGORIA_LABELS,
  type CategoriaEgreso,
  type CategoriaMovimiento,
  type TransaccionFinanciera,
} from "./zod";

const EGRESOS_GRAFICA_COMPRAS_PROVEEDOR: ReadonlySet<CategoriaEgreso> = new Set([
  "compra",
  "pago_proveedor",
]);

export function egresoIncluidoGraficaComprasProveedor(categoria: string): boolean {
  return EGRESOS_GRAFICA_COMPRAS_PROVEEDOR.has(categoria as CategoriaEgreso);
}

export function esIngresoFinanza(tipo: string): boolean {
  return tipo.trim().toLowerCase() === "ingreso";
}

export function montoAbsolutoMovimiento(monto: number): number {
  return Math.abs(Number(monto) || 0);
}

export type SerieDiariaFinanzasPunto = {
  diaIso: string;
  fecha: string;
  ingresos: number;
  egresos: number;
};

export type RangoGraficaFinanzas = {
  desde?: string;
  hasta?: string;
};

export type CategoriaFinanzasPunto = {
  categoria: CategoriaMovimiento;
  etiqueta: string;
  monto: number;
  tipo: "ingreso" | "egreso";
};

function diaIsoDesdeInstante(iso?: string): string | undefined {
  if (!iso) return undefined;
  const parte = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(parte) ? parte : undefined;
}

function acumularMovimientosPorDia(
  movimientos: TransaccionFinanciera[],
): Map<string, { ingresos: number; egresos: number }> {
  const map = new Map<string, { ingresos: number; egresos: number }>();

  for (const mov of movimientos) {
    const dia = fechaCalendarioGt(new Date(mov.created_at));
    let bucket = map.get(dia);
    if (!bucket) {
      bucket = { ingresos: 0, egresos: 0 };
      map.set(dia, bucket);
    }
    const monto = montoAbsolutoMovimiento(mov.monto);
    if (esIngresoFinanza(mov.tipo_movimiento)) {
      bucket.ingresos += monto;
    } else if (egresoIncluidoGraficaComprasProveedor(mov.categoria)) {
      bucket.egresos += monto;
    }
  }

  return map;
}

function etiquetaDiaGrafica(diaIso: string): string {
  const current = new Date(`${diaIso}T00:00:00`);
  return current.toLocaleDateString("es-GT", { month: "short", day: "numeric" });
}

function puntosDesdeMapaOrdenado(
  map: Map<string, { ingresos: number; egresos: number }>,
): SerieDiariaFinanzasPunto[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([diaIso, valores]) => ({
      diaIso,
      fecha: etiquetaDiaGrafica(diaIso),
      ingresos: valores.ingresos,
      egresos: valores.egresos,
    }));
}

function serieDiariaEnRangoCalendario(
  map: Map<string, { ingresos: number; egresos: number }>,
  desdeDia: string,
  hastaDia: string,
): SerieDiariaFinanzasPunto[] {
  const data: SerieDiariaFinanzasPunto[] = [];
  const start = new Date(`${desdeDia}T00:00:00`);
  const end = new Date(`${hastaDia}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return puntosDesdeMapaOrdenado(map);
  }

  const current = new Date(start);
  let daysCount = 0;
  while (current <= end && daysCount < 366) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    const diaIso = `${y}-${m}-${d}`;
    const valores = map.get(diaIso) ?? { ingresos: 0, egresos: 0 };
    data.push({
      diaIso,
      fecha: etiquetaDiaGrafica(diaIso),
      ingresos: valores.ingresos,
      egresos: valores.egresos,
    });
    current.setDate(current.getDate() + 1);
    daysCount += 1;
  }

  return data;
}

export function serieDiariaFinanzas(
  movimientos: TransaccionFinanciera[],
  rango?: RangoGraficaFinanzas,
): SerieDiariaFinanzasPunto[] {
  const map = acumularMovimientosPorDia(movimientos);
  const desdeDia = diaIsoDesdeInstante(rango?.desde);
  const hastaDia = diaIsoDesdeInstante(rango?.hasta);

  if (desdeDia && hastaDia) {
    return serieDiariaEnRangoCalendario(map, desdeDia, hastaDia);
  }

  return puntosDesdeMapaOrdenado(map);
}

export function totalesPorCategoriaFinanzas(
  movimientos: TransaccionFinanciera[],
): CategoriaFinanzasPunto[] {
  const map = new Map<string, CategoriaFinanzasPunto>();

  for (const mov of movimientos) {
    if (
      !esIngresoFinanza(mov.tipo_movimiento) &&
      !egresoIncluidoGraficaComprasProveedor(mov.categoria)
    ) {
      continue;
    }
    const cat = mov.categoria as CategoriaMovimiento;
    const key = `${mov.tipo_movimiento}:${cat}`;
    const prev = map.get(key);
    const monto = montoAbsolutoMovimiento(mov.monto);
    if (prev) {
      prev.monto += monto;
    } else {
      map.set(key, {
        categoria: cat,
        etiqueta: CATEGORIA_LABELS[cat] ?? cat,
        monto,
        tipo: esIngresoFinanza(mov.tipo_movimiento) ? "ingreso" : "egreso",
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.monto - a.monto);
}
