"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ShoppingBag,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  User,
  X,
  Clock,
  TrendingUp,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn, fmtQ } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import { Clock as ClockNode, Download as DownloadNode, FileDown, History, Pencil, Plus as PlusNode, SquarePen, UserPlus } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  ModuleDateFilterLayout,
  moduleDateFilterControlButtonClass,
} from "@/components/ui/module-date-period-filter";
import { moduleControlsShellClass, moduleListPageShellClass } from "@/lib/module-layout";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";
import {
  moduleTableBodyClass,
  moduleTableCellClass,
  moduleTableClass,
  moduleTableDesktopScrollClass,
  moduleTableDesktopWrapClass,
  moduleTableEmptyCellClass,
  moduleTableEmptyClass,
  ModuleTableFooter,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableRowClass,
  moduleTableSearchClass,
  moduleTableShellClass,
} from "@/components/ui/module-table";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { obtenerSemanasDelMes } from "@/lib/fechas-gt";
import { CrearCliente } from "./forms/Crear";
import { EditarCliente } from "./forms/VerEditar";
import { formatPhoneDisplay, getWhatsappUrl } from "../proveedores/forms/VerProveedor";
import { useClientes, useVentasCliente } from "./lib/hooks";
import type { Cliente, VentaCliente, TransaccionVenta } from "./lib/zod";

