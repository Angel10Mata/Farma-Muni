import type { CuentaPorCobrar } from "@/components/(base)/finanzas/lib/zod";
import { formatNumeroRecibo } from "@/components/(base)/ventas/lib/helpers";

export const PLAZO_CREDITO_DIAS = 30;

export type EstadoVencimientoCredito = "Vencido" | "Próximo a vencer" | "Al día";

export type LineaCreditoReporte = CuentaPorCobrar & {
  dias_restantes: number;
  estado_vencimiento: EstadoVencimientoCredito;
  fecha_vence_iso: string;
};

export function etiquetaReciboCredito(cuenta: CuentaPorCobrar): string {
  if (cuenta.numero_recibo != null && String(cuenta.numero_recibo).trim()) {
    const n = Number(cuenta.numero_recibo);
    if (!Number.isNaN(n)) {
      const fm = formatNumeroRecibo(n);
      if (fm) return fm;
    }
    return `#${cuenta.numero_recibo}`;
  }
  const id = cuenta.venta_id.replace(/-/g, "").toUpperCase();
  return `${id.substring(0, 3)}-${id.substring(3, 6)}`;
}

export function diasRestantesCredito(fechaVenta: string): number {
  const inicio = new Date(fechaVenta).getTime();
  if (Number.isNaN(inicio)) return PLAZO_CREDITO_DIAS;
  const diasTranscurridos = Math.floor(
    (Date.now() - inicio) / (1000 * 60 * 60 * 24),
  );
  return PLAZO_CREDITO_DIAS - diasTranscurridos;
}

export function estadoVencimientoCredito(
  diasRestantes: number,
): EstadoVencimientoCredito {
  if (diasRestantes < 0) return "Vencido";
  if (diasRestantes <= 7) return "Próximo a vencer";
  return "Al día";
}

export function fechaVenceCredito(fechaVenta: string): Date {
  const base = new Date(fechaVenta);
  if (Number.isNaN(base.getTime())) return new Date();
  const vence = new Date(base);
  vence.setDate(vence.getDate() + PLAZO_CREDITO_DIAS);
  return vence;
}

export function formatFechaCortaGt(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function enriquecerLineasCuentas(
  cuentas: CuentaPorCobrar[],
): LineaCreditoReporte[] {
  return cuentas
    .filter((c) => c.saldo_pendiente > 0)
    .map((c) => {
      const dias = diasRestantesCredito(c.fecha_venta);
      const vence = fechaVenceCredito(c.fecha_venta);
      return {
        ...c,
        dias_restantes: dias,
        estado_vencimiento: estadoVencimientoCredito(dias),
        fecha_vence_iso: vence.toISOString(),
      };
    });
}

export function resumenCuentasPorCobrar(lineas: LineaCreditoReporte[]) {
  const total = lineas.reduce((s, l) => s + l.saldo_pendiente, 0);
  const clientes = new Set(lineas.map((l) => l.cliente_id)).size;
  return {
    total,
    clientes,
    promedio: clientes > 0 ? total / clientes : 0,
  };
}

export function resumenPorEstadoVencimiento(lineas: LineaCreditoReporte[]) {
  let vencidos = 0;
  let proximos = 0;
  let alDia = 0;
  for (const l of lineas) {
    if (l.estado_vencimiento === "Vencido") vencidos += 1;
    else if (l.estado_vencimiento === "Próximo a vencer") proximos += 1;
    else alDia += 1;
  }
  return { vencidos, proximos, alDia };
}
