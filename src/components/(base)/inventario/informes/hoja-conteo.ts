import autoTable from "jspdf-autotable";
import { formatFechaCalendarioGt } from "@/lib/fechas-gt";
import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  columnasNumericas,
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  finalYTabla,
  piePaginas,
} from "@/lib/reportes/pdf-base";
import { fmtNum } from "@/lib/utils";
import { tituloProductoFarmacia } from "../lib/helpers";
import {
  compararFilasConteoFisico,
  lotesActivosConExistencia,
  type FilaLoteInforme,
} from "./lote-informe";

export function descargarHojaConteoFisicoPdf(
  lotes: FilaLoteInforme[],
  meta: MetaInforme,
  filtroUbicacion?: string | null,
) {
  let activos = lotesActivosConExistencia(lotes);
  if (filtroUbicacion && filtroUbicacion !== "all") {
    activos = activos.filter((l) => l.ubicacion === filtroUbicacion);
  }
  activos.sort(compararFilasConteoFisico);

  const doc = crearDocumentoPdf({ orientacion: "landscape" });
  const subtitulo =
    filtroUbicacion && filtroUbicacion !== "all"
      ? `Ubicación: ${filtroUbicacion}`
      : "Todas las ubicaciones";

  let y = encabezadoPdf(doc, {
    titulo: "Hoja de conteo físico",
    subtitulo,
    institucion: meta.institucion,
    generadoPor: meta.generadoPor,
  });

  autoTable(doc, {
    ...estilosTabla({ fontSize: 8, cellPadding: 3 }),
    startY: y,
    head: [
      [
        "Ubicación",
        "Producto",
        "Marca",
        "Lote",
        "Vencimiento",
        "Existencia sistema",
        "Conteo",
        "Diferencia",
      ],
    ],
    body: activos.map((f) => [
      f.ubicacion,
      tituloProductoFarmacia({
        nombre: f.marca,
        nombre_generico: f.generico_nombre,
        concentracion: f.concentracion,
        forma_farmaceutica: f.forma_farmaceutica,
        presentacion: f.presentacion,
      }),
      f.marca,
      f.numero_lote || "—",
      f.fecha_vencimiento ? formatFechaCalendarioGt(f.fecha_vencimiento) : "—",
      fmtNum(f.existencia),
      "____________",
      "____________",
    ]),
    columnStyles: columnasNumericas([5]),
  });

  y = finalYTabla(doc) + 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Contado por: ____________________", 14, y);
  doc.text("Revisado por: ____________________", 14, y + 7);
  doc.text("Fecha: ____________________", 14, y + 14);

  piePaginas(doc, "Conteo físico");
  doc.save(nombreArchivo("Hoja_Conteo_Fisico", undefined, "pdf"));
}
