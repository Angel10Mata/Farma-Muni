"use client";

import Link from "next/link";
import { fmtQ } from "@/lib/utils";
import {
  ETIQUETAS_CATEGORIA_VENCIMIENTO,
  type CategoriaVencimientoLote,
  type ConteoVencimientoLotes,
} from "@/lib/vencimientos-gt";

const CATEGORIAS_TARJETA: CategoriaVencimientoLote[] = [
  "vencido",
  "dias_0_30",
  "dias_31_60",
  "dias_61_90",
];

export function DashboardTarjetaPorVencer({
  conteo,
  valorCosto30Dias,
}: {
  conteo: ConteoVencimientoLotes;
  valorCosto30Dias: number;
}) {
  const total =
    conteo.vencido +
    conteo.dias_0_30 +
    conteo.dias_31_60 +
    conteo.dias_61_90 +
    conteo.mas_90;

  if (total === 0) return null;

  return (
    <section
      className="w-full rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 md:p-5 dark:border-amber-900/50 dark:bg-amber-950/20"
      aria-labelledby="dashboard-por-vencer-titulo"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="dashboard-por-vencer-titulo"
            className="text-sm font-black uppercase tracking-wide text-amber-900 dark:text-amber-200"
          >
            Por vencer
          </h2>
          <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-100/80">
            Lotes activos con existencia · valor al costo (vence en 30 días):{" "}
            <strong>{fmtQ(valorCosto30Dias)}</strong>
          </p>
        </div>
        <Link
          href="/farmamuni/inventario?vista=lotes&vencimiento=dias_0_30"
          className="text-[10px] font-black uppercase tracking-wider text-[#2c5f9b] hover:underline dark:text-[#6f9fd4]"
        >
          Ver inventario filtrado
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CATEGORIAS_TARJETA.map((cat) => (
          <Link
            key={cat}
            href={`/farmamuni/inventario?vista=lotes&vencimiento=${cat}`}
            className="rounded-xl border border-amber-200/60 bg-white/80 px-3 py-2 text-center transition-colors hover:bg-white dark:border-amber-900/40 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/70">
              {ETIQUETAS_CATEGORIA_VENCIMIENTO[cat]}
            </p>
            <p className="text-xl font-black text-amber-950 dark:text-amber-100">
              {conteo[cat]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
