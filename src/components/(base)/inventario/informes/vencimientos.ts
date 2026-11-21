import autoTable from "jspdf-autotable";
import { formatFechaCalendarioGt, normalizarFechaCalendario } from "@/lib/fechas-gt";
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
  finalYTabla,
  piePaginas,
  tituloSeccion,
} from "@/lib/reportes/pdf-base";
import {
  CATEGORIAS_VENCIMIENTO_LOTE,
  ETIQUETAS_CATEGORIA_VENCIMIENTO,
  categoriaVencimientoLote,
  diasRestantesVencimientoGt,
  esLoteActivoConExistencia,
  type CategoriaVencimientoLote,
} from "@/lib/vencimientos-gt";
import { fmtNum, fmtQ } from "@/lib/utils";
import { tituloProductoFarmacia } from "../lib/helpers";
import { lotesActivosConExistencia, type FilaLoteInforme } from "./lote-informe";

const GRUPOS_INFORME: CategoriaVencimientoLote[] = [
  "vencido",
  "dias_0_30",
  "dias_31_60",
  "dias_61_90",
];

export function accionSugeridaVencimiento(cat: CategoriaVencimientoLote): string {
  switch (cat) {
    case "vencido":
      return "Dar de baja";
    case "dias_0_30":
      return "Devolver o vender primero";
    case "dias_31_60":
    case "dias_61_90":
      return "Vigilar";
    default:
      return "—";
  }
}

function filasCategoria(filas: FilaLoteInforme[], cat: CategoriaVencimientoLote) {
  return filas.filter(
    (f) =>
      esLoteActivoConExistencia({
        activo: f.activo,
        cantidad_actual: f.existencia,
      }) && categoriaVencimientoLote(f.fecha_vencimiento) === cat,
  );
}

function subtotalesGrupo(grupo: FilaLoteInforme[]) {
  const unidades = grupo.reduce((s, f) => s + f.existencia, 0);
  const valorCosto = grupo.reduce((s, f) => s + f.valor_costo, 0);
  return { unidades, valorCosto };
}

export function descargarVencimientosPdf(filas: FilaLoteInforme[], meta: MetaInforme) {
  const base = lotesActivosConExistencia(filas);
  const doc = crearDocumentoPdf({ orientacion: "landscape" });

  let startY = encabezadoPdf(doc, {
    titulo: "Vencimientos de lotes",
    institucion: meta.institucion,
    generadoPor: meta.generadoPor,
  });

  let totalUnidades = 0;
  let totalValor = 0;

  for (const cat of GRUPOS_INFORME) {
    const grupo = filasCategoria(base, cat);
    if (grupo.length === 0) continue;

    const sub = subtotalesGrupo(grupo);
    totalUnidades += sub.unidades;
    totalValor += sub.valorCosto;

    startY = tituloSeccion(
      doc,
      startY,
      `${ETIQUETAS_CATEGORIA_VENCIMIENTO[cat]} · ${fmtNum(sub.unidades)} u · ${fmtQ(sub.valorCosto)}`,
    );

    autoTable(doc, {
      ...estilosTabla({ fontSize: 7, cellPadding: 2 }),
      startY,
      head: [
        [
          "Producto",
          "Lote",
          "Laboratorio",
          "Proveedor",
          "Existencia",
          "Vencimiento",
          "Días",
          "Valor costo",
          "Acción sugerida",
        ],
      ],
      body: grupo.map((f) => {
        const dias = diasRestantesVencimientoGt(f.fecha_vencimiento);
        return [
          tituloProductoFarmacia({
            nombre: f.marca,
            nombre_generico: f.generico_nombre,
            concentracion: f.concentracion,
            forma_farmaceutica: f.forma_farmaceutica,
            presentacion: f.presentacion,
          }),
          f.numero_lote || "—",
          f.laboratorio,
          f.proveedor_nombre || "—",
          fmtNum(f.existencia),
          f.fecha_vencimiento ? formatFechaCalendarioGt(f.fecha_vencimiento) : "—",
          dias === null ? "—" : String(dias),
          fmtQ(f.valor_costo),
          accionSugeridaVencimiento(cat),
        ];
      }),
      columnStyles: columnasNumericas([4, 6, 7]),
    });

    startY = finalYTabla(doc) + 8;
  }

  autoTable(doc, {
    ...estilosTabla({ fontSize: 9, cellPadding: 3 }),
    startY,
    body: [
      ["Total unidades (grupos del informe)", fmtNum(totalUnidades)],
      ["Total valor costo", fmtQ(totalValor)],
    ],
    columnStyles: columnasNumericas([1]),
  });

  piePaginas(doc, "Vencimientos");
  doc.save(nombreArchivo("Vencimientos_Lotes", undefined, "pdf"));
}

