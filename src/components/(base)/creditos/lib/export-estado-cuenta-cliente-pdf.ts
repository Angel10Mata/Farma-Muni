import autoTable from "jspdf-autotable";
import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  columnasNumericas,
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  finalYTabla,
  piePaginas,
  PDF_MARGEN_X,
} from "@/lib/reportes/pdf-base";
import { PALETA_RGB } from "@/lib/reportes/identidad";
import { formatFechaCalendarioGt, formatFechaHoraGt } from "@/lib/fechas-gt";
import { fmtQ } from "@/lib/utils";
import type { CreditoResumen, VentaCreditoDetalle } from "./zod";
import {
  construirMovimientosEstadoCuenta,
  etiquetaNitCliente,
  fechaSaldoVencidoDesde,
} from "./creditos-reporte-helpers";

export function descargarEstadoCuentaClientePdf(
  cliente: CreditoResumen,
  ventas: VentaCreditoDetalle[],
  meta: MetaInforme,
) {
  const movimientos = construirMovimientosEstadoCuenta(ventas);
  const saldoFinal =
    movimientos.length > 0
      ? movimientos[movimientos.length - 1].saldo
      : cliente.saldo_pendiente;
  const vencidoDesde = fechaSaldoVencidoDesde(ventas);
  const telefono = cliente.telefono?.trim() || "No registrado";

  const doc = crearDocumentoPdf();
  let y = encabezadoPdf(doc, {
    titulo: "Estado de cuenta",
    subtitulo: cliente.nombre,
    periodo: `NIT ${etiquetaNitCliente(cliente.nit)} · Tel. ${telefono}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });

  autoTable(doc, {
    ...estilosTabla({ fontSize: 8 }),
    startY: y,
    head: [["Fecha", "Recibo", "Descripción", "Cargo", "Abono", "Saldo"]],
    body: movimientos.map((m) => [
      formatFechaHoraGt(m.fecha),
      m.recibo,
      m.descripcion,
      m.cargo != null ? fmtQ(m.cargo) : "—",
      m.abono != null ? fmtQ(m.abono) : "—",
      fmtQ(m.saldo),
    ]),
    columnStyles: columnasNumericas([3, 4, 5]),
  });

  y = finalYTabla(doc) + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PALETA_RGB.texto);
  doc.text(`Saldo final: ${fmtQ(saldoFinal)}`, PDF_MARGEN_X, y);
  y += 6;

  if (vencidoDesde) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PALETA_RGB.rojo);
    doc.text(
      `Saldo vencido desde ${formatFechaCalendarioGt(vencidoDesde)}`,
      PDF_MARGEN_X,
      y,
    );
  }

  piePaginas(doc, "Estado de cuenta");
  doc.save(nombreArchivo("Estado_Cuenta", cliente.nombre, "pdf"));
}
