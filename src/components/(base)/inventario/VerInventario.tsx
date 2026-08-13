"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Plus,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Truck,
  Calendar,
  Box,
  Building2,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Pagination, PageSizeSelect } from "@/components/ui/pagination";
import { cn, fmtNum, fmtQ, getSwalThemeOpts } from "@/lib/utils";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/imgs/ImageUploader";
import AnimatedIcon from "@/components/ui/AnimatedIcon";
import { useProductos, useEliminarProducto } from "./lib/hooks";
import { ModalConfirmDelete, ModalShell } from "@/components/ui/general-modal";
// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  precio_costo?: number | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  imagen_url?: string | null;
  imagen_url_2?: string | null;
  imagen_url_3?: string | null;
  fecha_vencimiento?: string | null;
  numero_lote?: string | null;
  ubicacion?: string | null;
  created_at?: string;
  proveedor_id?: string | null;
  inv_proveedores?: {
    nombre: string;
  } | null;
  inv_compras_detalles?: {
    inv_compras?: {
      inv_proveedores?: {
        nombre: string;
      } | null;
    } | null;
  }[];
}

const isProductoProximoAVencer = (fechaVencimiento?: string | null, meses = 4): boolean => {
  if (!fechaVencimiento) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(fechaVencimiento);
  const limitDate = new Date(today);
  limitDate.setMonth(limitDate.getMonth() + meses);
  return expDate <= limitDate;
};

