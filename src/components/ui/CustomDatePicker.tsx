import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IntervaloSemana {
  label: string; // e.g. "Lun 1 - Dom 7" o "Lun 29 - Mar 30"
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
}

export function obtenerSemanasDelMes(month: number, year: number): IntervaloSemana[] {
  const semanas: IntervaloSemana[] = [];
  const ultimoDia = new Date(year, month + 1, 0);
  const totalDias = ultimoDia.getDate();

  let diaInicio = 1;

  while (diaInicio <= totalDias) {
    const fechaInicio = new Date(year, month, diaInicio);
    const diasHastaDomingo = fechaInicio.getDay() === 0 ? 0 : 7 - fechaInicio.getDay();
    let diaFin = diaInicio + diasHastaDomingo;
    if (diaFin > totalDias) {
      diaFin = totalDias;
    }

    const fechaFin = new Date(year, month, diaFin);

    const formatDia = (d: Date) => {
      const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return `${nombresDias[d.getDay()]} ${d.getDate()}`;
    };

    const pad = (n: number) => n.toString().padStart(2, "0");
    const desdeStr = `${year}-${pad(month + 1)}-${pad(diaInicio)}`;
    const hastaStr = `${year}-${pad(month + 1)}-${pad(diaFin)}`;

    semanas.push({
      label: `${formatDia(fechaInicio)} - ${formatDia(fechaFin)}`,
      desde: desdeStr,
      hasta: hastaStr
    });

    diaInicio = diaFin + 1;
  }

  return semanas;
}

interface CalendarioCell {
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
}

export function obtenerDiasDelMes(month: number, year: number): CalendarioCell[] {
  const cells: CalendarioCell[] = [];
  const primerDiaSemana = new Date(year, month, 1).getDay();
  const diasMesActual = new Date(year, month + 1, 0).getDate();
  const diasMesAnterior = new Date(year, month, 0).getDate();

  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({
      day: diasMesAnterior - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false
    });
  }

  for (let i = 1; i <= diasMesActual; i++) {
    cells.push({
      day: i,
      month,
      year,
      isCurrentMonth: true
    });
  }

  let nextMonthDay = 1;
  while (cells.length < 42) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({
      day: nextMonthDay,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false
    });
    nextMonthDay++;
  }

  return cells;
}

