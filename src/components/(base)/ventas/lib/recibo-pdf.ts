import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { APP_LOGO_PATH } from "@/lib/app-config";
import { fmtQ } from "@/lib/utils";
import { codigoReciboVenta } from "./helpers";

export type FarmaciaReciboSettings = {
  nombre: string;
  direccion: string;
  telefono: string;
};

type DetalleReciboLinea = {
  cantidad: number;
  subtotal: number;
  precio_aplicado?: number;
  nombre?: string | null;
  descripcion?: string | null;
  inv_productos?: { nombre?: string } | null;
};

type VentaReciboInput = {
  id: string;
  created_at: string;
  numero_recibo?: number | null;
  total: number | string;
  tipo_venta?: string | null;
  observaciones?: string | null;
  ven_clientes?: { nombre?: string; nit?: string } | null;
};

async function getBase64ImageFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function alturaReciboMm(numLineas: number, tieneNotas: boolean): number {
  const base = 72;
  const porLinea = 5.5;
  const pie = tieneNotas ? 28 : 22;
  return Math.max(120, base + numLineas * porLinea + pie);
}

export async function exportarReciboPdf(
  venta: VentaReciboInput,
  detalles: DetalleReciboLinea[],
  settings?: FarmaciaReciboSettings | null,
) {
  const farmaciaNombre = settings?.nombre?.trim() || "FarmaMuni";
  const farmaciaDireccion = settings?.direccion?.trim() || "";
  const farmaciaTelefono = settings?.telefono?.trim() || "";

  const clientName = venta.ven_clientes?.nombre || "Consumidor final";
  const clientNit = venta.ven_clientes?.nit || "C/F";
  const dateFormatted = new Date(venta.created_at).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const alto = alturaReciboMm(detalles.length, Boolean(venta.observaciones?.trim()));
  const doc = new jsPDF({ unit: "mm", format: [80, alto] });

  let currentY = 6;

  const logoBase64 = await getBase64ImageFromUrl(APP_LOGO_PATH);
  if (logoBase64) {
    const logoFormat = logoBase64.includes("image/webp") ? "WEBP" : "PNG";
    doc.addImage(logoBase64, logoFormat, 33, currentY, 14, 14);
    currentY += 17;
  } else {
    currentY += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(farmaciaNombre, 40, currentY, { align: "center" });
  currentY += 4;

  if (farmaciaDireccion) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const dirLines = doc.splitTextToSize(farmaciaDireccion, 70);
    dirLines.forEach((line: string) => {
      doc.text(line, 40, currentY, { align: "center" });
      currentY += 3.2;
    });
  }

  if (farmaciaTelefono) {
    doc.setFontSize(7);
    doc.text(`Tel: ${farmaciaTelefono}`, 40, currentY, { align: "center" });
    currentY += 3.5;
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(5, currentY, 75, currentY);
  currentY += 5;

  const codigoRecibo = codigoReciboVenta(venta);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`RECIBO DE VENTA #${codigoRecibo}`, 5, currentY);
  currentY += 5;

  doc.setFontSize(8);
  doc.text(`Fecha: ${dateFormatted}`, 5, currentY);
  currentY += 4.5;
  doc.text(`Cliente: ${clientName}`, 5, currentY);
  currentY += 4.5;
  doc.text(`NIT: ${clientNit}`, 5, currentY);
  currentY += 4.5;
  doc.text(`Pago: ${venta.tipo_venta || "Contado"}`, 5, currentY);
  currentY += 3;

  doc.line(5, currentY, 75, currentY);
  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    head: [["Cant", "Detalle", "Precio", "Sub"]],
    body: detalles.map((d) => {
      const unit =
        d.cantidad > 0
          ? d.subtotal / d.cantidad
          : d.precio_aplicado ?? 0;
      const detalle =
        d.nombre != null
          ? `${d.nombre}${d.descripcion ? ` — ${d.descripcion}` : ""}`
          : d.inv_productos?.nombre || "Pedido";
      return [d.cantidad, detalle, `${fmtQ(unit)}`, `${fmtQ(d.subtotal)}`];
    }),
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: 1,
      valign: "middle",
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 35 },
      2: { cellWidth: 12, halign: "right" },
      3: { cellWidth: 15, halign: "right" },
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
    },
    margin: { left: 4, right: 4 },
  });

  const docTabla = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  const finalY = (docTabla.lastAutoTable?.finalY ?? currentY) + 4;
  doc.line(5, finalY, 75, finalY);

  doc.setFontSize(9.5);
  doc.text(`TOTAL A PAGAR: ${fmtQ(Number(venta.total) || 0)}`, 75, finalY + 5, {
    align: "right",
  });

  let endY = finalY + 11;
  if (venta.observaciones?.trim()) {
    doc.setFontSize(7);
    const notas = doc.splitTextToSize(`Notas: ${venta.observaciones}`, 70);
    doc.text(notas, 5, endY);
    endY += notas.length * 3.5 + 2;
  }

  doc.setFontSize(7);
  doc.text("Este documento no es una factura", 40, endY, { align: "center" });
  endY += 5;
  doc.setFontSize(8);
  doc.text("¡Gracias por su compra!", 40, endY, { align: "center" });

  doc.save(`Recibo_FarmaMuni_${codigoRecibo}.pdf`);
}
