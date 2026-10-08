import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtNum, fmtQ } from "@/lib/utils";
import {
  nombreComercialSiDistinto,
  tituloProductoFarmacia,
} from "./lib/helpers";
import type { ProductoInventarioReporte } from "./lib/reportes-pdf";

export const exportarPDF = (productos: ProductoInventarioReporte[], vistaLotes = false) => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Reporte de Inventario - FarmaMuni", 14, 20);

  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-GT")}`, 14, 28);
  doc.text(`Registros: ${productos.length}`, 14, 34);

  const head = vistaLotes
    ? [
        "Código",
        "Producto",
        "Genérico",
        "Presentación",
        "Laboratorio",
        "Proveedor",
        "P. venta",
        "Costo",
        "Vencimiento",
        "Ubicación",
        "Existencias",
      ]
    : [
        "Producto",
        "Genérico",
        "Concentración",
        "Presentación",
        "Ubicación",
        "Existencias",
        "Mínimo",
        "P. sugerido",
        "Estado",
      ];

  const body = productos.map((p) => {
    const titulo = tituloProductoFarmacia(p);
    const comercial = nombreComercialSiDistinto(p);
    if (vistaLotes) {
      return [
        p.codigo || "—",
        titulo,
        p.nombre_generico || "—",
        p.presentacion || "—",
        p.laboratorio || "—",
        p.proveedor_nombre || "—",
        fmtQ(p.precio_venta ?? p.precio_base),
        fmtQ(Number(p.precio_costo) || 0),
        p.fecha_vencimiento
          ? new Date(p.fecha_vencimiento).toLocaleDateString("es-GT")
          : "—",
        p.ubicacion || "Sin asignar",
        fmtNum(p.stock_actual),
      ];
    }
    return [
      comercial ? `${titulo}\n(${comercial})` : titulo,
      p.nombre_generico || "—",
      p.concentracion || "—",
      p.presentacion || "—",
      p.ubicacion || "Sin asignar",
      fmtNum(p.stock_actual),
      fmtNum(p.stock_minimo),
      fmtQ(p.precio_base),
      p.activo ? "Activo" : "Inactivo",
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [head],
    body,
    theme: "striped",
    headStyles: { fillColor: [82, 93, 83] },
    styles: { fontSize: vistaLotes ? 7 : 8, cellPadding: 2 },
  });

  doc.save("Reporte_Inventario.pdf");
};
