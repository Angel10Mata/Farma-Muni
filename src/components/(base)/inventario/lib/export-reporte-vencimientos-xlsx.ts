import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { formatFechaCalendarioGt } from "@/lib/fechas-gt";
import {
  CATEGORIAS_VENCIMIENTO_LOTE,
  ETIQUETAS_CATEGORIA_VENCIMIENTO,
  categoriaVencimientoLote,
  diasRestantesVencimientoGt,
  esLoteActivoConExistencia,
  type CategoriaVencimientoLote,
} from "@/lib/vencimientos-gt";
import { tituloProductoFarmacia } from "./helpers";
import type { FilaReporteVencimientoLote } from "./reportes-vencimientos";

function filasPorCategoria(
  filas: FilaReporteVencimientoLote[],
  categoria: CategoriaVencimientoLote,
) {
  return filas.filter(
    (f) =>
      esLoteActivoConExistencia({
        activo: true,
        cantidad_actual: f.existencia,
      }) && categoriaVencimientoLote(f.fecha_vencimiento) === categoria,
  );
}

export async function descargarReporteVencimientosLotesExcel(
  filas: FilaReporteVencimientoLote[],
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Vencimientos");

  ws.addRow(["FarmaMuni — Lotes vencidos y por vencer"]);
  ws.addRow([`Generado: ${new Date().toLocaleString("es-GT")}`]);
  ws.addRow([]);

  const titulos = [
    "Producto",
    "Lote",
    "Laboratorio",
    "Proveedor",
    "Existencia",
    "Vencimiento",
    "Días restantes",
    "Valor costo",
  ];

  for (const cat of CATEGORIAS_VENCIMIENTO_LOTE) {
    const grupo = filasPorCategoria(filas, cat);
    if (grupo.length === 0) continue;

    ws.addRow([ETIQUETAS_CATEGORIA_VENCIMIENTO[cat]]);
    const head = ws.addRow(titulos);
    head.font = { bold: true };

    for (const f of grupo) {
      const dias = diasRestantesVencimientoGt(f.fecha_vencimiento);
      ws.addRow([
        tituloProductoFarmacia(f),
        f.numero_lote || "—",
        f.laboratorio || "—",
        f.proveedor_nombre || "—",
        f.existencia,
        f.fecha_vencimiento
          ? formatFechaCalendarioGt(f.fecha_vencimiento)
          : "—",
        dias === null ? "—" : dias,
        f.valor_costo,
      ]);
    }
    ws.addRow([]);
  }

  ws.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `Lotes_Vencidos_Por_Vencer_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
