import autoTable from "jspdf-autotable";
import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  columnasNumericas,
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  piePaginas,
} from "@/lib/reportes/pdf-base";
import { formatFechaCalendarioGt, formatFechaHoraGt } from "@/lib/fechas-gt";
import { fmtQ } from "@/lib/utils";
import type { Compra } from "./zod";
import { formatearFechaCompraGt, totalPagadoCompra } from "./compras-helpers";

type LoteDetalle = {
  numero_lote?: string | null;
  fecha_vencimiento?: string | null;
};

type LineaCompraDetalle = {
  precio_costo: number;
  cantidad: number;
  subtotal: number;
  inv_productos?: { nombre?: string; presentacion?: string } | null;
  inv_lotes?: LoteDetalle | LoteDetalle[] | null;
};

type PagoCompra = {
  id: string;
  categoria?: string;
  monto?: number;
  fecha_movimiento?: string;
  created_at?: string;
  descripcion?: string;
  concepto?: string;
};

function primerLote(
  lotes: LoteDetalle | LoteDetalle[] | null | undefined,
): LoteDetalle | null {
  if (!lotes) return null;
  if (Array.isArray(lotes)) return lotes[0] ?? null;
  return lotes;
}

function pagosProveedor(compra: Compra): PagoCompra[] {
  return (
    compra.fin_transacciones?.filter(
      (t): t is PagoCompra =>
        typeof t === "object" &&
        t !== null &&
        (t as PagoCompra).categoria === "pago_proveedor",
    ) ?? []
  );
}

export function descargarReporteCompraDetallePdf(
  compra: Compra,
  detalles: LineaCompraDetalle[],
  meta: MetaInforme,
) {
  const doc = crearDocumentoPdf();
  const proveedor = compra.inv_proveedores?.nombre?.trim() || "Proveedor";
  const nit = compra.inv_proveedores?.nit?.trim() || "C/F";

  let y = encabezadoPdf(doc, {
    titulo: "Constancia de ingreso a bodega",
    subtitulo: `${proveedor} · Factura ${compra.numero_factura?.trim() || "—"}`,
    periodo: `Registro ${formatFechaHoraGt(compra.created_at)} · NIT ${nit}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Vence pago: ${formatearFechaCompraGt(compra.fecha_vencimiento_pago)}`,
    14,
    y,
  );
  y += 8;

  autoTable(doc, {
    ...estilosTabla({ fontSize: 8 }),
    startY: y,
    head: [
      [
        "Producto / marca",
        "Lote",
        "Vencimiento",
        "Cant.",
        "Costo unit.",
        "Subtotal",
      ],
    ],
    body: detalles.map((d) => {
      const lote = primerLote(d.inv_lotes);
      const marca =
        d.inv_productos?.nombre?.trim() ||
        d.inv_productos?.presentacion?.trim() ||
        "Producto";
      return [
        marca,
        lote?.numero_lote?.trim() || "—",
        lote?.fecha_vencimiento
          ? formatFechaCalendarioGt(lote.fecha_vencimiento)
          : "—",
        String(d.cantidad),
        fmtQ(d.precio_costo),
        fmtQ(d.subtotal),
      ];
    }),
    columnStyles: columnasNumericas([3, 4, 5]),
  });

  const pagos = pagosProveedor(compra);
  const pagado = totalPagadoCompra(compra.fin_transacciones);
  const saldo = Math.max(0, compra.total - pagado);

  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y += 6;

  if (pagos.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Pagos registrados", 14, y);
    y += 4;

    autoTable(doc, {
      ...estilosTabla({ fontSize: 8 }),
      startY: y,
      head: [["Fecha", "Descripción", "Monto"]],
      body: pagos.map((p) => {
        const fecha = p.fecha_movimiento ?? p.created_at ?? "";
        const desc = p.descripcion ?? p.concepto ?? "Pago a proveedor";
        return [
          fecha ? formatFechaHoraGt(fecha) : "—",
          desc,
          fmtQ(Math.abs(Number(p.monto ?? 0))),
        ];
      }),
      columnStyles: columnasNumericas([2]),
    });
    y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total compra: ${fmtQ(compra.total)}`, 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Pagado: ${fmtQ(pagado)} · Saldo: ${fmtQ(saldo)}`, 14, y);

  piePaginas(doc, "Ingreso a bodega");
  const claveFactura =
    compra.numero_factura?.trim().replace(/\s+/g, "_") || compra.id.slice(0, 8);
  doc.save(nombreArchivo("Compra_Detalle", claveFactura, "pdf"));
}
