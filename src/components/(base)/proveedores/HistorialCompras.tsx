"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Calendar, ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import { cn, fmtQ } from "@/lib/utils";
import { moduleControlsShellClass } from "@/lib/module-layout";
import { ModuleDateFilterLayout } from "@/components/ui/module-date-period-filter";
import { ModuleFilterUnderlineTabs } from "@/components/ui/module-filter-tabs";
import { Compra } from "./lib/zod";
import { CompraDetalleModal } from "./modals/CompraDetalleModal";
import {
  compraPagoVencido,
  formatearFechaCompraGt,
  saldoPendienteCompra,
  totalPagadoCompra,
} from "./lib/compras-helpers";
import { InsigniaPagoVencidoCompra } from "./InsigniaPagoVencidoCompra";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { FileDown } from "lucide";
import { toast } from "react-toastify";
import { obtenerReporteComprasProveedor } from "./lib/actions";
import { descargarReporteComprasProveedorPdf } from "./lib/export-reporte-compras-proveedor-pdf";
import { ultimoDiaMesCalendario } from "@/lib/fechas-gt";
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

// Props
interface HistorialComprasProps {
  compras: Compra[];
}

// Helpers
const obtenerCodigoCompra = (id: string) => {
  if (!id) return "N/A";
  const cleanId = id.replace(/-/g, "").toUpperCase();
  return `${cleanId.substring(0, 3)}-${cleanId.substring(3, 6)}`;
};