// Panel de detalle del cliente
function ClienteDetalle({
  cliente,
  onClose,
  onEdit,
  onOpenHistorial,
}: {
  cliente: Cliente;
  onClose: () => void;
  onEdit: () => void;
  onOpenHistorial?: () => void;
}) {
  const { data: ventas = [], isLoading: loadingVentas } = useVentasCliente(cliente.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="bg-white dark:bg-zinc-800 flex flex-col h-full w-full animate-fade-in text-left"
    >
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-6 space-y-5 custom-scrollbar">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#8DA78E]/20 bg-[#8DA78E]/10">
            <Users className="size-5 text-[#8DA78E]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-snug text-slate-900 dark:text-white md:text-xl">
              {cliente.nombre}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer px-2 text-xl font-bold text-slate-400 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2.5">
        <h4 className="text-xs uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Contacto</h4>
        <div className="flex items-center gap-2.5 text-base text-slate-600 dark:text-slate-300">
          <Mail className="size-5 shrink-0 text-[#8DA78E]" />
          <span className="truncate">{cliente.email || "No registrado"}</span>
        </div>
        <div className="flex items-center gap-2.5 text-base text-slate-600 dark:text-slate-300">
          <Phone className="size-5 shrink-0 text-[#8DA78E]" />
          {cliente.telefono && cliente.telefono !== "No registrado" ? (
            <a
              href={getWhatsappUrl(cliente.telefono)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 dark:text-green-400 hover:underline font-bold inline-flex items-center gap-1"
            >
              {formatPhoneDisplay(cliente.telefono)}
            </a>
          ) : (
            <span className="truncate text-slate-400">No registrado</span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-base text-slate-600 dark:text-slate-300">
          <MapPin className="size-5 shrink-0 text-[#8DA78E]" />
          <span className="truncate">{cliente.direccion || "No registrada"}</span>
        </div>
        <div className="flex items-center gap-2.5 text-base text-slate-600 dark:text-slate-300">
          <CreditCard className="size-5 shrink-0 text-[#8DA78E]" />
          <span className="truncate">NIT: {cliente.nit || "C/F"}</span>
        </div>
      </div>

      <div className="space-y-3 border-t border-[#C1D1C5]/20 pt-3">
        <h4 className="text-xs uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Estado Financiero</h4>
        {loadingVentas ? (
          <p className="text-sm text-slate-400">Cargando transacciones...</p>
        ) : (() => {
          const ventasPendientes = (ventas as VentaCliente[]).filter((v) => {
            if (v.tipo_venta !== "Crédito") return false;
            const abonos = v.fin_transacciones
              ? v.fin_transacciones
                  .filter((t: TransaccionVenta) => t.categoria === "abono_cliente" || t.categoria === "venta")
                  .reduce((sum: number, t: TransaccionVenta) => sum + Number(t.monto), 0)
              : 0;
            return (v.total || 0) - abonos > 0;
          });

          if (ventasPendientes.length === 0) {
            return (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 dark:border-emerald-900/30 dark:bg-emerald-950/15">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <Check className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">No tiene pagos pendientes</p>
              </div>
            );
          }

          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-start rounded-xl border border-[#8DA78E]/20 bg-[#8DA78E]/10 px-3.5 py-3.5 dark:border-[#A3BEB0]/15 dark:bg-[#8DA78E]/5">
                <span className="text-xs font-bold uppercase text-[#525D53] dark:text-[#A3BEB0]">Pendiente ({ventasPendientes.length} {ventasPendientes.length === 1 ? "crédito" : "créditos"})</span>
              </div>
            </div>
          );
        })()}
      </div>

      <div>
        <h4 className="mb-2.5 text-xs uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Estadísticas</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: ShoppingBag, label: "Total Compras", value: cliente.totalCompras, color: "text-[#8DA78E] dark:text-[#A3BEB0]" },
            { icon: TrendingUp, label: "Pendiente", value: `${cliente.creditosPendientes || 0} créditos`, color: "text-rose-500" },
            { icon: Calendar, label: "Última Compra", value: cliente.ultimaCompra ? (() => { const parts = cliente.ultimaCompra.split("T")[0].split("-"); return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("es-GT"); })() : "Sin compras", color: "text-[#8DA78E] dark:text-[#A3BEB0]" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col justify-center rounded-xl border border-[#C1D1C5]/30 bg-white p-2.5 dark:border-[#A3BEB0]/10 dark:bg-[#525D53]/10">
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className={`size-4 shrink-0 ${color}`} />
                <span className="truncate text-[10px] font-bold uppercase leading-tight tracking-wider text-[#525D53] dark:text-[#A3BEB0]/70">{label}</span>
              </div>
              <p className={`text-sm font-black leading-snug ${color} truncate`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      </div>

      <div className="flex gap-3 p-4 md:p-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 bg-[#F5F5F1] dark:bg-zinc-900 justify-end">
        {onOpenHistorial ? (
          <SigetActionButton
            label="Historial"
            accentColor={sigetAccent.abrir}
            morphFrom={History}
            morphTo={ClockNode}
            morphOnHover={true}
            onClick={onOpenHistorial}
            className="w-auto shrink-0 flex-1 sm:flex-initial md:hidden"
          />
        ) : null}
        <SigetActionButton
          label="Editar"
          accentColor={sigetAccent.editar}
          morphFrom={Pencil}
          morphTo={SquarePen}
          onClick={onEdit}
          className="w-auto shrink-0 flex-1 sm:flex-initial"
        />
      </div>
    </motion.div>
  );
}

// Historial de compras con filtros y gráfico
function HistorialComprasPanel({
  cliente,
  ventas,
  onClose,
  className,
}: {
  cliente: Cliente;
  ventas: VentaCliente[];
  onClose: () => void;
  className?: string;
}) {
  // Estado filtros de fecha
  const [tipoFiltroFecha, setTipoFiltroFecha] = useState<string>("semana");
  const [fechaDia, setFechaDia] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [activeMonth, setActiveMonth] = useState(() => new Date().getMonth());
  const [activeYear, setActiveYear] = useState(() => new Date().getFullYear());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(-1);
  const [mostrarMesDropdown, setMostrarMesDropdown] = useState(false);
  const [mostrarSemanaDropdown, setMostrarSemanaDropdown] = useState(false);

  const [fechaRangoDesde, setFechaRangoDesde] = useState<string>("");
  const [fechaRangoHasta, setFechaRangoHasta] = useState<string>("");

  const mesDropdownRef = useRef<HTMLDivElement>(null);
  const semanaDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mesDropdownRef.current && !mesDropdownRef.current.contains(event.target as Node)) {
        setMostrarMesDropdown(false);
      }
      if (semanaDropdownRef.current && !semanaDropdownRef.current.contains(event.target as Node)) {
        setMostrarSemanaDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ventas filtradas y serie del gráfico
  const ventasFiltradas = useMemo(() => {
    return ventas.filter(v => {
      const fechaCal = v.created_at.split("T")[0];
      if (tipoFiltroFecha === "dia") {
        const [y, m] = fechaDia.split("-");
        const [vy, vm] = fechaCal.split("-");
        return vy === y && vm === m;
      } else if (tipoFiltroFecha === "semana") {
        const [vy, vm] = fechaCal.split("-").map(Number);
        if (vm - 1 !== activeMonth || vy !== activeYear) return false;
        if (selectedWeekIndex !== -1) {
          const semanas = obtenerSemanasDelMes(activeMonth, activeYear);
          const semanaSeleccionada = semanas[selectedWeekIndex];
          if (semanaSeleccionada) {
            return fechaCal >= semanaSeleccionada.desde && fechaCal <= semanaSeleccionada.hasta;
          }
        }
        return true;
      } else if (tipoFiltroFecha === "rango") {
        if (!fechaRangoDesde || !fechaRangoHasta) return true;
        return fechaCal >= fechaRangoDesde && fechaCal <= fechaRangoHasta;
      }
      return true;
    });
  }, [ventas, tipoFiltroFecha, fechaDia, activeMonth, activeYear, selectedWeekIndex, fechaRangoDesde, fechaRangoHasta]);

  const chartData = useMemo(() => {
    if (tipoFiltroFecha === "dia") {
      const parts = fechaDia.split("-").map(Number);
      if (parts.length < 3) return [];
      const [year, month] = parts;
      const daysInMonth = new Date(year, month, 0).getDate();

      const data = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        const total = ventas
          .filter(v => v.created_at.split("T")[0] === dayStr)
          .reduce((acc, curr) => acc + curr.total, 0);
        data.push({
          fecha: `${i} ${new Date(year, month - 1, 1).toLocaleDateString("es-GT", { month: "short" })}`,
          total
        });
      }
      return data;
    } else if (tipoFiltroFecha === "semana") {
      const data = [];
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(activeYear, i, 1);
        const monthName = monthDate.toLocaleDateString("es-GT", { month: "short" });
        const monthStr = String(i + 1).padStart(2, "0");
        const total = ventas
          .filter(v => {
            const [vy, vm] = v.created_at.split("T")[0].split("-");
            return vy === String(activeYear) && vm === monthStr;
          })
          .reduce((acc, curr) => acc + curr.total, 0);
        data.push({
          fecha: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          total
        });
      }
      return data;
    } else if (tipoFiltroFecha === "rango") {
      if (!fechaRangoDesde || !fechaRangoHasta) return [];
      const start = new Date(fechaRangoDesde + "T00:00:00");
      const end = new Date(fechaRangoHasta + "T23:59:59");
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

      const data = [];
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      let daysCount = 0;
      while (current <= end && daysCount < 366) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        const dayStr = `${y}-${m}-${d}`;
        const total = ventas
          .filter(v => v.created_at.split("T")[0] === dayStr)
          .reduce((acc, curr) => acc + curr.total, 0);

        data.push({
          fecha: current.toLocaleDateString("es-GT", { month: "short", day: "numeric" }),
          total
        });
        current.setDate(current.getDate() + 1);
        daysCount++;
      }
      return data;
    }
    return [];
  }, [ventas, tipoFiltroFecha, fechaDia, activeYear, fechaRangoDesde, fechaRangoHasta]);

  return (
      <motion.div
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 32 }}
        className={cn(
          "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900",
          className,
        )}
      >
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
          <div>
            <h3 className="font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider text-sm flex items-center gap-2">
              <Clock className="size-4" /> Historial de Compras
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Cliente: {cliente.nombre}</p>
          </div>

          <div className="flex-1 flex justify-center w-full md:w-auto">
            <ModuleDateFilterLayout
              className="mx-auto w-full md:w-fit"
              periodValue={tipoFiltroFecha}
              periodOptions={[
                { id: "dia", label: "Mes/Año" },
                { id: "semana", label: "Mes" },
                { id: "rango", label: "Rango" },
              ]}
              onPeriodChange={setTipoFiltroFecha}
            >
                {tipoFiltroFecha === "dia" && (
                  <CustomDatePicker
                    value={fechaDia}
                    onChange={setFechaDia}
                    placeholder="Mes y año"
                    align="left"
                    dropDirection="down"
                    granularity="month"
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
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[200] opacity-100 p-2"
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
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[180px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[200] opacity-100 py-1"
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
          </div>

          <button onClick={onClose} className="text-zinc-400 ml-auto md:ml-0 cursor-pointer">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="h-64 w-full bg-white dark:bg-zinc-900 rounded-xl">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="fecha" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `Q${value}`} />
                <Tooltip
                  formatter={(value: any) => [fmtQ(Number(value)), "Total"]}
                  labelStyle={{ color: '#000' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="total" stroke="#8DA78E" strokeWidth={3} dot={{ r: 4, fill: "#8DA78E", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#525D53" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0] mb-3">Detalle de Compras</h4>
            {ventasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                <ShoppingBag className="size-12 mb-3 opacity-20" />
                <p className="text-sm font-bold">No hay compras registradas en este período.</p>
              </div>
            ) : (
              ventasFiltradas.map(v => (
                <div key={v.id} className="flex justify-between items-center p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                  <div>
                    <p className="font-black text-sm text-zinc-800 dark:text-zinc-100">{fmtQ(v.total)}</p>
                    <p className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5"><Clock className="size-3" /> {new Date(v.created_at).toLocaleString("es-GT")}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md", v.tipo_venta === "Crédito" ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : "bg-[#8DA78E]/10 text-[#8DA78E] dark:bg-[#A3BEB0]/10 dark:text-[#A3BEB0]")}>
                    {v.tipo_venta}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
  );
}

export function VerClientes() {
  // Estado listado y modales
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [historialMovilAbierto, setHistorialMovilAbierto] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
  const [criterioOrden, setCriterioOrden] = useState<"nombre-asc" | "nombre-desc" | "compras-desc" | "saldo-asc" | "saldo-desc">("nombre-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Queries
  const { data: clientes = [], isLoading, refetch } = useClientes();
  const { data: ventasClienteSeleccionado = [] } = useVentasCliente(clienteSeleccionado?.id ?? null);

  const cerrarClienteSeleccionado = () => {
    setClienteSeleccionado(null);
    setHistorialMovilAbierto(false);
  };

  // Filtro, orden y paginación
  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase();
    return (
      (c.nombre || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.telefono || "").includes(busqueda) ||
      (c.nit || "").includes(busqueda)
    );
  });

  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => {
    if (criterioOrden === "nombre-asc") return (a.nombre || "").localeCompare(b.nombre || "");
    if (criterioOrden === "nombre-desc") return (b.nombre || "").localeCompare(a.nombre || "");
    if (criterioOrden === "compras-desc") return b.totalCompras - a.totalCompras;
    if (criterioOrden === "saldo-asc") return a.saldo - b.saldo;
    if (criterioOrden === "saldo-desc") return b.saldo - a.saldo;
    return 0;
  });

  const totalPages = Math.ceil(clientesOrdenados.length / pageSize) || 1;
  const paginatedClientes = clientesOrdenados.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Exportar PDF
  const handleExportarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text("Reporte General de Clientes", 14, 15);

      const tableData = clientesOrdenados.map((c) => [
        c.nombre,
        c.telefono,
        c.email,
        c.nit,
        c.totalCompras.toString(),
        `${fmtQ(c.saldo)}`
      ]);

      autoTable(doc, {
        head: [["Nombre", "Teléfono", "Email", "NIT", "Compras", "Saldo Pendiente"]],
        body: tableData,
        startY: 22,
        theme: "striped",
        headStyles: {
          fillColor: [141, 167, 142],
          textColor: [245, 245, 241],
          fontStyle: "bold",
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [245, 245, 241]
        },
        margin: { top: 40 },
        styles: {
          fontSize: 9,
          cellPadding: 3
        }
      });

      doc.save(`Reporte_Clientes_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF exportado correctamente.");
    } catch {
      toast.error("No se pudo generar el archivo PDF.");
    }
  };

  return (
    <div className={moduleListPageShellClass}>
      <div className="flex shrink-0 items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3">
          <ModuleHeaderBackButton size="sm" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">Módulo</p>
            <h1 className="text-xl font-black uppercase leading-none tracking-tight text-slate-900 dark:text-white md:text-2xl">
              Clientes
            </h1>
          </div>
        </div>

        <SigetActionButton
          label="Crear"
          accentColor={sigetAccent.crear}
          morphFrom={PlusNode}
          morphTo={UserPlus}
          onClick={() => setIsCreateOpen(true)}
          className="w-auto shrink-0"
        />
      </div>

      <section
        className={cn(
          moduleControlsShellClass,
          "relative z-30 shrink-0 overflow-visible p-3 md:p-4",
        )}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={moduleTableSearchClass}
            />
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Select
              value={criterioOrden}
              onValueChange={(val) => setCriterioOrden(val as typeof criterioOrden)}
            >
              <SelectTrigger className="flex-1 sm:flex-none w-full sm:w-[280px] h-10 rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-white focus:ring-1 focus:ring-[#8DA78E] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200] rounded-xl border-slate-200 bg-white opacity-100 dark:border-slate-800 dark:bg-zinc-900 shadow-md">
                <SelectItem value="nombre-asc" className="text-xs font-semibold cursor-pointer">Nombre (A-Z)</SelectItem>
                <SelectItem value="nombre-desc" className="text-xs font-semibold cursor-pointer">Nombre (Z-A)</SelectItem>
                <SelectItem value="compras-desc" className="text-xs font-semibold cursor-pointer">Nivel de Consumo (Compras)</SelectItem>
                <SelectItem value="saldo-asc" className="text-xs font-semibold cursor-pointer">Saldo Pendiente (Menor a Mayor)</SelectItem>
                <SelectItem value="saldo-desc" className="text-xs font-semibold cursor-pointer">Saldo Pendiente (Mayor a Menor)</SelectItem>
              </SelectContent>
            </Select>
            <SigetActionButton
              label="Exportar"
              accentColor={sigetAccent.excel}
              morphFrom={DownloadNode}
              morphTo={FileDown}
              onClick={handleExportarPDF}
              className="w-auto shrink-0"
            />
          </div>
        </div>
      </section>

      <div className="relative flex w-full flex-col">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-50 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 rounded-full border-2 border-[#8DA78E]/30 border-t-[#8DA78E] animate-spin" />
              <span className="text-xs font-bold text-slate-500">Cargando base de datos...</span>
            </div>
          </div>
        )}

        <div className={cn(moduleTableShellClass, "flex-none overflow-visible p-3 md:p-4")}>
          <div className="w-full flex-none">
            <div className="md:hidden flex flex-col gap-3 pr-2 w-full">
              {paginatedClientes.length === 0 ? (
                <div className={cn(moduleTableEmptyClass, "text-sm")}>
                  No se encontraron clientes.
                </div>
              ) : (
                paginatedClientes.map((cliente) => (
                  <motion.div
                    key={cliente.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={cn(
                      "relative border rounded-xl p-3 flex gap-3 items-center min-h-[96px] transition-all bg-white dark:bg-[#525D53]/10 border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20 hover:border-[#8DA78E] dark:hover:border-[#A3BEB0]/60"
                    )}
                  >
                    <div className="shrink-0 size-10 rounded-xl flex items-center justify-center border bg-[#8DA78E]/10 border-[#8DA78E]/20 text-[#8DA78E] dark:text-[#A3BEB0]">
                      <User className="size-5" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="font-black text-xs text-slate-900 dark:text-white truncate uppercase leading-tight">
                            {cliente.nombre}
                          </h3>
                          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-zinc-850 text-slate-500 rounded-full shrink-0 leading-none">
                            NIT: {cliente.nit || "C/F"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[10px]">
                          {cliente.telefono && cliente.telefono !== "No registrado" && (
                            <a
                              href={getWhatsappUrl(cliente.telefono)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline font-bold"
                            >
                              <Phone className="size-3" /> {formatPhoneDisplay(cliente.telefono)}
                            </a>
                          )}
                          {cliente.email && cliente.email !== "No registrado" && (
                            <span className="text-slate-400 dark:text-slate-500 truncate flex items-center gap-0.5">
                              <Mail className="size-3 shrink-0" /> {cliente.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 pt-1.5 border-t border-[#C1D1C5]/20 dark:border-[#A3BEB0]/10">
                        <div className="flex gap-2.5 text-[9px] leading-none">
                          <div>
                            <span className="text-[#525D53]/60 dark:text-[#A3BEB0]/50 font-bold uppercase">Compras:</span>
                            <span className="font-bold ml-0.5 text-zinc-700 dark:text-zinc-200 tabular-nums">
                              {cliente.totalCompras}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#525D53]/60 dark:text-[#A3BEB0]/50 font-bold uppercase">Saldo:</span>
                            <span className="font-black ml-0.5 text-[#8DA78E] dark:text-[#A3BEB0] tabular-nums tracking-tight">
                              {fmtQ(cliente.saldo)}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          <SigetActionButton
                            label="Editar"
                            accentColor={sigetAccent.editar}
                            morphFrom={Pencil}
                            morphTo={SquarePen}
                            onClick={() => {
                              setClienteParaEditar(cliente);
                              setIsEditOpen(true);
                            }}
                            className="w-auto shrink-0"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className={moduleTableDesktopWrapClass}>
              <div className={moduleTableDesktopScrollClass}>
              <table className={cn(moduleTableClass, "text-center")}>
                <thead>
                  <tr className={moduleTableHeadRowClass}>
                    <th className={cn(moduleTableHeadCellClass, "w-12 text-center")}>#</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Nombre Completo</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Teléfono</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Correo Electrónico</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>NIT</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Compras</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Saldo Pendiente</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Acciones</th>
                  </tr>
                </thead>
                <tbody className={moduleTableBodyClass}>
                  {paginatedClientes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={moduleTableEmptyCellClass}>
                        No se encontraron clientes.
                      </td>
                    </tr>
                  ) : (
                    paginatedClientes.map((cliente, index) => (
                      <tr
                        key={cliente.id}
                        onClick={() => {
                          const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
                          if (!isMobile) {
                            setClienteSeleccionado(clienteSeleccionado?.id === cliente.id ? null : cliente);
                          }
                        }}
                        className={cn(
                          "hover:bg-[#8DA78E]/10 dark:hover:bg-[#A3BEB0]/15 transition-all cursor-pointer",
                          clienteSeleccionado?.id === cliente.id && "bg-[#8DA78E]/20 dark:bg-[#8DA78E]/25"
                        )}
                      >
                        <td className="px-5 py-3.5 text-center font-bold text-slate-400 dark:text-slate-500">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-900 dark:text-white">
                          {cliente.nombre}
                        </td>
                        <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {cliente.telefono && cliente.telefono !== "No registrado" ? (
                            <a
                              href={getWhatsappUrl(cliente.telefono)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 text-green-600 dark:text-green-400 hover:underline font-bold"
                            >
                              <Phone className="size-3" /> {formatPhoneDisplay(cliente.telefono)}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center text-slate-500">{cliente.email}</td>
                        <td className="px-5 py-3.5 text-center font-mono text-slate-500">{cliente.nit}</td>
                        <td className="px-5 py-3.5 text-center font-bold tabular-nums text-slate-900 dark:text-white">
                          {cliente.totalCompras}
                        </td>
                        <td className="px-5 py-3.5 text-center font-black tabular-nums text-[#8DA78E] dark:text-[#A3BEB0]">
                          {fmtQ(cliente.saldo)}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <SigetActionButton
                              label="Editar"
                              accentColor={sigetAccent.editar}
                              morphFrom={Pencil}
                              morphTo={SquarePen}
                              onClick={() => {
                                setClienteParaEditar(cliente);
                                setIsEditOpen(true);
                              }}
                              className="w-auto shrink-0"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {!isLoading && (
            <ModuleTableFooter
              itemCount={clientesOrdenados.length}
              pageSize={pageSize}
              pageSizeOptions={[15, 30, 45]}
              setPageSize={setPageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="justify-center sm:justify-between"
            />
          )}
        </div>

        <AnimatePresence>
          {clienteSeleccionado && (
            <div className="fixed inset-0 z-[100]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={cerrarClienteSeleccionado}
                className="absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-sm"
              />
              <div className="pointer-events-none absolute inset-0 flex items-stretch p-4">
                <div className="pointer-events-auto flex h-[calc(100dvh-var(--banner-height,0px)-2rem)] max-h-[calc(100dvh-var(--banner-height,0px)-2rem)] w-full max-w-full flex-row items-stretch gap-3">
                  <div className="hidden min-h-0 min-w-0 md:flex md:flex-[7]">
                    <HistorialComprasPanel
                      cliente={clienteSeleccionado}
                      ventas={ventasClienteSeleccionado as VentaCliente[]}
                      onClose={cerrarClienteSeleccionado}
                    />
                  </div>
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900 md:flex-[3]"
                  >
                    <ClienteDetalle
                      cliente={clienteSeleccionado}
                      onClose={cerrarClienteSeleccionado}
                      onOpenHistorial={() => setHistorialMovilAbierto(true)}
                      onEdit={() => {
                        setClienteParaEditar(clienteSeleccionado);
                        setIsEditOpen(true);
                      }}
                    />
                  </motion.div>
                </div>
              </div>
              <AnimatePresence>
                {historialMovilAbierto ? (
                  <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm md:hidden"
                    onClick={() => setHistorialMovilAbierto(false)}
                  >
                    <div
                      className="h-[min(80vh,calc(100dvh-var(--banner-height,0px)-2rem))] w-[92vw] max-w-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HistorialComprasPanel
                        cliente={clienteSeleccionado}
                        ventas={ventasClienteSeleccionado as VentaCliente[]}
                        onClose={() => setHistorialMovilAbierto(false)}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </div>

      <CrearCliente
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />

      <EditarCliente
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setClienteParaEditar(null);
        }}
        onSuccess={() => refetch()}
        cliente={clienteParaEditar}
      />
    </div>
  );
}
