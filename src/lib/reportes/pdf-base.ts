import jsPDF from "jspdf";
import type { CellHookData, RowInput } from "jspdf-autotable";
import { PALETA_RGB, textoGeneradoInforme, type DatosInstitucionales } from "./identidad";

export const PDF_MARGEN_X = 14;
export const PDF_ANCHO_UTIL = 182;

export type EncabezadoPdfOpts = {
  titulo: string;
  subtitulo?: string;
  periodo?: string;
  generadoPor: string;
  institucion: DatosInstitucionales;
};

export function crearDocumentoPdf(opts?: {
  orientacion?: "portrait" | "landscape";
}) {
  return new jsPDF({
    orientation: opts?.orientacion ?? "portrait",
    unit: "mm",
    format: "a4",
  });
}

function lineaFarmacia(institucion: DatosInstitucionales): string {
  const partes = [
    `${institucion.entidad} · ${institucion.farmaciaNombre}`,
  ];
  if (institucion.farmaciaDireccion) partes.push(institucion.farmaciaDireccion);
  if (institucion.farmaciaTelefono) partes.push(institucion.farmaciaTelefono);
  return partes.join(" · ");
}

export function encabezadoPdf(doc: jsPDF, opts: EncabezadoPdfOpts): number {
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PALETA_RGB.secundario);
  doc.text(lineaFarmacia(opts.institucion), PDF_MARGEN_X, y);
  y += 6;

  doc.setFontSize(16);
  doc.setTextColor(...PALETA_RGB.texto);
  doc.text(opts.titulo, PDF_MARGEN_X, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PALETA_RGB.gris);
  const linea3 =
    opts.periodo?.trim() ||
    opts.subtitulo?.trim() ||
    "";
  if (linea3) {
    doc.text(linea3, PDF_MARGEN_X, y);
    y += 5;
  }

  doc.setFontSize(9);
  doc.text(textoGeneradoInforme(opts.generadoPor), PDF_MARGEN_X, y);
  y += 4;

  doc.setDrawColor(...PALETA_RGB.secundario);
  doc.setLineWidth(0.4);
  doc.line(PDF_MARGEN_X, y, PDF_MARGEN_X + PDF_ANCHO_UTIL, y);

  return y + 6;
}

export function piePaginas(doc: jsPDF, tituloInforme: string) {
  const total = doc.getNumberOfPages();
  const alto = doc.internal.pageSize.getHeight();
  const ancho = doc.internal.pageSize.getWidth();

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PALETA_RGB.gris);
    const pieY = alto - 8;
    doc.text(`FarmaMuni · ${tituloInforme}`, PDF_MARGEN_X, pieY);
    doc.text(`Página ${pagina} de ${total}`, ancho - PDF_MARGEN_X, pieY, {
      align: "right",
    });
  }
}

export function estilosTabla(extra?: {
  fontSize?: number;
  cellPadding?: number;
}) {
  return {
    theme: "striped" as const,
    headStyles: {
      fillColor: PALETA_RGB.primario,
      textColor: PALETA_RGB.blanco,
      fontStyle: "bold" as const,
      fontSize: extra?.fontSize ?? 8,
    },
    alternateRowStyles: {
      fillColor: PALETA_RGB.claro,
    },
    styles: {
      fontSize: extra?.fontSize ?? 8,
      cellPadding: extra?.cellPadding ?? 2.5,
      textColor: PALETA_RGB.texto,
      lineColor: [228, 228, 231] as [number, number, number],
      lineWidth: 0.1,
    },
    margin: { left: PDF_MARGEN_X, right: PDF_MARGEN_X },
  };
}

export function columnasNumericas(indices: number[]) {
  return Object.fromEntries(
    indices.map((i) => [i, { halign: "right" as const }]),
  );
}

export function filaTotales(
  etiqueta: string,
  valores: (string | number)[],
): RowInput {
  return [etiqueta, ...valores.map((v, i) => (i === 0 ? v : v))];
}

export function tituloSeccion(doc: jsPDF, y: number, texto: string): number {
  const alto = doc.internal.pageSize.getHeight();
  if (y > alto - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(...PALETA_RGB.primario);
  doc.rect(PDF_MARGEN_X, y - 2.5, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PALETA_RGB.primario);
  doc.text(texto, PDF_MARGEN_X + 5, y);
  return y + 8;
}

export type DocConTabla = jsPDF & { lastAutoTable?: { finalY: number } };

export function finalYTabla(doc: jsPDF): number {
  return (doc as DocConTabla).lastAutoTable?.finalY ?? 0;
}

export function aplicarEstadoCelda(
  data: CellHookData,
  columna: number,
  estilos: Record<string, Partial<CellHookData["cell"]["styles"]>>,
) {
  if (data.section !== "body" || data.column.index !== columna) return;
  const clave = String(data.cell.raw ?? "");
  const estilo = estilos[clave];
  if (estilo) {
    Object.assign(data.cell.styles, estilo);
  }
}
