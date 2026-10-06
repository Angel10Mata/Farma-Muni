import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { fmtQ } from "@/lib/utils";
import type { ReporteVentasMes } from "./reporte-ventas-mes";

const VERDE = "FF8DA78E";
const VERDE_OSCURO = "FF3B523D";
const VERDE_SUAVE = "FFE8F0E9";
const VERDE_PALIDO = "FFF4F7F4";
const NARANJA = "FFC28A38";
const GRIS = "FF71717A";
const GRIS_CLARO = "FFF4F4F5";
const GRIS_BORDE = "FFE4E4E7";
const TEXTO = "FF18181B";
const BADGE_OK = "FFDCEBDF";
const BADGE_OK_TXT = "FF15803D";
const BADGE_ANUL = "FFFECACA";
const BADGE_ANUL_TXT = "FFB91C1C";
const BLANCO = "FFFFFFFF";

const bordeFino: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: GRIS_BORDE } },
  left: { style: "thin", color: { argb: GRIS_BORDE } },
  bottom: { style: "thin", color: { argb: GRIS_BORDE } },
  right: { style: "thin", color: { argb: GRIS_BORDE } },
};

function subtituloGeneracion(reporte: ReporteVentasMes): string {
  const fechaGen = new Date().toLocaleString("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${reporte.periodoLabel} — generado el ${fechaGen} — realizado por ${reporte.generadoPor}`;
}

function encabezadoInforme(
  ws: ExcelJS.Worksheet,
  reporte: ReporteVentasMes,
  anchoMerge: number,
) {
  ws.mergeCells(1, 1, 1, anchoMerge);
  const marca = ws.getCell(1, 1);
  marca.value = "FARMAMUNI  ·  SISTEMA DE FARMACIA";
  marca.font = { bold: true, size: 9, color: { argb: VERDE } };
  marca.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 16;

  ws.mergeCells(2, 1, 2, anchoMerge);
  const titulo = ws.getCell(2, 1);
  titulo.value = "Reporte mensual de ventas";
  titulo.font = { bold: true, size: 16, color: { argb: TEXTO } };
  titulo.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 24;

  ws.mergeCells(3, 1, 3, anchoMerge);
  const sub = ws.getCell(3, 1);
  sub.value = subtituloGeneracion(reporte);
  sub.font = { size: 10, color: { argb: GRIS } };
  sub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(3).height = 18;

  for (let c = 1; c <= anchoMerge; c++) {
    const linea = ws.getCell(4, c);
    linea.border = {
      bottom: { style: "medium", color: { argb: VERDE } },
    };
  }
  ws.getRow(4).height = 6;
}

function tituloSeccion(ws: ExcelJS.Worksheet, fila: number, texto: string) {
  const icono = ws.getCell(fila, 1);
  icono.value = "";
  icono.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: VERDE },
  };
  ws.getColumn(1).width = 2;

  ws.mergeCells(fila, 2, fila, 8);
  const cell = ws.getCell(fila, 2);
  cell.value = texto;
  cell.font = { bold: true, size: 12, color: { argb: VERDE_OSCURO } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(fila).height = 20;
  return fila + 2;
}

function rellenoCelda(
  cell: ExcelJS.Cell,
  argb: string,
  bold = false,
  size = 10,
  color = TEXTO,
  align: "left" | "right" | "center" = "left",
) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb },
  };
  cell.font = { size, bold, color: { argb: color } };
  cell.alignment = { vertical: "middle", horizontal: align, indent: align === "left" ? 1 : 0 };
  cell.border = bordeFino;
}

function barraProgreso(
  ws: ExcelJS.Worksheet,
  fila: number,
  etiqueta: string,
  valor: number,
  max: number,
  colorBarra: string,
  segmentos = 14,
  colInicio = 3,
) {
  ws.getCell(fila, 1).value = etiqueta;
  ws.getCell(fila, 1).font = { size: 10, color: { argb: TEXTO } };
  ws.getCell(fila, 1).alignment = { vertical: "middle" };

  const llenos = max > 0 ? Math.round((valor / max) * segmentos) : 0;
  for (let i = 0; i < segmentos; i++) {
    const cell = ws.getCell(fila, colInicio + i);
    rellenoCelda(cell, i < llenos ? colorBarra : GRIS_CLARO);
  }
  const total = ws.getCell(fila, colInicio + segmentos + 1);
  total.value = valor;
  total.font = { bold: true, size: 10, color: { argb: TEXTO } };
  total.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(fila).height = 20;
}