export const CustomDatePicker = ({
  value,
  onChange,
  placeholder,
  align = "left",
  dropDirection = "down"
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  align?: "left" | "right" | "center";
  dropDirection?: "up" | "down";
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  
  const getParsedDate = () => {
    if (!value) return new Date();
    const [y, m, d] = value.split("-").map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
    return new Date(y, m - 1, d);
  };

  const parsedDate = getParsedDate();
  const [navMonth, setNavMonth] = useState(parsedDate.getMonth());
  const [navYear, setNavYear] = useState(parsedDate.getFullYear());
  const [yearRangeStart, setYearRangeStart] = useState(parsedDate.getFullYear() - 4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = getParsedDate();
    setNavMonth(p.getMonth());
    setNavYear(p.getFullYear());
    setYearRangeStart(p.getFullYear() - 4);
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      setViewMode("days");
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(navYear - 1);
    } else {
      setNavMonth(navMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(navYear + 1);
    } else {
      setNavMonth(navMonth + 1);
    }
  };

  const handleSelectDay = (cell: CalendarioCell) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const valStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
    onChange(valStr);
    setIsOpen(false);
  };

  const getDisplayDate = () => {
    if (!value) return placeholder || "Seleccionar...";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return placeholder || "Seleccionar...";
    return `${d}/${m}/${y}`;
  };

  const cells = obtenerDiasDelMes(navMonth, navYear);
  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const nombresMesesCortos = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 hover:border-[#8DA78E] rounded-xl px-2.5 py-1.5 cursor-pointer select-none transition-all shadow-xs h-[34px] min-w-[130px] text-left focus:outline-none focus:ring-1 focus:ring-[#8DA78E]"
      >
        <div className="flex items-center">
          <Calendar className="size-3.5 text-[#8DA78E] mr-1.5 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {getDisplayDate()}
          </span>
        </div>
        <ChevronDown className="size-3 text-slate-400 ml-1.5 shrink-0" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <div
              className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-xs sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl z-[200] p-4 min-w-[280px] max-w-[320px]",
                "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:static sm:translate-x-0 sm:translate-y-0 sm:z-50",
                "sm:absolute",
                dropDirection === "down" ? "sm:top-full sm:mt-2" : "sm:bottom-full sm:mb-2",
                align === "left" && "sm:left-0 sm:right-auto",
                align === "right" && "sm:right-0 sm:left-auto",
                align === "center" && "sm:left-1/2 sm:-translate-x-1/2"
              )}
            >
            {/* Header Controls */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              {viewMode === "days" && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg cursor-pointer text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("months")}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-800 dark:text-[#A3BEB0] bg-slate-100/80 dark:bg-zinc-900 hover:bg-[#8DA78E]/15 hover:text-[#8DA78E] dark:hover:bg-[#8DA78E]/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {nombresMeses[navMonth]}
                      <ChevronDown className="size-3 opacity-60" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("years")}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-800 dark:text-[#A3BEB0] bg-slate-100/80 dark:bg-zinc-900 hover:bg-[#8DA78E]/15 hover:text-[#8DA78E] dark:hover:bg-[#8DA78E]/20 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {navYear}
                      <ChevronDown className="size-3 opacity-60" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg cursor-pointer text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}

              {viewMode === "months" && (
                <>
                  <span className="text-xs font-bold text-slate-700 dark:text-[#A3BEB0] px-1">
                    Seleccionar Mes ({navYear})
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMode("days")}
                    className="text-xs font-bold text-[#8DA78E] hover:underline px-2 py-1 cursor-pointer"
                  >
                    Volver
                  </button>
                </>
              )}

              {viewMode === "years" && (
                <>
                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart - 12)}
                    className="p-1.5 rounded-lg cursor-pointer text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  <span className="text-xs font-bold text-slate-700 dark:text-[#A3BEB0]">
                    {yearRangeStart} - {yearRangeStart + 11}
                  </span>

                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart + 12)}
                    className="p-1.5 rounded-lg cursor-pointer text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}
            </div>

            {/* DAYS VIEW */}
            {viewMode === "days" && (
              <>
                <div className="grid grid-cols-7 gap-1 text-center mb-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                  {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((dayName) => (
                    <div key={dayName} className="py-1">{dayName}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {cells.map((cell, idx) => {
                    const pad = (n: number) => n.toString().padStart(2, "0");
                    const cellValStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
                    const isSelected = value === cellValStr;
                    const isToday = () => {
                      const today = new Date();
                      return (
                        today.getDate() === cell.day &&
                        today.getMonth() === cell.month &&
                        today.getFullYear() === cell.year
                      );
                    };

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDay(cell)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-[#8DA78E] text-white shadow-sm shadow-[#8DA78E]/30 scale-105 font-bold"
                            : cell.isCurrentMonth
                            ? isToday()
                              ? "border border-[#8DA78E] text-[#8DA78E] dark:text-[#A3BEB0] font-bold bg-[#8DA78E]/5 hover:bg-[#8DA78E]/10"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-900/60"
                            : "text-slate-400/50 dark:text-slate-650/30 hover:bg-slate-50/50 dark:hover:bg-zinc-900/10"
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* MONTHS GRID VIEW */}
            {viewMode === "months" && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {nombresMesesCortos.map((mName, idx) => {
                  const isCurrentNavMonth = navMonth === idx;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setNavMonth(idx);
                        setViewMode("days");
                      }}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        isCurrentNavMonth
                          ? "bg-[#8DA78E] text-white shadow-md shadow-[#8DA78E]/30 scale-105"
                          : "bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:bg-[#8DA78E]/15 hover:text-[#8DA78E]"
                      )}
                    >
                      {nombresMeses[idx]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* YEARS GRID VIEW */}
            {viewMode === "years" && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((y) => {
                  const isCurrentNavYear = navYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setNavYear(y);
                        setViewMode("days");
                      }}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        isCurrentNavYear
                          ? "bg-[#8DA78E] text-white shadow-md shadow-[#8DA78E]/30 scale-105"
                          : "bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:bg-[#8DA78E]/15 hover:text-[#8DA78E]"
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-900/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="px-2.5 py-1 text-slate-500 hover:text-red-500 dark:hover:text-red-400 font-bold transition-colors cursor-pointer rounded-md hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pad = (n: number) => n.toString().padStart(2, "0");
                  const todayObj = new Date();
                  const todayStr = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-${pad(todayObj.getDate())}`;
                  onChange(todayStr);
                  setIsOpen(false);
                }}
                className="px-2.5 py-1 text-[#8DA78E] dark:text-[#A3BEB0] hover:bg-[#8DA78E]/10 font-bold transition-colors cursor-pointer rounded-md"
              >
                Hoy
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>
  );
};
