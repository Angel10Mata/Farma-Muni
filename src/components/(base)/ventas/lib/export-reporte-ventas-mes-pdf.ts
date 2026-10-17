import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PALETA_RGB, type MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  finalYTabla,
  PDF_ANCHO_UTIL,
  PDF_MARGEN_X,
  piePaginas,
  tituloSeccion,
} from "@/lib/reportes/pdf-base";
import { fmtQ } from "@/lib/utils";
import type { ReporteVentasMes } from "./reporte-ventas-mes";

const MX = PDF_MARGEN_X;
const ANCHO = PDF_ANCHO_UTIL;

const C = {
  teal: PALETA_RGB.secundario,
  tealDark: PALETA_RGB.primario,
  tealLight: PALETA_RGB.claro,
  tealPale: [248, 250, 248] as [number, number, number],
  naranja: PALETA_RGB.ambar,
  zinc: PALETA_RGB.gris,
  zincClaro: [244, 244, 245] as [number, number, number],
  badgeOk: [220, 236, 223] as [number, number, number],
  textoOk: [46, 125, 82] as [number, number, number],
  textoAnul: PALETA_RGB.rojo,
  negro: PALETA_RGB.texto,
};

function resumenMes(doc: jsPDF, y: number, reporte: ReporteVentasMes): number {
  y = tituloSeccion(doc, y, "Resumen del mes");

  const ticket =
    reporte.resumen.ventasActivas > 0
      ? reporte.resumen.montoTotalActivas / reporte.resumen.ventasActivas
      : 0;

  doc.setFillColor(...C.tealLight);
  doc.setDrawColor(...C.teal);
  doc.setLineWidth(0.25);
  doc.roundedRect(MX, y, ANCHO, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.tealDark);
  doc.text("MONTO TOTAL DEL MES — VENTAS VIGENTES", MX + 5, y + 9);

  doc.setFontSize(19);
  doc.text(fmtQ(reporte.resumen.montoTotalActivas), MX + 5, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.zinc);
  doc.text(
    `${reporte.resumen.ventasActivas} ventas vigentes`,
    MX + ANCHO - 5,
    y + 13,
    { align: "right" },
  );
  doc.text(
    `${fmtQ(ticket)} de ticket promedio`,
    MX + ANCHO - 5,
    y + 20,
    { align: "right" },
  );

  return y + 34;
}

