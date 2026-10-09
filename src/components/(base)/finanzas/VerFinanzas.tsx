"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Search,
  Trash2,
  Calendar,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  MoreVertical,
} from "lucide-react";
import Swal from "sweetalert2";
import { getSwalThemeOpts } from "@/lib/utils";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { moduleControlsShellClass, moduleListPageShellClass } from "@/lib/module-layout";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";
import {
  moduleTableBodyClass,
  moduleTableClass,
  moduleTableDesktopScrollClass,
  moduleTableDesktopWrapClass,
  moduleTableEmptyClass,
  ModuleTableFooter,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableScrollClass,
  moduleTableSearchClass,
  moduleTableShellClass,
} from "@/components/ui/module-table";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import {
  ModuleDateFilterLayout,
  moduleDateFilterControlButtonClass,
} from "@/components/ui/module-date-period-filter";
import { ModuleFilterUnderlineTabs } from "@/components/ui/module-filter-tabs";
import { fechaCalendarioGt, obtenerSemanasDelMes } from "@/lib/fechas-gt";

import {
  CATEGORIA_LABELS,
  FILTROS_TIPO,
  type FiltroTipo,
} from "./lib/zod";
import {
  useMovimientosFinancieros,
  useResumenFinanciero,
  useEliminarMovimiento,
  useCuentasPorPagar,
} from "./lib/hooks";
import { TarjetaCuentasPorPagar } from "@/components/(base)/proveedores/TarjetaCuentasPorPagar";
import { resumenCuentasPorPagarDesdeRpc } from "@/components/(base)/proveedores/lib/compras-helpers";
import type { TransaccionFinanciera } from "./lib/zod";

const SEARCH_DEBOUNCE_MS = 350;

