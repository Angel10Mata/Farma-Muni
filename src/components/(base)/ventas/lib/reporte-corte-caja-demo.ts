import { DEMO_FINANZAS_MOVIMIENTOS, DEMO_VENTAS_HISTORIAL } from "@/lib/demo/fixtures";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import { fechaVentaCalendarioGt } from "./helpers";
import { construirReporteCorteCaja } from "./reporte-corte-caja";

export function construirReporteCorteCajaDemo(
  fecha: string,
  usuarioId: string | null,
) {
  const hoy = fechaCalendarioGt();
  const fechaUsar = fecha || hoy;

  const ventas = DEMO_VENTAS_HISTORIAL.filter((v) => {
    if (fechaVentaCalendarioGt(v.created_at) !== fechaUsar) return false;
    if (usuarioId && v.usuario_id !== usuarioId) return false;
    return true;
  }).map((v, i) => ({
    ...v,
    tipo_venta:
      i % 5 === 0
        ? "credito"
        : i % 4 === 0
          ? "Tarjeta"
          : "contado",
  }));

  const abonos = DEMO_FINANZAS_MOVIMIENTOS
    .filter(
      (m) =>
        m.categoria === "abono_cliente" &&
        m.tipo_movimiento === "ingreso" &&
        fechaCalendarioGt(new Date(m.fecha_movimiento)) === fechaUsar,
    )
    .map((m) => ({
      monto: m.monto,
      fecha_movimiento: m.fecha_movimiento,
      descripcion: m.descripcion,
    }));

  const anuladas = ventas.filter((v) => v.anulada || v.estado === "anulada");

  return construirReporteCorteCaja({
    fecha: fechaUsar,
    etiquetaVendedor: usuarioId ? "Vendedor demo" : "Todos los vendedores",
    ventas,
    anulacionesDia: anuladas.map((v) => ({
      recibo: `FM-${String(v.numero_recibo).padStart(6, "0")}`,
      monto: Number(v.total) || 0,
      autor: "Admin Sistema",
      motivo: v.motivo_anulacion ?? "Demo",
    })),
    abonos,
  });
}
