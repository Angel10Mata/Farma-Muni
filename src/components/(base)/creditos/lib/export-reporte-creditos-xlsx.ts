import type { CuentaPorCobrar } from "@/components/(base)/finanzas/lib/zod";
import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
  tablaExcel,
  type ColumnaExcel,
} from "@/lib/reportes/excel-base";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import { agruparCuentasPorClienteReporte } from "./creditos-reporte-helpers";

type FilaExcel = {
  cliente: string;
  total_credito: number;
  abonado: number;
  saldo: number;
  venta_antigua: string;
  antiguedad_dias: number;
  d_0_30: number;
  d_31_60: number;
  d_61_90: number;
  d_mas_90: number;
  vencido: string;
};

const columnas: ColumnaExcel<FilaExcel>[] = [
  { titulo: "Cliente", clave: "cliente", tipo: "texto", ancho: 28 },
  { titulo: "Total crédito", clave: "total_credito", tipo: "moneda", ancho: 14 },
  { titulo: "Abonado", clave: "abonado", tipo: "moneda", ancho: 12 },
  { titulo: "Saldo", clave: "saldo", tipo: "moneda", ancho: 12 },
  { titulo: "Venta más antigua", clave: "venta_antigua", tipo: "fecha", ancho: 16 },
  { titulo: "Antigüedad (días)", clave: "antiguedad_dias", tipo: "entero", ancho: 14 },
  { titulo: "0-30 días", clave: "d_0_30", tipo: "moneda", ancho: 12 },
  { titulo: "31-60 días", clave: "d_31_60", tipo: "moneda", ancho: 12 },
  { titulo: "61-90 días", clave: "d_61_90", tipo: "moneda", ancho: 12 },
  { titulo: "Más de 90 días", clave: "d_mas_90", tipo: "moneda", ancho: 14 },
  { titulo: "Crédito vencido", clave: "vencido", tipo: "texto", ancho: 12 },
];

export async function descargarReporteCreditosExcel(
  cuentas: CuentaPorCobrar[],
  meta: MetaInforme,
) {
  const porCliente = agruparCuentasPorClienteReporte(cuentas);
  const hoy = fechaCalendarioGt();

  const wb = crearLibro();
  const { ws, filaInicio } = hojaConEncabezado(wb, "Cuentas por cobrar", {
    titulo: "Cuentas por cobrar",
    periodo: `Al ${hoy}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: columnas.length,
  });

  const filas: FilaExcel[] = porCliente.map((f) => ({
    cliente: f.cliente_nombre,
    total_credito: f.total_credito,
    abonado: f.abonado,
    saldo: f.saldo,
    venta_antigua: f.venta_mas_antigua ?? "",
    antiguedad_dias: f.antiguedad_dias,
    d_0_30: f.bucket_0_30,
    d_31_60: f.bucket_31_60,
    d_61_90: f.bucket_61_90,
    d_mas_90: f.bucket_mas_90,
    vencido: f.credito_vencido ? "Sí" : "No",
  }));

  tablaExcel(ws, filaInicio, columnas, filas, {
    totales: true,
    etiquetaTotales: "Totales",
  });

  await guardarLibro(wb, nombreArchivo("Cuentas_Por_Cobrar", hoy, "xlsx"));
}
