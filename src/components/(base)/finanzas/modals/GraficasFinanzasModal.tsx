"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
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

function GraficaPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <h3 className="mb-1 shrink-0 text-[10px] font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]">
        {title}
      </h3>
      <div className="min-h-[7.5rem] flex-1 rounded-xl bg-white dark:bg-zinc-900 md:min-h-[8.5rem]">
        {children}
      </div>
    </div>
  );
}

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

  const serieDiaria = useMemo(
    () => serieDiariaFinanzas(movimientos, { desde, hasta }),
    [movimientos, desde, hasta],
  );
  const porCategoria = useMemo(() => totalesPorCategoriaFinanzas(movimientos), [movimientos]);

  const ingresosPie = porCategoria.filter((c) => c.tipo === "ingreso");
  const egresosPie = porCategoria.filter((c) => c.tipo === "egreso");

  const cargando = isLoading || isFetching;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Gráficas financieras"
      maxWidth="max-w-6xl"
      scrollable={false}
      className="md:mx-auto md:h-[min(44rem,calc(100dvh-2rem))] md:max-h-[calc(100dvh-2rem)] md:w-full"
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      <div className="shrink-0 border-b border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/50 md:px-5 md:py-3">
        <FinanzasPeriodoSelector
          variant="mesAnio"
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          className="mx-auto w-full md:w-fit"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pb-2 md:gap-2.5 md:px-6 md:pb-3">
      <div className="grid shrink-0 grid-cols-3 gap-1.5 text-center md:gap-2">
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
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 md:gap-3">
          <GraficaPanel title="Ingresos por día">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serieDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="fecha" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `Q${value}`}
                />
                <Tooltip
                  formatter={(value) => [fmtQ(Number(value ?? 0)), "Total"]}
                  labelStyle={{ color: "#000" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ingresos"
                  stroke={COLOR_INGRESO}
                  strokeWidth={3}
                  dot={{ r: 4, fill: COLOR_INGRESO, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#525D53" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GraficaPanel>

          <GraficaPanel title="Compras y pagos proveedor por día">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serieDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="fecha" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `Q${value}`}
                />
                <Tooltip
                  formatter={(value) => [fmtQ(Number(value ?? 0)), "Total"]}
                  labelStyle={{ color: "#000" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="egresos"
                  stroke={COLOR_EGRESO}
                  strokeWidth={3}
                  dot={{ r: 4, fill: COLOR_EGRESO, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#be123c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GraficaPanel>

          <GraficaPanel title="Ingresos por categoría">
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
          </GraficaPanel>

          <GraficaPanel title="Compras y pagos a proveedor">
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
          </GraficaPanel>
        </div>
      )}

      <ModalFooter className="mt-0 shrink-0 border-t border-zinc-100 px-3 py-2 dark:border-zinc-800 md:px-5">
        <ModalCancelButton onClick={onClose} />
      </ModalFooter>
      </div>
    </ModalShell>
  );
}
