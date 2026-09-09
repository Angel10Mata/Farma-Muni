import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtNum, fmtQ } from "@/lib/utils";

export const exportarPDF = (productos: any[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(16);
  doc.text("Reporte de Inventario - FarmaMuni", 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);
  
  // Data Mapping
  const data = productos.map((p) => [
    p.codigo || "Sin Código",
    p.nombre,
    p.inv_proveedores?.nombre || p.inv_compras_detalles?.[0]?.inv_compras?.inv_proveedores?.nombre || "Sin Proveedor",
    fmtNum(p.stock_actual),
    p.stock_actual <= p.stock_minimo ? "STOCK BAJO" : "OK",
    fmtQ(p.precio_base)
  ]);
  
  // Table
  autoTable(doc, {
    startY: 32,
    head: [["Código", "Producto", "Proveedor", "Stock", "Alerta", "Precio"]],
    body: data,
    theme: "striped",
    headStyles: { fillColor: [82, 93, 83] }, // LOOK_1_OLIVO_OSCURO
  });
  
  doc.save("Reporte_Inventario.pdf");
};
