import type { Compra } from "./zod";
import { fechaCalendarioGt } from "@/lib/fechas-gt";

export const FACTURA_DUPLICATE_MSG =
  "Esa factura ya fue registrada para este proveedor.";

export function esEstadoCompraPagado(estado: string | null | undefined): boolean {
  return (estado ?? "").trim().toLowerCase() === "pagado";
}

const CATEGORIAS_PAGO_COMPRA = new Set(["pago_proveedor", "compra"]);

export function totalPagadoCompra(
  finTransacciones: unknown[] | null | undefined,
): number {
  return (
    finTransacciones
      ?.filter(
        (t): t is { categoria?: string; monto?: number } =>
          typeof t === "object" && t !== null,
      )
      .filter((t) => CATEGORIAS_PAGO_COMPRA.has(t.categoria ?? ""))
      .reduce((sum, t) => sum + Number(t.monto ?? 0), 0) ?? 0
  );
}

export function saldoPendienteCompra(compra: {
  total: number;
  fin_transacciones?: unknown[] | null;
}): number {
  const pagado = totalPagadoCompra(compra.fin_transacciones);
  return Math.max(0, (Number(compra.total) || 0) - pagado);
}

export function compraEstaPagada(compra: Compra): boolean {
  const saldo = saldoPendienteCompra(compra);
  return saldo <= 0.009 || esEstadoCompraPagado(compra.estado_pago);
}

export function compraPagoVencido(
  compra: {
    fecha_vencimiento_pago?: string | null;
    total: number;
    fin_transacciones?: unknown[] | null;
    estado_pago?: string | null;
  },
  hoy?: string,
): boolean {
  if (compraEstaPagada(compra as Compra)) return false;
  const vence = compra.fecha_vencimiento_pago?.trim();
  if (!vence) return false;
  const hoyGt = hoy ?? fechaCalendarioGt();
  return vence < hoyGt;
}

export function formatearFechaCompraGt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function resumenCuentasPorPagarDesdeCompras(compras: Compra[]) {
  let totalPendiente = 0;
  let totalVencido = 0;
  const hoy = fechaCalendarioGt();

  for (const c of compras) {
    const saldo = saldoPendienteCompra(c);
    if (saldo <= 0.009) continue;
    totalPendiente += saldo;
    if (compraPagoVencido(c, hoy)) {
      totalVencido += saldo;
    }
  }

  return { totalPendiente, totalVencido };
}

export function resumenCuentasPorPagarDesdeRpc(
  cuentas: {
    saldo_pendiente: number;
    fecha_vencimiento_pago?: string | null;
  }[],
) {
  let totalPendiente = 0;
  let totalVencido = 0;
  const hoy = fechaCalendarioGt();

  for (const c of cuentas) {
    const saldo = Number(c.saldo_pendiente) || 0;
    if (saldo <= 0.009) continue;
    totalPendiente += saldo;
    const vence = c.fecha_vencimiento_pago?.trim();
    if (vence && vence < hoy) {
      totalVencido += saldo;
    }
  }

  return { totalPendiente, totalVencido };
}