export function VerFinanzas() {
  // Paginación y búsqueda
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filtros de fecha
  const [tipoFiltroFecha, setTipoFiltroFecha] = useState<string>("dia");
  const [fechaDia, setFechaDia] = useState<string>(() => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [activeMonth, setActiveMonth] = useState(() => new Date().getMonth());
  const [activeYear, setActiveYear] = useState(() => new Date().getFullYear());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const [mostrarMesDropdown, setMostrarMesDropdown] = useState(false);
  const [mostrarSemanaDropdown, setMostrarSemanaDropdown] = useState(false);
  const mesDropdownRef = useRef<HTMLDivElement>(null);
  const semanaDropdownRef = useRef<HTMLDivElement>(null);

  const [fechaRangoDesde, setFechaRangoDesde] = useState<string>("");
  const [fechaRangoHasta, setFechaRangoHasta] = useState<string>("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anulación de movimiento
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDesc, setDeleteDesc] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Cerrar dropdowns al hacer clic fuera
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

  const { desde, hasta, resumenDesde, resumenHasta } = useMemo(() => {
    let d = undefined;
    let h = undefined;
    let rD = undefined;
    let rH = undefined;
    const pad = (n: number) => n.toString().padStart(2, "0");

    if (tipoFiltroFecha === "dia" && fechaDia) {
      d = `${fechaDia}T00:00:00.000-06:00`;
      h = `${fechaDia}T23:59:59.999-06:00`;
      const [y, m, day] = fechaDia.split('-');
      const ultimoDia = new Date(Number(y), Number(m), 0).getDate();
      rD = `${y}-${m}-01T00:00:00.000-06:00`;
      rH = `${y}-${m}-${pad(ultimoDia)}T23:59:59.999-06:00`;
    } else if (tipoFiltroFecha === "semana") {
      const semanas = obtenerSemanasDelMes(activeMonth, activeYear);
      const ultimoDia = new Date(activeYear, activeMonth + 1, 0).getDate();
      const mesCompletoDesde = `${activeYear}-${pad(activeMonth + 1)}-01T00:00:00.000-06:00`;
      const mesCompletoHasta = `${activeYear}-${pad(activeMonth + 1)}-${pad(ultimoDia)}T23:59:59.999-06:00`;
      
      rD = mesCompletoDesde;
      rH = mesCompletoHasta;

      if (selectedWeekIndex === -1) {
        d = mesCompletoDesde;
        h = mesCompletoHasta;
      } else {
        const sem = semanas[selectedWeekIndex];
        if (sem) {
          d = `${sem.desde}T00:00:00.000-06:00`;
          h = `${sem.hasta}T23:59:59.999-06:00`;
        }
      }
    } else if (tipoFiltroFecha === "rango") {
      if (fechaRangoDesde) {
        d = `${fechaRangoDesde}T00:00:00.000-06:00`;
        rD = d;
      }
      if (fechaRangoHasta) {
        h = `${fechaRangoHasta}T23:59:59.999-06:00`;
        rH = h;
      }
    }

    return { desde: d, hasta: h, resumenDesde: rD, resumenHasta: rH };
  }, [tipoFiltroFecha, fechaDia, activeMonth, activeYear, selectedWeekIndex, fechaRangoDesde, fechaRangoHasta]);

  // Queries y mutaciones
  const { data: listado, isLoading } = useMovimientosFinancieros({
    page,
    pageSize,
    tipo: filtroTipo,
    search: searchTerm,
    desde,
    hasta
  });
  
  const { data: resumen = { total_ingresos: 0, total_egresos: 0, balance: 0 } } = useResumenFinanciero(resumenDesde, resumenHasta);
  const { data: cuentasPagar = [] } = useCuentasPorPagar();
  const resumenPagar = resumenCuentasPorPagarDesdeRpc(cuentasPagar);
  const { mutateAsync: anularMovimiento } = useEliminarMovimiento();

  const movimientos = listado?.data || [];
  const totalRegistros = listado?.count || 0;

  // Handlers
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await anularMovimiento(id);
      toast.success("El registro ha sido anulado correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo anular el registro";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Formato de presentación
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(amount);

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    const weekDayStr = d.toLocaleString("es-GT", { weekday: "short" }).replace(/\./g, '');
    const weekDay = weekDayStr.charAt(0).toUpperCase() + weekDayStr.slice(1);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHour = String(hours % 12 || 12).padStart(2, "0");
    return `${weekDay} ${day}/${month}/${year} | ${formattedHour}:${minutes} ${ampm}`;
  };

  const getCategoriaLabel = (categoria: string) =>
    CATEGORIA_LABELS[categoria as keyof typeof CATEGORIA_LABELS] ?? categoria.toUpperCase();

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / pageSize));

  return (
    <div className={moduleListPageShellClass}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-1">
          <ModuleHeaderBackButton size="sm" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">
              Control Financiero
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Ingresos, egresos, balance y cuentas pendientes
            </p>
          </div>
        </div>

        {/* Totales — siempre el balance real de TODO el libro mayor, calculado en Postgres */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-1">
          <div className="bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-3 md:p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 mb-2">
              <div className="p-1.5 md:p-2 bg-[#8DA78E]/10 rounded-lg text-[#8DA78E] shrink-0">
                <ArrowUpRight className="size-4 md:size-5" />
              </div>
              <h3 className="text-[9px] md:text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Ingresos
              </h3>
            </div>
            <p className="text-[12px] min-[380px]:text-sm sm:text-base md:text-2xl font-black text-[#8DA78E] tracking-tighter break-words whitespace-normal leading-tight">
              {formatMoney(resumen.total_ingresos)}
            </p>
          </div>

          <div className="bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-3 md:p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 mb-2">
              <div className="p-1.5 md:p-2 bg-rose-500/10 rounded-lg text-rose-500 shrink-0">
                <ArrowDownRight className="size-4 md:size-5" />
              </div>
              <h3 className="text-[9px] md:text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Egresos
              </h3>
            </div>
            <p className="text-[12px] min-[380px]:text-sm sm:text-base md:text-2xl font-black text-rose-500 tracking-tighter break-words whitespace-normal leading-tight">{formatMoney(resumen.total_egresos)}</p>
          </div>

          <div className="bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-3 md:p-5 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 mb-2">
              <div className="p-1.5 md:p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 shrink-0">
                <Wallet className="size-4 md:size-5" />
              </div>
              <h3 className="text-[9px] md:text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Balance Total
              </h3>
            </div>
            <p
              className={cn(
                "text-[12px] min-[380px]:text-sm sm:text-base md:text-2xl font-black tracking-tighter break-words whitespace-normal leading-tight",
                resumen.balance >= 0 ? "text-zinc-900 dark:text-white" : "text-rose-500"
              )}
            >
              {formatMoney(resumen.balance)}
            </p>
          </div>

          <TarjetaCuentasPorPagar
            totalPendiente={resumenPagar.totalPendiente}
            totalVencido={resumenPagar.totalVencido}
            className="col-span-2 md:col-span-1"
          />
        </div>

      </div>

      <section
        className={cn(
          moduleControlsShellClass,
          "relative z-30 shrink-0 overflow-visible p-3 md:p-4",
        )}
      >
        <div className="flex flex-col gap-3">
          <div className="relative w-full min-w-0 text-left lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8DA78E]/70" />
            <input
              type="text"
              placeholder="Buscar por concepto o categoría..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(moduleTableSearchClass, "py-2 pl-9")}
            />
          </div>

          <div
            className="flex flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
          >
            <ModuleDateFilterLayout
              periodValue={tipoFiltroFecha}
              periodOptions={[
                { id: "dia", label: "Día" },
                { id: "semana", label: "Mes" },
                { id: "rango", label: "Rango" },
              ]}
              onPeriodChange={setTipoFiltroFecha}
            >
                  {tipoFiltroFecha === "dia" && (
                    <CustomDatePicker
                      value={fechaDia}
                      onChange={setFechaDia}
                      placeholder="Elegir día"
                      align="left"
                      dropDirection="down"
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
                              {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][activeMonth]} {activeYear}
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
                              className="absolute top-full left-1/2 z-[200] mt-1 w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 opacity-100 shadow-xl dark:border-slate-800 dark:bg-zinc-900"
                            >
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-900">
                                <button
                                  type="button"
                                  onClick={() => setActiveYear((y) => y - 1)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 cursor-pointer"
                                >
                                  <ChevronLeft className="size-3.5" />
                                </button>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeYear}</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveYear((y) => y + 1)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500 cursor-pointer"
                                >
                                  <ChevronRight className="size-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((m, idx) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                      setActiveMonth(idx);
                                      setMostrarMesDropdown(false);
                                      setSelectedWeekIndex(-1);
                                    }}
                                    className={cn(
                                      "px-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                                      activeMonth === idx
                                        ? "bg-[#8DA78E] text-white"
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
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
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {selectedWeekIndex === -1 ? "Todo el mes" : obtenerSemanasDelMes(activeMonth, activeYear)[selectedWeekIndex]?.label || "Semana"}
                          </span>
                          <ChevronDown className="size-3 text-slate-400 shrink-0" />
                        </button>
                        
                        <AnimatePresence>
                          {mostrarSemanaDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute top-full left-1/2 z-[200] mt-1 w-[180px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 opacity-100 shadow-xl dark:border-slate-800 dark:bg-zinc-900"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWeekIndex(-1);
                                  setMostrarSemanaDropdown(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between cursor-pointer",
                                  selectedWeekIndex === -1
                                    ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
                                )}
                              >
                                <span>Todo el mes</span>
                                {selectedWeekIndex === -1 && <Check className="size-3" />}
                              </button>
                              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                              {obtenerSemanasDelMes(activeMonth, activeYear).map((sem, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedWeekIndex(idx);
                                    setMostrarSemanaDropdown(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between cursor-pointer",
                                    selectedWeekIndex === idx
                                      ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
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
                        onChange={setFechaRangoDesde}
                        placeholder="Desde"
                        align="left"
                        dropDirection="down"
                      />
                      <span className="text-xs text-slate-400">-</span>
                      <CustomDatePicker
                        value={fechaRangoHasta}
                        onChange={setFechaRangoHasta}
                        placeholder="Hasta"
                        align="right"
                        dropDirection="down"
                      />
                    </div>
                  )}
            </ModuleDateFilterLayout>

            <ModuleFilterUnderlineTabs
              ariaLabel="Tipo de movimiento"
              value={filtroTipo}
              options={FILTROS_TIPO.map((tipo) => ({ id: tipo, label: tipo }))}
              onChange={(tipo) => {
                setPage(1);
                setFiltroTipo(tipo);
              }}
              className="sm:justify-end"
            />
          </div>
        </div>
      </section>

        <div className={cn(moduleTableShellClass, "relative p-0")}>
          <div className={cn(moduleTableScrollClass, "p-1 sm:p-2 md:p-4 min-h-0")}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8DA78E] mb-4"></div>
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                  Cargando registros financieros...
                </p>
              </div>
            ) : movimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#8DA78E]/10 flex items-center justify-center mb-4">
                  <FileText className="size-8 text-[#8DA78E]/50" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Sin registros</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                  No se encontraron movimientos financieros que coincidan con los filtros aplicados.
                </p>
              </div>
            ) : (
              <>
                <div className="md:hidden flex flex-col gap-3 px-1">
                  {movimientos.map((mov) => {
                    const isIngreso = mov.tipo_movimiento === "ingreso";
                    const dateFormatted = formatFecha(mov.created_at ?? mov.fecha_movimiento).replace(',', '');
                    return (
                      <motion.div
                        key={mov.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={cn(
                          "relative border rounded-xl p-3 flex gap-3 items-center min-h-[88px] transition-all bg-white dark:bg-[#525D53]/10 border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20 hover:border-[#8DA78E] dark:hover:border-[#A3BEB0]/60"
                        )}
                      >
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <h3 className={cn(
                                "font-black text-xs truncate uppercase leading-tight",
                                "text-slate-900 dark:text-white"
                              )}>
                                {mov.descripcion}
                              </h3>
                              <span className="text-[10px] text-slate-500 font-medium truncate">
                                {dateFormatted}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={cn(
                                "font-black text-[13px] tabular-nums tracking-tight leading-tight",
                                mov.monto < 0 ? "text-rose-600" : (isIngreso ? "text-[#8DA78E] dark:text-[#A3BEB0]" : "text-rose-500")
                              )}>
                                {isIngreso ? (mov.monto < 0 ? "-" : "+") : (mov.monto < 0 ? "+" : "-")}
                                {formatMoney(Math.abs(mov.monto))}
                              </span>
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {getCategoriaLabel(mov.categoria)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === mov.id ? null : mov.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                          
                          {activeMenuId === mov.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-50 min-w-[110px]">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  Swal.fire({
                                    title: "¿Anular registro?",
                                    text: `Se creará un registro inverso para anular: "${mov.descripcion}". Esta acción no se puede deshacer.`,
                                    icon: "warning",
                                    showCancelButton: true,
                                    confirmButtonText: "Sí, anular",
                                    cancelButtonText: "Cancelar",
                                    ...getSwalThemeOpts()
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      handleDelete(mov.id);
                                    }
                                  });
                                }}
                                className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md cursor-pointer"
                              >
                                <Trash2 className="size-3.5" /> Anular
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className={moduleTableDesktopWrapClass}>
                  <div className={moduleTableDesktopScrollClass}>
                  <table className={moduleTableClass}>
                    <thead>
                      <tr className={moduleTableHeadRowClass}>
                        <th className={moduleTableHeadCellClass}>Fecha</th>
                        <th className={moduleTableHeadCellClass}>Concepto / Categoría</th>
                        <th className={cn(moduleTableHeadCellClass, "text-right")}>Monto</th>
                        <th className={cn(moduleTableHeadCellClass, "text-center")}>
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={moduleTableBodyClass}>
                      {movimientos.map((mov) => (
                        <motion.tr
                          key={mov.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                        >
                          <td className="px-2 sm:px-5 py-3 sm:py-4 align-top sm:align-middle">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Calendar className="size-3 sm:size-3.5 text-zinc-400 shrink-0 hidden sm:block" />
                              <span className="text-[10px] sm:text-xs font-medium text-zinc-600 dark:text-zinc-300 break-words line-clamp-2">
                                {formatFecha(mov.created_at ?? mov.fecha_movimiento).replace(',', '')}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-5 py-3 sm:py-4 align-top sm:align-middle">
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-[11px] sm:text-sm font-bold line-clamp-2 break-words",
                                mov.monto < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"
                              )}>
                                {mov.descripcion}
                              </span>
                              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1 sm:gap-1.5">
                                <span className="truncate">{getCategoriaLabel(mov.categoria)}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-5 py-3 sm:py-4 text-right align-top sm:align-middle whitespace-nowrap">
                            <span
                              className={cn(
                                "text-xs sm:text-sm font-black tabular-nums tracking-tight",
                                mov.monto < 0 ? "text-rose-600" : (mov.tipo_movimiento === "ingreso" ? "text-[#8DA78E]" : "text-rose-500")
                              )}
                            >
                              {mov.tipo_movimiento === "ingreso" ? (mov.monto < 0 ? "-" : "+") : (mov.monto < 0 ? "+" : "-")}
                              {formatMoney(Math.abs(mov.monto))}
                            </span>
                          </td>

                          <td className="px-1 sm:px-5 py-3 sm:py-4 text-center align-top sm:align-middle">
                            <button
                              type="button"
                              onClick={() => {
                                Swal.fire({
                                  title: "¿Anular registro?",
                                  text: `Se creará un registro inverso para anular: "${mov.descripcion}". Esta acción no se puede deshacer.`,
                                  icon: "warning",
                                  showCancelButton: true,
                                  confirmButtonText: "Sí, anular",
                                  cancelButtonText: "Cancelar",
                                  ...getSwalThemeOpts()
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    handleDelete(mov.id);
                                  }
                                });
                              }}
                              className="p-1 sm:p-2 rounded-xl text-zinc-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all focus:opacity-100 cursor-pointer"
                              title="Anular registro"
                            >
                              <Trash2 className="size-3.5 sm:size-4 mx-auto" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {!isLoading && (
            <ModuleTableFooter
              itemCount={totalRegistros}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={page}
              totalPages={totalPaginas}
              onPageChange={setPage}
            />
          )}
        </div>

    </div>
  );
}