function hojaResumen(wb: ExcelJS.Workbook, reporte: ReporteVentasMes) {
  const ws = wb.addWorksheet("Resumen", {
    views: [{ showGridLines: false }],
  });
  encabezadoInforme(ws, reporte, 8);
  let r = tituloSeccion(ws, 6, "Resumen del mes");

  const ticket =
    reporte.resumen.ventasActivas > 0
      ? reporte.resumen.montoTotalActivas / reporte.resumen.ventasActivas
      : 0;

  ws.mergeCells(r, 1, r, 5);
  const cMonto = ws.getCell(r, 1);
  cMonto.value = "MONTO TOTAL DEL MES — VENTAS VIGENTES";
  cMonto.font = { bold: true, size: 8, color: { argb: VERDE_OSCURO } };
  cMonto.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: VERDE_SUAVE },
  };
  cMonto.alignment = { vertical: "top", horizontal: "left", indent: 1 };

  ws.mergeCells(r + 1, 1, r + 2, 5);
  const cValor = ws.getCell(r + 1, 1);
  cValor.value = fmtQ(reporte.resumen.montoTotalActivas);
  cValor.font = { bold: true, size: 20, color: { argb: VERDE_OSCURO } };
  cValor.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: VERDE_SUAVE },
  };
  cValor.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  ws.mergeCells(r, 6, r, 8);
  ws.getCell(r, 6).value = `${reporte.resumen.ventasActivas} ventas vigentes`;
  ws.getCell(r, 6).font = { size: 10, color: { argb: GRIS } };
  ws.getCell(r, 6).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: VERDE_SUAVE },
  };
  ws.mergeCells(r + 1, 6, r + 2, 8);
  ws.getCell(r + 1, 6).value = `${fmtQ(ticket)} de ticket promedio`;
  ws.getCell(r + 1, 6).font = { size: 10, color: { argb: GRIS } };
  ws.getCell(r + 1, 6).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: VERDE_SUAVE },
  };
  for (let row = r; row <= r + 2; row++) {
    for (let col = 1; col <= 8; col++) {
      ws.getCell(row, col).border = {
        top: { style: "thin", color: { argb: VERDE } },
        left: { style: "thin", color: { argb: VERDE } },
        bottom: { style: "thin", color: { argb: VERDE } },
        right: { style: "thin", color: { argb: VERDE } },
      };
    }
    ws.getRow(row).height = 22;
  }

  r += 5;
  const mini = [
    ["VENTAS REGISTRADAS", reporte.resumen.totalVentas],
    ["VENTAS VIGENTES", reporte.resumen.ventasActivas],
    ["VENTAS ANULADAS", reporte.resumen.anuladas],
  ];
  mini.forEach(([etq, val], i) => {
    const col = 1 + i * 3;
    ws.mergeCells(r, col, r + 1, col + 2);
    const labelCell = ws.getCell(r, col);
    labelCell.value = etq;
    labelCell.font = { bold: true, size: 7, color: { argb: GRIS } };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BLANCO },
    };
    labelCell.alignment = { vertical: "top", horizontal: "left", indent: 1 };

    ws.mergeCells(r + 2, col, r + 3, col + 2);
    const valCell = ws.getCell(r + 2, col);
    valCell.value = val;
    valCell.font = { bold: true, size: 16, color: { argb: TEXTO } };
    valCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BLANCO },
    };
    valCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    for (let row = r; row <= r + 3; row++) {
      for (let c = col; c <= col + 2; c++) {
        ws.getCell(row, c).border = bordeFino;
      }
    }
  });

  ws.getColumn(2).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(8).width = 14;
}

function hojaFormaPago(wb: ExcelJS.Workbook, reporte: ReporteVentasMes) {
  const ws = wb.addWorksheet("Forma de pago", {
    views: [{ showGridLines: false }],
  });
  encabezadoInforme(ws, reporte, 8);
  let r = tituloSeccion(ws, 6, "Forma de pago");

  const max = Math.max(
    reporte.resumen.porContado,
    reporte.resumen.porCredito,
    reporte.resumen.porTarjeta,
    1,
  );
  barraProgreso(ws, r, "Contado", reporte.resumen.porContado, max, VERDE);
  barraProgreso(ws, r + 1, "Crédito", reporte.resumen.porCredito, max, NARANJA);
  barraProgreso(ws, r + 2, "Tarjeta", reporte.resumen.porTarjeta, max, GRIS_BORDE);
  ws.getColumn(1).width = 12;
}

function encabezadoTabla(ws: ExcelJS.Worksheet, fila: number, titulos: string[]) {
  const row = ws.getRow(fila);
  titulos.forEach((t, i) => {
    const cell = row.getCell(i + 1);
    cell.value = t;
    cell.font = { bold: true, size: 9, color: { argb: GRIS } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GRIS_CLARO },
    };
    cell.border = bordeFino;
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  });
  row.height = 20;
}

function cuerpoTabla(
  ws: ExcelJS.Worksheet,
  desde: number,
  filas: (string | number)[][],
) {
  filas.forEach((vals, idx) => {
    const row = ws.getRow(desde + idx);
    vals.forEach((v, col) => {
      const cell = row.getCell(col + 1);
      cell.value = v;
      cell.font = { size: 9, color: { argb: TEXTO } };
      cell.border = bordeFino;
      cell.alignment = {
        vertical: "middle",
        horizontal: col === vals.length - 1 && String(v).startsWith("Q") ? "right" : "left",
        indent: 1,
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: VERDE_PALIDO },
        };
      }
    });
    row.height = 18;
  });
}