type FilaExcelVenc = {
  grupo: string;
  producto: string;
  lote: string;
  laboratorio: string;
  proveedor: string;
  existencia: number;
  vencimiento: Date | string;
  dias: number | string;
  valor_costo: number;
  accion: string;
};

function fechaExcel(iso: string): Date | string {
  const n = normalizarFechaCalendario(iso);
  if (!n) return "";
  return new Date(
    Date.UTC(Number(n.slice(0, 4)), Number(n.slice(5, 7)) - 1, Number(n.slice(8, 10))),
  );
}

export async function descargarVencimientosExcel(filas: FilaLoteInforme[], meta: MetaInforme) {
  const base = lotesActivosConExistencia(filas);
  const wb = crearLibro();
  const { ws, filaInicio } = hojaConEncabezado(wb, "Vencimientos", {
    titulo: "Vencimientos de lotes",
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 10,
  });

  const columnas = [
    { titulo: "Grupo", clave: "grupo" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Producto", clave: "producto" as const, tipo: "texto" as const, ancho: 28 },
    { titulo: "Lote", clave: "lote" as const, tipo: "texto" as const, ancho: 12 },
    { titulo: "Laboratorio", clave: "laboratorio" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Proveedor", clave: "proveedor" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Existencia", clave: "existencia" as const, tipo: "entero" as const, ancho: 11 },
    { titulo: "Vencimiento", clave: "vencimiento" as const, tipo: "fecha" as const, ancho: 12 },
    { titulo: "Días restantes", clave: "dias" as const, tipo: "entero" as const, ancho: 12 },
    { titulo: "Valor costo", clave: "valor_costo" as const, tipo: "moneda" as const, ancho: 12 },
    { titulo: "Acción sugerida", clave: "accion" as const, tipo: "texto" as const, ancho: 22 },
  ];

  const datos: FilaExcelVenc[] = [];
  for (const cat of CATEGORIAS_VENCIMIENTO_LOTE) {
    if (!GRUPOS_INFORME.includes(cat)) continue;
    const grupo = filasCategoria(base, cat);
    for (const f of grupo) {
      const dias = diasRestantesVencimientoGt(f.fecha_vencimiento);
      datos.push({
        grupo: ETIQUETAS_CATEGORIA_VENCIMIENTO[cat],
        producto: tituloProductoFarmacia({
          nombre: f.marca,
          nombre_generico: f.generico_nombre,
          concentracion: f.concentracion,
          forma_farmaceutica: f.forma_farmaceutica,
          presentacion: f.presentacion,
        }),
        lote: f.numero_lote || "—",
        laboratorio: f.laboratorio,
        proveedor: f.proveedor_nombre || "—",
        existencia: f.existencia,
        vencimiento: fechaExcel(f.fecha_vencimiento),
        dias: dias === null ? "" : dias,
        valor_costo: f.valor_costo,
        accion: accionSugeridaVencimiento(cat),
      });
    }
  }

  tablaExcel(ws, filaInicio, columnas, datos, { totales: true });
  await guardarLibro(wb, nombreArchivo("Vencimientos_Lotes", undefined, "xlsx"));
}
