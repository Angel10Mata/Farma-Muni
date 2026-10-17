import type { CuentaPorCobrar } from "@/components/(base)/finanzas/lib/zod";
import {
  codigoReciboVenta,
  formatNumeroRecibo,
} from "@/components/(base)/ventas/lib/helpers";
import type { VentaCreditoDetalle } from "./zod";
import {
  fechaCalendarioGt,
  normalizarFechaCalendario,
} from "@/lib/fechas-gt";
import { diasRestantesVencimientoGt } from "@/lib/vencimientos-gt";

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

export function fechaVenceCreditoDesdeVenta(
  fechaVenta: string,
  fechaVencimientoGuardada?: string | null,
): string {
  const guardada = normalizarFechaCalendario(fechaVencimientoGuardada);
  if (guardada) return guardada;
  const base =
    normalizarFechaCalendario(fechaVenta) ||
    fechaCalendarioGt(new Date(fechaVenta));
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + PLAZO_CREDITO_DIAS);
  return fechaCalendarioGt(d);
}

export function diasRestantesCredito(
  fechaVenta: string,
  fechaVencimiento?: string | null,
): number {
  const vence = fechaVenceCreditoDesdeVenta(fechaVenta, fechaVencimiento);
  return diasRestantesVencimientoGt(vence) ?? PLAZO_CREDITO_DIAS;
}

export function estadoVencimientoCredito(
  diasRestantes: number,
): EstadoVencimientoCredito {
  if (diasRestantes < 0) return "Vencido";
  if (diasRestantes <= 7) return "Próximo a vencer";
  return "Al día";
}

