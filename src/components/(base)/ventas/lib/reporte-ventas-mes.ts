import { fmtQ } from "@/lib/utils";
import { formatFechaHoraGt } from "@/lib/fechas-gt";
import {
  etiquetaTipoVentaHistorial,
  obtenerCodigoRecibo,
  ventaEsContadoHistorial,
  ventaEsCreditoHistorial,
  ventaEsTarjetaHistorial,
  ventaEstaAnulada,
} from "./helpers";

export type ReporteVentasMesDatos = {
  periodoLabel: string;
  periodoClave: string;
  resumen: {
    totalVentas: number;
    ventasActivas: number;
    anuladas: number;
    porContado: number;
    porCredito: number;
    porTarjeta: number;
    montoTotalActivas: number;
  };
  anulaciones: Array<{
    recibo: string;
    fecha: string;
    cliente: string;
    autor: string;
    motivo: string;
  }>;
  historial: Array<{
    recibo: string;
    fecha: string;
    cliente: string;
    tipo: string;
    total: string;
    estado: string;
    notaAnulacion: string;
  }>;
  topProductos: Array<{ nombre: string; cantidad: number }>;
};

export type ReporteVentasMes = ReporteVentasMesDatos & {
  generadoPor: string;
};

export type VentaReporteMesInput = {
  id: string;
  created_at: string;
  numero_recibo?: number | null;
  tipo_venta: string | null;
  total: number | string | null;
  observaciones?: string | null;
  anulada?: boolean | null;
  ven_clientes?: { nombre: string } | null;
};

export type DetalleReporteMesInput = {
  venta_id: string;
  cantidad: number;
  inv_productos?: { nombre: string } | null;
};

const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function etiquetaRecibo(venta: VentaReporteMesInput): string {
  if (venta.numero_recibo != null) return `#${venta.numero_recibo}`;
  return obtenerCodigoRecibo(venta.id);
}

export function etiquetaPeriodoVentasMes(year: number, month: number): string {
  const nombre = MESES_ES[month - 1] ?? String(month);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${year}`;
}

export function construirReporteVentasMes(
  ventas: VentaReporteMesInput[],
  anulacionesPorVentaId: Record<string, { autor: string; motivo: string }>,
  detalles: DetalleReporteMesInput[],
  year: number,
  month: number,
): ReporteVentasMesDatos {
  const periodoClave = `${year}-${String(month).padStart(2, "0")}`;
  const periodoLabel = etiquetaPeriodoVentasMes(year, month);

  let anuladas = 0;
  let porContado = 0;
  let porCredito = 0;
  let porTarjeta = 0;
  let montoTotalActivas = 0;

  const anulaciones: ReporteVentasMes["anulaciones"] = [];
  const historial: ReporteVentasMes["historial"] = [];

  for (const v of ventas) {
    const esAnulada = ventaEstaAnulada(v);
    if (esAnulada) {
      anuladas += 1;
    } else {
      const total = Number(v.total) || 0;
      montoTotalActivas += total;
      if (ventaEsCreditoHistorial(v.tipo_venta)) porCredito += 1;
      else if (ventaEsTarjetaHistorial(v.tipo_venta)) porTarjeta += 1;
      else if (ventaEsContadoHistorial(v.tipo_venta)) porContado += 1;
    }

    const recibo = etiquetaRecibo(v);
    const cliente = v.ven_clientes?.nombre?.trim() || "Cliente general";
    const fecha = formatFechaHoraGt(v.created_at);

    let notaAnulacion = "";
    if (esAnulada) {
      const bit = anulacionesPorVentaId[v.id];
      const autor = bit?.autor?.trim() || "—";
      const motivo = bit?.motivo?.trim() || "—";
      notaAnulacion = `Autorizó: ${autor}. Motivo: ${motivo}`;
      anulaciones.push({
        recibo,
        fecha,
        cliente,
        autor,
        motivo,
      });
    }

    historial.push({
      recibo,
      fecha,
      cliente,
      tipo: etiquetaTipoVentaHistorial(v.tipo_venta),
      total: fmtQ(Number(v.total) || 0),
      estado: esAnulada ? "Anulada" : "Vigente",
      notaAnulacion,
    });
  }

  const productoCantidad = new Map<string, number>();
  for (const d of detalles) {
    const nombre = d.inv_productos?.nombre?.trim() || "Producto";
    productoCantidad.set(nombre, (productoCantidad.get(nombre) ?? 0) + d.cantidad);
  }
  const topProductos = [...productoCantidad.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 25);

  return {
    periodoLabel,
    periodoClave,
    resumen: {
      totalVentas: ventas.length,
      ventasActivas: ventas.length - anuladas,
      anuladas,
      porContado,
      porCredito,
      porTarjeta,
      montoTotalActivas,
    },
    anulaciones,
    historial,
    topProductos,
  };
}
