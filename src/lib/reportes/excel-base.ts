import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { hexArgb, PALETA, type DatosInstitucionales } from "./identidad";
import { textoGeneradoInforme } from "./identidad";

const BORDE = "FFE4E4E7";

const bordeFino: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDE } },
  left: { style: "thin", color: { argb: BORDE } },
  bottom: { style: "thin", color: { argb: BORDE } },
  right: { style: "thin", color: { argb: BORDE } },
};

export type ColumnaExcel<T extends Record<string, unknown>> = {
  titulo: string;
  clave: keyof T & string;
  tipo: "texto" | "entero" | "moneda" | "fecha" | "porcentaje";
  ancho?: number;
};

export type EncabezadoExcelOpts = {
  titulo: string;
  periodo?: string;
  subtitulo?: string;
  generadoPor: string;
  institucion: DatosInstitucionales;
  columnasMerge?: number;
};

export function crearLibro() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FarmaMuni";
  wb.created = new Date();
  return wb;
}

function lineaInstitucion(institucion: DatosInstitucionales): string {
  const partes = [
    `${institucion.entidad} · ${institucion.farmaciaNombre}`,
  ];
  if (institucion.farmaciaDireccion) partes.push(institucion.farmaciaDireccion);
  if (institucion.farmaciaTelefono) partes.push(institucion.farmaciaTelefono);
  return partes.join(" · ");
}

export function hojaConEncabezado(
  wb: ExcelJS.Workbook,
  nombreHoja: string,
  opts: EncabezadoExcelOpts,
) {
  const ws = wb.addWorksheet(nombreHoja, {
    views: [{ showGridLines: false }],
  });
  const merge = opts.columnasMerge ?? 8;

  ws.mergeCells(1, 1, 1, merge);
  const r1 = ws.getCell(1, 1);
  r1.value = lineaInstitucion(opts.institucion);
  r1.font = { bold: true, size: 9, color: { argb: hexArgb(PALETA.secundario) } };
  ws.getRow(1).height = 16;

  ws.mergeCells(2, 1, 2, merge);
  const r2 = ws.getCell(2, 1);
  r2.value = opts.titulo;
  r2.font = { bold: true, size: 16, color: { argb: hexArgb(PALETA.texto) } };
  ws.getRow(2).height = 22;

  ws.mergeCells(3, 1, 3, merge);
  const r3 = ws.getCell(3, 1);
  const linea3 =
    opts.periodo?.trim() || opts.subtitulo?.trim() || "";
  r3.value = linea3;
  r3.font = { size: 10, color: { argb: hexArgb(PALETA.gris) } };
  ws.getRow(3).height = 18;

  ws.mergeCells(4, 1, 4, merge);
  const r4 = ws.getCell(4, 1);
  r4.value = textoGeneradoInforme(opts.generadoPor);
  r4.font = { size: 9, color: { argb: hexArgb(PALETA.gris) } };
  ws.getRow(4).height = 16;

  for (let c = 1; c <= merge; c += 1) {
    ws.getCell(5, c).border = {
      bottom: { style: "medium", color: { argb: hexArgb(PALETA.secundario) } },
    };
  }
  ws.getRow(5).height = 6;

  return { ws, filaInicio: 7 };
}

function numFmtColumna(tipo: ColumnaExcel<Record<string, unknown>>["tipo"]) {
  if (tipo === "moneda") return '"Q"#,##0.00';
  if (tipo === "entero") return "#,##0";
  if (tipo === "fecha") return "dd/mm/yyyy";
  if (tipo === "porcentaje") return "0.00%";
  return undefined;
}

function valorCelda(
  tipo: ColumnaExcel<Record<string, unknown>>["tipo"],
  valor: unknown,
): ExcelJS.CellValue {
  if (valor === null || valor === undefined || valor === "") return "";
  if (tipo === "fecha") {
    if (valor instanceof Date) return valor;
    const d = new Date(String(valor));
    return Number.isNaN(d.getTime()) ? String(valor) : d;
  }
  if (tipo === "entero" || tipo === "moneda" || tipo === "porcentaje") {
    const n = Number(valor);
    return Number.isFinite(n) ? n : String(valor);
  }
  return String(valor);
}

export function tablaExcel<T extends Record<string, unknown>>(
  ws: ExcelJS.Worksheet,
  filaInicio: number,
  columnas: ColumnaExcel<T>[],
  filas: T[],
  opciones?: { totales?: boolean; etiquetaTotales?: string },
) {
  const headRow = ws.getRow(filaInicio);
  columnas.forEach((col, idx) => {
    const cell = headRow.getCell(idx + 1);
    cell.value = col.titulo;
    cell.font = { bold: true, size: 9, color: { argb: hexArgb("#FFFFFF") } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: hexArgb(PALETA.primario) },
    };
    cell.border = bordeFino;
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    if (col.ancho) ws.getColumn(idx + 1).width = col.ancho;
  });
  headRow.height = 20;

  const primeraFilaDatos = filaInicio + 1;
  filas.forEach((fila, rowIdx) => {
    const row = ws.getRow(primeraFilaDatos + rowIdx);
    columnas.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const raw = fila[col.clave];
      cell.value = valorCelda(col.tipo, raw);
      const fmt = numFmtColumna(col.tipo);
      if (fmt) cell.numFmt = fmt;
      cell.font = { size: 9, color: { argb: hexArgb(PALETA.texto) } };
      cell.border = bordeFino;
      const alignRight =
        col.tipo === "moneda" ||
        col.tipo === "entero" ||
        col.tipo === "porcentaje";
      cell.alignment = {
        vertical: "middle",
        horizontal: alignRight ? "right" : "left",
        indent: alignRight ? 0 : 1,
      };
      if (rowIdx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: hexArgb(PALETA.claro) },
        };
      }
    });
    row.height = 18;
  });

  const ultimaFilaDatos = primeraFilaDatos + filas.length - 1;
  const filaFinTabla =
    filas.length > 0 ? ultimaFilaDatos : filaInicio;

  if (opciones?.totales && filas.length > 0) {
    const filaTot = ultimaFilaDatos + 1;
    const row = ws.getRow(filaTot);
    columnas.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.border = bordeFino;
      cell.font = { bold: true, size: 9, color: { argb: hexArgb(PALETA.texto) } };
      if (colIdx === 0) {
        cell.value = opciones.etiquetaTotales ?? "Totales";
        return;
      }
      const letra = ws.getColumn(colIdx + 1).letter;
      if (col.tipo === "moneda" || col.tipo === "entero") {
        cell.value = {
          formula: `SUM(${letra}${primeraFilaDatos}:${letra}${ultimaFilaDatos})`,
        };
        const fmt = numFmtColumna(col.tipo);
        if (fmt) cell.numFmt = fmt;
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
  }

  const colLetraFin = ws.getColumn(columnas.length).letter;
  ws.autoFilter = {
    from: { row: filaInicio, column: 1 },
    to: { row: filaFinTabla, column: columnas.length },
  };
  ws.views = [
    {
      state: "frozen",
      ySplit: filaInicio,
      showGridLines: false,
    },
  ];

  return filaFinTabla + (opciones?.totales && filas.length > 0 ? 2 : 1);
}

export async function guardarLibro(wb: ExcelJS.Workbook, nombreArchivo: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, nombreArchivo);
}
