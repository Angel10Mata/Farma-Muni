import {
  formatFechaCalendarioGt,
  formatHoraTablaGt,
} from "@/lib/fechas-gt";
import {
  clasificarFormaPagoReporte,
  codigoReciboVenta,
  ETIQUETA_CONSUMIDOR_FINAL,
  etiquetaTipoVentaHistorial,
  ventaEstaAnulada,
} from "./helpers";
import type { ResumenFormaPagoMes } from "./reporte-ventas-mes";

export type ReporteCorteCajaDatos = {
  fecha: string;
  fechaLabel: string;
  etiquetaVendedor: string;
  resumen: {
    contado: ResumenFormaPagoMes;
    tarjeta: ResumenFormaPagoMes;
    credito: ResumenFormaPagoMes;
    abonos: ResumenFormaPagoMes;
    totalEfectivoEntregar: number;
  };
  abonosDetalle: Array<{
    hora: string;
    monto: number;
    descripcion: string;
  }>;
  anulaciones: Array<{
    recibo: string;
    monto: number;
    autor: string;
    motivo: string;
  }>;
  detalleVentas: Array<{
    recibo: string;
    hora: string;
    cliente: string;
    formaPago: string;
    total: number;
    estado: string;
  }>;
};

export type ReporteCorteCaja = ReporteCorteCajaDatos & {
  generadoPor: string;
};

type VentaCorteInput = {
  id: string;
  created_at: string;
  numero_recibo?: number | null;
  tipo_venta: string | null;
  total: number | string | null;
  observaciones?: string | null;
  anulada?: boolean | null;
  estado?: string | null;
  ven_clientes?: { nombre: string } | null;
};

function resumenVacio(): ResumenFormaPagoMes {
  return { cantidad: 0, monto: 0 };
}

export function construirReporteCorteCaja(params: {
  fecha: string;
  etiquetaVendedor: string;
  ventas: VentaCorteInput[];
  anulacionesDia: Array<{
    recibo: string;
    monto: number;
    autor: string;
    motivo: string;
  }>;
  abonos: Array<{
    monto: number;
    fecha_movimiento: string;
    descripcion: string;
  }>;
}): ReporteCorteCajaDatos {
  const contado = resumenVacio();
  const tarjeta = resumenVacio();
  const credito = resumenVacio();
  const abonosResumen = resumenVacio();

  const detalleVentas: ReporteCorteCajaDatos["detalleVentas"] = [];

  for (const v of params.ventas) {
    const esAnulada = ventaEstaAnulada(v);
    const total = Number(v.total) || 0;
    const bucket = clasificarFormaPagoReporte(v.tipo_venta);

    if (!esAnulada) {
      if (bucket === "contado") {
        contado.cantidad += 1;
        contado.monto += total;
      } else if (bucket === "tarjeta") {
        tarjeta.cantidad += 1;
        tarjeta.monto += total;
      } else if (bucket === "credito") {
        credito.cantidad += 1;
        credito.monto += total;
      }
    }

    detalleVentas.push({
      recibo: codigoReciboVenta(v),
      hora: formatHoraTablaGt(v.created_at),
      cliente:
        v.ven_clientes?.nombre?.trim() || ETIQUETA_CONSUMIDOR_FINAL,
      formaPago: etiquetaTipoVentaHistorial(v.tipo_venta),
      total,
      estado: esAnulada ? "Anulada" : "Vigente",
    });
  }

  const abonosDetalle = params.abonos.map((a) => {
    abonosResumen.cantidad += 1;
    abonosResumen.monto += a.monto;
    return {
      hora: formatHoraTablaGt(a.fecha_movimiento),
      monto: a.monto,
      descripcion: a.descripcion.trim() || "Abono de cliente",
    };
  });

  const totalEfectivoEntregar =
    Math.round((contado.monto + abonosResumen.monto) * 100) / 100;

  return {
    fecha: params.fecha,
    fechaLabel: formatFechaCalendarioGt(params.fecha),
    etiquetaVendedor: params.etiquetaVendedor,
    resumen: {
      contado,
      tarjeta,
      credito,
      abonos: abonosResumen,
      totalEfectivoEntregar,
    },
    abonosDetalle,
    anulaciones: params.anulacionesDia,
    detalleVentas,
  };
}
