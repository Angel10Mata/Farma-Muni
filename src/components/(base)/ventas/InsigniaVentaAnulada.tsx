"use client";

import { formatFechaHoraGt } from "@/lib/fechas-gt";
import { ventaEstaAnulada } from "./lib/helpers";

type VentaAnulacionInfo = {
  motivo_anulacion?: string | null;
  anulada_por_profile?: { nombre?: string } | null;
  anulada_at?: string | null;
  observaciones?: string | null;
  anulada?: boolean | null;
  estado?: string | null;
};

export function InsigniaVentaAnulada({ venta }: { venta: VentaAnulacionInfo }) {
  if (!ventaEstaAnulada(venta)) {
    return null;
  }
  const motivo = venta.motivo_anulacion?.trim();
  const quien = venta.anulada_por_profile?.nombre?.trim() || "Administrador";
  const cuando = venta.anulada_at ? formatFechaHoraGt(venta.anulada_at) : null;

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-etiqueta text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
      <p className="font-black uppercase tracking-wide">Anulada</p>
      {motivo ? <p className="mt-0.5 font-medium">{motivo}</p> : null}
      <p className="mt-0.5 text-rose-700/90 dark:text-rose-300/80">
        {quien}
        {cuando ? ` · ${cuando}` : ""}
      </p>
    </div>
  );
}