function formaPago(doc: jsPDF, y: number, reporte: ReporteVentasMes): number {
  y = tituloSeccion(doc, y, "Forma de pago");
  const filas = [
    {
      label: "Contado",
      resumen: reporte.resumen.porContado,
      color: C.teal,
    },
    {
      label: "Tarjeta",
      resumen: reporte.resumen.porTarjeta,
      color: C.zinc,
    },
    {
      label: "Crédito",
      resumen: reporte.resumen.porCredito,
      color: C.naranja,
    },
  ];
  const max = Math.max(...filas.map((f) => f.resumen.cantidad), 1);
  const barraMax = 88;

  filas.forEach((fila, i) => {
    const ry = y + i * 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.negro);
    doc.text(fila.label, MX, ry + 5);

    const bx = MX + 26;
    doc.setFillColor(...C.zincClaro);
    doc.roundedRect(bx, ry, barraMax, 7, 1.5, 1.5, "F");
    const ancho = (fila.resumen.cantidad / max) * barraMax;
    if (ancho > 0.5) {
      doc.setFillColor(...fila.color);
      doc.roundedRect(bx, ry, ancho, 7, 1.5, 1.5, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.text(
      `${fila.resumen.cantidad} · ${fmtQ(fila.resumen.monto)}`,
      bx + barraMax + 4,
      ry + 5.5,
    );
  });

  return y + 46;
}

const estilosTablaVentas = estilosTabla({ fontSize: 8, cellPadding: 3 });

function ventasAnuladas(
  doc: jsPDF,
  y: number,
  reporte: ReporteVentasMes,
): number {
  y = tituloSeccion(doc, y, "Ventas anuladas");

  if (!reporte.anulaciones.length) {
    doc.setFillColor(...C.tealLight);
    doc.roundedRect(MX, y, ANCHO, 14, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.tealDark);
    doc.text("No se registraron anulaciones en este periodo.", MX + 5, y + 9);
    return y + 22;
  }

  autoTable(doc, {
    ...estilosTablaVentas,
    startY: y,
    head: [["RECIBO", "FECHA", "CLIENTE", "AUTORIZÓ", "MOTIVO"]],
    body: reporte.anulaciones.map((a) => [
      a.recibo,
      a.fecha,
      a.cliente,
      a.autor,
      a.motivo,
    ]),
    columnStyles: { 4: { cellWidth: 52 } },
  });

  return finalYTabla(doc) + 10;
}

function historialVentas(doc: jsPDF, y: number, reporte: ReporteVentasMes): number {
  y = tituloSeccion(doc, y, "Historial de ventas");

  autoTable(doc, {
    ...estilosTablaVentas,
    startY: y,
    head: [["RECIBO", "FECHA", "CLIENTE", "TIPO", "TOTAL", "ESTADO"]],
    body: reporte.historial.map((h) => [
      h.recibo,
      h.fecha,
      h.cliente,
      h.tipo,
      fmtQ(h.total),
      h.estado,
    ]),
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 32 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "center", cellWidth: 20 },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 5) {
        const estado = String(data.cell.raw ?? "");
        if (estado === "Vigente") {
          data.cell.styles.fillColor = C.badgeOk;
          data.cell.styles.textColor = C.textoOk;
          data.cell.styles.fontStyle = "bold";
        } else if (estado === "Anulada") {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = C.textoAnul;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    showHead: "everyPage",
  });

  return finalYTabla(doc) + 10;
}

function resumenVendedores(
  doc: jsPDF,
  y: number,
  reporte: ReporteVentasMes,
): number {
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  y = tituloSeccion(doc, y, "Resumen por vendedor");
  if (!reporte.porVendedor.length) {
    doc.setFontSize(9);
    doc.setTextColor(...C.zinc);
    doc.text("Sin ventas vigentes por vendedor.", MX, y + 4);
    return y + 12;
  }
  autoTable(doc, {
    ...estilosTablaVentas,
    startY: y,
    head: [["VENDEDOR", "VENTAS", "MONTO"]],
    body: reporte.porVendedor.map((v) => [
      v.vendedor,
      String(v.ventas),
      fmtQ(v.monto),
    ]),
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });
  return finalYTabla(doc) + 10;
}

function medicamentosVendidos(
  doc: jsPDF,
  y: number,
  reporte: ReporteVentasMes,
): number {
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  y = tituloSeccion(doc, y, "Medicamentos más vendidos (vigentes)");

  const items = reporte.topProductos;
  if (!items.length) {
    doc.setFontSize(9);
    doc.setTextColor(...C.zinc);
    doc.text("Sin detalle de productos en el periodo.", MX, y + 4);
    return y + 12;
  }

  autoTable(doc, {
    ...estilosTablaVentas,
    startY: y,
    head: [
      ["PRODUCTO", "MARCA", "CANT.", "MONTO", "COSTO", "GANANCIA"],
    ],
    body: items.slice(0, 25).map((p) => [
      p.producto,
      p.marca,
      String(p.cantidad),
      fmtQ(p.monto),
      fmtQ(p.costo),
      fmtQ(p.ganancia),
    ]),
    columnStyles: {
      2: { halign: "right", cellWidth: 12 },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 22 },
    },
  });

  return finalYTabla(doc) + 6;
}

export function descargarReporteVentasMesPdf(
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const doc = crearDocumentoPdf();

  let y = encabezadoPdf(doc, {
    titulo: "Reporte mensual de ventas",
    periodo: reporte.periodoLabel,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });
  y = resumenMes(doc, y, reporte);
  y = formaPago(doc, y, reporte);
  y = ventasAnuladas(doc, y, reporte);

  if (y > 235) {
    doc.addPage();
    y = 20;
  }
  y = historialVentas(doc, y, reporte);
  y = resumenVendedores(doc, y, reporte);
  medicamentosVendidos(doc, y, reporte);

  piePaginas(doc, "Reporte mensual de ventas");
  doc.save(nombreArchivo("Reporte_Ventas", reporte.periodoClave, "pdf"));
}
