import ExcelJS from "exceljs";
import { hexArgb, PALETA, type MetaInforme } from "@/lib/reportes/identidad";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
  tablaExcel,
} from "@/lib/reportes/excel-base";
import { nombreArchivo } from "@/lib/reportes/nombres";
import { formatearCambioPorcentaje, type ReporteIngresosEgresos } from "./reporte-ingresos-egresos";

const TITULO = "Ingresos y egresos del período";

function filaTotalesPorTipo(
  ws: ExcelJS.Worksheet,
  fila: number,
  colTipo: number,
  colMonto: number,
  primeraFilaDatos: number,
  ultimaFilaDatos: number,
) {
  const letraTipo = ws.getColumn(colTipo).letter;
  const letraMonto = ws.getColumn(colMonto).letter;

  const filaIng = fila;
  const c0 = ws.getRow(filaIng).getCell(1);
  c0.value = "Total ingresos";
  c0.font = { bold: true, size: 9 };
  ws.getRow(filaIng).getCell(colMonto).value = {
    formula: `SUMIF(${letraTipo}${primeraFilaDatos}:${letraTipo}${ultimaFilaDatos},"Ingreso",${letraMonto}${primeraFilaDatos}:${letraMonto}${ultimaFilaDatos})`,
  };
  ws.getRow(filaIng).getCell(colMonto).numFmt = '"Q"#,##0.00';
  ws.getRow(filaIng).getCell(colMonto).font = { bold: true };

  const filaEgr = fila + 1;
  ws.getRow(filaEgr).getCell(1).value = "Total egresos";
  ws.getRow(filaEgr).getCell(1).font = { bold: true, size: 9 };
  ws.getRow(filaEgr).getCell(colMonto).value = {
    formula: `SUMIF(${letraTipo}${primeraFilaDatos}:${letraTipo}${ultimaFilaDatos},"Egreso",${letraMonto}${primeraFilaDatos}:${letraMonto}${ultimaFilaDatos})`,
  };
  ws.getRow(filaEgr).getCell(colMonto).numFmt = '"Q"#,##0.00';
  ws.getRow(filaEgr).getCell(colMonto).font = { bold: true };
}

