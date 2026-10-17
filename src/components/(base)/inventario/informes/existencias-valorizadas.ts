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
  categoriaVencimientoLote,
  type CategoriaVencimientoLote,
} from "@/lib/vencimientos-gt";
import { fmtNum, fmtQ } from "@/lib/utils";
import type { InvGenerico } from "../lib/jerarquia-zod";
import {
  claveGenericoInforme,
  compararFilasLoteInforme,
  etiquetaConcentracionForma,
  genericosBajoMinimoInforme,
  lotesActivosConExistencia,
  type FilaLoteInforme,
} from "./lote-informe";

const CATEGORIAS_POR_VENCER_90: CategoriaVencimientoLote[] = [
  "dias_0_30",
  "dias_31_60",
  "dias_61_90",
];

function indicadoresExistencias(lotes: FilaLoteInforme[], genericos: InvGenerico[]) {
  const activos = lotesActivosConExistencia(lotes);
  const marcas = new Set(activos.map((l) => l.producto_id));
  const unidades = activos.reduce((s, l) => s + l.existencia, 0);
  const valorCosto = activos.reduce((s, l) => s + l.valor_costo, 0);
  const valorVenta = activos.reduce((s, l) => s + l.valor_venta, 0);
  const bajoMin = genericosBajoMinimoInforme(genericos).length;
  const porVencer90 = activos.filter((l) =>
    CATEGORIAS_POR_VENCER_90.includes(categoriaVencimientoLote(l.fecha_vencimiento)),
  ).length;
  const vencidos = activos.filter(
    (l) => categoriaVencimientoLote(l.fecha_vencimiento) === "vencido",
  );
  const unidadesVencidas = vencidos.reduce((s, l) => s + l.existencia, 0);
  const valorVencido = vencidos.reduce((s, l) => s + l.valor_costo, 0);
  return {
    marcas: marcas.size,
    unidades,
    valorCosto,
    valorVenta,
    bajoMin,
    porVencer90,
    lotesVencidos: vencidos.length,
    unidadesVencidas,
    valorVencido,
  };
}

function agruparPorGenerico(lotes: FilaLoteInforme[]) {
  const map = new Map<string, FilaLoteInforme[]>();
  for (const l of lotes) {
    const key = claveGenericoInforme(l);
    const list = map.get(key) ?? [];
    list.push(l);
    map.set(key, list);
  }
  const grupos = [...map.entries()].map(([key, filas]) => {
    const sorted = [...filas].sort(compararFilasLoteInforme);
    const first = sorted[0];
    return {
      key,
      catalogo: first.catalogo_nombre,
      concentracionForma: etiquetaConcentracionForma(first),
      filas: sorted,
      subtotalExistencia: sorted.reduce((s, x) => s + x.existencia, 0),
      subtotalCosto: sorted.reduce((s, x) => s + x.valor_costo, 0),
      subtotalVenta: sorted.reduce((s, x) => s + x.valor_venta, 0),
    };
  });
  grupos.sort((a, b) =>
    `${a.catalogo} ${a.concentracionForma}`.localeCompare(
      `${b.catalogo} ${b.concentracionForma}`,
      "es",
      { sensitivity: "base" },
    ),
  );
  return grupos;
}

export function descargarExistenciasValorizadasPdf(
  lotes: FilaLoteInforme[],
  genericos: InvGenerico[],
  meta: MetaInforme,
) {
  const activos = lotesActivosConExistencia(lotes).sort(compararFilasLoteInforme);
  const ind = indicadoresExistencias(lotes, genericos);
  const doc = crearDocumentoPdf({ orientacion: "landscape" });

  let y = encabezadoPdf(doc, {
    titulo: "Existencias valorizadas",
    institucion: meta.institucion,
    generadoPor: meta.generadoPor,
  });

  autoTable(doc, {
    ...estilosTabla({ fontSize: 9, cellPadding: 3 }),
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Marcas con existencia", fmtNum(ind.marcas)],
      ["Unidades en existencia", fmtNum(ind.unidades)],
      ["Valor a costo (real)", fmtQ(ind.valorCosto)],
      ["Valor a precio de venta", fmtQ(ind.valorVenta)],
      ["Genéricos bajo mínimo", fmtNum(ind.bajoMin)],
      ["Lotes por vencer (≤ 90 días)", fmtNum(ind.porVencer90)],
      ["Lotes vencidos con existencia", fmtNum(ind.lotesVencidos)],
      ["Valor costo (vencidos)", fmtQ(ind.valorVencido)],
    ],
    columnStyles: columnasNumericas([1]),
  });

  y = finalYTabla(doc) + 8;

  const grupos = agruparPorGenerico(activos);
  let totalExistencia = 0;
  let totalCosto = 0;
  let totalVenta = 0;

  for (const g of grupos) {
    y = tituloSeccion(
      doc,
      y,
      `${g.catalogo} · ${g.concentracionForma}`,
    );

    const porMarca = new Map<string, FilaLoteInforme[]>();
    for (const f of g.filas) {
      const key = `${f.producto_id}\0${f.marca}`;
      const list = porMarca.get(key) ?? [];
      list.push(f);
      porMarca.set(key, list);
    }

    totalExistencia += g.subtotalExistencia;
    totalCosto += g.subtotalCosto;
    totalVenta += g.subtotalVenta;

    for (const filasMarca of porMarca.values()) {
      const m = filasMarca[0];
      y = tituloSeccion(doc, y, `Marca: ${m.marca} · ${m.laboratorio}`);
      const body = filasMarca.map((f) => [
        f.numero_lote || "—",
        f.fecha_vencimiento ? formatFechaCalendarioGt(f.fecha_vencimiento) : "—",
        f.ubicacion,
        fmtNum(f.existencia),
        fmtQ(f.precio_costo),
        fmtQ(f.valor_costo),
        fmtQ(f.precio_venta),
        fmtQ(f.valor_venta),
      ]);
      autoTable(doc, {
        ...estilosTabla({ fontSize: 7, cellPadding: 2 }),
        startY: y,
        head: [
          [
            "Lote",
            "Vencimiento",
            "Ubicación",
            "Existencia",
            "Costo unit.",
            "Valor costo",
            "P. venta",
            "Valor venta",
          ],
        ],
        body,
        columnStyles: columnasNumericas([3, 4, 5, 6, 7]),
      });
      y = finalYTabla(doc) + 4;
    }

    autoTable(doc, {
      ...estilosTabla({ fontSize: 8, cellPadding: 2 }),
      startY: y,
      body: [
        [
          "Subtotal genérico",
          "",
          "",
          fmtNum(g.subtotalExistencia),
          "",
          fmtQ(g.subtotalCosto),
          "",
          fmtQ(g.subtotalVenta),
        ],
      ],
      columnStyles: columnasNumericas([3, 5, 7]),
    });
    y = finalYTabla(doc) + 6;
  }

  autoTable(doc, {
    ...estilosTabla({ fontSize: 9, cellPadding: 3 }),
    startY: y,
    body: [
      [
        "TOTAL GENERAL",
        "",
        "",
        fmtNum(totalExistencia),
        "",
        fmtQ(totalCosto),
        "",
        fmtQ(totalVenta),
      ],
    ],
    columnStyles: columnasNumericas([3, 5, 7]),
  });

  piePaginas(doc, "Existencias valorizadas");
  doc.save(nombreArchivo("Existencias_Valorizadas", undefined, "pdf"));
}