function hojaAnuladas(wb: ExcelJS.Workbook, reporte: ReporteVentasMes) {
  const ws = wb.addWorksheet("Anuladas", {
    views: [{ showGridLines: false }],
  });
  encabezadoInforme(ws, reporte, 8);
  let r = tituloSeccion(ws, 6, "Ventas anuladas");

  if (!reporte.anulaciones.length) {
    ws.mergeCells(r, 1, r, 8);
    const aviso = ws.getCell(r, 1);
    aviso.value = "No se registraron anulaciones en este periodo.";
    aviso.font = { size: 10, color: { argb: VERDE_OSCURO } };
    aviso.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: VERDE_SUAVE },
    };
    aviso.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(r).height = 28;
    return;
  }

  encabezadoTabla(ws, r, ["RECIBO", "FECHA", "CLIENTE", "AUTORIZÓ", "MOTIVO"]);
  cuerpoTabla(
    ws,
    r + 1,
    reporte.anulaciones.map((a) => [
      a.recibo,
      a.fecha,
      a.cliente,
      a.autor,
      a.motivo,
    ]),
  );
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 26;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 40;
}

function hojaHistorial(wb: ExcelJS.Workbook, reporte: ReporteVentasMes) {
  const ws = wb.addWorksheet("Historial", {
    views: [{ state: "frozen", ySplit: 10, showGridLines: false }],
  });
  encabezadoInforme(ws, reporte, 8);
  const r = tituloSeccion(ws, 6, "Historial de ventas");

  encabezadoTabla(ws, r, [
    "RECIBO",
    "FECHA",
    "CLIENTE",
    "TIPO",
    "TOTAL",
    "ESTADO",
  ]);
  const filas = reporte.historial.map((h) => [
    h.recibo,
    h.fecha,
    h.cliente,
    h.tipo,
    h.total,
    h.estado,
  ]);
  cuerpoTabla(ws, r + 1, filas);
  filas.forEach((fila, idx) => {
    const cell = ws.getRow(r + 1 + idx).getCell(6);
    const estado = String(fila[5]);
    if (estado === "Vigente") {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BADGE_OK },
      };
      cell.font = { bold: true, size: 9, color: { argb: BADGE_OK_TXT } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    } else if (estado === "Anulada") {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BADGE_ANUL },
      };
      cell.font = { bold: true, size: 9, color: { argb: BADGE_ANUL_TXT } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 24;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 12;
}

function hojaMasVendidos(wb: ExcelJS.Workbook, reporte: ReporteVentasMes) {
  const ws = wb.addWorksheet("Más vendidos", {
    views: [{ showGridLines: false }],
  });
  encabezadoInforme(ws, reporte, 8);
  let r = tituloSeccion(ws, 6, "Medicamentos más vendidos (vigentes)");

  const items = reporte.topProductos;
  if (!items.length) {
    ws.mergeCells(r, 1, r, 8);
    ws.getCell(r, 1).value = "Sin detalle de productos en el periodo.";
    ws.getCell(r, 1).font = { size: 10, color: { argb: GRIS } };
    return;
  }

  const max = Math.max(...items.map((p) => p.cantidad), 1);
  items.forEach((prod, i) => {
    const fila = r + i;
    ws.getCell(fila, 1).value = prod.nombre;
    ws.getCell(fila, 1).font = { size: 9, color: { argb: TEXTO } };
    ws.getCell(fila, 1).alignment = { vertical: "middle" };

    const t = items.length > 1 ? i / (items.length - 1) : 0;
    const rC = Math.round(141 + (248 - 141) * t);
    const gC = Math.round(167 + (250 - 167) * t);
    const bC = Math.round(142 + (248 - 142) * t);
    const colorBarra =
      `FF${rC.toString(16).padStart(2, "0")}${gC.toString(16).padStart(2, "0")}${bC.toString(16).padStart(2, "0")}`.toUpperCase();

    const llenos = Math.round((prod.cantidad / max) * 12);
    for (let s = 0; s < 12; s++) {
      rellenoCelda(ws.getCell(fila, 3 + s), s < llenos ? colorBarra : GRIS_CLARO);
    }
    ws.getCell(fila, 16).value = prod.cantidad;
    ws.getCell(fila, 16).font = { bold: true, size: 9 };
    ws.getRow(fila).height = 18;
  });

  ws.getColumn(1).width = 38;
  ws.getColumn(2).width = 2;
}

export async function descargarReporteVentasMesExcel(reporte: ReporteVentasMes) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FarmaMuni";
  wb.created = new Date();

  hojaResumen(wb, reporte);
  hojaFormaPago(wb, reporte);
  hojaAnuladas(wb, reporte);
  hojaHistorial(wb, reporte);
  hojaMasVendidos(wb, reporte);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `Reporte_Ventas_${reporte.periodoClave}.xlsx`);
}
