import { formatFechaHoraGt } from "@/lib/fechas-gt";
import {
  clasificarFormaPagoReporte,
  codigoReciboVenta,
  ETIQUETA_CONSUMIDOR_FINAL,
  etiquetaTipoVentaHistorial,
  ventaEstaAnulada,
} from "./helpers";

export type ResumenFormaPagoMes = {
  cantidad: number;
  monto: number;
};

export type ReporteVentasMesDatos = {
  periodoLabel: string;
  periodoClave: string;
  resumen: {
    totalVentas: number;
    ventasActivas: number;
    anuladas: number;
    porContado: ResumenFormaPagoMes;
    porCredito: ResumenFormaPagoMes;
    porTarjeta: ResumenFormaPagoMes;
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
    total: number;
    estado: string;
    notaAnulacion: string;
  }>;
  topProductos: Array<{
    producto: string;
    marca: string;
    cantidad: number;
    monto: number;
    costo: number;
    ganancia: number;
  }>;
  porVendedor: Array<{
    vendedor: string;
    ventas: number;
    monto: number;
  }>;
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
  usuario_id?: string | null;
  ven_clientes?: { nombre: string } | null;
};

export type DetalleReporteMesInput = {
  venta_id: string;
  cantidad: number;
  subtotal: number;
  producto: string;
  marca: string;
  costo: number;
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
  return codigoReciboVenta(venta);
}

function resumenFormaPagoVacio(): ResumenFormaPagoMes {
  return { cantidad: 0, monto: 0 };
}

export function etiquetaPeriodoVentasMes(year: number, month: number): string {
  const nombre = MESES_ES[month - 1] ?? String(month);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${year}`;
}

export function construirReporteVentasMes(
  ventas: VentaReporteMesInput[],
  anulacionesPorVentaId: Record<string, { autor: string; motivo: string }>,
  detalles: DetalleReporteMesInput[],
  nombresVendedorPorId: Record<string, string>,
  year: number,
  month: number,
): ReporteVentasMesDatos {
  const periodoClave = `${year}-${String(month).padStart(2, "0")}`;
  const periodoLabel = etiquetaPeriodoVentasMes(year, month);

  let anuladas = 0;
  const porContado = resumenFormaPagoVacio();
  const porCredito = resumenFormaPagoVacio();
  const porTarjeta = resumenFormaPagoVacio();
  let montoTotalActivas = 0;

  const anulaciones: ReporteVentasMes["anulaciones"] = [];
  const historial: ReporteVentasMes["historial"] = [];
  const vendedorAgg = new Map<string, { ventas: number; monto: number }>();

  for (const v of ventas) {
    const esAnulada = ventaEstaAnulada(v);
    if (esAnulada) {
      anuladas += 1;
    } else {
      const total = Number(v.total) || 0;
      montoTotalActivas += total;
      const bucket = clasificarFormaPagoReporte(v.tipo_venta);
      if (bucket === "credito") {
        porCredito.cantidad += 1;
        porCredito.monto += total;
      } else if (bucket === "tarjeta") {
        porTarjeta.cantidad += 1;
        porTarjeta.monto += total;
      } else if (bucket === "contado") {
        porContado.cantidad += 1;
        porContado.monto += total;
      }

      const vendedorId = v.usuario_id ?? "";
      const vendedorNombre =
        (vendedorId && nombresVendedorPorId[vendedorId]) || "Sin nombre";
      const prev = vendedorAgg.get(vendedorNombre) ?? { ventas: 0, monto: 0 };
      vendedorAgg.set(vendedorNombre, {
        ventas: prev.ventas + 1,
        monto: prev.monto + total,
      });
    }

    const recibo = etiquetaRecibo(v);
    const cliente =
      v.ven_clientes?.nombre?.trim() || ETIQUETA_CONSUMIDOR_FINAL;
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
      total: Number(v.total) || 0,
      estado: esAnulada ? "Anulada" : "Vigente",
      notaAnulacion,
    });
  }

  const productoAgg = new Map<
    string,
    {
      producto: string;
      marca: string;
      cantidad: number;
      monto: number;
      costo: number;
    }
  >();
  for (const d of detalles) {
    const key = `${d.marca}\0${d.producto}`;
    const prev = productoAgg.get(key) ?? {
      producto: d.producto,
      marca: d.marca,
      cantidad: 0,
      monto: 0,
      costo: 0,
    };
    productoAgg.set(key, {
      producto: d.producto,
      marca: d.marca,
      cantidad: prev.cantidad + d.cantidad,
      monto: prev.monto + d.subtotal,
      costo: prev.costo + d.costo,
    });
  }

  const topProductos = [...productoAgg.values()]
    .map((p) => ({
      producto: p.producto,
      marca: p.marca,
      cantidad: p.cantidad,
      monto: Math.round(p.monto * 100) / 100,
      costo: Math.round(p.costo * 100) / 100,
      ganancia: Math.round((p.monto - p.costo) * 100) / 100,
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 25);

  const porVendedor = [...vendedorAgg.entries()]
    .map(([vendedor, stats]) => ({
      vendedor,
      ventas: stats.ventas,
      monto: Math.round(stats.monto * 100) / 100,
    }))
    .sort((a, b) => b.monto - a.monto);

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
    porVendedor,
  };
}
