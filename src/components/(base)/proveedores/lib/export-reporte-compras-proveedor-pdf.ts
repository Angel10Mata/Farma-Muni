import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CompraProveedorReporteRow } from "./actions";

const MX = 14;

export type ReporteComprasProveedorPdf = {
  fechaDesde: string;
  fechaHasta: string;
  generadoPor: string;
  filas: CompraProveedorReporteRow[];
};

export function descargarReporteComprasProveedorPdf(
  reporte: ReporteComprasProveedorPdf,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Compras por proveedor", MX, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Del ${reporte.fechaDesde} al ${reporte.fechaHasta}`, MX, 26);
  doc.text(`Generado por: ${reporte.generadoPor}`, MX, 32);

  const vencidas = reporte.filas.filter((f) => f.vencida === "Sí").length;
  doc.text(`Facturas vencidas con saldo: ${vencidas}`, MX, 38);

  autoTable(doc, {
    startY: 44,
    head: [
      [
        "Proveedor",
        "Factura",
        "Fecha",
        "Vence",
        "Total",
        "Pagado",
        "Saldo",
        "Vencida",
      ],
    ],
    body: reporte.filas.map((f) => [
      f.proveedor,
      f.factura,
      f.fecha,
      f.vence,
      f.total,
      f.pagado,
      f.saldo,
      f.vencida,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [44, 95, 155] },
    margin: { left: MX, right: MX },
  });

  doc.save(
    `compras-proveedor_${reporte.fechaDesde}_${reporte.fechaHasta}.pdf`,
  );
}
