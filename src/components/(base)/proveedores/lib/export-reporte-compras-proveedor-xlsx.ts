import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
  tablaExcel,
  type ColumnaExcel,
} from "@/lib/reportes/excel-base";
import type { CompraProveedorReporteRow } from "./actions";
import type { ReporteComprasProveedorPdf } from "./export-reporte-compras-proveedor-pdf";

type FilaExcel = {
  proveedor: string;
  factura: string;
  fecha: string;
  vence: string;
  total: number;
  pagado: number;
  saldo: number;
  vencida: string;
};

const columnas: ColumnaExcel<FilaExcel>[] = [
  { titulo: "Proveedor", clave: "proveedor", tipo: "texto", ancho: 28 },
  { titulo: "Factura", clave: "factura", tipo: "texto", ancho: 14 },
  { titulo: "Fecha", clave: "fecha", tipo: "fecha", ancho: 18 },
  { titulo: "Vence pago", clave: "vence", tipo: "fecha", ancho: 14 },
  { titulo: "Total", clave: "total", tipo: "moneda", ancho: 12 },
  { titulo: "Pagado", clave: "pagado", tipo: "moneda", ancho: 12 },
  { titulo: "Saldo", clave: "saldo", tipo: "moneda", ancho: 12 },
  { titulo: "Vencida", clave: "vencida", tipo: "texto", ancho: 10 },
];

export async function descargarReporteComprasProveedorExcel(
  reporte: ReporteComprasProveedorPdf,
  meta: MetaInforme,
) {
  const titulo = reporte.soloSaldoPendiente
    ? "Cuentas por pagar"
    : "Compras por proveedor";

  const wb = crearLibro();
  const { ws, filaInicio } = hojaConEncabezado(wb, "Compras", {
    titulo,
    periodo: `Del ${reporte.fechaDesde} al ${reporte.fechaHasta}${reporte.soloSaldoPendiente ? " · Solo saldo pendiente" : ""}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: columnas.length,
  });

  const filas: FilaExcel[] = reporte.filas.map((f) => ({
    proveedor: f.proveedor,
    factura: f.factura,
    fecha: f.fecha,
    vence: f.vence ?? "",
    total: f.total,
    pagado: f.pagado,
    saldo: f.saldo,
    vencida: f.vencida ? "Sí" : "No",
  }));

  tablaExcel(ws, filaInicio, columnas, filas, {
    totales: true,
    etiquetaTotales: "Totales",
  });

  await guardarLibro(
    wb,
    nombreArchivo(
      reporte.soloSaldoPendiente ? "Cuentas_Por_Pagar" : "Compras_Proveedor",
      `${reporte.fechaDesde}_${reporte.fechaHasta}`,
      "xlsx",
    ),
  );
}
