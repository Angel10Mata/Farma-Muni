"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ModalCancelButton,
  ModalFooter,
  ModalShell,
} from "@/components/ui/general-modal";
import { fmtQ } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { FiltroTipo } from "../lib/zod";
import { useMovimientosGraficaFinanzas, useResumenFinanciero } from "../lib/hooks";
import {
  serieDiariaFinanzas,
  totalesPorCategoriaFinanzas,
} from "../lib/finanzas-graficas-helpers";
import { FinanzasPeriodoSelector } from "../FinanzasPeriodoSelector";
import {
  calcularRangoPeriodoFinanzas,
  periodoFinanzasInicial,
  type PeriodoFinanzasState,
} from "../lib/periodo-finanzas-helpers";

const COLOR_INGRESO = "#8DA78E";
const COLOR_EGRESO = "#f43f5e";
const PIE_COLORS = ["#8DA78E", "#525D53", "#2c5f9b", "#6f9fd4", "#f59e0b", "#f43f5e", "#a78bfa"];

type GraficasFinanzasModalProps = {
  open: boolean;
  onClose: () => void;
  periodoInicial: PeriodoFinanzasState;
  tipo: FiltroTipo;
  search: string;
};

export function GraficasFinanzasModal({
  open,
  onClose,
  periodoInicial,
  tipo,
  search,
}: GraficasFinanzasModalProps) {
  const [periodo, setPeriodo] = useState<PeriodoFinanzasState>(periodoFinanzasInicial);
  const sincronizadoRef = useRef(false);

  useEffect(() => {
    if (open && !sincronizadoRef.current) {
      setPeriodo(periodoInicial);
      sincronizadoRef.current = true;
    }
    if (!open) {
      sincronizadoRef.current = false;
    }
  }, [open, periodoInicial]);

  const { desde, hasta, resumenDesde, resumenHasta } = useMemo(
    () => calcularRangoPeriodoFinanzas(periodo, { diaEsMesCompleto: true }),
    [periodo],
  );

  const { data: resumen = { total_ingresos: 0, total_egresos: 0, balance: 0 } } =
    useResumenFinanciero(resumenDesde, resumenHasta);

  const { data: movimientos = [], isLoading, isFetching } = useMovimientosGraficaFinanzas(
    { desde, hasta, tipo, search },
    open,
  );

  const serieDiaria = useMemo(() => serieDiariaFinanzas(movimientos), [movimientos]);
  const porCategoria = useMemo(() => totalesPorCategoriaFinanzas(movimientos), [movimientos]);

  const ingresosPie = porCategoria.filter((c) => c.tipo === "ingreso");
  const egresosPie = porCategoria.filter((c) => c.tipo === "egreso");

  const cargando = isLoading || isFetching;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Gráficas financieras"
      fullscreen
      scrollable={false}
      contentClassName="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-0"
    >
      <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50 md:px-6 md:py-4">
        <FinanzasPeriodoSelector
          variant="mesAnio"
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          className="mx-auto w-full md:w-fit"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4 md:gap-4 md:px-6 md:pb-5">
      <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-[9px] font-bold uppercase text-zinc-500">Ingresos</p>
          <p className="text-sm font-black text-[#8DA78E] md:text-base">{fmtQ(resumen.total_ingresos)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-[9px] font-bold uppercase text-zinc-500">Egresos</p>
          <p className="text-sm font-black text-rose-500 md:text-base">{fmtQ(resumen.total_egresos)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-[9px] font-bold uppercase text-zinc-500">Balance</p>
          <p
            className={cn(
              "text-sm font-black md:text-base",
              resumen.balance >= 0 ? "text-zinc-900 dark:text-white" : "text-rose-500",
            )}
          >
            {fmtQ(resumen.balance)}
          </p>
        </div>
      </div>

      {cargando ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-b-2 border-[#8DA78E]" />
        </div>
      ) : movimientos.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          No hay movimientos en el período y filtros actuales.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:gap-4">
          <div className="flex min-h-0 flex-[1.15] flex-col">
            <h3 className="mb-1.5 shrink-0 text-[10px] font-black uppercase tracking-wider text-[#525D53] dark:text-[#A3BEB0]">
              Ingresos y egresos por día
            </h3>
            <div className="min-h-0 flex-1 rounded-xl border border-zinc-200/80 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900/80 md:p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serieDiaria} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis
                    dataKey="etiqueta"
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `Q${v}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      fmtQ(Number(value ?? 0)),
                      name === "ingresos" ? "Ingresos" : "Compras y pagos proveedor",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "ingresos" ? "Ingresos" : "Compras y pagos proveedor"
                    }
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="ingresos" fill={COLOR_INGRESO} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="egresos" fill={COLOR_EGRESO} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-2 md:gap-4">
            <div className="flex min-h-0 flex-col">
              <h3 className="mb-1.5 shrink-0 text-[10px] font-black uppercase tracking-wider text-[#525D53] dark:text-[#A3BEB0]">
                Ingresos por categoría
              </h3>
              <div className="min-h-0 flex-1 rounded-xl border border-zinc-200/80 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900/80 md:p-3">
                {ingresosPie.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-xs text-zinc-400">
                    Sin ingresos en el período
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ingresosPie}
                        dataKey="monto"
                        nameKey="etiqueta"
                        cx="50%"
                        cy="50%"
                        innerRadius="48%"
                        outerRadius="78%"
                        paddingAngle={2}
                      >
                        {ingresosPie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmtQ(Number(value ?? 0))} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-col">
              <h3 className="mb-1.5 shrink-0 text-[10px] font-black uppercase tracking-wider text-[#525D53] dark:text-[#A3BEB0]">
                Compras y pagos a proveedor
              </h3>
              <div className="min-h-0 flex-1 rounded-xl border border-zinc-200/80 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900/80 md:p-3">
                {egresosPie.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-xs text-zinc-400">
                    Sin compras ni pagos a proveedor en el período
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={egresosPie}
                        dataKey="monto"
                        nameKey="etiqueta"
                        cx="50%"
                        cy="50%"
                        innerRadius="48%"
                        outerRadius="78%"
                        paddingAngle={2}
                      >
                        {egresosPie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmtQ(Number(value ?? 0))} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalFooter className="mt-0 shrink-0 md:mt-2">
        <ModalCancelButton onClick={onClose} />
      </ModalFooter>
      </div>
    </ModalShell>
  );
}
