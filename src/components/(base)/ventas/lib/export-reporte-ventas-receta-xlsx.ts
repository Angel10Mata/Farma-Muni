import type { MetaInforme } from "@/lib/reportes/identidad";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
  tablaExcel,
} from "@/lib/reportes/excel-base";
import { nombreArchivo } from "@/lib/reportes/nombres";
import type { ReporteVentasRecetaPdf } from "./export-reporte-ventas-receta-pdf";
import { formatFechaHoraGt } from "@/lib/fechas-gt";

export async function descargarReporteVentasRecetaExcel(
  reporte: ReporteVentasRecetaPdf,
  meta: MetaInforme,
) {
  const wb = crearLibro();
  const { ws, filaInicio } = hojaConEncabezado(wb, "Detalle", {
    titulo: "Ventas con receta",
    periodo: `Del ${reporte.fechaDesde} al ${reporte.fechaHasta}`,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 10,
  });

  let r = tablaExcel(
    ws,
    filaInicio,
    [
      { titulo: "Recibo", clave: "recibo", tipo: "texto", ancho: 12 },
      { titulo: "Fecha", clave: "fecha", tipo: "texto", ancho: 22 },
      { titulo: "Cliente", clave: "cliente", tipo: "texto", ancho: 22 },
      { titulo: "Médico", clave: "medico", tipo: "texto", ancho: 20 },
      { titulo: "Colegiado", clave: "colegiado", tipo: "texto", ancho: 14 },
      { titulo: "N. receta", clave: "numero_receta", tipo: "texto", ancho: 12 },
      { titulo: "Producto", clave: "producto", tipo: "texto", ancho: 28 },
      { titulo: "Marca", clave: "marca", tipo: "texto", ancho: 18 },
      { titulo: "Lote", clave: "lote", tipo: "texto", ancho: 12 },
      { titulo: "Cant.", clave: "cantidad", tipo: "entero", ancho: 10 },
    ],
    reporte.filas.map((f) => ({
      recibo: f.recibo,
      fecha: formatFechaHoraGt(f.fecha),
      cliente: f.cliente,
      medico: f.medico,
      colegiado: f.colegiado,
      numero_receta: f.numero_receta,
      producto: f.producto,
      marca: f.marca,
      lote: f.lote,
      cantidad: f.cantidad,
    })),
  );

  r += 2;
  tablaExcel(
    ws,
    r,
    [
      { titulo: "Producto", clave: "producto", tipo: "texto", ancho: 28 },
      { titulo: "Marca", clave: "marca", tipo: "texto", ancho: 18 },
      { titulo: "Unidades", clave: "cantidad", tipo: "entero", ancho: 12 },
    ],
    reporte.totalesPorProducto.map((t) => ({
      producto: t.producto,
      marca: t.marca,
      cantidad: t.cantidad,
    })),
    { totales: true, etiquetaTotales: "Total unidades" },
  );

  await guardarLibro(
    wb,
    nombreArchivo(
      "Ventas_Con_Receta",
      `${reporte.fechaDesde}_${reporte.fechaHasta}`,
      "xlsx",
    ),
  );
}