type FilaExcelExistencias = {
  producto: string;
  concentracion: string;
  forma: string;
  marca: string;
  laboratorio: string;
  lote: string;
  codigo_barras: string;
  ubicacion: string;
  vencimiento: Date | string;
  existencia: number;
  costo: number;
  valor_costo: number;
  precio_venta: number;
  valor_venta: number;
};

function fechaExcel(iso: string): Date | string {
  const n = normalizarFechaCalendario(iso);
  if (!n) return "";
  return new Date(
    Date.UTC(Number(n.slice(0, 4)), Number(n.slice(5, 7)) - 1, Number(n.slice(8, 10))),
  );
}

export async function descargarExistenciasValorizadasExcel(
  lotes: FilaLoteInforme[],
  meta: MetaInforme,
) {
  const activos = lotesActivosConExistencia(lotes).sort(compararFilasLoteInforme);
  const wb = crearLibro();
  const { ws, filaInicio } = hojaConEncabezado(wb, "Existencias", {
    titulo: "Existencias valorizadas",
    generadoPor: meta.generadoPor,
    institucion: meta.institucion,
    columnasMerge: 14,
  });

  const columnas = [
    { titulo: "Producto", clave: "producto" as const, tipo: "texto" as const, ancho: 22 },
    { titulo: "Concentración", clave: "concentracion" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Forma", clave: "forma" as const, tipo: "texto" as const, ancho: 12 },
    { titulo: "Marca", clave: "marca" as const, tipo: "texto" as const, ancho: 16 },
    { titulo: "Laboratorio", clave: "laboratorio" as const, tipo: "texto" as const, ancho: 14 },
    { titulo: "Lote", clave: "lote" as const, tipo: "texto" as const, ancho: 12 },
    { titulo: "Código de barras", clave: "codigo_barras" as const, tipo: "texto" as const, ancho: 16 },
    { titulo: "Ubicación", clave: "ubicacion" as const, tipo: "texto" as const, ancho: 12 },
    { titulo: "Vencimiento", clave: "vencimiento" as const, tipo: "fecha" as const, ancho: 12 },
    { titulo: "Existencia", clave: "existencia" as const, tipo: "entero" as const, ancho: 11 },
    { titulo: "Costo", clave: "costo" as const, tipo: "moneda" as const, ancho: 11 },
    { titulo: "Valor costo", clave: "valor_costo" as const, tipo: "moneda" as const, ancho: 12 },
    { titulo: "Precio venta", clave: "precio_venta" as const, tipo: "moneda" as const, ancho: 12 },
    { titulo: "Valor venta", clave: "valor_venta" as const, tipo: "moneda" as const, ancho: 12 },
  ];

  const datos: FilaExcelExistencias[] = activos.map((f) => ({
    producto: f.catalogo_nombre,
    concentracion: f.concentracion,
    forma: f.forma_farmaceutica,
    marca: f.marca,
    laboratorio: f.laboratorio,
    lote: f.numero_lote || "—",
    codigo_barras: f.codigo_barras || "—",
    ubicacion: f.ubicacion,
    vencimiento: fechaExcel(f.fecha_vencimiento),
    existencia: f.existencia,
    costo: f.precio_costo,
    valor_costo: f.valor_costo,
    precio_venta: f.precio_venta,
    valor_venta: f.valor_venta,
  }));

  tablaExcel(ws, filaInicio, columnas, datos, {
    totales: true,
    etiquetaTotales: "Totales",
  });

  await guardarLibro(wb, nombreArchivo("Existencias_Valorizadas", undefined, "xlsx"));
}