// Historial
export function HistorialCompras({ compras }: HistorialComprasProps) {
  // Estado
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [filtroPago, setFiltroPago] = useState<"todos" | "Pagado" | "Pendiente">("todos");

  const [tipoFiltroFechaCompras, setTipoFiltroFechaCompras] = useState<"dia" | "mes" | "rango">("mes");
  const [fechaDiaCompras, setFechaDiaCompras] = useState<string>(fechaCalendarioGt());
  
  const [activeMonthCompras, setActiveMonthCompras] = useState(new Date().getMonth());
  const [activeYearCompras, setActiveYearCompras] = useState(new Date().getFullYear());
  
  const [fechaRangoDesdeCompras, setFechaRangoDesdeCompras] = useState<string>("");
  const [fechaRangoHastaCompras, setFechaRangoHastaCompras] = useState<string>("");

  const [selectedWeekIndexCompras, setSelectedWeekIndexCompras] = useState(-1);

  const [currentPageCompras, setCurrentPageCompras] = useState(1);
  const [pageSizeCompras, setPageSizeCompras] = useState(15);
  const [exportandoReporte, setExportandoReporte] = useState(false);

  const [mostrarMesDropdownCompras, setMostrarMesDropdownCompras] = useState(false);
  const [mostrarSemanaDropdownCompras, setMostrarSemanaDropdownCompras] = useState(false);

  const mesDropdownComprasRef = useRef<HTMLDivElement>(null);
  const semanaDropdownComprasRef = useRef<HTMLDivElement>(null);

  // Modales
  const [compraDetalleSeleccionada, setCompraDetalleSeleccionada] = useState<Compra | null>(null);
  const [isLoadingDetalles, setIsLoadingDetalles] = useState(false);
  const [detallesDeCompra, setDetallesDeCompra] = useState<any[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mesDropdownComprasRef.current && !mesDropdownComprasRef.current.contains(event.target as Node)) {
        setMostrarMesDropdownCompras(false);
      }
      if (semanaDropdownComprasRef.current && !semanaDropdownComprasRef.current.contains(event.target as Node)) {
        setMostrarSemanaDropdownCompras(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cargarDetallesCompra = async (compra: Compra) => {
    setCompraDetalleSeleccionada(compra);
    setIsLoadingDetalles(true);
    // Usamos los detalles pre-cargados (eager loaded)
    setTimeout(() => {
      setDetallesDeCompra(compra.inv_compras_detalles || []);
      setIsLoadingDetalles(false);
    }, 50); // Pequeño timeout para transición visual fluida si se desea, o sin timeout.
  };

  const obtenerSemanasDelMes = (month: number, year: number) => {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let currentStart = new Date(firstDay);
    let currentEnd = new Date(firstDay);

    while (currentStart <= lastDay) {
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + (7 - (currentStart.getDay() || 7))); // Hasta el domingo
      if (currentEnd > lastDay) currentEnd = new Date(lastDay);

      weeks.push({
        start: new Date(currentStart),
        end: new Date(currentEnd),
        label: `${currentStart.getDate()} al ${currentEnd.getDate()} ${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][month]}`
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }
    return weeks;
  };

  const resolverRangoReporte = () => {
    if (tipoFiltroFechaCompras === "rango" && fechaRangoDesdeCompras && fechaRangoHastaCompras) {
      return { desde: fechaRangoDesdeCompras, hasta: fechaRangoHastaCompras };
    }
    if (tipoFiltroFechaCompras === "dia" && fechaDiaCompras) {
      return { desde: fechaDiaCompras, hasta: fechaDiaCompras };
    }
    const monthStr = String(activeMonthCompras + 1).padStart(2, "0");
    const lastDay = ultimoDiaMesCalendario(activeYearCompras, activeMonthCompras + 1);
    return {
      desde: `${activeYearCompras}-${monthStr}-01`,
      hasta: `${activeYearCompras}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
    };
  };

  const exportarComprasProveedor = async () => {
    const { desde, hasta } = resolverRangoReporte();
    setExportandoReporte(true);
    try {
      const res = await obtenerReporteComprasProveedor(desde, hasta);
      if (!res.success) throw new Error(res.error);
      if (res.data.filas.length === 0) {
        toast.warn("No hay compras en el periodo seleccionado.");
        return;
      }
      descargarReporteComprasProveedorPdf(res.data);
      toast.success("Reporte PDF generado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setExportandoReporte(false);
    }
  };

  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      // 1. Búsqueda
      if (busquedaHistorial) {
        const q = busquedaHistorial.toLowerCase();
        const matchSearch =
          obtenerCodigoCompra(c.id).toLowerCase().includes(q) ||
          (c.inv_proveedores?.nombre || "").toLowerCase().includes(q) ||
          (c.numero_factura || "").toLowerCase().includes(q) ||
          (c.observaciones || "").toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // 2. Filtro de Pago
      const abonos = totalPagadoCompra(c.fin_transacciones);
      const isPaid = abonos >= c.total;
      
      if (filtroPago === "Pagado" && !isPaid) return false;
      if (filtroPago === "Pendiente" && isPaid) return false;

      // 3. Filtro de Fecha
      const cDate = new Date(c.created_at);
      cDate.setHours(0, 0, 0, 0);

      if (tipoFiltroFechaCompras === "dia") {
        if (!fechaDiaCompras) return false;
        // La compra de Supabase viene en UTC (o con T)
        const dStr = new Date(c.created_at).toISOString().split("T")[0];
        return dStr === fechaDiaCompras;
      } else if (tipoFiltroFechaCompras === "mes") {
        if (cDate.getMonth() !== activeMonthCompras || cDate.getFullYear() !== activeYearCompras) {
          return false;
        }
        if (selectedWeekIndexCompras !== -1) {
          const semanas = obtenerSemanasDelMes(activeMonthCompras, activeYearCompras);
          const sel = semanas[selectedWeekIndexCompras];
          if (!sel) return true;
          const sDate = new Date(sel.start);
          sDate.setHours(0, 0, 0, 0);
          const eDate = new Date(sel.end);
          eDate.setHours(23, 59, 59, 999);
          if (new Date(c.created_at).getTime() < sDate.getTime() || new Date(c.created_at).getTime() > eDate.getTime()) {
            return false;
          }
        }
        return true;
      } else if (tipoFiltroFechaCompras === "rango") {
        if (fechaRangoDesdeCompras && fechaRangoHastaCompras) {
          const cTime = new Date(c.created_at).getTime();
          const start = new Date(fechaRangoDesdeCompras + "T00:00:00").getTime();
          const end = new Date(fechaRangoHastaCompras + "T23:59:59").getTime();
          return cTime >= start && cTime <= end;
        } else if (fechaRangoDesdeCompras) {
          const cTime = new Date(c.created_at).getTime();
          const start = new Date(fechaRangoDesdeCompras + "T00:00:00").getTime();
          return cTime >= start;
        } else if (fechaRangoHastaCompras) {
          const cTime = new Date(c.created_at).getTime();
          const end = new Date(fechaRangoHastaCompras + "T23:59:59").getTime();
          return cTime <= end;
        }
        return true;
      }

      return true;
    });
  }, [
    compras, busquedaHistorial, filtroPago, tipoFiltroFechaCompras,
    fechaDiaCompras, activeMonthCompras, activeYearCompras, selectedWeekIndexCompras,
    fechaRangoDesdeCompras, fechaRangoHastaCompras
  ]);

  const totalComprasItems = comprasFiltradas.length;
  const totalComprasPages = Math.max(1, Math.ceil(totalComprasItems / pageSizeCompras));
  const activeComprasPage = Math.min(currentPageCompras, totalComprasPages);
  
  const comprasPaginadas = useMemo(() => {
    const startIndex = (activeComprasPage - 1) * pageSizeCompras;
    const endIndex = startIndex + pageSizeCompras;
    return comprasFiltradas.slice(startIndex, endIndex);
  }, [comprasFiltradas, activeComprasPage, pageSizeCompras]);

  return (
    <div className="flex flex-col gap-4 flex-1 h-full min-h-[550px]">
      
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
              value={busquedaHistorial}
              onChange={(e) => {
                setBusquedaHistorial(e.target.value);
                setCurrentPageCompras(1);
              }}
              placeholder="Buscar por código, proveedor..."
              className={cn(moduleTableSearchClass, "py-2 pl-9")}
            />
          </div>

          <div
            className="flex flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
          >
            <ModuleDateFilterLayout
              periodValue={tipoFiltroFechaCompras}
              periodOptions={[
                { id: "dia", label: "Día" },
                { id: "mes", label: "Mes" },
                { id: "rango", label: "Rango" },
              ]}
              onPeriodChange={(id) => {
                setTipoFiltroFechaCompras(id as "dia" | "mes" | "rango");
                setCurrentPageCompras(1);
                if (id === "mes") {
                  setSelectedWeekIndexCompras(-1);
                }
              }}
            >
            <AnimatePresence mode="wait">
              {tipoFiltroFechaCompras === "dia" && (
                <motion.div
                  key="dia"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <CustomDatePicker
                    value={fechaDiaCompras}
                    onChange={(val) => {
                      setFechaDiaCompras(val);
                      setCurrentPageCompras(1);
                    }}
                    placeholder="Elegir día"
                    align="left"
                  />
                </motion.div>
              )}

              {tipoFiltroFechaCompras === "mes" && (
                <motion.div
                  key="mes"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-row items-center gap-1.5 w-auto flex-nowrap max-w-full"
                >
                  {/* Navegador de Mes/Año */}
                  <div className="flex h-[42px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5 py-0.5 dark:border-slate-800 dark:bg-zinc-900">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeMonthCompras === 0) {
                            setActiveMonthCompras(11);
                            setActiveYearCompras(activeYearCompras - 1);
                        } else {
                            setActiveMonthCompras(activeMonthCompras - 1);
                        }
                        setSelectedWeekIndexCompras(-1);
                        setCurrentPageCompras(1);
                      }}
                      className="size-5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer"
                    >
                      <ChevronLeft className="size-3" />
                    </button>

                    <div className="relative" ref={mesDropdownComprasRef}>
                      <button
                        type="button"
                        onClick={() => setMostrarMesDropdownCompras(!mostrarMesDropdownCompras)}
                        className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-[#A3BEB0] cursor-pointer hover:bg-transparent active:bg-transparent focus:outline-none focus-visible:outline-none"
                      >
                        {[
                          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                        ][activeMonthCompras]} {activeYearCompras}
                      </button>

                      <AnimatePresence>
                        {mostrarMesDropdownCompras && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-55 p-1 grid grid-cols-3 gap-1 min-w-[240px]"
                          >
                            {[
                              "Ene", "Feb", "Mar", "Abr", "May", "Jun",
                              "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
                            ].map((mName, mIdx) => (
                              <button
                                key={mIdx}
                                type="button"
                                onClick={() => {
                                  setActiveMonthCompras(mIdx);
                                  setSelectedWeekIndexCompras(-1);
                                  setCurrentPageCompras(1);
                                  setMostrarMesDropdownCompras(false);
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                  activeMonthCompras === mIdx
                                    ? "bg-[#8DA78E] text-white"
                                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                                }`}
                              >
                                {mName}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeMonthCompras === 11) {
                            setActiveMonthCompras(0);
                            setActiveYearCompras(activeYearCompras + 1);
                        } else {
                            setActiveMonthCompras(activeMonthCompras + 1);
                        }
                        setSelectedWeekIndexCompras(-1);
                        setCurrentPageCompras(1);
                      }}
                      className="size-5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer"
                    >
                      <ChevronRight className="size-3" />
                    </button>
                  </div>

                  {/* Dropdown de semanas */}
                  <div className="relative" ref={semanaDropdownComprasRef}>
                    {(() => {
                      const semanas = obtenerSemanasDelMes(activeMonthCompras, activeYearCompras);
                      const semSeleccionada = semanas[selectedWeekIndexCompras] || semanas[0];
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setMostrarSemanaDropdownCompras(!mostrarSemanaDropdownCompras)}
                            className="flex h-[42px] min-w-[8.75rem] shrink-0 cursor-pointer items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-[#525D53] transition-all dark:border-slate-800 dark:bg-zinc-900 dark:text-[#A3BEB0]"
                          >
                            <span>{selectedWeekIndexCompras === -1 ? "Todas las semanas" : (semSeleccionada ? semSeleccionada.label : "Seleccionar semana")}</span>
                            <ChevronDown className="size-3.5 text-slate-400" />
                          </button>

                          <AnimatePresence>
                            {mostrarSemanaDropdownCompras && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="absolute left-0 mt-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5 min-w-[220px]"
                              >
                                {/* Opción: Todas las semanas */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedWeekIndexCompras(-1);
                                    setCurrentPageCompras(1);
                                    setMostrarSemanaDropdownCompras(false);
                                  }}
                                  className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                                    selectedWeekIndexCompras === -1
                                      ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                                  }`}
                                >
                                  <span>Todas las semanas</span>
                                  {selectedWeekIndexCompras === -1 && <Check className="size-3.5" />}
                                </button>
                                {/* Separador */}
                                <div className="border-t border-slate-200 dark:border-zinc-800 my-0.5" />
                                {/* Semanas individuales */}
                                {semanas.map((s, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setSelectedWeekIndexCompras(idx);
                                      setCurrentPageCompras(1);
                                      setMostrarSemanaDropdownCompras(false);
                                    }}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                                      selectedWeekIndexCompras === idx
                                        ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                                    }`}
                                  >
                                    <span>{s.label}</span>
                                    {selectedWeekIndexCompras === idx && <Check className="size-3.5" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              )}

              {tipoFiltroFechaCompras === "rango" && (
                <motion.div
                  key="rango"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2 flex-wrap max-w-full"
                >
                  <span className="text-[10px] font-bold text-slate-400">Desde:</span>
                  <CustomDatePicker
                    value={fechaRangoDesdeCompras}
                    onChange={(val) => {
                      setFechaRangoDesdeCompras(val);
                      setCurrentPageCompras(1);
                    }}
                    placeholder="Desde"
                    align="left"
                  />
                  <span className="text-[10px] font-bold text-slate-400">Hasta:</span>
                  <CustomDatePicker
                    value={fechaRangoHastaCompras}
                    onChange={(val) => {
                      setFechaRangoHastaCompras(val);
                      setCurrentPageCompras(1);
                    }}
                    placeholder="Hasta"
                    align="right"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </ModuleDateFilterLayout>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <SigetActionButton
                label="Proveedor"
                accentColor={sigetAccent.excel}
                morphFrom={FileDown}
                morphTo={FileDown}
                morphOnHover={false}
                onClick={() => void exportarComprasProveedor()}
                disabled={exportandoReporte}
                className="w-auto shrink-0"
              />
              <ModuleFilterUnderlineTabs
                ariaLabel="Estado de pago"
                value={filtroPago}
                options={[
                  { id: "todos", label: "Todos" },
                  { id: "Pagado", label: "Pagado" },
                  { id: "Pendiente", label: "Pendiente" },
                ]}
                onChange={(id) => {
                  setFiltroPago(id);
                  setCurrentPageCompras(1);
                }}
                className="sm:justify-end"
              />
            </div>
          </div>
        </div>
      </section>

        <div className={cn(moduleTableShellClass, "mt-0")}>
        <div className={cn(moduleTableScrollClass, "pr-1 min-h-0")}>
          {comprasPaginadas.length === 0 ? (
            <div className={moduleTableEmptyClass}>
              No se encontraron compras en el historial.
            </div>
          ) : (
          <>
            {/* Vista Móvil (Tarjetas) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {comprasPaginadas.map((c) => {
                const date = new Date(c.created_at).toLocaleString("es-GT", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-[#525D53]/10 border border-[#C1D1C5]/30 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xs text-left"
                  >
                    {/* Mobile View Item */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Compra #{obtenerCodigoCompra(c.id)}
                      </span>
                      {(() => {
                        const abonos = totalPagadoCompra(c.fin_transacciones);
                        const isPaid = abonos >= c.total || c.estado_pago === "Pagado";
                        const vencido = compraPagoVencido(c);
                        return (
                          <span className="inline-flex flex-wrap items-center gap-1">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isPaid
                                  ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                              }`}
                            >
                              {isPaid ? "Pagado" : "Pendiente"}
                            </span>
                            {vencido && <InsigniaPagoVencidoCompra />}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <p className="font-bold text-slate-800 dark:text-zinc-200">
                        {c.inv_proveedores?.nombre || "Proveedor Desconocido"}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="size-3.5 text-[#8DA78E]" /> {date}
                      </p>
                      {c.observaciones && (
                        <p className="text-[10px] text-slate-550 dark:text-slate-400 italic mt-1 bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-slate-100 dark:border-zinc-800/40 truncate">
                          {c.observaciones}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-900 mt-1">
                      {(() => {
                        const saldoCompra = saldoPendienteCompra(c);
                        return (
                          <>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-450 uppercase leading-none">
                                {saldoCompra < c.total && saldoCompra > 0 ? "Saldo Pendiente" : "Total"}
                              </span>
                              <span className="text-xs font-black text-[#8DA78E] mt-1">
                                {fmtQ(saldoCompra < c.total && saldoCompra > 0 ? saldoCompra : c.total)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => cargarDetallesCompra(c)}
                                className="px-3 py-1.5 bg-[#8DA78E]/10 hover:bg-[#8DA78E]/25 text-[#8DA78E] dark:text-[#A3BEB0] font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase border border-[#8DA78E]/20"
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista Desktop (Tabla) */}
            <div className={moduleTableDesktopWrapClass}>
              <div className={moduleTableDesktopScrollClass}>
                <table className={moduleTableClass}>
                  <thead>
                    <tr className={moduleTableHeadRowClass}>
                      <th className={moduleTableHeadCellClass}>Compra #</th>
                      <th className={moduleTableHeadCellClass}>Fecha</th>
                      <th className={moduleTableHeadCellClass}>Proveedor</th>
                      <th className={moduleTableHeadCellClass}>Factura</th>
                      <th className={moduleTableHeadCellClass}>Vence pago</th>
                      <th className={moduleTableHeadCellClass}>Estado Pago</th>
                      <th className={cn(moduleTableHeadCellClass, "text-right")}>Total</th>
                      <th className={cn(moduleTableHeadCellClass, "text-center")}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={moduleTableBodyClass}>
                    {comprasPaginadas.map((c) => {
                      const date = new Date(c.created_at).toLocaleString("es-GT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });
                      const abonos = totalPagadoCompra(c.fin_transacciones);
                      const isPaid = abonos >= c.total || c.estado_pago === "Pagado";
                      const saldoCompra = saldoPendienteCompra(c);
                      const vencido = compraPagoVencido(c);
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            #{obtenerCodigoCompra(c.id)}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{date}</td>
                          <td className="px-5 py-3.5 font-bold">
                            {c.inv_proveedores?.nombre || "Proveedor Desconocido"}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs">
                            {c.numero_factura?.trim() || "—"}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                            {formatearFechaCompraGt(c.fecha_vencimiento_pago)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="inline-flex flex-wrap items-center gap-1">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isPaid
                                    ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                }`}
                              >
                                {isPaid ? "Pagado" : "Pendiente"}
                              </span>
                              {vencido && <InsigniaPagoVencidoCompra />}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-[#8DA78E] dark:text-[#A3BEB0] whitespace-nowrap">
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">
                                {saldoCompra < c.total && saldoCompra > 0 ? "Saldo" : "Total"}
                              </span>
                              <span>
                                {fmtQ(saldoCompra < c.total && saldoCompra > 0 ? saldoCompra : c.total)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => cargarDetallesCompra(c)}
                                className="px-3 py-1.5 bg-[#8DA78E]/10 hover:bg-[#8DA78E]/25 text-[#8DA78E] dark:text-[#A3BEB0] font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase border border-[#8DA78E]/20"
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ModuleTableFooter
        itemCount={totalComprasItems}
        pageSize={pageSizeCompras}
        pageSizeOptions={[15, 30, 45]}
        setPageSize={setPageSizeCompras}
        currentPage={activeComprasPage}
        totalPages={totalComprasPages}
        onPageChange={setCurrentPageCompras}
      />
        </div>
      
      <CompraDetalleModal 
        compra={compraDetalleSeleccionada}
        onClose={() => setCompraDetalleSeleccionada(null)}
        isLoadingDetalles={isLoadingDetalles}
        detallesDeCompra={detallesDeCompra}
      />
    </div>
  );
}
