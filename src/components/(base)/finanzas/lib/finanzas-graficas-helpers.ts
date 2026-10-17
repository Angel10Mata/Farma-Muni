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
  fecha: string;
  etiqueta: string;
  ingresos: number;
  egresos: number;
};

export type CategoriaFinanzasPunto = {
  categoria: CategoriaMovimiento;
  etiqueta: string;
  monto: number;
  tipo: "ingreso" | "egreso";
};

function etiquetaDiaCorta(isoFecha: string): string {
  const [y, m, d] = isoFecha.split("-");
  return `${d}/${m}`;
}

export function serieDiariaFinanzas(movimientos: TransaccionFinanciera[]): SerieDiariaFinanzasPunto[] {
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

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, valores]) => ({
      fecha,
      etiqueta: etiquetaDiaCorta(fecha),
      ingresos: valores.ingresos,
      egresos: valores.egresos,
    }));
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
