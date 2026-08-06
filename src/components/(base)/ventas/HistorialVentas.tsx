"use client";

import { useState, useRef } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight, Calendar, Printer, Check, Receipt, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, fmtQ } from "@/lib/utils";
import { CustomDatePicker, obtenerSemanasDelMes } from "@/components/ui/CustomDatePicker";
import { Pagination, PageSizeSelect } from "@/components/ui/pagination";
import { obtenerCodigoRecibo } from "./recibo-utils";
import { useHistorialVentas } from "./lib/hooks";
import { DetalleVentaModal } from "./modals/DetalleVentaModal";

interface HistorialVentasProps {
  onPrint: (venta: any, detalles: any) => void;
  onShareWhatsApp: (venta: any) => void;
}

function formatCustomDate(dateString: string) {
  const d = new Date(dateString);
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
}

export function HistorialVentas({ onPrint, onShareWhatsApp }: HistorialVentasProps) {
  const { data: historialData = [], isLoading } = useHistorialVentas();

  // Filtros
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [tipoPagoSwitch, setTipoPagoSwitch] = useState<"todos" | "contado" | "credito">("todos");
  
  // Filtros de Fecha
  const [tipoFiltroFecha, setTipoFiltroFecha] = useState<"dia" | "semana" | "rango">("dia");
  const [fechaDia, setFechaDia] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [fechaRangoDesde, setFechaRangoDesde] = useState<string>("");
  const [fechaRangoHasta, setFechaRangoHasta] = useState<string>("");

  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [mostrarMesDropdown, setMostrarMesDropdown] = useState(false);
  const [mostrarSemanaDropdown, setMostrarSemanaDropdown] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [ventaDetalleSeleccionada, setVentaDetalleSeleccionada] = useState<any | null>(null);

  // --- Lógica de filtrado ---
  const query = busquedaHistorial.toLowerCase();
  let filtered = historialData.filter(v => {
    // 1. Texto (recibo, notas, cliente)
    const matchesQuery = !query || 
      (v.numero_recibo && v.numero_recibo.toString().includes(query)) ||
      (v.observaciones && v.observaciones.toLowerCase().includes(query)) ||
      (v.ven_clientes?.nombre && v.ven_clientes.nombre.toLowerCase().includes(query)) ||
      obtenerCodigoRecibo(v.id).toLowerCase().includes(query);
    
    // 2. Tipo Pago
    const matchesTipoPago = 
      tipoPagoSwitch === "todos" || 
      (tipoPagoSwitch === "contado" && (v.tipo_venta === "Efectivo" || v.tipo_venta === "Contado" || v.tipo_venta === "Transferencia" || v.tipo_venta === "Tarjeta")) ||
      (tipoPagoSwitch === "credito" && v.tipo_venta === "Crédito");

    if (!matchesQuery || !matchesTipoPago) return false;

    // 3. Fecha
    if (tipoFiltroFecha === "dia" && fechaDia) {
      if (!v.created_at.startsWith(fechaDia)) return false;
    } else if (tipoFiltroFecha === "rango" && fechaRangoDesde && fechaRangoHasta) {
      const d = v.created_at.split("T")[0];
      if (d < fechaRangoDesde || d > fechaRangoHasta) return false;
    } else if (tipoFiltroFecha === "semana") {
      const vTime = new Date(v.created_at).getTime();
      const start = new Date(activeYear, activeMonth, 1).getTime();
      const end = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59).getTime();
      if (vTime < start || vTime > end) return false;
    }

    return true;
  });

  const totalVentas = filtered.reduce((sum, v) => sum + (Number(v.total) || 0), 0);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white dark:bg-zinc-900 border-y md:border border-zinc-200 dark:border-zinc-800 md:rounded-3xl p-5 overflow-hidden shadow-sm">
      <div className="flex flex-col xl:flex-row gap-4 mb-4 justify-between items-start">
        
        {/* Lado Izquierdo: Buscador y Filtros de Fecha */}
        <div className="flex flex-col gap-4 flex-1 w-full xl:w-auto">
          {/* Buscador */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por recibo, cliente o notas de venta..."
              value={busquedaHistorial}
              onChange={(e) => {
                setBusquedaHistorial(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/40 transition-all"
            />
          </div>

          {/* Filtros de Fecha */}
          <div className="flex flex-row gap-3 items-center bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-left w-fit flex-wrap max-w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "dia", label: "Día" },
            { id: "semana", label: "Mes" },
            { id: "rango", label: "Rango" }
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setTipoFiltroFecha(opt.id as any);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                tipoFiltroFecha === opt.id
                  ? "bg-[#8DA78E]/10 text-[#8DA78E] border border-[#8DA78E]/20"
                  : "border border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {tipoFiltroFecha === "dia" && (
              <motion.div key="dia" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <CustomDatePicker value={fechaDia} onChange={(val) => { setFechaDia(val); setCurrentPage(1); }} align="center" />
              </motion.div>
            )}

            {tipoFiltroFecha === "semana" && (
              <motion.div key="semana" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-row items-center gap-2">
                {/* Mes selector */}
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-1.5 py-0.5 h-[34px] shrink-0">
                  <button onClick={() => { activeMonth === 0 ? (setActiveMonth(11), setActiveYear(activeYear - 1)) : setActiveMonth(activeMonth - 1); setCurrentPage(1); }} className="size-4.5 rounded flex items-center justify-center text-zinc-500 cursor-pointer">
                    <ChevronLeft className="size-3" />
                  </button>
                  <div className="relative">
                    <button onClick={() => setMostrarMesDropdown(!mostrarMesDropdown)} className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 px-2 py-1 flex items-center gap-1 cursor-pointer rounded-lg transition-colors">
                      <Calendar className="size-3 text-[#8DA78E]" /> {new Date(activeYear, activeMonth).toLocaleString("es-GT", { month: "short" })} {activeYear}
                    </button>
                    <AnimatePresence>
                      {mostrarMesDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 grid grid-cols-3 gap-1 min-w-[240px]"
                        >
                          {[
                            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
                            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
                          ].map((mName, mIdx) => (
                            <button
                              key={mIdx}
                              type="button"
                              onClick={() => {
                                setActiveMonth(mIdx);
                                setCurrentPage(1);
                                setMostrarMesDropdown(false);
                              }}
                              className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                activeMonth === mIdx
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
                  <button onClick={() => { activeMonth === 11 ? (setActiveMonth(0), setActiveYear(activeYear + 1)) : setActiveMonth(activeMonth + 1); setCurrentPage(1); }} className="size-4.5 rounded flex items-center justify-center text-zinc-500 cursor-pointer">
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {tipoFiltroFecha === "rango" && (
              <motion.div key="rango" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400">Desde:</span>
                <CustomDatePicker value={fechaRangoDesde} onChange={(val) => { setFechaRangoDesde(val); setCurrentPage(1); }} placeholder="Inicio" align="center" />
                <span className="text-[10px] font-bold text-zinc-400">Hasta:</span>
                <CustomDatePicker value={fechaRangoHasta} onChange={(val) => { setFechaRangoHasta(val); setCurrentPage(1); }} placeholder="Fin" align="right" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

      {/* Lado Derecho: Switch de Pago y Total Vendido */}
        <div className="flex flex-col gap-4 shrink-0 w-full xl:w-auto mt-4 xl:mt-0 items-end xl:items-start">
          {/* Switch de pago */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit h-[46px] items-center">
            {[
              { id: "todos", label: "Todos" },
              { id: "contado", label: "Contado" },
              { id: "credito", label: "Crédito" }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTipoPagoSwitch(opt.id as any);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer relative h-[38px]",
                  tipoPagoSwitch === opt.id
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 w-full shadow-sm h-[58px]">
              <span className="text-xl font-black text-[#3B523D] dark:text-[#A0BCA2]">Total:</span>
              <span className="text-[#8DA78E] ml-2 text-xl font-black tracking-wide">{fmtQ(totalVentas)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8DA78E]"></div></div>
        ) : paginatedData.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-14 text-center text-zinc-400 font-bold">
            No se encontraron registros de ventas
          </div>
        ) : (
          <>
            {/* Vista Mobile (Tarjetas) */}
            <div className="md:hidden flex flex-col gap-3">
              {paginatedData.map((v) => {
                const date = formatCustomDate(v.created_at);
                return (
                  <div key={v.id} className={cn("bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm relative overflow-hidden", v.observaciones?.includes("[ANULADA]") && "border-rose-200 bg-rose-50/30 dark:bg-rose-900/10")}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Venta #{obtenerCodigoRecibo(v.id)}
                      </span>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        ["Efectivo", "Contado"].includes(v.tipo_venta) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                        v.tipo_venta === "Tarjeta" ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" :
                        "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      )}>
                        {v.tipo_venta}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <p className="font-bold text-slate-800 dark:text-zinc-200">
                        {v.ven_clientes?.nombre || "Consumidor Final"}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="size-3.5 text-[#8DA78E]" /> {date}
                      </p>
                      {v.observaciones && (
                        <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-slate-100 dark:border-zinc-800/40">
                          {v.observaciones}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-900 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Total</span>
                        <span className="text-xs font-black text-[#8DA78E] mt-1">{fmtQ(v.total)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setVentaDetalleSeleccionada(v)} className="px-3 py-1.5 bg-[#8DA78E]/10 hover:bg-[#8DA78E]/25 text-[#8DA78E] font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase">
                          Detalle
                        </button>
                        <button onClick={() => onPrint(v, [])} className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer">
                          <Printer className="size-5" />
                        </button>
                        <button onClick={() => onShareWhatsApp(v)} className="px-6 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer">
                          <MessageCircle className="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista Desktop (Tabla) */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-5 py-3.5">Recibo</th>
                    <th className="px-5 py-3.5">Fecha</th>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Pago</th>
                    <th className="px-5 py-3.5 text-right">Total</th>
                    <th className="px-5 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                  {paginatedData.map((v) => {
                    const date = formatCustomDate(v.created_at);
                    return (
                      <tr
                        key={v.id}
                        className={cn(
                          "transition-colors",
                          v.observaciones?.includes("[ANULADA]")
                            ? "bg-rose-50/50 dark:bg-rose-500/5 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                        )}
                      >
                        <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          {obtenerCodigoRecibo(v.id)}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 whitespace-nowrap">{date}</td>
                        <td className="px-5 py-3.5 font-bold">
                          {v.ven_clientes?.nombre || "Consumidor Final"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            ["Efectivo", "Contado"].includes(v.tipo_venta) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                            v.tipo_venta === "Tarjeta" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" :
                            "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          )}>
                            {v.tipo_venta}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-[#8DA78E] whitespace-nowrap">
                          {fmtQ(v.total)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setVentaDetalleSeleccionada(v)}
                              className="px-3 py-1.5 bg-[#8DA78E]/10 hover:bg-[#8DA78E]/25 text-[#8DA78E] font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase"
                            >
                              Ver Detalle
                            </button>
                            <button
                              onClick={() => onPrint(v, [])}
                              className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                              title="Imprimir directamente"
                            >
                              <Printer className="size-5" />
                            </button>
                            <button
                              onClick={() => onShareWhatsApp(v)}
                              className="px-6 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                              title="Compartir por WhatsApp"
                            >
                              <MessageCircle className="size-5" />
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

      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-4">
            <PageSizeSelect pageSize={pageSize} setPageSize={(size) => { setPageSize(size); setCurrentPage(1); }} />
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {ventaDetalleSeleccionada && (
        <DetalleVentaModal
          venta={ventaDetalleSeleccionada}
          onClose={() => setVentaDetalleSeleccionada(null)}
          onPrint={onPrint}
        />
      )}
    </div>
  );
}
