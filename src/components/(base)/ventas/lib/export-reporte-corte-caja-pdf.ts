import autoTable from "jspdf-autotable";
import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  finalYTabla,
  piePaginas,
  tituloSeccion,
} from "@/lib/reportes/pdf-base";
import { fmtQ } from "@/lib/utils";
import type { ReporteCorteCaja } from "./reporte-corte-caja";

function filaResumenPago(
  etiqueta: string,
  cantidad: number,
  monto: number,
): string[] {
  return [etiqueta, String(cantidad), fmtQ(monto)];
}

export function descargarReporteCorteCajaPdf(
  reporte: ReporteCorteCaja,
  meta: MetaInforme,
) {
  const doc = crearDocumentoPdf();

  let y = encabezadoPdf(doc, {
    titulo: "Corte de caja diario",
    periodo: `${reporte.fechaLabel} · ${reporte.etiquetaVendedor}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });

  y = tituloSeccion(doc, y, "Ventas vigentes por forma de pago");
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Forma de pago", "Ventas", "Monto"]],
    body: [
      filaResumenPago(
        "Contado",
        reporte.resumen.contado.cantidad,
        reporte.resumen.contado.monto,
      ),
      filaResumenPago(
        "Tarjeta",
        reporte.resumen.tarjeta.cantidad,
        reporte.resumen.tarjeta.monto,
      ),
      filaResumenPago(
        "Crédito",
        reporte.resumen.credito.cantidad,
        reporte.resumen.credito.monto,
      ),
    ],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });

  y = finalYTabla(doc) + 8;
  y = tituloSeccion(doc, y, "Abonos de clientes");
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Hora", "Monto", "Descripción"]],
    body:
      reporte.abonosDetalle.length > 0
        ? reporte.abonosDetalle.map((a) => [
            a.hora,
            fmtQ(a.monto),
            a.descripcion,
          ])
        : [["—", "—", "Sin abonos registrados"]],
    columnStyles: { 1: { halign: "right" } },
  });

  y = finalYTabla(doc) + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    `Total a entregar en efectivo: ${fmtQ(reporte.resumen.totalEfectivoEntregar)}`,
    14,
    y,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  doc.text(
    `(Contado ${fmtQ(reporte.resumen.contado.monto)} + abonos ${fmtQ(reporte.resumen.abonos.monto)})`,
    14,
    y,
  );

  y += 10;
  y = tituloSeccion(doc, y, "Ventas anuladas del día");
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Recibo", "Monto", "Autorizó", "Motivo"]],
    body:
      reporte.anulaciones.length > 0
        ? reporte.anulaciones.map((a) => [
            a.recibo,
            fmtQ(a.monto),
            a.autor,
            a.motivo,
          ])
        : [["—", "—", "—", "Sin anulaciones"]],
    columnStyles: { 1: { halign: "right" } },
  });

  y = finalYTabla(doc) + 10;
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  y = tituloSeccion(doc, y, "Detalle de recibos");
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Recibo", "Hora", "Cliente", "Pago", "Total", "Estado"]],
    body: reporte.detalleVentas.map((d) => [
      d.recibo,
      d.hora,
      d.cliente,
      d.formaPago,
      fmtQ(d.total),
      d.estado,
    ]),
    columnStyles: { 4: { halign: "right" } },
    showHead: "everyPage",
  });

  y = finalYTabla(doc) + 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Entregó: ____________________", 14, y);
  doc.text("Recibió: ____________________", 110, y);

  piePaginas(doc, "Corte de caja diario");
  doc.save(nombreArchivo("Corte_Caja", reporte.fecha, "pdf"));
}
