import autoTable from "jspdf-autotable";
import type { CellHookData } from "jspdf-autotable";
import { PALETA_RGB, type MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  columnasNumericas,
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  finalYTabla,
  piePaginas,
  tituloSeccion,
} from "@/lib/reportes/pdf-base";
import { formatFechaCalendarioGt, formatFechaHoraGt } from "@/lib/fechas-gt";
import { formatearFechaCompraGt } from "./compras-helpers";
import { fmtQ } from "@/lib/utils";
import type { CompraProveedorReporteRow } from "./actions";

export type ReporteComprasProveedorPdf = {
  fechaDesde: string;
  fechaHasta: string;
  generadoPor: string;
  soloSaldoPendiente?: boolean;
  filas: CompraProveedorReporteRow[];
};

function agruparPorProveedor(filas: CompraProveedorReporteRow[]) {
  const map = new Map<string, CompraProveedorReporteRow[]>();
  for (const f of filas) {
    const lista = map.get(f.proveedor) ?? [];
    lista.push(f);
    map.set(f.proveedor, lista);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function descargarReporteComprasProveedorPdf(
  reporte: ReporteComprasProveedorPdf,
  meta: MetaInforme,
) {
  const doc = crearDocumentoPdf({ orientacion: "landscape" });

  const vencidas = reporte.filas.filter((f) => f.vencida).length;
  const titulo = reporte.soloSaldoPendiente
    ? "Cuentas por pagar"
    : "Compras por proveedor";

  let y = encabezadoPdf(doc, {
    titulo,
    periodo: `Del ${reporte.fechaDesde} al ${reporte.fechaHasta} · Facturas vencidas con saldo: ${vencidas}${reporte.soloSaldoPendiente ? " · Solo saldo pendiente" : ""}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });

  const grupos = agruparPorProveedor(reporte.filas);
  let granTotal = 0;
  let granPagado = 0;
  let granSaldo = 0;

  const estiloBase = estilosTabla({ fontSize: 7, cellPadding: 1.5 });

  for (const [proveedor, filasProv] of grupos) {
    y = tituloSeccion(doc, y, proveedor);

    const subTotal = filasProv.reduce((s, f) => s + f.total, 0);
    const subPagado = filasProv.reduce((s, f) => s + f.pagado, 0);
    const subSaldo = filasProv.reduce((s, f) => s + f.saldo, 0);
    granTotal += subTotal;
    granPagado += subPagado;
    granSaldo += subSaldo;

    autoTable(doc, {
      ...estiloBase,
      startY: y,
      head: [
        [
          "Factura",
          "Fecha",
          "Vence",
          "Total",
          "Pagado",
          "Saldo",
        ],
      ],
      body: [
        ...filasProv.map((f) => [
          f.factura,
          formatFechaHoraGt(f.fecha),
          f.vence ? formatearFechaCompraGt(f.vence) : "—",
          fmtQ(f.total),
          fmtQ(f.pagado),
          fmtQ(f.saldo),
        ]),
        [
          { content: "Subtotal proveedor", styles: { fontStyle: "bold" } },
          "",
          "",
          fmtQ(subTotal),
          fmtQ(subPagado),
          fmtQ(subSaldo),
        ],
      ],
      columnStyles: columnasNumericas([3, 4, 5]),
      didParseCell: (data: CellHookData) => {
        if (data.section !== "body") return;
        const idx = data.row.index;
        if (idx >= filasProv.length) return;
        if (filasProv[idx]?.vencida) {
          data.cell.styles.textColor = PALETA_RGB.rojo;
        }
      },
    });

    y = finalYTabla(doc) + 4;
  }

  if (grupos.length > 0) {
    autoTable(doc, {
      ...estiloBase,
      startY: y,
      body: [
        [
          { content: "TOTAL GENERAL", styles: { fontStyle: "bold" } },
          "",
          "",
          fmtQ(granTotal),
          fmtQ(granPagado),
          fmtQ(granSaldo),
        ],
      ],
      columnStyles: columnasNumericas([3, 4, 5]),
    });
  }

  piePaginas(doc, titulo);
  doc.save(
    nombreArchivo(
      reporte.soloSaldoPendiente ? "Cuentas_Por_Pagar" : "Compras_Proveedor",
      `${reporte.fechaDesde}_${reporte.fechaHasta}`,
      "pdf",
    ),
  );
}
