import { fechaCalendarioGt, normalizarFechaCalendario } from "@/lib/fechas-gt";

export type CategoriaVencimientoLote =
  | "vencido"
  | "dias_0_30"
  | "dias_31_60"
  | "dias_61_90"
  | "mas_90";

export const CATEGORIAS_VENCIMIENTO_LOTE: CategoriaVencimientoLote[] = [
  "vencido",
  "dias_0_30",
  "dias_31_60",
  "dias_61_90",
  "mas_90",
];

export const ETIQUETAS_CATEGORIA_VENCIMIENTO: Record<CategoriaVencimientoLote, string> = {
  vencido: "Vencido",
  dias_0_30: "0-30 días",
  dias_31_60: "31-60 días",
  dias_61_90: "61-90 días",
  mas_90: "Más de 90 días",
};

export type InsigniaVencimientoLote = {
  categoria: CategoriaVencimientoLote;
  etiqueta: string;
  className: string;
};

export type LoteVencimientoCampos = {
  activo: boolean;
  cantidad_actual: number;
  fecha_vencimiento?: string | null;
  precio_costo?: number | null;
};

export type ConteoVencimientoLotes = Record<CategoriaVencimientoLote, number>;

export function esLoteActivoConExistencia(lote: {
  activo: boolean;
  cantidad_actual: number;
}): boolean {
  return Boolean(lote.activo) && (Number(lote.cantidad_actual) || 0) > 0;
}

export function diasRestantesVencimientoGt(
  fechaVencimiento?: string | null,
  hoyCalendario = fechaCalendarioGt(),
): number | null {
  const fecha = normalizarFechaCalendario(fechaVencimiento);
  if (!fecha) return null;

  const [y1, m1, d1] = hoyCalendario.split("-").map(Number);
  const [y2, m2, d2] = fecha.split("-").map(Number);
  const msHoy = Date.UTC(y1, m1 - 1, d1);
  const msVence = Date.UTC(y2, m2 - 1, d2);
  return Math.round((msVence - msHoy) / 86_400_000);
}

export function categoriaVencimientoLote(
  fechaVencimiento?: string | null,
  hoyCalendario = fechaCalendarioGt(),
): CategoriaVencimientoLote {
  const dias = diasRestantesVencimientoGt(fechaVencimiento, hoyCalendario);
  if (dias === null) return "mas_90";
  if (dias < 0) return "vencido";
  if (dias <= 30) return "dias_0_30";
  if (dias <= 60) return "dias_31_60";
  if (dias <= 90) return "dias_61_90";
  return "mas_90";
}

export function loteCoincideCategoriaVencimiento(
  lote: LoteVencimientoCampos,
  categoria: CategoriaVencimientoLote,
  hoyCalendario = fechaCalendarioGt(),
): boolean {
  if (!esLoteActivoConExistencia(lote)) return false;
  return categoriaVencimientoLote(lote.fecha_vencimiento, hoyCalendario) === categoria;
}

export function contarLotesPorCategoriaVencimiento(
  lotes: LoteVencimientoCampos[],
  hoyCalendario = fechaCalendarioGt(),
): ConteoVencimientoLotes {
  const conteo: ConteoVencimientoLotes = {
    vencido: 0,
    dias_0_30: 0,
    dias_31_60: 0,
    dias_61_90: 0,
    mas_90: 0,
  };

  for (const lote of lotes) {
    if (!esLoteActivoConExistencia(lote)) continue;
    const cat = categoriaVencimientoLote(lote.fecha_vencimiento, hoyCalendario);
    conteo[cat] += 1;
  }

  return conteo;
}

export function valorCostoLotesCategoria(
  lotes: LoteVencimientoCampos[],
  categoria: CategoriaVencimientoLote,
  hoyCalendario = fechaCalendarioGt(),
): number {
  let total = 0;
  for (const lote of lotes) {
    if (!loteCoincideCategoriaVencimiento(lote, categoria, hoyCalendario)) continue;
    const u = Number(lote.cantidad_actual) || 0;
    const costo = Number(lote.precio_costo) || 0;
    total += u * costo;
  }
  return total;
}

export function insigniaVencimientoLote(
  fechaVencimiento?: string | null,
  hoyCalendario = fechaCalendarioGt(),
): InsigniaVencimientoLote | null {
  const dias = diasRestantesVencimientoGt(fechaVencimiento, hoyCalendario);
  if (dias === null) {
    return {
      categoria: "mas_90",
      etiqueta: "Sin fecha",
      className:
        "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600",
    };
  }

  const categoria = categoriaVencimientoLote(fechaVencimiento, hoyCalendario);
  const base =
    "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide";

  switch (categoria) {
    case "vencido":
      return {
        categoria,
        etiqueta: ETIQUETAS_CATEGORIA_VENCIMIENTO.vencido,
        className: `${base} bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800`,
      };
    case "dias_0_30":
      return {
        categoria,
        etiqueta: ETIQUETAS_CATEGORIA_VENCIMIENTO.dias_0_30,
        className: `${base} bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800`,
      };
    case "dias_31_60":
      return {
        categoria,
        etiqueta: ETIQUETAS_CATEGORIA_VENCIMIENTO.dias_31_60,
        className: `${base} bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-200 dark:border-orange-900`,
      };
    case "dias_61_90":
      return {
        categoria,
        etiqueta: ETIQUETAS_CATEGORIA_VENCIMIENTO.dias_61_90,
        className: `${base} bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950/25 dark:text-yellow-100 dark:border-yellow-900`,
      };
    default:
      return {
        categoria: "mas_90",
        etiqueta: ETIQUETAS_CATEGORIA_VENCIMIENTO.mas_90,
        className: `${base} bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800`,
      };
  }
}

export function parseCategoriaVencimientoQuery(
  value: string | null | undefined,
): CategoriaVencimientoLote | null {
  if (!value) return null;
  return CATEGORIAS_VENCIMIENTO_LOTE.includes(value as CategoriaVencimientoLote)
    ? (value as CategoriaVencimientoLote)
    : null;
}

export function lotesPorVencerEn30Dias(lotes: LoteVencimientoCampos[]): number {
  return lotes.filter((l) =>
    loteCoincideCategoriaVencimiento(l, "dias_0_30"),
  ).length;
}