// ─── Tarjeta de producto ─────────────────────────────────────────────────────
function ProductoCard({
  producto,
  onClick,
  onEdit,
  onDelete,
  destacarRojo,
}: {
  producto: Producto;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  destacarRojo?: boolean;
}) {
  const isLowStock = producto.stock_actual <= producto.stock_minimo;
  const imagenes = [producto.imagen_url, producto.imagen_url_2, producto.imagen_url_3].filter(Boolean);
  const isExpiringSoon = isProductoProximoAVencer(producto.fecha_vencimiento);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className={cn("group relative border rounded-xl p-2.5 cursor-pointer hover:border-[#8DA78E] dark:hover:border-[#A3BEB0]/60 flex gap-3 items-center min-h-[96px]",
        destacarRojo
          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/30"
          : isExpiringSoon
            ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
            : "bg-[#F5F5F1] dark:bg-[#525D53]/10 border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20")}
    >
      {/* Thumbnail Left */}
      <div className="shrink-0 size-20 rounded-lg bg-white dark:bg-zinc-900/60 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/20 flex items-center justify-center overflow-hidden">
        {producto.imagen_url ? (
          <img
            src={createClient().storage.from("Imagenes_Farmacia").getPublicUrl(producto.imagen_url).data.publicUrl}
            alt={producto.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="size-6 text-slate-300 dark:text-slate-600 animate-pulse" />
        )}
      </div>

      {/* Content Right */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-black text-xs text-slate-900 dark:text-white truncate uppercase leading-tight">
              {producto.nombre}
            </h3>
            <span className={cn(
              "size-2 rounded-full mt-0.5 shrink-0",
              producto.activo ? "bg-[#8DA78E]" : "bg-red-400"
            )} />
          </div>
          <p className="text-[9px] font-mono text-slate-500 mt-0.5">
            CÓD: {producto.codigo || "SIN CÓDIGO"}
            {producto.numero_lote && ` | LOTE: ${producto.numero_lote}`}
          </p>
          {producto.fecha_vencimiento && (
            <p className={cn("text-[9px] font-bold mt-0.5", isExpiringSoon ? "text-amber-500 animate-pulse" : "text-slate-500")}>
              VENCE: {new Date(producto.fecha_vencimiento).toLocaleDateString("es-GT")}
            </p>
          )}
          {(producto.inv_proveedores?.nombre || producto.inv_compras_detalles?.[0]?.inv_compras?.inv_proveedores?.nombre) && (
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase flex items-center gap-1">
              <Truck className="size-3 text-[#8DA78E] dark:text-[#A3BEB0]" /> {producto.inv_proveedores?.nombre || producto.inv_compras_detalles?.[0]?.inv_compras?.inv_proveedores?.nombre}
            </p>
          )}
          {producto.ubicacion && producto.ubicacion !== "Sin asignar" && (
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase flex items-center gap-1">
              <Box className="size-3 text-[#8DA78E] dark:text-[#A3BEB0]" /> {producto.ubicacion}
            </p>
          )}
        </div>

        {/* Bottom stats and action buttons side by side */}
        <div className="mt-1.5 flex items-center justify-between gap-2 pt-1 border-t border-[#C1D1C5]/20 dark:border-[#A3BEB0]/10">
          <div className="flex gap-2.5 text-[9px] leading-none">
            <div>
              <span className="text-[#525D53]/60 dark:text-[#A3BEB0]/50 font-bold uppercase">Stock:</span>
              <span className={cn(
                "font-black ml-0.5",
                isLowStock ? "text-red-500 animate-pulse" : "text-slate-700 dark:text-slate-300"
              )}>
                {fmtNum(producto.stock_actual)}
              </span>
            </div>
            <div>
              <span className="text-[#525D53]/60 dark:text-[#A3BEB0]/50 font-bold uppercase">Precio:</span>
              <span className="font-black ml-0.5 text-[#8DA78E] dark:text-[#A3BEB0]">
                {fmtQ(producto.precio_base)}
              </span>
            </div>
          </div>

          {/* Action buttons (50/50 split) */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-2.5 py-1 bg-[#A3BEB0]/20 hover:bg-[#A3BEB0]/40 text-[#525D53] dark:text-[#A3BEB0] text-[9px] font-bold rounded-md transition-all cursor-pointer uppercase"
            >
              Editar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-2.5 py-1 bg-red-400 hover:bg-red-500 text-white text-[9px] font-bold rounded-md transition-all cursor-pointer uppercase"
            >
              Borrar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Custom Date Picker ─────────────────────────────────────────────────────────
interface CalendarioCell {
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
}

function obtenerDiasDelMes(month: number, year: number): CalendarioCell[] {
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

const CustomDatePicker = ({
  value,
  onChange,
  placeholder,
  align = "left"
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  align?: "left" | "right";
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
        className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20 rounded-md py-0.5 px-2 cursor-pointer select-none transition-all h-[24px] min-w-[120px] text-left focus:outline-none focus:ring-1 focus:ring-[#8DA78E]"
      >
        <div className="flex items-center">
          <Calendar className="size-3.5 text-[#8DA78E] mr-1.5 shrink-0" />
          <span className="text-[10px] font-bold text-[#8DA78E] dark:text-[#A3BEB0]">
            {getDisplayDate()}
          </span>
        </div>
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
                "sm:absolute sm:mt-2",
                align === "left" ? "sm:left-0 sm:right-auto" : "sm:right-0 sm:left-auto"
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
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${isSelected
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

// ─── Panel de detalle ──────────────────────────────────────────────────────────
function ProductoDetalle({
  producto,
  onClose,
  onEditClick
}: {
  producto: Producto;
  onClose: () => void;
  onEditClick: () => void;
}) {
  const isLowStock = producto.stock_actual <= producto.stock_minimo;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="bg-zinc-100 dark:bg-zinc-800 border border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20 rounded-2xl p-3 flex flex-col gap-2.5 h-fit max-h-full overflow-y-auto w-full animate-fade-in shadow-2xl"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-2 border-b border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="shrink-0 size-8 rounded-lg bg-gradient-to-br from-[#C1D1C5] to-[#8DA78E] flex items-center justify-center text-white">
            <Package className="size-4.5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalle del Producto</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 transition-colors text-base font-bold px-1.5 cursor-pointer shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Nombre */}
      <div className="space-y-1">
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Nombre</h4>
        <h2 className="font-black text-slate-900 dark:text-white text-base leading-tight break-words">{producto.nombre}</h2>
      </div>

      {/* Código y Estado */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="col-span-2 space-y-1">
          <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Código de Barras</h4>
          <p className="text-xs font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-zinc-900/40 border border-[#C1D1C5]/20 rounded-lg px-3 py-2 uppercase">{producto.codigo || "Sin Código"}</p>
        </div>

        <div className="space-y-1">
          <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Estado</h4>
          <div className="bg-white dark:bg-zinc-900/40 border border-[#C1D1C5]/20 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-2 h-[38px] shadow-sm">
            <span className={`text-[10px] font-bold uppercase ${producto.activo ? "text-[#8DA78E] dark:text-[#A3BEB0]" : "text-red-500"}`}>
              {producto.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-1 mt-1">
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Descripción</h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal bg-white dark:bg-zinc-900/50 p-2.5 rounded-lg border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10">
          {producto.descripcion || "Sin descripción registrada para este producto."}
        </p>
      </div>

      {/* Datos técnicos */}
      <div>
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70 mb-1.5">Inventario y Costos</h4>
        <div className="grid grid-cols-3 gap-2">
          {/* Existencias */}
          <div className="bg-white dark:bg-[#525D53]/10 rounded-xl px-2 py-1.5 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 flex items-center justify-between gap-1 h-[38px] shadow-sm">
            <span className="text-[9px] text-[#525D53] dark:text-[#A3BEB0]/70 font-bold uppercase tracking-wider shrink-0">Existencias</span>
            <span className={`text-xs font-black ${isLowStock ? "text-red-400 animate-pulse" : "text-[#8DA78E] dark:text-[#A3BEB0]"}`}>{fmtNum(producto.stock_actual)}</span>
          </div>

          {/* Alerta Mínima */}
          <div className="bg-white dark:bg-[#525D53]/10 rounded-xl px-2 py-1.5 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 flex items-center justify-between gap-1 h-[38px] shadow-sm">
            <span className="text-[9px] text-[#525D53] dark:text-[#A3BEB0]/70 font-bold uppercase tracking-wider shrink-0">Mínimo</span>
            <span className="text-xs font-black text-[#8DA78E] dark:text-[#A3BEB0]">{fmtNum(producto.stock_minimo)}</span>
          </div>

          {/* Precio Unitario */}
          <div className="bg-white dark:bg-[#525D53]/10 rounded-xl px-2 py-1.5 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 flex items-center justify-between gap-1 h-[38px] shadow-sm">
            <span className="text-[9px] text-[#525D53] dark:text-[#A3BEB0]/70 font-bold uppercase tracking-wider shrink-0">Precio U.</span>
            <span className="text-xs font-black text-[#8DA78E] dark:text-[#A3BEB0]">{fmtQ(producto.precio_base)}</span>
          </div>

          {/* Proveedor */}
          <div className="col-span-3 bg-white dark:bg-[#525D53]/10 rounded-xl p-2.5 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10">
            <span className="text-[9px] text-[#525D53] dark:text-[#A3BEB0]/70 font-semibold uppercase tracking-wide block mb-0.5">Proveedor</span>
            <p className="text-xs font-bold text-[#8DA78E] dark:text-[#A3BEB0] truncate">
              {producto.inv_proveedores?.nombre || producto.inv_compras_detalles?.[0]?.inv_compras?.inv_proveedores?.nombre || "Sin Proveedor"}
            </p>
          </div>

          {/* Ubicación */}
          <div className="col-span-3 bg-white dark:bg-[#525D53]/10 rounded-xl p-2.5 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10">
            <span className="text-[9px] text-[#525D53] dark:text-[#A3BEB0]/70 font-semibold uppercase tracking-wide block mb-0.5">Ubicación</span>
            <p className="text-xs font-bold text-[#8DA78E] dark:text-[#A3BEB0] truncate flex items-center gap-1">
              <Box className="size-3 shrink-0" /> {producto.ubicacion || "Sin asignar"}
            </p>
          </div>

          {/* Vencimiento y Lote */}
          <div className="col-span-3 grid grid-cols-2 gap-2 mt-1">
            <div className="bg-white dark:bg-[#525D53]/10 rounded-xl px-2 py-1.5 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 flex items-center justify-between gap-1 h-[38px] shadow-sm">
              <span className="text-[9px] text-[#525D53] dark:text-[#A3BEB0]/70 font-bold uppercase tracking-wider shrink-0">Vence</span>
              <span className="text-xs font-black text-[#8DA78E] dark:text-[#A3BEB0]">
                {producto.fecha_vencimiento ? new Date(producto.fecha_vencimiento).toLocaleDateString("es-GT") : "—"}
              </span>
            </div>

            <div className="bg-white dark:bg-[#525D53]/10 rounded-xl px-2 py-1.5 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 flex items-center justify-between gap-1 h-[38px] shadow-sm">
              <span className="text-[9px] text-[#525D53] dark:text-[#A3BEB0]/70 font-bold uppercase tracking-wider shrink-0">Lote</span>
              <span className="text-xs font-black text-[#8DA78E] dark:text-[#A3BEB0]">
                {producto.numero_lote || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Galería de Imágenes */}
      <div className="space-y-1.5 mt-1">
        <h4 className="text-[10px] uppercase tracking-widest font-black text-[#525D53] dark:text-[#A3BEB0]/70">Galería de Imágenes</h4>
        <div className="grid grid-cols-3 gap-2">
          {[producto.imagen_url, producto.imagen_url_2, producto.imagen_url_3].map((imgUrl, idx) => {
            const publicUrl = imgUrl ? createClient().storage.from("Imagenes_Farmacia").getPublicUrl(imgUrl).data.publicUrl : null;
            return (
              <div key={idx} className="aspect-[3/4] rounded-xl bg-white dark:bg-zinc-900/60 border border-[#C1D1C5]/30 dark:border-[#A3BEB0]/20 flex items-center justify-center overflow-hidden shadow-xs">
                {publicUrl ? (
                  <img src={publicUrl} alt={`${producto.nombre} - img ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <Package className="size-5 text-slate-300 dark:text-slate-600" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-start items-center mt-4 pt-3 border-t border-[#C1D1C5]/20 dark:border-[#A3BEB0]/10 shrink-0">
        <button
          type="button"
          onClick={onEditClick}
          className="w-fit py-2.5 px-8 rounded-xl bg-[#A3BEB0] hover:bg-[#8DA78E] text-[#F5F5F1] text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          Editar Producto
        </button>
      </div>
    </motion.div>
  );
}

// ─── Componente Filtro de Ubicación ─────────────────────────────────────────
const LocationFilterDropdown = ({
  selectedLocation,
  onSelectLocation,
  locations,
  products
}: {
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  locations: string[];
  products: Producto[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const loc = p.ubicacion || "Sin asignar";
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return counts;
  }, [products]);

  const totalProducts = products.length;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-3 py-2.5 rounded-xl border text-[11px] md:text-xs font-bold transition-all flex items-center gap-2 cursor-pointer h-full shadow-xs select-none",
          selectedLocation
            ? "border-[#8DA78E] bg-[#8DA78E]/10 text-[#525D53] dark:text-[#A3BEB0] dark:bg-[#8DA78E]/20"
            : "border-slate-200 dark:border-slate-700/60 bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-slate-300 hover:border-[#8DA78E]"
        )}
      >
        <Box className="size-3.5 text-[#8DA78E] shrink-0" />
        <span className="truncate max-w-[140px] md:max-w-[170px]">
          {selectedLocation || "Todas las ubicaciones"}
        </span>

        {selectedLocation ? (
          <span className="flex items-center gap-1.5 ml-1">
            <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-[#8DA78E] text-white">
              {locationCounts[selectedLocation] || 0}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelectLocation("");
              }}
              className="p-0.5 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
              title="Limpiar filtro"
            >
              <X className="size-3" />
            </span>
          </span>
        ) : (
          <ChevronDown className={cn("size-3 text-slate-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl z-50 p-2 max-h-72 overflow-y-auto custom-scrollbar"
          >
            <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
              <span>Ubicaciones</span>
              <span className="text-[#8DA78E] font-bold">{locations.length} encontradas</span>
            </div>

            {/* Opción: Todas las ubicaciones */}
            <button
              type="button"
              onClick={() => {
                onSelectLocation("");
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer my-0.5",
                selectedLocation === ""
                  ? "bg-[#8DA78E] text-white shadow-sm"
                  : "text-slate-700 dark:text-slate-200 hover:bg-[#8DA78E]/10 hover:text-[#8DA78E]"
              )}
            >
              <div className="flex items-center gap-2">
                <Building2 className="size-3.5 opacity-80 shrink-0" />
                <span>Todas las ubicaciones</span>
              </div>
              <span className={cn("px-2 py-0.5 text-[10px] rounded-full font-extrabold", selectedLocation === "" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-zinc-900 text-slate-500")}>
                {totalProducts}
              </span>
            </button>

            {/* Ubicaciones individuales */}
            {locations.map((ub) => {
              const isSelected = selectedLocation === ub;
              const count = locationCounts[ub] || 0;
              return (
                <button
                  key={ub}
                  type="button"
                  onClick={() => {
                    onSelectLocation(ub);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer my-0.5 text-left",
                    isSelected
                      ? "bg-[#8DA78E] text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-200 hover:bg-[#8DA78E]/10 hover:text-[#8DA78E]"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Box className="size-3.5 opacity-80 shrink-0" />
                    <span className="truncate">{ub}</span>
                  </div>
                  <span className={cn("px-2 py-0.5 text-[10px] rounded-full font-extrabold shrink-0", isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-zinc-900 text-slate-500")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export function VerInventario() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  const [filtroProximoVencer, setFiltroProximoVencer] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("activos");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);


  // Estados de Base de Datos Real
  const { data: productos = [], isLoading, refetch: refetchProductos } = useProductos();
  const { mutateAsync: eliminarProductoAsync, isPending: isDeleting } = useEliminarProducto();
  const [showDeleteModal, setShowDeleteModal] = useState<Producto | null>(null);
  const [mostrarBajoStock, setMostrarBajoStock] = useState(false);

  // Escáner de código de barras
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const lastKeyTime = useRef<number>(Date.now());

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mostrarPageSizeDropdown, setMostrarPageSizeDropdown] = useState(false);
  const pageSizeDropdownRef = useRef<HTMLDivElement>(null);
  const [mostrarFiltroEstadoDropdown, setMostrarFiltroEstadoDropdown] = useState(false);
  const filtroEstadoDropdownRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pageSizeDropdownRef.current && !pageSizeDropdownRef.current.contains(event.target as Node)) {
        setMostrarPageSizeDropdown(false);
      }
      if (filtroEstadoDropdownRef.current && !filtroEstadoDropdownRef.current.contains(event.target as Node)) {
        setMostrarFiltroEstadoDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
  }, []);

  // Lógica de Escáner de Código de Barras
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar eventos que vengan de inputs o textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const now = Date.now();
      const isFastTyping = now - lastKeyTime.current < 50;
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        if (barcodeBuffer.length > 2) {
          const scannedCode = barcodeBuffer;
          const found = productos.find(p => p.codigo === scannedCode);
          if (found) {
            setBusqueda(scannedCode);
            setProductoSeleccionado(found);
            // Si estaba en otra página o pestaña, volvemos a la 1
            setCurrentPage(1);
          } else {
            Swal.fire({
              title: "No Encontrado",
              text: `Código no registrado: ${scannedCode}`,
              icon: "warning",
              timer: 2500,
              ...getSwalThemeOpts()
            });
          }
        }
        setBarcodeBuffer("");
      } else if (e.key.length === 1) {
        if (isFastTyping) {
          setBarcodeBuffer(prev => prev + e.key);
        } else {
          setBarcodeBuffer(e.key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeBuffer, productos]);

  // Filtrado de productos
  const ubicacionesUnicas = Array.from(
    new Set(
      productos
        .map((p) => p.ubicacion || "Sin asignar")
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const productosFiltrados = productos.filter((p) => {
    const matchesSearch =
      (p.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo || "").toLowerCase().includes(busqueda.toLowerCase());

    const matchesStock = !filtroStockBajo || p.stock_actual <= p.stock_minimo;

    let matchesExpiring = true;
    if (filtroProximoVencer) {
      matchesExpiring = isProductoProximoAVencer(p.fecha_vencimiento);
    }

    const matchesEstado =
      filtroEstado === "todos" ? true :
        filtroEstado === "activos" ? p.activo :
          !p.activo;

    const matchesUbicacion = !filtroUbicacion || (p.ubicacion || "Sin asignar") === filtroUbicacion;

    return matchesSearch && matchesStock && matchesEstado && matchesExpiring && matchesUbicacion;
  }).sort((a, b) => {
    const aLow = a.stock_actual <= a.stock_minimo ? 0 : 1;
    const bLow = b.stock_actual <= b.stock_minimo ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    return a.nombre.localeCompare(b.nombre);
  });

  const hayStockBajoGlobal = productos.some((p) => p.stock_actual <= p.stock_minimo);
  const hayProximoVencerGlobal = productos.some((p) => isProductoProximoAVencer(p.fecha_vencimiento));

  const totalItems = productosFiltrados.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const productosPaginados = productosFiltrados.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize
  );



  const handleNuevoProducto = () => {
    router.push("/farmacia-la-salud/inventario/nuevo");
  };

  const handleEliminarProducto = (producto: Producto) => {
    setShowDeleteModal(producto);
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;
    try {
      await eliminarProductoAsync(showDeleteModal.id);
      Swal.fire({ title: "Eliminado", text: `${showDeleteModal.nombre} fue eliminado del inventario.`, icon: "success", ...getSwalThemeOpts() });
      if (productoSeleccionado?.id === showDeleteModal.id) setProductoSeleccionado(null);
      setShowDeleteModal(null);
    } catch (err: any) {
      Swal.fire({ title: "Error", text: "No se pudo eliminar el producto: " + err.message, icon: "error", ...getSwalThemeOpts() });
    }
  };



  // Exportar lista a PDF
  const handleExportarPDF = () => {
    try {
      const doc = new jsPDF();

      // Encabezado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(82, 93, 83); // #525D53 (Olivo Oscuro)
      doc.text("FARMACIA SALUD - REPORTE DE INVENTARIO", 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const fecha = new Date().toLocaleDateString("es-GT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.text(`Fecha de generación: ${fecha}`, 14, 27);
      doc.text(`Total de productos listados: ${productosFiltrados.length}`, 14, 33);

      // Línea divisoria
      doc.setDrawColor(193, 209, 197); // #C1D1C5
      doc.line(14, 38, 196, 38);

      // Generar tabla
      autoTable(doc, {
        startY: 42,
        head: [["Código", "Nombre del Producto", "Ubicación", "Proveedor", "Stock Actual", "Mínimo", "Precio Venta", "Estado"]],
        body: productosFiltrados.map((p) => [
          p.codigo || "Sin Código",
          p.nombre,
          p.ubicacion || "Sin asignar",
          p.inv_proveedores?.nombre || p.inv_compras_detalles?.[0]?.inv_compras?.inv_proveedores?.nombre || "—",
          fmtNum(p.stock_actual),
          fmtNum(p.stock_minimo),
          fmtQ(p.precio_base),
          p.activo ? "Activo" : "Inactivo"
        ]),
        headStyles: {
          fillColor: [141, 167, 142], // #8DA78E
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

      doc.save(`Reporte_Inventario_${new Date().toISOString().slice(0, 10)}.pdf`);

      Swal.fire({
        title: "¡PDF Exportado!",
        text: "El reporte de inventario se ha descargado exitosamente.",
        icon: "success",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        ...getSwalThemeOpts()
      });
    } catch (error: any) {
      console.error("Error al exportar PDF:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo generar el archivo PDF: " + error.message,
        icon: "error",
        ...getSwalThemeOpts(),
        confirmButtonColor: "#ef4444"
      });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 px-2 pt-32 pb-8 md:px-4 md:pt-28 relative mt-4 md:mt-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-2.5 md:px-0">
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-12 rounded-2xl bg-[#8DA78E]/10 border border-[#8DA78E]/20 flex items-center justify-center overflow-hidden">
            <AnimatedIcon iconKey="gbzbfgyf" className="text-[#8DA78E] dark:text-[#A3BEB0]" size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">Módulo</p>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none mt-1">
              Inventario
            </h1>
          </div>
        </div>

        <button
          onClick={handleNuevoProducto}
          className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#8DA78E] text-[#F5F5F1] text-sm font-bold transition-all shadow-sm cursor-pointer shrink-0 animate-fade-in"
        >
          Nuevo
        </button>
      </div>

      {/* Tabs Selector: Activos / Inactivos (arriba del Buscador) */}
      <div className="px-2.5 md:px-0 mt-2 flex justify-center">
        <div className="flex border-b border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 w-full max-w-xs select-none">
          <button
            type="button"
            onClick={() => {
              setFiltroEstado("activos");
              setCurrentPage(1);
            }}
            className={cn(
              "flex-1 py-2 text-xs font-black uppercase tracking-wider text-center border-b-2 cursor-pointer text-[#8DA78E] dark:text-[#A3BEB0]",
              filtroEstado === "activos" ? "border-[#8DA78E] dark:border-[#A3BEB0]" : "border-transparent"
            )}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => {
              setFiltroEstado("inactivos");
              setCurrentPage(1);
            }}
            className={cn(
              "flex-1 py-2 text-xs font-black uppercase tracking-wider text-center border-b-2 cursor-pointer text-[#8DA78E] dark:text-[#A3BEB0]",
              filtroEstado === "inactivos" ? "border-[#8DA78E] dark:border-[#A3BEB0]" : "border-transparent"
            )}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* Buscador, Filtros y Exportar */}
      <div className="flex flex-col md:flex-row gap-3 px-2.5 md:px-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-zinc-900/60 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/30 focus:border-[#8DA78E] transition-all"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto pb-1 md:pb-0 select-none justify-end">
          {/* Filtro por Ubicación */}
          {ubicacionesUnicas.length > 0 && (
            <div className="w-full md:w-auto flex justify-center md:block">
              <LocationFilterDropdown
                selectedLocation={filtroUbicacion}
                onSelectLocation={(loc) => {
                  setFiltroUbicacion(loc);
                  setCurrentPage(1);
                }}
                locations={ubicacionesUnicas}
                products={productos}
              />
            </div>
          )}

          <div className="grid grid-cols-3 md:flex gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                const nextVal = !filtroStockBajo;
                setFiltroStockBajo(nextVal);
                if (nextVal) setFiltroProximoVencer(false);
                setCurrentPage(1);
              }}
              className={`w-full md:w-auto justify-center px-1.5 md:px-4 py-2.5 rounded-xl border text-[11px] md:text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${filtroStockBajo
                ? "border-red-400 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                : "border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                } ${hayStockBajoGlobal && !filtroStockBajo ? "animate-pulse" : ""}`}
            >
              <AlertTriangle className="size-3 md:size-3.5" /> Stock Bajo
            </button>

            <button
              onClick={() => {
                const nextVal = !filtroProximoVencer;
                setFiltroProximoVencer(nextVal);
                if (nextVal) setFiltroStockBajo(false);
                setCurrentPage(1);
              }}
              className={`w-full md:w-auto justify-center px-1.5 md:px-4 py-2.5 rounded-xl border text-[11px] md:text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${filtroProximoVencer
                ? "border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                : "border-amber-200 dark:border-amber-900/50 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                } ${hayProximoVencerGlobal && !filtroProximoVencer ? "animate-pulse" : ""}`}
            >
              <Calendar className="size-3 md:size-3.5" /> Vencimiento
            </button>

            <button
              onClick={handleExportarPDF}
              className="w-full md:w-auto justify-center px-1.5 md:px-4 py-2.5 rounded-xl border border-[#C1D1C5] dark:border-[#A3BEB0]/30 text-[#525D53] dark:text-[#A3BEB0] transition-all flex items-center gap-1 text-[11px] md:text-xs font-bold shrink-0 cursor-pointer"
            >
              <Download className="size-3 md:size-3.5" /> Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Grid de productos + detalle */}
      <div className="flex gap-4 flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-50 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 rounded-full border-2 border-[#8DA78E]/30 border-t-[#8DA78E] animate-spin" />
              <span className="text-xs font-bold text-slate-500">Cargando base de datos...</span>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#525D53]/10 border border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20 rounded-3xl p-5 shadow-sm overflow-hidden">
          <div className="w-full flex-1 overflow-y-auto custom-scrollbar">
            {/* Mobile: Product Cards */}
            <div className="md:hidden flex flex-col gap-3 pr-2">
              {productosPaginados.length === 0 ? (
                <div className="text-center py-14 text-slate-400 font-bold text-sm">
                  No se encontraron productos
                </div>
              ) : (
                productosPaginados.map((p) => (
                  <ProductoCard
                    key={p.id}
                    producto={p}
                    destacarRojo={filtroStockBajo && p.stock_actual <= p.stock_minimo}
                    onClick={() => {
                      setProductoSeleccionado(p);
                    }}
                    onEdit={() => router.push("/farmacia-la-salud/inventario/editar/" + p.id)}
                    onDelete={() => handleEliminarProducto(p)}
                  />
                ))
              )}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto w-full pb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-5 py-3.5">Código</th>
                    <th className="px-5 py-3.5">Producto</th>
                    <th className="px-5 py-3.5">Ubicación</th>
                    <th className="px-5 py-3.5">Venc./Lote</th>
                    <th className="px-5 py-3.5">Proveedor</th>
                    <th className="px-5 py-3.5">Existencias</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Precio Venta</th>
                    <th className="px-5 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                  {productosPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-14 text-slate-400 font-bold">
                        No se encontraron productos
                      </td>
                    </tr>
                  ) : (
                    [...productosPaginados].sort((a, b) => a.stock_actual - b.stock_actual).reduce((acc: React.ReactNode[], p, index, array) => {
                      const isLowStock = p.stock_actual <= p.stock_minimo;
                      const isSelected = productoSeleccionado?.id === p.id;

                      const prevProduct = index > 0 ? array[index - 1] : null;
                      const prevWasLowStock = prevProduct ? prevProduct.stock_actual <= prevProduct.stock_minimo : true;

                      if (prevWasLowStock && !isLowStock && index > 0) {
                        acc.push(
                          <tr key={`separator-${p.id}`} className="bg-[#C1D1C5]/20 dark:bg-zinc-800/40 pointer-events-none">
                            <td colSpan={9} className="px-5 py-2 text-center text-[10px] font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]">
                              — Stock Normal —
                            </td>
                          </tr>
                        );
                      }

                      const isExpiringSoon = isProductoProximoAVencer(p.fecha_vencimiento);

                      acc.push(
                        <tr
                          key={p.id}
                          onClick={() => {
                            setProductoSeleccionado(isSelected ? null : p);
                          }}
                          className={cn(
                            "hover:bg-[#8DA78E]/10 dark:hover:bg-[#A3BEB0]/15 transition-all cursor-pointer",
                            isSelected && "bg-[#8DA78E]/20 dark:bg-[#8DA78E]/25",
                            isLowStock && !isExpiringSoon && "text-red-500 dark:text-red-400 animate-pulse bg-red-500/5 dark:bg-red-500/10",
                            isExpiringSoon && "bg-amber-500/10 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 animate-pulse"
                          )}
                        >
                          <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            {p.codigo || "Sin Código"}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            {p.nombre}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100/80 dark:bg-zinc-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800/80 shadow-2xs max-w-[150px]">
                              <Box className="size-3 text-[#8DA78E] shrink-0" />
                              <span className="truncate">{p.ubicacion || "Sin asignar"}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col">
                              {p.fecha_vencimiento ? (
                                <span className={cn("font-semibold", isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300")}>
                                  {new Date(p.fecha_vencimiento).toLocaleDateString("es-GT")}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                              {p.numero_lote && <span className="text-[10px] text-slate-500">Lote: {p.numero_lote}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-500 dark:text-slate-400">
                            {p.inv_proveedores?.nombre || p.inv_compras_detalles?.[0]?.inv_compras?.inv_proveedores?.nombre || "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn(
                              "font-semibold",
                              isLowStock ? "font-bold" : "text-slate-700 dark:text-slate-300"
                            )}>
                              {fmtNum(p.stock_actual)}
                            </span>
                            {isLowStock && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[9px] font-bold uppercase tracking-wide">
                                Stock Bajo
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              p.activo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            )}>
                              {p.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-[#8DA78E] dark:text-[#A3BEB0]">
                            {fmtQ(p.precio_base)}
                          </td>
                          <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => {
                                  setProductoSeleccionado(p);
                                  router.push("/farmacia-la-salud/inventario/editar/" + p.id);
                                }}
                                className="px-3 py-1.5 bg-[#C1D1C5]/30 hover:bg-[#8DA78E] text-[#525D53] hover:text-white dark:bg-[#A3BEB0]/20 dark:text-[#A3BEB0] dark:hover:bg-[#A3BEB0] dark:hover:text-zinc-900 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminarProducto(p)}
                                className="px-3 py-1.5 bg-red-400 hover:bg-red-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-[10px] uppercase"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                      return acc;
                    }, [])
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Barra de Paginación */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-[#C1D1C5]/40 dark:border-zinc-800 text-slate-600 dark:text-slate-400">
              <PageSizeSelect
                pageSize={pageSize}
                setPageSize={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                  setMostrarPageSizeDropdown(false);
                }}
              />
              <div className="flex justify-center w-full sm:w-auto">
                <Pagination
                  currentPage={activePage}
                  totalPages={totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Panel de detalle */}
        <AnimatePresence>
          {productoSeleccionado && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="hidden md:block absolute top-[-110px] right-0 h-[calc(100%+110px)] w-[750px] z-20"
            >
              <div className="h-fit max-h-full">
                <ProductoDetalle
                  producto={productoSeleccionado}
                  onClose={() => setProductoSeleccionado(null)}
                  onEditClick={() => router.push(`/farmacia-la-salud/inventario/editar/${productoSeleccionado.id}`)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de eliminación */}
        <ModalShell
          isOpen={!!showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          title="Eliminar producto"
          subtitle="Confirmación de inventario"
        >
          {showDeleteModal && (
            <ModalConfirmDelete
              title="¿Eliminar producto del inventario?"
              description="Confirma si deseas eliminar este registro del catálogo de productos."
              itemDetails={{
                nombre: showDeleteModal.nombre,
                codigo: showDeleteModal.codigo,
                stock: showDeleteModal.stock_actual,
                precio: showDeleteModal.precio_base,
                imagen: showDeleteModal.imagen_url,
                ubicacion: showDeleteModal.ubicacion,
              }}
              onConfirm={confirmDelete}
              onCancel={() => setShowDeleteModal(null)}
              loading={isDeleting}
            />
          )}
        </ModalShell>
      </div>
    </div>
  );
}
