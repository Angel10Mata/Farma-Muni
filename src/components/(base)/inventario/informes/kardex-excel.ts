import autoTable from "jspdf-autotable";
import { formatFechaHoraGt } from "@/lib/fechas-gt";
import type { MetaInforme } from "@/lib/reportes/identidad";
import { nombreArchivo } from "@/lib/reportes/nombres";
import {
  crearLibro,
  guardarLibro,
  hojaConEncabezado,
  tablaExcel,
} from "@/lib/reportes/excel-base";
import {
  columnasNumericas,
  crearDocumentoPdf,
  encabezadoPdf,
  estilosTabla,
  piePaginas,
} from "@/lib/reportes/pdf-base";
import { fmtNum } from "@/lib/utils";
import {
  cantidadEntradaSalidaKardex,
  etiquetaTipoMovimientoKardex,
  referenciaKardexTexto,
  type FiltrosKardexReporte,
} from "../lib/kardex-helpers";
import { etiquetaLaboratorioComercial, tituloProductoFarmacia } from "../lib/helpers";
import type { KardexFila } from "../lib/zod";

export function descargarKardexPdf(
  filas: KardexFila[],
  filtros: FiltrosKardexReporte,
  meta: MetaInforme,
) {
  const doc = crearDocumentoPdf({ orientacion: "landscape" });
  const partesSub: string[] = [];
  if (filtros.productoLabel) partesSub.push(`Producto: ${filtros.productoLabel}`);
  if (filtros.loteNumero) partesSub.push(`Lote: ${filtros.loteNumero}`);
  if (filtros.tipo) partesSub.push(`Tipo: ${etiquetaTipoMovimientoKardex(filtros.tipo)}`);
  if (filtros.desde || filtros.hasta) {
    partesSub.push(`Fechas: ${filtros.desde ?? "…"} — ${filtros.hasta ?? "…"}`);
  }

  const startY = encabezadoPdf(doc, {
    titulo: "Kardex de inventario",
    periodo: partesSub.length > 0 ? partesSub.join(" · ") : undefined,
    institucion: meta.institucion,
    generadoPor: meta.generadoPor,
  });

  autoTable(doc, {
    ...estilosTabla({ fontSize: 7, cellPadding: 2 }),
    startY,
    head: [
      [
        "Fecha",
        "Producto",
        "Lote",
        "Tipo",
        "Entrada",
        "Salida",
        "Saldo lote",
        "Saldo producto",
        "Usuario",
        "Motivo / ref.",
      ],
    ],
    body: filas.map((f) => {
      const { entrada, salida } = cantidadEntradaSalidaKardex(f.cantidad);
      const productoTitulo = tituloProductoFarmacia({
        nombre: f.producto_nombre ?? "",
        nombre_generico: f.producto_nombre_generico,
        concentracion: f.producto_concentracion,
      });
      return [
        formatFechaHoraGt(f.created_at),
        productoTitulo,
        [f.lote_numero, etiquetaLaboratorioComercial(f.lote_laboratorio)]
          .filter((x) => x != null && String(x).trim() !== "")
          .join(" · ") || "—",
        etiquetaTipoMovimientoKardex(f.tipo),
        entrada != null ? fmtNum(entrada) : "—",
        salida != null ? fmtNum(salida) : "—",
        f.saldo_lote != null ? fmtNum(f.saldo_lote) : "—",
        f.saldo_producto != null ? fmtNum(f.saldo_producto) : "—",
        f.usuario_nombre ?? "—",
        referenciaKardexTexto(f.referencia_tipo, f.referencia_id, f.motivo),
      ];
    }),
    columnStyles: columnasNumericas([4, 5, 6, 7]),
  });

  piePaginas(doc, "Kardex de inventario");
  doc.save(nombreArchivo("Kardex_Inventario", undefined, "pdf"));
}

type FilaExcelKardex = {
  fecha_hora: string;
  producto: string;
  lote: string;
  tipo: string;
  entrada: number | string;
  salida: number | string;
  saldo_lote: number | string;
  saldo_producto: number | string;
  usuario: string;
  motivo_ref: string;
};

export async function descargarKardexExcel(
  filas: KardexFila[],
  filtros: FiltrosKardexReporte,
  meta: MetaInforme,
) {
  const wb = crearLibro();
  const partesSub: string[] = [];
  if (filtros.productoLabel) partesSub.push(`Producto: ${filtros.productoLabel}`);
  if (filtros.loteNumero) partesSub.push(`Lote: ${filtros.loteNumero}`);
  if (filtros.tipo) partesSub.push(`Tipo: ${etiquetaTipoMovimientoKardex(filtros.tipo)}`);
  if (filtros.desde || filtros.hasta) {
    partesSub.push(`${filtros.desde ?? "…"} — ${filtros.hasta ?? "…"}`);
  }

  const { ws, filaInicio } = hojaConEncabezado(wb, "Kardex", {
    titulo: "Kardex de inventario",
    periodo: partesSub.join(" · ") || undefined,
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 10,
  });

  const columnas = [
    { titulo: "Fecha / hora", clave: "fecha_hora" as const, tipo: "texto" as const, ancho: 18 },
    { titulo: "Producto", clave: "producto" as const, tipo: "texto" as const, ancho: 26 },
    { titulo: "Lote", clave: "lote" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Tipo", clave: "tipo" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Entrada", clave: "entrada" as const, tipo: "entero" as const, ancho: 10 },
    { titulo: "Salida", clave: "salida" as const, tipo: "entero" as const, ancho: 10 },
    { titulo: "Saldo lote", clave: "saldo_lote" as const, tipo: "entero" as const, ancho: 11 },
    { titulo: "Saldo producto", clave: "saldo_producto" as const, tipo: "entero" as const, ancho: 12 },
    { titulo: "Usuario", clave: "usuario" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Motivo / ref.", clave: "motivo_ref" as const, tipo: "texto" as const, ancho: 22 },
  ];

  const datos: FilaExcelKardex[] = filas.map((f) => {
    const { entrada, salida } = cantidadEntradaSalidaKardex(f.cantidad);
    return {
      fecha_hora: formatFechaHoraGt(f.created_at),
      producto: tituloProductoFarmacia({
        nombre: f.producto_nombre ?? "",
        nombre_generico: f.producto_nombre_generico,
        concentracion: f.producto_concentracion,
      }),
      lote:
        [f.lote_numero, etiquetaLaboratorioComercial(f.lote_laboratorio)]
          .filter((x) => x != null && String(x).trim() !== "")
          .join(" · ") || "—",
      tipo: etiquetaTipoMovimientoKardex(f.tipo),
      entrada: entrada ?? "",
      salida: salida ?? "",
      saldo_lote: f.saldo_lote ?? "",
      saldo_producto: f.saldo_producto ?? "",
      usuario: f.usuario_nombre ?? "—",
      motivo_ref: referenciaKardexTexto(
        f.referencia_tipo,
        f.referencia_id,
        f.motivo,
      ),
    };
  });

  tablaExcel(ws, filaInicio, columnas, datos);
  await guardarLibro(wb, nombreArchivo("Kardex_Inventario", undefined, "xlsx"));
}
