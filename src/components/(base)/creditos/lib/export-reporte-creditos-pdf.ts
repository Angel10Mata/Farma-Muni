import autoTable from "jspdf-autotable";
import type { CellHookData } from "jspdf-autotable";
import type { CuentaPorCobrar } from "@/components/(base)/finanzas/lib/zod";
import { PALETA_RGB, type MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  columnasNumericas,
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  piePaginas,
} from "@/lib/reportes/pdf-base";
import { formatFechaCalendarioGt, fechaCalendarioGt } from "@/lib/fechas-gt";
import { fmtQ } from "@/lib/utils";
import {
  agruparCuentasPorClienteReporte,
  type FilaCxcPorCliente,
} from "./creditos-reporte-helpers";

export type ReporteCreditosPdfInput = {
  cuentas: CuentaPorCobrar[];
  generadoPor: string;
};

function filaTotalesColumnas(filas: FilaCxcPorCliente[]) {
  const sum = (k: keyof FilaCxcPorCliente) =>
    filas.reduce((s, f) => s + Number(f[k] ?? 0), 0);
  return {
    total_credito: sum("total_credito"),
    abonado: sum("abonado"),
    saldo: sum("saldo"),
    bucket_0_30: sum("bucket_0_30"),
    bucket_31_60: sum("bucket_31_60"),
    bucket_61_90: sum("bucket_61_90"),
    bucket_mas_90: sum("bucket_mas_90"),
  };
}

export function descargarReporteCreditosPdf(
  input: ReporteCreditosPdfInput,
  meta: MetaInforme,
) {
  const porCliente = agruparCuentasPorClienteReporte(input.cuentas);
  const tot = filaTotalesColumnas(porCliente);
  const hoy = formatFechaCalendarioGt(fechaCalendarioGt());

  const doc = crearDocumentoPdf({ orientacion: "landscape" });
  const startY = encabezadoPdf(doc, {
    titulo: "Cuentas por cobrar",
    periodo: `Al ${hoy} · ${porCliente.length} clientes con saldo · Total ${fmtQ(tot.saldo)}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
  });

  const estiloBase = estilosTabla({ fontSize: 7, cellPadding: 1.5 });

  autoTable(doc, {
    ...estiloBase,
    startY,
    head: [
      [
        "Cliente",
        "Total crédito",
        "Abonado",
        "Saldo",
        "Venta más antigua",
        "Antigüedad (d)",
        "0-30 d",
        "31-60 d",
        "61-90 d",
        "+90 d",
      ],
    ],
    body: [
      ...porCliente.map((f) => [
        f.cliente_nombre,
        fmtQ(f.total_credito),
        fmtQ(f.abonado),
        fmtQ(f.saldo),
        f.venta_mas_antigua
          ? formatFechaCalendarioGt(f.venta_mas_antigua)
          : "—",
        String(f.antiguedad_dias),
        fmtQ(f.bucket_0_30),
        fmtQ(f.bucket_31_60),
        fmtQ(f.bucket_61_90),
        fmtQ(f.bucket_mas_90),
      ]),
      [
        { content: "TOTALES", styles: { fontStyle: "bold" } },
        fmtQ(tot.total_credito),
        fmtQ(tot.abonado),
        fmtQ(tot.saldo),
        "",
        "",
        fmtQ(tot.bucket_0_30),
        fmtQ(tot.bucket_31_60),
        fmtQ(tot.bucket_61_90),
        fmtQ(tot.bucket_mas_90),
      ],
    ],
    columnStyles: columnasNumericas([1, 2, 3, 5, 6, 7, 8, 9]),
    didParseCell: (data: CellHookData) => {
      if (data.section !== "body") return;
      const idx = data.row.index;
      if (idx >= porCliente.length) return;
      if (porCliente[idx]?.credito_vencido) {
        data.cell.styles.textColor = PALETA_RGB.rojo;
      }
    },
  });

  piePaginas(doc, "Cuentas por cobrar");
  doc.save(nombreArchivo("Cuentas_Por_Cobrar", hoy, "pdf"));
}
