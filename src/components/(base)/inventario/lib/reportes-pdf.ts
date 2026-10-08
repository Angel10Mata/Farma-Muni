import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtNum, fmtQ } from "@/lib/utils";
import {
  diasRestantesVencimiento,
  etiquetaEstadoVencimiento,
  isProductoProximoAVencer,
  isProductoVencido,
  precioVentaEfectivoLote,
  tituloProductoFarmacia,
} from "./helpers";

export type ProductoInventarioReporte = {
  codigo: string;
  nombre: string;
  nombre_generico?: string | null;
  concentracion?: string | null;
  forma_farmaceutica?: string | null;
  presentacion?: string | null;
  requiere_receta?: boolean;
  stock_actual: number;
  stock_minimo: number;
  precio_base: number;
  precio_venta?: number | null;
  precio_costo?: number | null;
  laboratorio?: string | null;
  proveedor_nombre?: string | null;
  activo: boolean;
  fecha_vencimiento?: string | null;
  numero_lote?: string | null;
  ubicacion?: string | null;
};

// Encabezado común del PDF
function encabezadoPdf(doc: jsPDF, titulo: string, subtitulo: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(82, 93, 83);
  doc.text(titulo, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitulo, 14, 25);
  doc.setDrawColor(193, 209, 197);
  doc.line(14, 28, 196, 28);
}

// Reporte de vencimientos
export function descargarReporteVencimientos(productos: ProductoInventarioReporte[]) {
  const doc = new jsPDF();
  const fechaGen = new Date().toLocaleString("es-GT");
  encabezadoPdf(
    doc,
    "FarmaMuni — Reporte de vencimientos",
    `Generado: ${fechaGen}`,
  );

  const conFecha = productos
    .filter((p) => p.fecha_vencimiento)
    .sort((a, b) => {
      const da = new Date(a.fecha_vencimiento!).getTime();
      const db = new Date(b.fecha_vencimiento!).getTime();
      return da - db;
    });

  autoTable(doc, {
    startY: 34,
    head: [
      [
        "Código",
        "Producto",
        "Genérico",
        "Presentación",
        "Laboratorio",
        "Proveedor",
        "P. venta",
        "Lote",
        "Vencimiento",
        "Días",
        "Existencias",
        "Estado",
      ],
    ],
    body: conFecha.map((p) => {
      const dias = diasRestantesVencimiento(p.fecha_vencimiento);
      const diasStr =
        dias === null ? "—" : dias < 0 ? `${Math.abs(dias)} vencido` : `${dias}`;
      const precioVenta = precioVentaEfectivoLote(p.precio_venta, p.precio_base);
      return [
        p.codigo || "—",
        tituloProductoFarmacia(p),
        p.nombre_generico || "—",
        p.presentacion || "—",
        p.laboratorio || "—",
        p.proveedor_nombre || "—",
        fmtQ(precioVenta),
        p.numero_lote || "—",
        new Date(p.fecha_vencimiento!).toLocaleDateString("es-GT"),
        diasStr,
        fmtNum(p.stock_actual),
        etiquetaEstadoVencimiento(p.fecha_vencimiento),
      ];
    }),
    headStyles: {
      fillColor: [141, 167, 142],
      textColor: [245, 245, 241],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  doc.save(`Reporte_Vencimientos_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Resumen de gestión
export function descargarReporteGestion(productos: ProductoInventarioReporte[]) {
  const doc = new jsPDF();
  const activos = productos.filter((p) => p.activo);
  const stockBajo = activos.filter((p) => p.stock_actual <= p.stock_minimo);
  const porVencer = activos.filter((p) =>
    isProductoProximoAVencer(p.fecha_vencimiento),
  );
  const vencidosConStock = activos.filter(
    (p) => isProductoVencido(p.fecha_vencimiento) && p.stock_actual > 0,
  );

  const totalUnidades = activos.reduce((s, p) => s + p.stock_actual, 0);
  const valorVentaEst = activos.reduce(
    (s, p) =>
      s +
      p.stock_actual * precioVentaEfectivoLote(p.precio_venta, p.precio_base),
    0,
  );
  const valorCostoEst = activos.reduce(
    (s, p) => s + p.stock_actual * (Number(p.precio_costo) || Number(p.precio_base) * 0.65 || 0),
    0,
  );
  const unidadesPorVencer = porVencer.reduce((s, p) => s + p.stock_actual, 0);
  const unidadesVencidas = vencidosConStock.reduce(
    (s, p) => s + p.stock_actual,
    0,
  );

  encabezadoPdf(
    doc,
    "FarmaMuni — Resumen de gestión (inventario)",
    `Generado: ${new Date().toLocaleString("es-GT")}`,
  );

  const filas = [
    ["Productos activos en catálogo", fmtNum(activos.length)],
    ["Unidades totales en existencia", fmtNum(totalUnidades)],
    ["Valor estimado a precio de venta", fmtQ(valorVentaEst)],
    ["Valor estimado a costo", fmtQ(valorCostoEst)],
    ["Productos con stock bajo", fmtNum(stockBajo.length)],
    ["Productos por vencer (4 meses)", fmtNum(porVencer.length)],
    ["Unidades en riesgo de vencimiento", fmtNum(unidadesPorVencer)],
    ["Productos vencidos con existencia", fmtNum(vencidosConStock.length)],
    ["Unidades vencidas pendientes de baja", fmtNum(unidadesVencidas)],
  ];

  autoTable(doc, {
    startY: 34,
    head: [["Indicador", "Valor"]],
    body: filas,
    headStyles: {
      fillColor: [141, 167, 142],
      textColor: [245, 245, 241],
      fontStyle: "bold",
    },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
    },
  });

  doc.save(`Resumen_Gestion_Inventario_${new Date().toISOString().slice(0, 10)}.pdf`);
}
