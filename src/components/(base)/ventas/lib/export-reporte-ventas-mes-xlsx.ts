import ExcelJS from "exceljs";
import { hexArgb, PALETA, type MetaInforme } from "@/lib/reportes/identidad";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
} from "@/lib/reportes/excel-base";
import { nombreArchivo } from "@/lib/reportes/nombres";
import { fmtQ } from "@/lib/utils";
import type { ReporteVentasMes } from "./reporte-ventas-mes";

const VERDE = hexArgb(PALETA.secundario);
const VERDE_OSCURO = hexArgb(PALETA.primario);
const VERDE_SUAVE = hexArgb(PALETA.claro);
const VERDE_PALIDO = "FFF4F7F4";
const NARANJA = "FFC28A38";
const GRIS = hexArgb(PALETA.gris);
const GRIS_CLARO = "FFF4F4F5";
const GRIS_BORDE = "FFE4E4E7";
const TEXTO = hexArgb(PALETA.texto);
const BADGE_OK = "FFDCEBDF";
const BADGE_OK_TXT = "FF15803D";
const BADGE_ANUL = "FFFECACA";
const BADGE_ANUL_TXT = hexArgb(PALETA.rojo);
const BLANCO = "FFFFFFFF";

const bordeFino: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: GRIS_BORDE } },
  left: { style: "thin", color: { argb: GRIS_BORDE } },
  bottom: { style: "thin", color: { argb: GRIS_BORDE } },
  right: { style: "thin", color: { argb: GRIS_BORDE } },
};

function encabezadoOpts(reporte: ReporteVentasMes, meta: MetaInforme) {
  return {
    titulo: "Reporte mensual de ventas",
    periodo: reporte.periodoLabel,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 8,
  };
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

function hojaResumen(
  wb: ExcelJS.Workbook,
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const { ws, filaInicio } = hojaConEncabezado(wb, "Resumen", encabezadoOpts(reporte, meta));
  let r = tituloSeccion(ws, filaInicio, "Resumen del mes");

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

function hojaFormaPago(
  wb: ExcelJS.Workbook,
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const { ws, filaInicio } = hojaConEncabezado(
    wb,
    "Forma de pago",
    encabezadoOpts(reporte, meta),
  );
  let r = tituloSeccion(ws, filaInicio, "Forma de pago");

  encabezadoTabla(ws, r, ["FORMA", "VENTAS", "MONTO"]);
  cuerpoTabla(ws, r + 1, [
    [
      "Contado",
      reporte.resumen.porContado.cantidad,
      reporte.resumen.porContado.monto,
    ],
    [
      "Tarjeta",
      reporte.resumen.porTarjeta.cantidad,
      reporte.resumen.porTarjeta.monto,
    ],
    [
      "Crédito",
      reporte.resumen.porCredito.cantidad,
      reporte.resumen.porCredito.monto,
    ],
  ]);
  for (let i = 0; i < 3; i++) {
    const row = ws.getRow(r + 1 + i);
    row.getCell(2).numFmt = "#,##0";
    row.getCell(3).numFmt = '"Q"#,##0.00';
    row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
  }
  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 16;
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

function hojaAnuladas(
  wb: ExcelJS.Workbook,
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const { ws, filaInicio } = hojaConEncabezado(wb, "Anuladas", encabezadoOpts(reporte, meta));
  let r = tituloSeccion(ws, filaInicio, "Ventas anuladas");

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

function hojaHistorial(
  wb: ExcelJS.Workbook,
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const { ws, filaInicio } = hojaConEncabezado(wb, "Historial", encabezadoOpts(reporte, meta));
  ws.views = [{ state: "frozen", ySplit: filaInicio, showGridLines: false }];
  const r = tituloSeccion(ws, filaInicio, "Historial de ventas");

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
    const row = ws.getRow(r + 1 + idx);
    const totalCell = row.getCell(5);
    totalCell.numFmt = '"Q"#,##0.00';
    totalCell.alignment = { horizontal: "right", vertical: "middle" };
    const cell = row.getCell(6);
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

function hojaVendedores(
  wb: ExcelJS.Workbook,
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const { ws, filaInicio } = hojaConEncabezado(
    wb,
    "Vendedores",
    encabezadoOpts(reporte, meta),
  );
  const r = tituloSeccion(ws, filaInicio, "Resumen por vendedor");
  encabezadoTabla(ws, r, ["VENDEDOR", "VENTAS", "MONTO"]);
  cuerpoTabla(
    ws,
    r + 1,
    reporte.porVendedor.map((v) => [v.vendedor, v.ventas, v.monto]),
  );
  reporte.porVendedor.forEach((_, idx) => {
    const row = ws.getRow(r + 1 + idx);
    row.getCell(2).numFmt = "#,##0";
    row.getCell(3).numFmt = '"Q"#,##0.00';
  });
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 16;
}

function hojaMasVendidos(
  wb: ExcelJS.Workbook,
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const { ws, filaInicio } = hojaConEncabezado(
    wb,
    "Más vendidos",
    encabezadoOpts(reporte, meta),
  );
  let r = tituloSeccion(ws, filaInicio, "Medicamentos más vendidos (vigentes)");

  const items = reporte.topProductos;
  if (!items.length) {
    ws.mergeCells(r, 1, r, 8);
    ws.getCell(r, 1).value = "Sin detalle de productos en el periodo.";
    ws.getCell(r, 1).font = { size: 10, color: { argb: GRIS } };
    return;
  }

  encabezadoTabla(ws, r, [
    "PRODUCTO",
    "MARCA",
    "CANT.",
    "MONTO",
    "COSTO",
    "GANANCIA",
  ]);
  cuerpoTabla(
    ws,
    r + 1,
    items.map((p) => [
      p.producto,
      p.marca,
      p.cantidad,
      p.monto,
      p.costo,
      p.ganancia,
    ]),
  );
  items.forEach((_, idx) => {
    const row = ws.getRow(r + 1 + idx);
    row.getCell(3).numFmt = "#,##0";
    for (let c = 4; c <= 6; c++) {
      row.getCell(c).numFmt = '"Q"#,##0.00';
    }
  });
  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 22;
}

export async function descargarReporteVentasMesExcel(
  reporte: ReporteVentasMes,
  meta: MetaInforme,
) {
  const wb = crearLibro();

  hojaResumen(wb, reporte, meta);
  hojaFormaPago(wb, reporte, meta);
  hojaAnuladas(wb, reporte, meta);
  hojaHistorial(wb, reporte, meta);
  hojaVendedores(wb, reporte, meta);
  hojaMasVendidos(wb, reporte, meta);

  await guardarLibro(
    wb,
    nombreArchivo("Reporte_Ventas", reporte.periodoClave, "xlsx"),
  );
}
