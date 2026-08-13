"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ShoppingBag,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Download,
  TrendingUp,
  X,
  Clock,
  ChevronDown,
  Check,
  User,
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
import Swal from "sweetalert2";
import { getSwalThemeOpts } from "@/lib/utils";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AnimatedIcon from "@/components/ui/AnimatedIcon";
import { Pagination, PageSizeSelect } from "@/components/ui/pagination";
import { CustomDatePicker, obtenerSemanasDelMes } from "@/components/ui/CustomDatePicker";
import { CrearCliente } from "./forms/CrearCliente";
import { EditarCliente } from "./forms/EditarCliente";
import { formatPhoneDisplay, getWhatsappUrl } from "../proveedores/forms/ProveedorDetalle";
import { useClientes, useVentasCliente } from "./lib/hooks";
import type { Cliente, VentaCliente, TransaccionVenta } from "./lib/zod";

function ClienteDetalle({
  cliente,
  onClose,
  onEdit,
}: {
  cliente: Cliente;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: ventas = [], isLoading: loadingVentas } = useVentasCliente(cliente.id);
  const [showHistorial, setShowHistorial] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="bg-white dark:bg-zinc-800 flex flex-col h-full w-full animate-fade-in text-left"
    >
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-6 space-y-4 custom-scrollbar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="shrink-0 size-8 rounded-lg bg-[#8DA78E]/10 border border-[#8DA78E]/20 flex items-center justify-center">
            <Users className="size-4.5 text-[#8DA78E]" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-white text-base leading-none">{cliente.nombre}</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 transition-colors text-lg font-bold px-2 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Contacto</h4>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Mail className="size-4 text-[#8DA78E] shrink-0" />
          <span className="truncate">{cliente.email || "No registrado"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Phone className="size-4 text-[#8DA78E] shrink-0" />
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
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <MapPin className="size-4 text-[#8DA78E] shrink-0" />
          <span className="truncate">{cliente.direccion || "No registrada"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <CreditCard className="size-4 text-[#8DA78E] shrink-0" />
          <span className="truncate">NIT: {cliente.nit || "C/F"}</span>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-[#C1D1C5]/20">
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Estado Financiero</h4>
        {loadingVentas ? (
          <p className="text-xs text-slate-400">Cargando transacciones...</p>
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
              <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3">
                <div className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">No tiene pagos pendientes</p>
              </div>
            );
          }

          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-start bg-[#8DA78E]/10 dark:bg-[#8DA78E]/5 border border-[#8DA78E]/20 dark:border-[#A3BEB0]/15 rounded-xl px-3 py-3">
                <span className="text-[10px] uppercase font-bold text-[#525D53] dark:text-[#A3BEB0]">Pendiente ({ventasPendientes.length} {ventasPendientes.length === 1 ? "crédito" : "créditos"})</span>
              </div>
            </div>
          );
        })()}
      </div>

      <div>
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70 mb-2">Estadísticas</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ShoppingBag, label: "Total Compras", value: cliente.totalCompras, color: "text-[#8DA78E] dark:text-[#A3BEB0]" },
            { icon: TrendingUp, label: "Pendiente", value: `${cliente.creditosPendientes || 0} créditos`, color: "text-rose-500" },
            { icon: Calendar, label: "Última Compra", value: cliente.ultimaCompra ? (() => { const parts = cliente.ultimaCompra.split("T")[0].split("-"); return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("es-GT"); })() : "Sin compras", color: "text-[#8DA78E] dark:text-[#A3BEB0]" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white dark:bg-[#525D53]/10 rounded-lg p-2 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 flex flex-col justify-center">
              <div className="flex items-center gap-1 mb-0.5">
                <Icon className={`size-3 ${color} shrink-0`} />
                <span className="text-[8px] text-[#525D53] dark:text-[#A3BEB0]/70 font-bold uppercase tracking-wider truncate leading-tight">{label}</span>
              </div>
              <p className={`text-xs font-black ${color} truncate leading-tight`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      </div>

      <div className="flex gap-3 p-4 md:p-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 bg-[#F5F5F1] dark:bg-zinc-900 justify-end">
        <button
          onClick={() => setShowHistorial(true)}
          className="flex-1 py-3 px-4 rounded-xl border border-[#8DA78E] text-[#8DA78E] text-xs font-bold transition-all hover:bg-[#8DA78E]/10 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          Historial de Compras
        </button>
        <button
          onClick={onEdit}
          className="flex-1 py-3 px-4 rounded-xl bg-[#8DA78E] hover:bg-[#7b927c] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          Editar Cliente
        </button>
      </div>

      <AnimatePresence>
        {showHistorial && (
          <HistorialComprasModal
            cliente={cliente}
            ventas={ventas as VentaCliente[]}
            onClose={() => setShowHistorial(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HistorialComprasModal({
  cliente,
  ventas,
  onClose
}: {
  cliente: Cliente;
  ventas: VentaCliente[];
  onClose: () => void;
}) {
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

  const ventasFiltradas = useMemo(() => {
    return ventas.filter(v => {
      const fechaCal = v.created_at.split("T")[0];
      if (tipoFiltroFecha === "dia") {
        return fechaCal === fechaDia;
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-[85vw] max-w-5xl h-[80vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden flex flex-col mt-10"
      >
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
          <div>
            <h3 className="font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider text-sm flex items-center gap-2">
              <Clock className="size-4" /> Historial de Compras
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Cliente: {cliente.nombre}</p>
          </div>

          <div className="flex-1 flex justify-center w-full md:w-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full md:w-fit mx-auto sm:mx-0">
              <div className="flex items-center justify-center gap-1 bg-slate-50 dark:bg-zinc-900/50 p-1 rounded-xl border border-slate-100 dark:border-zinc-800 w-full sm:w-auto">
                {[
                  { id: "dia", label: "Día" },
                  { id: "semana", label: "Mes" },
                  { id: "rango", label: "Rango" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTipoFiltroFecha(opt.id)}
                    className={cn(
                      "flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      tipoFiltroFecha === opt.id
                        ? "bg-white dark:bg-zinc-800 text-[#8DA78E] shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                {tipoFiltroFecha === "dia" && (
                  <CustomDatePicker
                    value={fechaDia}
                    onChange={setFechaDia}
                    align="center"
                  />
                )}

                {tipoFiltroFecha === "semana" && (
                  <div className="flex items-center gap-2 w-full">
                    <div className="relative w-1/2 sm:w-auto" ref={mesDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setMostrarMesDropdown(!mostrarMesDropdown)}
                        className="flex items-center justify-between w-full sm:w-[140px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 hover:border-[#8DA78E] rounded-xl px-2.5 py-1.5 cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#8DA78E] transition-all h-[34px]"
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
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2"
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

                    <div className="relative w-1/2 sm:w-auto" ref={semanaDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setMostrarSemanaDropdown(!mostrarSemanaDropdown)}
                        className="flex items-center justify-between w-full sm:w-[150px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 hover:border-[#8DA78E] rounded-xl px-2.5 py-1.5 cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#8DA78E] transition-all h-[34px]"
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
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[180px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1"
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
                  <div className="flex items-center justify-center gap-2">
                    <CustomDatePicker
                      value={fechaRangoDesde}
                      onChange={setFechaRangoDesde}
                      placeholder="Desde"
                      align="center"
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <CustomDatePicker
                      value={fechaRangoHasta}
                      onChange={setFechaRangoHasta}
                      placeholder="Hasta"
                      align="center"
                    />
                  </div>
                )}
              </div>
            </div>
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
    </div>
  );
}

export function VerClientes() {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
  const [criterioOrden, setCriterioOrden] = useState<"nombre-asc" | "nombre-desc" | "compras-desc" | "saldo-asc" | "saldo-desc">("nombre-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: clientes = [], isLoading, refetch } = useClientes();

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
      Swal.fire({ title: "Éxito", text: "PDF exportado exitosamente.", icon: "success", ...getSwalThemeOpts() });
    } catch {
      Swal.fire({ title: "Error", text: "No se pudo generar el archivo PDF.", icon: "error", ...getSwalThemeOpts() });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 px-2 pt-32 pb-8 md:px-4 md:pt-28 relative mt-4 md:mt-8 min-h-screen">
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4">
          <div className="shrink-0 size-12 rounded-2xl bg-[#8DA78E]/10 border border-[#8DA78E]/20 flex items-center justify-center overflow-hidden">
            <AnimatedIcon iconKey="zdwrqfmb" className="text-[#8DA78E] dark:text-[#A3BEB0]" size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">Módulo</p>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
              Clientes
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#8DA78E] text-[#F5F5F1] text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="size-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-zinc-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/30 focus:border-[#8DA78E] transition-all"
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
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 shadow-md">
              <SelectItem value="nombre-asc" className="text-xs font-semibold cursor-pointer">Nombre (A-Z)</SelectItem>
              <SelectItem value="nombre-desc" className="text-xs font-semibold cursor-pointer">Nombre (Z-A)</SelectItem>
              <SelectItem value="compras-desc" className="text-xs font-semibold cursor-pointer">Nivel de Consumo (Compras)</SelectItem>
              <SelectItem value="saldo-asc" className="text-xs font-semibold cursor-pointer">Saldo Pendiente (Menor a Mayor)</SelectItem>
              <SelectItem value="saldo-desc" className="text-xs font-semibold cursor-pointer">Saldo Pendiente (Mayor a Menor)</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={handleExportarPDF}
            className="px-8 py-2.5 rounded-xl border border-[#C1D1C5] dark:border-[#A3BEB0]/30 text-[#525D53] dark:text-[#A3BEB0] transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Download className="size-3.5" /> PDF
          </button>
        </div>
      </div>

      <div className="flex gap-4 relative w-full flex-1 min-h-0 overflow-x-hidden p-1">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-50 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 rounded-full border-2 border-[#8DA78E]/30 border-t-[#8DA78E] animate-spin" />
              <span className="text-xs font-bold text-slate-500">Cargando base de datos...</span>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0 bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5 shadow-sm overflow-hidden">
          <div className="w-full flex-1 overflow-y-auto custom-scrollbar">
            <div className="md:hidden flex flex-col gap-3 pr-2 w-full">
              {paginatedClientes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-800/40">
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

                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setClienteParaEditar(cliente);
                              setIsEditOpen(true);
                            }}
                            className="px-2 py-1 bg-[#A3BEB0]/20 hover:bg-[#A3BEB0]/40 text-[#525D53] dark:text-[#A3BEB0] text-[9px] font-bold rounded-md transition-all cursor-pointer uppercase"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-5 py-3.5 text-center w-12">#</th>
                    <th className="px-5 py-3.5">Nombre Completo</th>
                    <th className="px-5 py-3.5">Teléfono</th>
                    <th className="px-5 py-3.5">Correo Electrónico</th>
                    <th className="px-5 py-3.5">NIT</th>
                    <th className="px-5 py-3.5 text-right">Compras</th>
                    <th className="px-5 py-3.5 text-right">Saldo Pendiente</th>
                    <th className="px-5 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                  {paginatedClientes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
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
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {cliente.nombre}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {cliente.telefono && cliente.telefono !== "No registrado" ? (
                            <a
                              href={getWhatsappUrl(cliente.telefono)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline font-bold"
                            >
                              <Phone className="size-3" /> {formatPhoneDisplay(cliente.telefono)}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{cliente.email}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">{cliente.nit}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                          {cliente.totalCompras}
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-[#8DA78E] dark:text-[#A3BEB0]">
                          {fmtQ(cliente.saldo)}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setClienteParaEditar(cliente);
                                setIsEditOpen(true);
                              }}
                              className="px-3 py-1.5 bg-[#A3BEB0]/20 hover:bg-[#A3BEB0]/40 text-[#525D53] dark:text-[#A3BEB0] font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!isLoading && clientesOrdenados.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-[#C1D1C5]/40 dark:border-zinc-800 text-slate-600 dark:text-slate-400">
              <PageSizeSelect
                pageSize={pageSize}
                setPageSize={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
              <div className="flex justify-start sm:justify-center w-full sm:w-auto">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {clienteSeleccionado && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setClienteSeleccionado(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md h-[calc(100%-2rem)] m-4 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col rounded-[2rem] overflow-hidden"
              >
                <div className="h-full">
                  <ClienteDetalle
                    cliente={clienteSeleccionado}
                    onClose={() => setClienteSeleccionado(null)}
                    onEdit={() => {
                      setClienteParaEditar(clienteSeleccionado);
                      setIsEditOpen(true);
                    }}
                  />
                </div>
              </motion.div>
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
