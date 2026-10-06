import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtQ } from "@/lib/utils";
import type { ReporteVentasMes } from "./reporte-ventas-mes";

type DocConTabla = jsPDF & { lastAutoTable: { finalY: number } };

const MX = 14;
const ANCHO = 182;

const C = {
  teal: [141, 167, 142] as [number, number, number],
  tealDark: [59, 82, 61] as [number, number, number],
  tealLight: [232, 240, 233] as [number, number, number],
  tealPale: [248, 250, 248] as [number, number, number],
  naranja: [194, 138, 56] as [number, number, number],
  zinc: [113, 113, 122] as [number, number, number],
  zincClaro: [244, 244, 245] as [number, number, number],
  badgeOk: [220, 236, 223] as [number, number, number],
  textoOk: [46, 125, 82] as [number, number, number],
  textoAnul: [185, 28, 28] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
  negro: [24, 24, 27] as [number, number, number],
};

function mezclarColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function encabezado(
  doc: jsPDF,
  periodoLabel: string,
  generadoPor: string,
): number {
  const fechaGen = new Date().toLocaleString("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.teal);
  doc.text("FARMAMUNI  ·  SISTEMA DE FARMACIA", MX, 16);

  doc.setFontSize(20);
  doc.setTextColor(...C.negro);
  doc.text("Reporte mensual de ventas", MX, 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.zinc);
  doc.text(`${periodoLabel} — generado el ${fechaGen}`, MX, 34);
  doc.text(`Realizado por: ${generadoPor}`, MX, 40);

  doc.setDrawColor(...C.teal);
  doc.setLineWidth(0.5);
  doc.line(MX, 44, MX + ANCHO, 44);

  return 50;
}

function tituloSeccion(doc: jsPDF, y: number, texto: string): number {
  doc.setFillColor(...C.teal);
  doc.rect(MX, y - 2.5, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.tealDark);
  doc.text(texto, MX + 5, y);
  return y + 8;
}

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
    { label: "Contado", valor: reporte.resumen.porContado, color: C.teal },
    { label: "Crédito", valor: reporte.resumen.porCredito, color: C.naranja },
  ];
  const max = Math.max(...filas.map((f) => f.valor), 1);
  const barraMax = 108;

  filas.forEach((fila, i) => {
    const ry = y + i * 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.negro);
    doc.text(fila.label, MX, ry + 5);

    const bx = MX + 26;
    doc.setFillColor(...C.zincClaro);
    doc.roundedRect(bx, ry, barraMax, 7, 1.5, 1.5, "F");
    const ancho = (fila.valor / max) * barraMax;
    if (ancho > 0.5) {
      doc.setFillColor(...fila.color);
      doc.roundedRect(bx, ry, ancho, 7, 1.5, 1.5, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.text(String(fila.valor), bx + barraMax + 5, ry + 5.5);
  });

  return y + 28;
}

const estilosTabla = {
  theme: "plain" as const,
  headStyles: {
    fillColor: C.zincClaro,
    textColor: C.zinc,
    fontStyle: "bold" as const,
    fontSize: 7,
    cellPadding: 3,
  },
  styles: {
    fontSize: 8,
    cellPadding: 3,
    textColor: C.negro,
    lineColor: [228, 228, 231] as [number, number, number],
    lineWidth: 0.1,
  },
  margin: { left: MX, right: 14 },
};

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
    ...estilosTabla,
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

  return (doc as DocConTabla).lastAutoTable.finalY + 10;
}

function historialVentas(doc: jsPDF, y: number, reporte: ReporteVentasMes): number {
  y = tituloSeccion(doc, y, "Historial de ventas");

  autoTable(doc, {
    ...estilosTabla,
    startY: y,
    head: [["RECIBO", "FECHA", "CLIENTE", "TIPO", "TOTAL", "ESTADO"]],
    body: reporte.historial.map((h) => [
      h.recibo,
      h.fecha,
      h.cliente,
      h.tipo,
      h.total,
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

  return (doc as DocConTabla).lastAutoTable.finalY + 10;
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

  const max = Math.max(...items.map((p) => p.cantidad), 1);
  const barraMax = 95;

  items.slice(0, 15).forEach((prod, i) => {
    const ry = y + i * 9;
    const t = items.length > 1 ? i / (items.length - 1) : 0;
    const colorBarra = mezclarColor(C.teal, C.tealPale, t * 0.85);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.negro);
    const nombre =
      prod.nombre.length > 38 ? `${prod.nombre.slice(0, 37)}…` : prod.nombre;
    doc.text(nombre, MX, ry + 5);

    const bx = MX + 72;
    doc.setFillColor(...C.zincClaro);
    doc.roundedRect(bx, ry + 1, barraMax, 5, 1, 1, "F");
    const ancho = (prod.cantidad / max) * barraMax;
    if (ancho > 0.3) {
      doc.setFillColor(...colorBarra);
      doc.roundedRect(bx, ry + 1, ancho, 5, 1, 1, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(String(prod.cantidad), bx + barraMax + 4, ry + 5);
  });

  return y + Math.min(items.length, 15) * 9 + 6;
}

export function descargarReporteVentasMesPdf(reporte: ReporteVentasMes) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = encabezado(doc, reporte.periodoLabel, reporte.generadoPor);
  y = resumenMes(doc, y, reporte);
  y = formaPago(doc, y, reporte);
  y = ventasAnuladas(doc, y, reporte);

  if (y > 235) {
    doc.addPage();
    y = 20;
  }
  y = historialVentas(doc, y, reporte);
  medicamentosVendidos(doc, y, reporte);

  doc.save(`Reporte_Ventas_${reporte.periodoClave}.pdf`);
}
