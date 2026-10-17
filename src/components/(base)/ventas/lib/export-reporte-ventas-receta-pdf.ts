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
  tituloSeccion,
} from "@/lib/reportes/pdf-base";
import { formatFechaHoraGt } from "@/lib/fechas-gt";
import type {
  TotalesRecetaProductoRow,
  VentaRecetaReporteRow,
} from "./actions";

export type ReporteVentasRecetaPdf = {
  fechaDesde: string;
  fechaHasta: string;
  generadoPor: string;
  filas: VentaRecetaReporteRow[];
  totalesPorProducto: TotalesRecetaProductoRow[];
};

export function descargarReporteVentasRecetaPdf(
  reporte: ReporteVentasRecetaPdf,
  meta: MetaInforme,
) {
  const doc = crearDocumentoPdf();

  let y = encabezadoPdf(doc, {
    titulo: "Ventas con receta",
    periodo: `Del ${reporte.fechaDesde} al ${reporte.fechaHasta}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });

  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [
      [
        "Recibo",
        "Fecha",
        "Cliente",
        "Médico",
        "Colegiado",
        "N. receta",
        "Producto",
        "Marca",
        "Lote",
        "Cant.",
      ],
    ],
    body: reporte.filas.map((f) => [
      f.recibo,
      formatFechaHoraGt(f.fecha),
      f.cliente,
      f.medico,
      f.colegiado,
      f.numero_receta,
      f.producto,
      f.marca,
      f.lote,
      String(f.cantidad),
    ]),
    columnStyles: columnasNumericas([9]),
    styles: { fontSize: 7, cellPadding: 2 },
  });

  y = finalYTabla(doc) + 8;
  y = tituloSeccion(doc, y, "Total de unidades por producto");

  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Producto", "Marca", "Unidades"]],
    body: reporte.totalesPorProducto.map((t) => [
      t.producto,
      t.marca,
      String(t.cantidad),
    ]),
    columnStyles: columnasNumericas([2]),
  });

  piePaginas(doc, "Ventas con receta");
  doc.save(
    nombreArchivo(
      "Ventas_Con_Receta",
      `${reporte.fechaDesde}_${reporte.fechaHasta}`,
      "pdf",
    ),
  );
}
