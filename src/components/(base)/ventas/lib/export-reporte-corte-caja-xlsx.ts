import type { MetaInforme } from "@/lib/reportes/identidad";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
  tablaExcel,
} from "@/lib/reportes/excel-base";
import { nombreArchivo } from "@/lib/reportes/nombres";
import type { ReporteCorteCaja } from "./reporte-corte-caja";

export async function descargarReporteCorteCajaExcel(
  reporte: ReporteCorteCaja,
  meta: MetaInforme,
) {
  const wb = crearLibro();

  const enc = {
    titulo: "Corte de caja diario",
    periodo: `${reporte.fechaLabel} · ${reporte.etiquetaVendedor}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 8,
  };

  const { ws: wsResumen, filaInicio: r0 } = hojaConEncabezado(
    wb,
    "Resumen",
    enc,
  );

  let r = tablaExcel(
    wsResumen,
    r0,
    [
      { titulo: "Forma de pago", clave: "forma", tipo: "texto", ancho: 16 },
      { titulo: "Ventas", clave: "cantidad", tipo: "entero", ancho: 12 },
      { titulo: "Monto", clave: "monto", tipo: "moneda", ancho: 14 },
    ],
    [
      {
        forma: "Contado",
        cantidad: reporte.resumen.contado.cantidad,
        monto: reporte.resumen.contado.monto,
      },
      {
        forma: "Tarjeta",
        cantidad: reporte.resumen.tarjeta.cantidad,
        monto: reporte.resumen.tarjeta.monto,
      },
      {
        forma: "Crédito",
        cantidad: reporte.resumen.credito.cantidad,
        monto: reporte.resumen.credito.monto,
      },
      {
        forma: "Abonos (efectivo)",
        cantidad: reporte.resumen.abonos.cantidad,
        monto: reporte.resumen.abonos.monto,
      },
    ],
  );

  r += 2;
  wsResumen.getCell(r, 1).value = "Total a entregar en efectivo";
  wsResumen.getCell(r, 1).font = { bold: true };
  wsResumen.getCell(r, 3).value = reporte.resumen.totalEfectivoEntregar;
  wsResumen.getCell(r, 3).numFmt = '"Q"#,##0.00';
  wsResumen.getCell(r, 3).font = { bold: true };

  const { ws: wsDet, filaInicio: d0 } = hojaConEncabezado(wb, "Recibos", enc);
  tablaExcel(
    wsDet,
    d0,
    [
      { titulo: "Recibo", clave: "recibo", tipo: "texto", ancho: 12 },
      { titulo: "Hora", clave: "hora", tipo: "texto", ancho: 12 },
      { titulo: "Cliente", clave: "cliente", tipo: "texto", ancho: 22 },
      { titulo: "Pago", clave: "formaPago", tipo: "texto", ancho: 12 },
      { titulo: "Total", clave: "total", tipo: "moneda", ancho: 12 },
      { titulo: "Estado", clave: "estado", tipo: "texto", ancho: 12 },
    ],
    reporte.detalleVentas.map((d) => ({
      recibo: d.recibo,
      hora: d.hora,
      cliente: d.cliente,
      formaPago: d.formaPago,
      total: d.total,
      estado: d.estado,
    })),
    { totales: true },
  );

  const { ws: wsAnul, filaInicio: a0 } = hojaConEncabezado(
    wb,
    "Anuladas",
    enc,
  );
  tablaExcel(
    wsAnul,
    a0,
    [
      { titulo: "Recibo", clave: "recibo", tipo: "texto", ancho: 12 },
      { titulo: "Monto", clave: "monto", tipo: "moneda", ancho: 12 },
      { titulo: "Autorizó", clave: "autor", tipo: "texto", ancho: 18 },
      { titulo: "Motivo", clave: "motivo", tipo: "texto", ancho: 40 },
    ],
    reporte.anulaciones.map((a) => ({
      recibo: a.recibo,
      monto: a.monto,
      autor: a.autor,
      motivo: a.motivo,
    })),
  );

  await guardarLibro(wb, nombreArchivo("Corte_Caja", reporte.fecha, "xlsx"));
}