export async function descargarReporteIngresosEgresosExcel(
  reporte: ReporteIngresosEgresos,
  meta: MetaInforme,
) {
  const wb = crearLibro();
  const enc = {
    titulo: TITULO,
    periodo: reporte.periodoLabel,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 6,
  };

  const { ws: wsResumen, filaInicio: r0 } = hojaConEncabezado(wb, "Resumen", enc);
  let r = tablaExcel(
    wsResumen,
    r0,
    [
      { titulo: "Concepto", clave: "concepto", tipo: "texto", ancho: 32 },
      { titulo: "Monto", clave: "monto", tipo: "moneda", ancho: 16 },
    ],
    [
      { concepto: "Total ingresos", monto: reporte.resumen.totalIngresos },
      { concepto: "Total egresos", monto: reporte.resumen.totalEgresos },
      { concepto: "Resultado (ingresos − egresos)", monto: reporte.resumen.resultado },
    ],
  );

  r += 2;
  wsResumen.getCell(r, 1).value = "Comparación con período anterior";
  wsResumen.getCell(r, 1).font = {
    bold: true,
    size: 11,
    color: { argb: hexArgb(PALETA.primario) },
  };
  r += 1;
  wsResumen.getCell(r, 1).value = reporte.periodoAnteriorLabel;
  wsResumen.getCell(r, 1).font = { size: 9, color: { argb: hexArgb(PALETA.gris) } };
  r += 1;

  r = tablaExcel(
    wsResumen,
    r,
    [
      { titulo: "Concepto", clave: "concepto", tipo: "texto", ancho: 22 },
      { titulo: "Período actual", clave: "actual", tipo: "moneda", ancho: 16 },
      { titulo: "Período anterior", clave: "anterior", tipo: "moneda", ancho: 16 },
      { titulo: "Variación", clave: "variacion", tipo: "moneda", ancho: 14 },
      { titulo: "% cambio", clave: "pct", tipo: "texto", ancho: 12 },
    ],
    [
      {
        concepto: "Ingresos",
        actual: reporte.comparacion.actual.totalIngresos,
        anterior: reporte.comparacion.anterior.totalIngresos,
        variacion: reporte.comparacion.cambioIngresos.monto,
        pct: formatearCambioPorcentaje(reporte.comparacion.cambioIngresos.porcentaje),
      },
      {
        concepto: "Egresos",
        actual: reporte.comparacion.actual.totalEgresos,
        anterior: reporte.comparacion.anterior.totalEgresos,
        variacion: reporte.comparacion.cambioEgresos.monto,
        pct: formatearCambioPorcentaje(reporte.comparacion.cambioEgresos.porcentaje),
      },
      {
        concepto: "Resultado",
        actual: reporte.comparacion.actual.resultado,
        anterior: reporte.comparacion.anterior.resultado,
        variacion: reporte.comparacion.cambioResultado.monto,
        pct: formatearCambioPorcentaje(reporte.comparacion.cambioResultado.porcentaje),
      },
    ],
  );

  r += 2;
  r = tablaExcel(
    wsResumen,
    r,
    [
      { titulo: "Ingresos por categoría", clave: "etiqueta", tipo: "texto", ancho: 28 },
      { titulo: "Monto", clave: "monto", tipo: "moneda", ancho: 14 },
    ],
    reporte.ingresosPorCategoria.map((f) => ({
      etiqueta: f.etiqueta,
      monto: f.monto,
    })),
    { totales: true, etiquetaTotales: "Total ingresos" },
  );

  r += 2;
  tablaExcel(
    wsResumen,
    r,
    [
      { titulo: "Egresos por categoría", clave: "etiqueta", tipo: "texto", ancho: 28 },
      { titulo: "Monto", clave: "monto", tipo: "moneda", ancho: 14 },
    ],
    reporte.egresosPorCategoria.map((f) => ({
      etiqueta: f.etiqueta,
      monto: f.monto,
    })),
    { totales: true, etiquetaTotales: "Total egresos" },
  );

  const { ws: wsDet, filaInicio: d0 } = hojaConEncabezado(wb, "Movimientos", enc);
  type FilaDetExcel = {
    fecha: string;
    tipo: string;
    categoria: string;
    descripcion: string;
    referencia: string;
    monto: number;
  };
  const columnasDet = [
    { titulo: "Fecha", clave: "fecha", tipo: "texto" as const, ancho: 26 },
    { titulo: "Tipo", clave: "tipo", tipo: "texto" as const, ancho: 12 },
    { titulo: "Categoría", clave: "categoria", tipo: "texto" as const, ancho: 22 },
    { titulo: "Descripción", clave: "descripcion", tipo: "texto" as const, ancho: 36 },
    { titulo: "Referencia", clave: "referencia", tipo: "texto" as const, ancho: 16 },
    { titulo: "Monto", clave: "monto", tipo: "moneda" as const, ancho: 14 },
  ] satisfies import("@/lib/reportes/excel-base").ColumnaExcel<FilaDetExcel>[];
  const filasDet: FilaDetExcel[] = reporte.detalle.map((f) => ({
    fecha: f.fecha,
    tipo: f.tipo,
    categoria: f.categoria,
    descripcion: f.descripcion,
    referencia: f.referencia,
    monto: f.monto,
  }));

  const primeraFilaDatos = d0 + 1;
  const ultimaFilaDatos = primeraFilaDatos + Math.max(filasDet.length, 1) - 1;
  tablaExcel(wsDet, d0, columnasDet, filasDet);

  if (filasDet.length > 0) {
    filaTotalesPorTipo(
      wsDet,
      ultimaFilaDatos + 2,
      2,
      6,
      primeraFilaDatos,
      ultimaFilaDatos,
    );
  }

  await guardarLibro(
    wb,
    nombreArchivo("Ingresos_Egresos_Periodo", reporte.periodoLabel, "xlsx"),
  );
}
