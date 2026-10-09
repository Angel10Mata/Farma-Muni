import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { VentaRecetaReporteRow } from "./actions";

const MX = 14;

export type ReporteVentasRecetaPdf = {
  fechaDesde: string;
  fechaHasta: string;
  generadoPor: string;
  filas: VentaRecetaReporteRow[];
};

export function descargarReporteVentasRecetaPdf(reporte: ReporteVentasRecetaPdf) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Ventas con receta", MX, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Del ${reporte.fechaDesde} al ${reporte.fechaHasta}`,
    MX,
    26,
  );
  doc.text(`Generado por: ${reporte.generadoPor}`, MX, 32);

  autoTable(doc, {
    startY: 38,
    head: [
      [
        "Recibo",
        "Fecha",
        "Cliente",
        "Médico",
        "Colegiado",
        "N. receta",
        "Total",
      ],
    ],
    body: reporte.filas.map((f) => [
      f.recibo,
      f.fecha,
      f.cliente,
      f.medico,
      f.colegiado,
      f.numero_receta,
      f.total,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [44, 95, 155] },
    margin: { left: MX, right: MX },
  });

  doc.save(`ventas-con-receta_${reporte.fechaDesde}_${reporte.fechaHasta}.pdf`);
}
