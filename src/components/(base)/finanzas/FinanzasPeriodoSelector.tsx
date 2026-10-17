"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import {
  ModuleDateFilterLayout,
  moduleDateFilterControlButtonClass,
} from "@/components/ui/module-date-period-filter";
import { obtenerSemanasDelMes } from "@/lib/fechas-gt";
import { cn } from "@/lib/utils";
import type { PeriodoFinanzasState } from "./lib/periodo-finanzas-helpers";

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type FinanzasPeriodoSelectorProps = {
  className?: string;
  variant: "mesAnio" | "lista";
  periodo: PeriodoFinanzasState;
  onPeriodoChange: (next: PeriodoFinanzasState) => void;
};

export function FinanzasPeriodoSelector({
  className,
  variant,
  periodo,
  onPeriodoChange,
}: FinanzasPeriodoSelectorProps) {
  const mesDropdownRef = useRef<HTMLDivElement>(null);
  const semanaDropdownRef = useRef<HTMLDivElement>(null);
  const [mostrarMesDropdown, setMostrarMesDropdown] = useState(false);
  const [mostrarSemanaDropdown, setMostrarSemanaDropdown] = useState(false);

  const {
    tipoFiltroFecha,
    fechaDia,
    activeMonth,
    activeYear,
    selectedWeekIndex,
    fechaRangoDesde,
    fechaRangoHasta,
  } = periodo;

  const patch = (partial: Partial<PeriodoFinanzasState>) => {
    onPeriodoChange({ ...periodo, ...partial });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (semanaDropdownRef.current && !semanaDropdownRef.current.contains(event.target as Node)) {
        setMostrarSemanaDropdown(false);
      }
      if (mesDropdownRef.current && !mesDropdownRef.current.contains(event.target as Node)) {
        setMostrarMesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const periodOptions =
    variant === "mesAnio"
      ? [
          { id: "dia", label: "Mes/Año" },
          { id: "semana", label: "Mes" },
          { id: "rango", label: "Rango" },
        ]
      : [
          { id: "dia", label: "Día" },
          { id: "semana", label: "Mes" },
          { id: "rango", label: "Rango" },
        ];

  return (
    <ModuleDateFilterLayout
      className={cn("mx-auto w-full md:w-fit", className)}
      periodValue={tipoFiltroFecha}
      periodOptions={periodOptions}
      onPeriodChange={(id) => patch({ tipoFiltroFecha: id })}
    >
      {tipoFiltroFecha === "dia" && (
        <CustomDatePicker
          value={fechaDia}
          onChange={(v) => patch({ fechaDia: v })}
          placeholder={variant === "mesAnio" ? "Mes y año" : "Elegir día"}
          align="left"
          dropDirection="down"
          granularity={variant === "mesAnio" ? "month" : "day"}
        />
      )}

      {tipoFiltroFecha === "semana" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative shrink-0" ref={mesDropdownRef}>
            <button
              type="button"
              onClick={() => setMostrarMesDropdown(!mostrarMesDropdown)}
              className={cn(moduleDateFilterControlButtonClass, "sm:w-[8.75rem]")}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[#8DA78E]" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {MESES_CORTOS[activeMonth]} {activeYear}
                </span>
              </div>
              <ChevronDown className="size-3 text-slate-400" />
            </button>

            <AnimatePresence>
              {mostrarMesDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-1/2 z-[260] mt-1 w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 opacity-100 shadow-xl dark:border-slate-800 dark:bg-zinc-900"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-900">
                    <button
                      type="button"
                      onClick={() => patch({ activeYear: activeYear - 1 })}
                      className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeYear}</span>
                    <button
                      type="button"
                      onClick={() => patch({ activeYear: activeYear + 1 })}
                      className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {MESES_CORTOS.map((m, idx) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          patch({ activeMonth: idx, selectedWeekIndex: -1 });
                          setMostrarMesDropdown(false);
                        }}
                        className={cn(
                          "cursor-pointer rounded-lg px-1 py-1.5 text-[10px] font-bold transition-all",
                          activeMonth === idx
                            ? "bg-[#8DA78E] text-white"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-zinc-900",
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative shrink-0" ref={semanaDropdownRef}>
            <button
              type="button"
              onClick={() => setMostrarSemanaDropdown(!mostrarSemanaDropdown)}
              className={cn(moduleDateFilterControlButtonClass, "sm:w-[9.375rem]")}
            >
              <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                {selectedWeekIndex === -1
                  ? "Todo el mes"
                  : obtenerSemanasDelMes(activeMonth, activeYear)[selectedWeekIndex]?.label || "Semana"}
              </span>
              <ChevronDown className="size-3 shrink-0 text-slate-400" />
            </button>

            <AnimatePresence>
              {mostrarSemanaDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-1/2 z-[260] mt-1 w-[180px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 opacity-100 shadow-xl dark:border-slate-800 dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() => {
                      patch({ selectedWeekIndex: -1 });
                      setMostrarSemanaDropdown(false);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs font-bold",
                      selectedWeekIndex === -1
                        ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-zinc-900",
                    )}
                  >
                    <span>Todo el mes</span>
                    {selectedWeekIndex === -1 && <Check className="size-3" />}
                  </button>
                  <div className="mx-2 my-1 h-px bg-slate-100 dark:bg-slate-800" />
                  {obtenerSemanasDelMes(activeMonth, activeYear).map((sem, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        patch({ selectedWeekIndex: idx });
                        setMostrarSemanaDropdown(false);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs font-semibold",
                        selectedWeekIndex === idx
                          ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-zinc-900",
                      )}
                    >
                      <span>{sem.label}</span>
                      {selectedWeekIndex === idx && <Check className="size-3" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {tipoFiltroFecha === "rango" && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <CustomDatePicker
            value={fechaRangoDesde}
            onChange={(v) => patch({ fechaRangoDesde: v })}
            placeholder="Desde"
            align="left"
            dropDirection="down"
          />
          <span className="text-xs text-slate-400">-</span>
          <CustomDatePicker
            value={fechaRangoHasta}
            onChange={(v) => patch({ fechaRangoHasta: v })}
            placeholder="Hasta"
            align="right"
            dropDirection="down"
          />
        </div>
      )}
    </ModuleDateFilterLayout>
  );
}
