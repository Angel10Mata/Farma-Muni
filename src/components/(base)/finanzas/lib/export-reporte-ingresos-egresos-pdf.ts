import autoTable from "jspdf-autotable";
import type { MetaInforme } from "@/lib/reportes/identidad";
import { PALETA_RGB } from "@/lib/reportes/identidad";
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
import {
  formatearCambioPorcentaje,
  type ReporteIngresosEgresos,
} from "./reporte-ingresos-egresos";

function filaCambio(
  concepto: string,
  actual: number,
  anterior: number,
  cambio: { monto: number; porcentaje: number | null },
): string[] {
  return [
    concepto,
    fmtQ(actual),
    fmtQ(anterior),
    fmtQ(cambio.monto),
    formatearCambioPorcentaje(cambio.porcentaje),
  ];
}

export function descargarReporteIngresosEgresosPdf(
  reporte: ReporteIngresosEgresos,
  meta: MetaInforme,
) {
  const doc = crearDocumentoPdf({ orientacion: "landscape" });
  const titulo = "Ingresos y egresos del período";

  let y = encabezadoPdf(doc, {
    titulo,
    periodo: reporte.periodoLabel,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });

  y = tituloSeccion(doc, y, "Resumen del período");
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Concepto", "Monto"]],
    body: [
      ["Total ingresos", fmtQ(reporte.resumen.totalIngresos)],
      ["Total egresos", fmtQ(reporte.resumen.totalEgresos)],
      ["Resultado (ingresos − egresos)", fmtQ(reporte.resumen.resultado)],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  y = finalYTabla(doc) + 8;
  y = tituloSeccion(
    doc,
    y,
    `Comparación con período anterior (${reporte.periodoAnteriorLabel})`,
  );
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["", "Período actual", "Período anterior", "Variación", "% cambio"]],
    body: [
      filaCambio(
        "Ingresos",
        reporte.comparacion.actual.totalIngresos,
        reporte.comparacion.anterior.totalIngresos,
        reporte.comparacion.cambioIngresos,
      ),
      filaCambio(
        "Egresos",
        reporte.comparacion.actual.totalEgresos,
        reporte.comparacion.anterior.totalEgresos,
        reporte.comparacion.cambioEgresos,
      ),
      filaCambio(
        "Resultado",
        reporte.comparacion.actual.resultado,
        reporte.comparacion.anterior.resultado,
        reporte.comparacion.cambioResultado,
      ),
    ],
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  y = finalYTabla(doc) + 8;
  y = tituloSeccion(doc, y, "Ingresos por categoría");
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Categoría", "Monto"]],
    body: reporte.ingresosPorCategoria.map((f) => [f.etiqueta, fmtQ(f.monto)]),
    columnStyles: { 1: { halign: "right" } },
  });

  y = finalYTabla(doc) + 8;
  y = tituloSeccion(doc, y, "Egresos por categoría");
  autoTable(doc, {
    ...estilosTabla(),
    startY: y,
    head: [["Categoría", "Monto"]],
    body: reporte.egresosPorCategoria.map((f) => [f.etiqueta, fmtQ(f.monto)]),
    columnStyles: { 1: { halign: "right" } },
  });

  y = finalYTabla(doc) + 8;
  y = tituloSeccion(doc, y, "Detalle de movimientos");
  autoTable(doc, {
    ...estilosTabla({ fontSize: 7, cellPadding: 2 }),
    startY: y,
    head: [["Fecha", "Tipo", "Categoría", "Descripción", "Referencia", "Monto"]],
    body:
      reporte.detalle.length > 0
        ? reporte.detalle.map((f) => [
            f.fecha,
            f.tipo,
            f.categoria,
            f.descripcion,
            f.referencia,
            fmtQ(f.monto),
          ])
        : [["—", "—", "—", "Sin movimientos en el período", "—", "—"]],
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 18 },
      2: { cellWidth: 28 },
      5: { halign: "right", cellWidth: 22 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const raw = String(data.cell.raw ?? "");
        if (raw === "Ingreso") {
          data.cell.styles.textColor = [46, 125, 82];
        } else if (raw === "Egreso") {
          data.cell.styles.textColor = PALETA_RGB.rojo;
        }
      }
    },
  });

  piePaginas(doc, titulo);
  doc.save(
    nombreArchivo("Ingresos_Egresos_Periodo", reporte.periodoLabel, "pdf"),
  );
}
