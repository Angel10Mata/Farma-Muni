import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFechaCalendarioGt } from "@/lib/fechas-gt";
import {
  CATEGORIAS_VENCIMIENTO_LOTE,
  ETIQUETAS_CATEGORIA_VENCIMIENTO,
  categoriaVencimientoLote,
  diasRestantesVencimientoGt,
  esLoteActivoConExistencia,
  type CategoriaVencimientoLote,
} from "@/lib/vencimientos-gt";
import { fmtNum, fmtQ } from "@/lib/utils";
import { tituloProductoFarmacia, type CamposTituloProducto } from "./helpers";

export type FilaReporteVencimientoLote = CamposTituloProducto & {
  codigo?: string;
  numero_lote?: string | null;
  laboratorio?: string | null;
  proveedor_nombre?: string | null;
  existencia: number;
  fecha_vencimiento?: string | null;
  precio_costo?: number | null;
  valor_costo: number;
};

export function filasReporteDesdeInventario(
  productos: Array<{
    codigo: string;
    nombre: string;
    nombre_generico?: string | null;
    concentracion?: string | null;
    forma_farmaceutica?: string | null;
    presentacion?: string | null;
    stock_actual: number;
    fecha_vencimiento?: string | null;
    numero_lote?: string | null;
    laboratorio?: string | null;
    proveedor_nombre?: string | null;
    precio_costo?: number | null;
    activo: boolean;
  }>,
): FilaReporteVencimientoLote[] {
  return productos
    .filter((p) => p.activo && p.stock_actual > 0)
    .map((p) => {
      const costo = Number(p.precio_costo) || 0;
      const existencia = Number(p.stock_actual) || 0;
      return {
        nombre: p.nombre,
        nombre_generico: p.nombre_generico,
        concentracion: p.concentracion,
        forma_farmaceutica: p.forma_farmaceutica,
        presentacion: p.presentacion,
        codigo: p.codigo,
        numero_lote: p.numero_lote,
        laboratorio: p.laboratorio,
        proveedor_nombre: p.proveedor_nombre,
        existencia,
        fecha_vencimiento: p.fecha_vencimiento,
        precio_costo: costo,
        valor_costo: existencia * costo,
      };
    });
}

function filasCategoria(filas: FilaReporteVencimientoLote[], cat: CategoriaVencimientoLote) {
  return filas.filter(
    (f) =>
      f.existencia > 0 &&
      categoriaVencimientoLote(f.fecha_vencimiento) === cat,
  );
}

export function descargarReporteLotesVencidosPorVencer(filas: FilaReporteVencimientoLote[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FarmaMuni — Lotes vencidos y por vencer", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-GT")}`, 14, 22);

  let startY = 28;

  for (const cat of CATEGORIAS_VENCIMIENTO_LOTE) {
    const grupo = filasCategoria(filas, cat);
    if (grupo.length === 0) continue;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(ETIQUETAS_CATEGORIA_VENCIMIENTO[cat], 14, startY);
    startY += 4;

    autoTable(doc, {
      startY,
      head: [
        [
          "Producto",
          "Lote",
          "Laboratorio",
          "Proveedor",
          "Existencia",
          "Vencimiento",
          "Días",
          "Valor costo",
        ],
      ],
      body: grupo.map((f) => {
        const dias = diasRestantesVencimientoGt(f.fecha_vencimiento);
        return [
          tituloProductoFarmacia(f),
          f.numero_lote || "—",
          f.laboratorio || "—",
          f.proveedor_nombre || "—",
          fmtNum(f.existencia),
          f.fecha_vencimiento
            ? formatFechaCalendarioGt(f.fecha_vencimiento)
            : "—",
          dias === null ? "—" : String(dias),
          fmtQ(f.valor_costo),
        ];
      }),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [141, 167, 142], fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY;
    startY = (finalY ?? startY) + 10;

    if (startY > 180) {
      doc.addPage();
      startY = 20;
    }
  }

  doc.save(`Lotes_Vencidos_Por_Vencer_${new Date().toISOString().slice(0, 10)}.pdf`);
}