export function fechaVenceCredito(
  fechaVenta: string,
  fechaVencimiento?: string | null,
): Date {
  const iso = fechaVenceCreditoDesdeVenta(fechaVenta, fechaVencimiento);
  return new Date(`${iso}T12:00:00`);
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
      const dias =
        typeof c.dias_restantes === "number"
          ? c.dias_restantes
          : diasRestantesCredito(
              c.fecha_venta,
              c.fecha_vencimiento_credito,
            );
      const vence = fechaVenceCredito(
        c.fecha_venta,
        c.fecha_vencimiento_credito,
      );
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

export type FilaCxcPorCliente = {
  cliente_id: string;
  cliente_nombre: string;
  total_credito: number;
  abonado: number;
  saldo: number;
  venta_mas_antigua: string | null;
  antiguedad_dias: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_mas_90: number;
  credito_vencido: boolean;
};

function diasAntiguedadSaldo(
  fechaVenta: string,
  fechaVencimiento?: string | null,
): number {
  const hoy = fechaCalendarioGt();
  const vence =
    normalizarFechaCalendario(fechaVencimiento) ||
    fechaVenceCreditoDesdeVenta(fechaVenta, fechaVencimiento);
  const restantes = diasRestantesVencimientoGt(vence, hoy);
  if (restantes === null) return 0;
  return restantes < 0 ? Math.abs(restantes) : 0;
}

function asignarBucket(diasVencido: number, monto: number, fila: FilaCxcPorCliente) {
  if (diasVencido <= 30) fila.bucket_0_30 += monto;
  else if (diasVencido <= 60) fila.bucket_31_60 += monto;
  else if (diasVencido <= 90) fila.bucket_61_90 += monto;
  else fila.bucket_mas_90 += monto;
}

export function agruparCuentasPorClienteReporte(
  cuentas: CuentaPorCobrar[],
): FilaCxcPorCliente[] {
  const map = new Map<string, FilaCxcPorCliente>();

  for (const c of cuentas) {
    if (c.saldo_pendiente <= 0) continue;

    let fila = map.get(c.cliente_id);
    if (!fila) {
      fila = {
        cliente_id: c.cliente_id,
        cliente_nombre: c.cliente_nombre,
        total_credito: 0,
        abonado: 0,
        saldo: 0,
        venta_mas_antigua: null,
        antiguedad_dias: 0,
        bucket_0_30: 0,
        bucket_31_60: 0,
        bucket_61_90: 0,
        bucket_mas_90: 0,
        credito_vencido: false,
      };
      map.set(c.cliente_id, fila);
    }

    fila.total_credito += c.total;
    fila.abonado += c.total_cobrado;
    fila.saldo += c.saldo_pendiente;

    const fechaVenta = c.fecha_venta;
    if (
      !fila.venta_mas_antigua ||
      new Date(fechaVenta).getTime() <
        new Date(fila.venta_mas_antigua).getTime()
    ) {
      fila.venta_mas_antigua = fechaVenta;
    }

    const dias =
      typeof c.dias_restantes === "number"
        ? c.dias_restantes
        : diasRestantesCredito(c.fecha_venta, c.fecha_vencimiento_credito);
    if (dias < 0) fila.credito_vencido = true;

    const antiguedad = diasAntiguedadSaldo(
      c.fecha_venta,
      c.fecha_vencimiento_credito,
    );
    if (antiguedad > fila.antiguedad_dias) {
      fila.antiguedad_dias = antiguedad;
    }
    asignarBucket(antiguedad, c.saldo_pendiente, fila);
  }

  return [...map.values()].sort((a, b) =>
    a.cliente_nombre.localeCompare(b.cliente_nombre),
  );
}

export type MovimientoEstadoCuenta = {
  instante: number;
  fecha: string;
  recibo: string;
  descripcion: string;
  cargo: number | null;
  abono: number | null;
  saldo: number;
};

export function etiquetaNitCliente(nit: string | null | undefined): string {
  const t = nit?.trim();
  if (!t || t.toLowerCase() === "null") return "C/F";
  return t;
}

export function construirMovimientosEstadoCuenta(
  ventas: VentaCreditoDetalle[],
): MovimientoEstadoCuenta[] {
  type Pendiente = {
    instante: number;
    fecha: string;
    recibo: string;
    descripcion: string;
    cargo: number;
    abono: number;
  };

  const pendientes: Pendiente[] = [];

  for (const v of ventas) {
    const recibo = codigoReciboVenta({
      id: v.id,
      numero_recibo: v.numero_recibo ?? null,
    });
    pendientes.push({
      instante: new Date(v.created_at).getTime(),
      fecha: v.created_at,
      recibo,
      descripcion: `Venta a crédito ${recibo}`,
      cargo: v.total ?? 0,
      abono: 0,
    });

    const abonos =
      v.fin_transacciones?.filter(
        (t) => t.categoria === "abono_cliente" || t.categoria === "venta",
      ) ?? [];

    for (const a of abonos) {
      pendientes.push({
        instante: new Date(a.fecha_movimiento).getTime(),
        fecha: a.fecha_movimiento,
        recibo,
        descripcion:
          a.categoria === "venta"
            ? `Abono / cobro ${recibo}`
            : `Abono ${recibo}`,
        cargo: 0,
        abono: Number(a.monto),
      });
    }
  }

  pendientes.sort((a, b) => a.instante - b.instante);

  let saldo = 0;
  const movimientos: MovimientoEstadoCuenta[] = [];

  for (const m of pendientes) {
    saldo += m.cargo - m.abono;
    movimientos.push({
      instante: m.instante,
      fecha: m.fecha,
      recibo: m.recibo,
      descripcion: m.descripcion,
      cargo: m.cargo > 0 ? m.cargo : null,
      abono: m.abono > 0 ? m.abono : null,
      saldo,
    });
  }

  return movimientos;
}

export function fechaSaldoVencidoDesde(
  ventas: VentaCreditoDetalle[],
): string | null {
  const hoy = fechaCalendarioGt();
  let masAntigua: string | null = null;

  for (const v of ventas) {
    const abonos =
      v.fin_transacciones?.filter(
        (t) => t.categoria === "abono_cliente" || t.categoria === "venta",
      ) ?? [];
    const totalAbonado = abonos.reduce((s, t) => s + Number(t.monto), 0);
    const saldoVenta = (v.total ?? 0) - totalAbonado;
    if (saldoVenta <= 0.009) continue;

    const vence = fechaVenceCreditoDesdeVenta(
      v.created_at,
      v.fecha_credito_vencimiento,
    );
    const restantes = diasRestantesVencimientoGt(vence, hoy);
    if (restantes !== null && restantes < 0) {
      if (!masAntigua || vence < masAntigua) masAntigua = vence;
    }
  }

  return masAntigua;
}
