import autoTable from "jspdf-autotable";
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
import { fmtNum, fmtQ } from "@/lib/utils";
import type { InvGenerico } from "../lib/jerarquia-zod";
import {
  construirFilasStockBajo,
  type FilaLoteInforme,
  type FilaStockBajoInforme,
} from "./lote-informe";

function agruparPorProveedor(filas: FilaStockBajoInforme[]) {
  const map = new Map<string, FilaStockBajoInforme[]>();
  for (const f of filas) {
    const key = f.ultimo_proveedor || "Sin proveedor";
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

function filasTabla(f: FilaStockBajoInforme) {
  return [
    f.producto,
    f.concentracion_forma,
    fmtNum(f.minimo),
    fmtNum(f.existencia),
    fmtNum(f.faltante),
    fmtNum(f.sugerido),
    f.ultima_marca,
    f.ultimo_proveedor,
    fmtQ(f.ultimo_costo),
    f.agotado ? "Agotado" : "Bajo mínimo",
  ];
}

export function descargarStockBajoPdf(
  lotes: FilaLoteInforme[],
  genericos: InvGenerico[],
  meta: MetaInforme,
) {
  const filas = construirFilasStockBajo(genericos, lotes);
  const doc = crearDocumentoPdf({ orientacion: "landscape" });

  let y = encabezadoPdf(doc, {
    titulo: "Stock bajo y pedido sugerido",
    institucion: meta.institucion,
    generadoPor: meta.generadoPor,
  });

  const grupos = agruparPorProveedor(filas);
  for (const [proveedor, grupo] of grupos) {
    y = tituloSeccion(doc, y, `Proveedor: ${proveedor}`);
    autoTable(doc, {
      ...estilosTabla({ fontSize: 7, cellPadding: 2 }),
      startY: y,
      head: [
        [
          "Producto",
          "Concentración y forma",
          "Mínimo",
          "Existencia",
          "Faltante",
          "Sugerido",
          "Última marca",
          "Proveedor",
          "Último costo",
          "Estado",
        ],
      ],
      body: grupo.map(filasTabla),
      columnStyles: columnasNumericas([2, 3, 4, 5, 8]),
    });
    y = finalYTabla(doc) + 8;
  }

  piePaginas(doc, "Stock bajo");
  doc.save(nombreArchivo("Stock_Bajo_Pedido", undefined, "pdf"));
}

type FilaExcelStock = {
  producto: string;
  concentracion_forma: string;
  minimo: number;
  existencia: number;
  faltante: number;
  sugerido: number;
  ultima_marca: string;
  ultimo_proveedor: string;
  ultimo_costo: number;
  estado: string;
};

export async function descargarStockBajoExcel(
  lotes: FilaLoteInforme[],
  genericos: InvGenerico[],
  meta: MetaInforme,
) {
  const filas = construirFilasStockBajo(genericos, lotes);
  const wb = crearLibro();
  const { ws, filaInicio } = hojaConEncabezado(wb, "Stock bajo", {
    titulo: "Stock bajo y pedido sugerido",
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 10,
  });

  const columnas = [
    { titulo: "Producto", clave: "producto" as const, tipo: "texto" as const, ancho: 20 },
    {
      titulo: "Concentración y forma",
      clave: "concentracion_forma" as const,
      tipo: "texto" as const,
      ancho: 22,
    },
    { titulo: "Mínimo", clave: "minimo" as const, tipo: "entero" as const, ancho: 10 },
    { titulo: "Existencia", clave: "existencia" as const, tipo: "entero" as const, ancho: 11 },
    { titulo: "Faltante", clave: "faltante" as const, tipo: "entero" as const, ancho: 10 },
    { titulo: "Sugerido a pedir", clave: "sugerido" as const, tipo: "entero" as const, ancho: 12 },
    { titulo: "Última marca", clave: "ultima_marca" as const, tipo: "texto" as const, ancho: 16 },
    { titulo: "Último proveedor", clave: "ultimo_proveedor" as const, tipo: "texto" as const, ancho: 16 },
    { titulo: "Último costo", clave: "ultimo_costo" as const, tipo: "moneda" as const, ancho: 12 },
    { titulo: "Estado", clave: "estado" as const, tipo: "texto" as const, ancho: 12 },
  ];

  const datos: FilaExcelStock[] = filas.map((f) => ({
    producto: f.producto,
    concentracion_forma: f.concentracion_forma,
    minimo: f.minimo,
    existencia: f.existencia,
    faltante: f.faltante,
    sugerido: f.sugerido,
    ultima_marca: f.ultima_marca,
    ultimo_proveedor: f.ultimo_proveedor,
    ultimo_costo: f.ultimo_costo,
    estado: f.agotado ? "Agotado" : "Bajo mínimo",
  }));

  tablaExcel(ws, filaInicio, columnas, datos);
  await guardarLibro(wb, nombreArchivo("Stock_Bajo_Pedido", undefined, "xlsx"));
}
