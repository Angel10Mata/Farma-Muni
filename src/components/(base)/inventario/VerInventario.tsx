"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  ChevronDown,
  CalendarX,
  Box,
  Building2,
  X,
  FileText,
  BarChart3,
  MoreVertical,
  Pencil as PencilIcon,
  Ban,
  CircleCheck,
  FileDown,
} from "lucide-react";
import {
  Pencil as PencilNode,
  Plus as PlusNode,
  SquarePen as SquarePenNode,
  UserPlus,
} from "lucide";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { cn, fmtNum, fmtQ } from "@/lib/utils";
import {
  modulePillSwitchBtnClass,
  modulePillSwitchShellClass,
} from "@/components/ui/module-pill-switch";
import { useRouter } from "next/navigation";
import {
  useProductos,
  useLotes,
  useActivarProducto,
  useDesactivarProducto,
  useRegistrarBajaVencido,
} from "./lib/hooks";
import type { LoteInventario } from "./lib/zod";
import {
  etiquetaEstadoVencimiento,
  isProductoProximoAVencer,
  isProductoVencido,
  nombreComercialSiDistinto,
  precioVentaEfectivoLote,
  productoCoincideBusquedaInventario,
  tituloProductoFarmacia,
} from "./lib/helpers";
import {
  descargarReporteGestion,
  descargarReporteVencimientos,
  type ProductoInventarioReporte,
} from "./lib/reportes-pdf";
import { exportarPDF } from "./utils";
import {
  ModalConfirmDelete,
  ModalShell,
  modalActionMessage,
  toast,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { inventarioPageShellClass, moduleControlsShellClass } from "@/lib/module-layout";
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
// Tipos de la pantalla
interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  nombre_generico?: string;
  concentracion?: string;
  forma_farmaceutica?: string;
  presentacion?: string;
  unidad_venta?: string;
  requiere_receta?: boolean;
  descripcion: string;
  precio_base: number;
  precio_venta?: number;
  precio_costo?: number | null;
  laboratorio?: string | null;
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
  inv_proveedores?: {
    nombre: string;
  } | null;
  producto_maestro_id?: string;
}

function productoParaReporte(p: Producto): ProductoInventarioReporte {
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    nombre_generico: p.nombre_generico,
    concentracion: p.concentracion,
    forma_farmaceutica: p.forma_farmaceutica,
    presentacion: p.presentacion,
    requiere_receta: p.requiere_receta,
    stock_actual: p.stock_actual,
    stock_minimo: p.stock_minimo,
    precio_base: p.precio_base,
    precio_venta: p.precio_venta,
    precio_costo: p.precio_costo,
    laboratorio: p.laboratorio,
    proveedor_nombre: p.inv_proveedores?.nombre ?? null,
    activo: p.activo,
    fecha_vencimiento: p.fecha_vencimiento,
    numero_lote: p.numero_lote,
    ubicacion: p.ubicacion,
  };
}

function ProductoFarmaciaTitulo({
  producto,
  className,
  tituloClassName,
}: {
  producto: Producto;
  className?: string;
  tituloClassName?: string;
}) {
  const comercial = nombreComercialSiDistinto(producto);
  return (
    <div className={className}>
      <p className={cn("font-semibold leading-snug", tituloClassName)}>
        {tituloProductoFarmacia(producto)}
      </p>
      {comercial ? (
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          {comercial}
        </p>
      ) : null}
      {producto.requiere_receta ? (
        <span
          className="mt-1 inline-flex rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800 dark:text-amber-300"
        >
          Requiere receta
        </span>
      ) : null}
    </div>
  );
}

function idProductoCatalogo(producto: Producto) {
  return producto.producto_maestro_id ?? producto.id;
}

function mapLoteAFila(lote: LoteInventario): Producto {
  const raw = lote.inv_productos;
  const p = Array.isArray(raw) ? raw[0] : raw;
  const precioBase = p?.precio_base ?? 0;
  const precioVenta = precioVentaEfectivoLote(lote.precio_venta, precioBase);
  return {
    id: lote.id,
    producto_maestro_id: lote.producto_id,
    codigo: lote.codigo_barras,
    nombre: p?.nombre ?? "—",
    nombre_generico: p?.nombre_generico ?? "",
    concentracion: p?.concentracion ?? "",
    forma_farmaceutica: p?.forma_farmaceutica ?? "otro",
    presentacion: p?.presentacion ?? "",
    unidad_venta: p?.unidad_venta ?? "unidad",
    requiere_receta: p?.requiere_receta ?? false,
    descripcion: "",
    precio_base: precioBase,
    precio_venta: precioVenta,
    precio_costo: lote.precio_costo,
    laboratorio: lote.laboratorio ?? null,
    stock_actual: Number(lote.cantidad_actual) || 0,
    stock_minimo: p?.stock_minimo ?? 0,
    activo: lote.activo && (p?.activo ?? true),
    fecha_vencimiento: lote.fecha_vencimiento ?? null,
    numero_lote: lote.numero_lote ?? null,
    ubicacion: lote.ubicacion ?? null,
    inv_proveedores: lote.inv_proveedores ?? null,
  };
}

function lotesPorProductoId(lotes: LoteInventario[], productoId: string): LoteInventario[] {
  return lotes
    .filter((l) => l.producto_id === productoId && l.activo)
    .sort((a, b) => (a.fecha_vencimiento ?? "").localeCompare(b.fecha_vencimiento ?? ""));
}

function mapUbicacionesPorProducto(lotes: LoteInventario[]): Map<string, string> {
  const porProducto = new Map<string, Set<string>>();
  for (const lote of lotes) {
    if (!lote.activo) continue;
    const ubi = lote.ubicacion?.trim();
    if (!ubi) continue;
    const set = porProducto.get(lote.producto_id) ?? new Set<string>();
    set.add(ubi);
    porProducto.set(lote.producto_id, set);
  }
  const out = new Map<string, string>();
  for (const [productoId, set] of porProducto) {
    out.set(
      productoId,
      Array.from(set).sort((a, b) => a.localeCompare(b, "es")).join(", "),
    );
  }
  return out;
}

function ProductoAccionesMenu({
  activo,
  showBaja,
  onBaja,
  onEdit,
  onDesactivar,
  onActivar,
}: {
  activo: boolean;
  showBaja: boolean;
  onBaja: () => void;
  onEdit: () => void;
  onDesactivar: () => void;
  onActivar: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Acciones del producto"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[200] min-w-[148px] rounded-xl border border-zinc-200 bg-white p-1 opacity-100 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
      >
        {showBaja ? (
          <DropdownMenuItem
            className="cursor-pointer rounded-lg text-xs font-bold text-rose-600 focus:bg-rose-50 focus:text-rose-600 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-600 dark:text-rose-400 dark:focus:bg-rose-950/40 dark:focus:text-rose-400 dark:data-[highlighted]:bg-rose-950/40 dark:data-[highlighted]:text-rose-400 [&_svg]:text-current"
            onSelect={() => onBaja()}
          >
            <CalendarX className="size-3.5" />
            Baja por vencimiento
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="cursor-pointer rounded-lg text-xs font-bold text-zinc-700 focus:bg-zinc-100 focus:text-zinc-700 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-700 dark:text-zinc-200 dark:focus:bg-zinc-800 dark:focus:text-zinc-200 dark:data-[highlighted]:bg-zinc-800 dark:data-[highlighted]:text-zinc-200 [&_svg]:text-current"
          onSelect={() => onEdit()}
        >
          <PencilIcon className="size-3.5" />
          Editar
        </DropdownMenuItem>
        {activo ? (
          <DropdownMenuItem
            className="cursor-pointer rounded-lg text-xs font-bold text-amber-700 focus:bg-amber-50 focus:text-amber-700 data-[highlighted]:bg-amber-50 data-[highlighted]:text-amber-700 dark:text-amber-400 dark:focus:bg-amber-950/40 dark:focus:text-amber-400 dark:data-[highlighted]:bg-amber-950/40 dark:data-[highlighted]:text-amber-400 [&_svg]:text-current"
            onSelect={() => onDesactivar()}
          >
            <Ban className="size-3.5" />
            Desactivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer rounded-lg text-xs font-bold text-[#2E9E77] focus:bg-emerald-50 focus:text-[#2E9E77] data-[highlighted]:bg-emerald-50 data-[highlighted]:text-[#2E9E77] dark:text-emerald-400 dark:focus:bg-emerald-950/40 dark:focus:text-emerald-400 dark:data-[highlighted]:bg-emerald-950/40 dark:data-[highlighted]:text-emerald-400 [&_svg]:text-current"
            onSelect={() => onActivar()}
          >
            <CircleCheck className="size-3.5" />
            Activar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Tarjeta de producto
function ProductoCard({
  producto,
  onClick,
  onEdit,
  onDesactivar,
  onActivar,
  onBaja,
  destacarStock,
  destacarProximo,
  destacarVencido,
}: {
  producto: Producto;
  onClick: () => void;
  onEdit: () => void;
  onDesactivar: () => void;
  onActivar: () => void;
  onBaja?: () => void;
  destacarStock?: boolean;
  destacarProximo?: boolean;
  destacarVencido?: boolean;
}) {
  const isLowStock = producto.stock_actual <= producto.stock_minimo;
  const imagenes = [producto.imagen_url, producto.imagen_url_2, producto.imagen_url_3].filter(Boolean);
  const isExpiringSoon = isProductoProximoAVencer(producto.fecha_vencimiento);
  const isVencido =
    isProductoVencido(producto.fecha_vencimiento) && producto.stock_actual > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className={cn(
        "group relative border rounded-xl p-2.5 cursor-pointer hover:border-[#8DA78E] dark:hover:border-[#A3BEB0]/60 flex gap-3 items-center min-h-[96px]",
        destacarVencido && isVencido
          ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800/50"
          : destacarProximo && isExpiringSoon
            ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
            : destacarStock && isLowStock
              ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/30"
              : "bg-[#F5F5F1] dark:bg-[#525D53]/10 border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20",
      )}
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
            <div className="min-w-0 flex-1">
              <ProductoFarmaciaTitulo
                producto={producto}
                tituloClassName="font-black text-xs text-slate-900 dark:text-white truncate uppercase"
              />
            </div>
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
            <p
              className={cn(
                "text-[9px] font-bold mt-0.5",
                destacarVencido && isVencido
                  ? "text-rose-600 animate-pulse"
                  : destacarProximo && isExpiringSoon
                    ? "text-amber-500 animate-pulse"
                    : "text-slate-500",
              )}
            >
              {destacarVencido && isVencido ? "VENCIDO" : "VENCE"}:{" "}
              {new Date(producto.fecha_vencimiento).toLocaleDateString("es-GT")}
            </p>
          )}
          {producto.laboratorio ? (
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase truncate">
              Lab: {producto.laboratorio}
            </p>
          ) : null}
          {producto.inv_proveedores?.nombre ? (
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase truncate">
              Prov: {producto.inv_proveedores.nombre}
            </p>
          ) : null}
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
              <span
                className={cn(
                  "font-black ml-0.5",
                  destacarStock && isLowStock
                    ? "text-red-500 animate-pulse"
                    : "text-slate-700 dark:text-slate-300",
                )}
              >
                {fmtNum(producto.stock_actual)}
              </span>
            </div>
            <div>
              <span className="text-[#525D53]/60 dark:text-[#A3BEB0]/50 font-bold uppercase">Precio:</span>
              <span className="font-black ml-0.5 text-[#8DA78E] dark:text-[#A3BEB0]">
                {fmtQ(producto.precio_venta ?? producto.precio_base)}
              </span>
            </div>
          </div>

          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <ProductoAccionesMenu
              activo={producto.activo}
              showBaja={isVencido && !!onBaja}
              onBaja={() => onBaja?.()}
              onEdit={onEdit}
              onDesactivar={onDesactivar}
              onActivar={onActivar}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Panel de detalle
function ProductoDetalle({
  producto,
  lotesProducto,
  onClose,
  onEditClick,
}: {
  producto: Producto;
  lotesProducto: LoteInventario[];
  onClose: () => void;
  onEditClick: () => void;
}) {
  const isLowStock = producto.stock_actual <= producto.stock_minimo;
  const detalleLabelClass =
    "text-[10px] font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]/70";
  const detalleFieldClass =
    "rounded-xl border border-[#C1D1C5]/30 bg-zinc-50/80 px-3 py-2.5 text-sm text-slate-800 dark:border-[#A3BEB0]/15 dark:bg-zinc-900/40 dark:text-slate-100";
  const detalleMetricClass =
    "flex min-h-[2.75rem] items-center justify-between gap-2 rounded-xl border border-[#C1D1C5]/30 bg-zinc-50/80 px-3 py-2 dark:border-[#A3BEB0]/15 dark:bg-[#525D53]/10";

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-left animate-fade-in dark:bg-zinc-800"
    >
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 md:px-8 md:py-7">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200/90 pb-5 dark:border-zinc-700/80">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#8DA78E]/25 bg-[#8DA78E]/10">
              <Package className="size-5 text-[#8DA78E] dark:text-[#A3BEB0]" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className={detalleLabelClass}>Producto</p>
              <ProductoFarmaciaTitulo
                producto={producto}
                tituloClassName="text-xl font-black text-slate-900 dark:text-white md:text-2xl"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-2 text-xl font-bold leading-none text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
              <div className="space-y-2">
                <h4 className={detalleLabelClass}>Código de barras</h4>
                <p className={cn(detalleFieldClass, "font-mono text-sm uppercase tracking-wide")}>
                  {producto.codigo || "Sin código"}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className={detalleLabelClass}>Estado</h4>
                <div className={cn(detalleFieldClass, "flex items-center justify-center font-bold uppercase")}>
                  <span className={producto.activo ? "text-[#8DA78E] dark:text-[#A3BEB0]" : "text-red-500"}>
                    {producto.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className={detalleLabelClass}>Descripción</h4>
              <p className={cn(detalleFieldClass, "text-sm leading-relaxed text-slate-600 dark:text-slate-300")}>
                {producto.descripcion || "Sin descripción registrada para este producto."}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className={detalleLabelClass}>Inventario y costos</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={detalleMetricClass}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#525D53] dark:text-[#A3BEB0]/80">
                    Existencias
                  </span>
                  <span
                    className={cn(
                      "text-base font-black tabular-nums",
                      isLowStock ? "text-red-500 animate-pulse" : "text-[#8DA78E] dark:text-[#A3BEB0]",
                    )}
                  >
                    {fmtNum(producto.stock_actual)}
                  </span>
                </div>
                <div className={detalleMetricClass}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#525D53] dark:text-[#A3BEB0]/80">
                    Mínimo
                  </span>
                  <span className="text-base font-black tabular-nums text-[#8DA78E] dark:text-[#A3BEB0]">
                    {fmtNum(producto.stock_minimo)}
                  </span>
                </div>
                <div className={detalleMetricClass}>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#525D53] dark:text-[#A3BEB0]/80">
                    P. sugerido
                  </span>
                  <span className="text-base font-black tabular-nums text-[#8DA78E] dark:text-[#A3BEB0]">
                    {fmtQ(producto.precio_base)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <h4 className={detalleLabelClass}>Ubicación</h4>
                  <p
                    className={cn(
                      detalleFieldClass,
                      "flex items-center gap-2 truncate text-sm font-bold text-[#8DA78E] dark:text-[#A3BEB0]",
                    )}
                  >
                    <Box className="size-4 shrink-0 opacity-80" />
                    {producto.ubicacion || "Sin asignar"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className={detalleLabelClass}>Lotes y vencimiento</h4>
                <div
                  className={cn(
                    detalleFieldClass,
                    "min-h-[2.75rem] space-y-0 p-0 overflow-hidden",
                  )}
                >
                  {lotesProducto.length === 0 ? (
                    <p className="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                      Sin lotes registrados para este producto.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#C1D1C5]/25 dark:divide-[#A3BEB0]/15">
                      {lotesProducto.map((lote) => {
                        const vencido =
                          isProductoVencido(lote.fecha_vencimiento) &&
                          (Number(lote.cantidad_actual) || 0) > 0;
                        const proximo = isProductoProximoAVencer(lote.fecha_vencimiento);
                        const estadoVenc = etiquetaEstadoVencimiento(lote.fecha_vencimiento);
                        const fechaTxt = lote.fecha_vencimiento
                          ? new Date(lote.fecha_vencimiento).toLocaleDateString("es-GT")
                          : "Sin fecha";
                        return (
                          <li
                            key={lote.id}
                            className={cn(
                              "flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
                              !lote.activo && "opacity-60",
                            )}
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
                                Lote {lote.numero_lote || "—"}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {lote.laboratorio ? `Lab: ${lote.laboratorio}` : "Sin laboratorio"}
                                {lote.inv_proveedores?.nombre
                                  ? ` · Prov: ${lote.inv_proveedores.nombre}`
                                  : ""}
                              </p>
                              <p className="text-[10px] font-bold text-[#8DA78E] dark:text-[#A3BEB0]">
                                Venta {fmtQ(precioVentaEfectivoLote(lote.precio_venta, producto.precio_base))}
                                {" · "}
                                Costo {fmtQ(Number(lote.precio_costo) || 0)}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-[#525D53]/80 dark:text-[#A3BEB0]/70">
                                {lote.activo ? "Activo" : "Inactivo"}
                                {lote.ubicacion ? ` · ${lote.ubicacion}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                              <span
                                className={cn(
                                  "text-xs font-bold tabular-nums",
                                  vencido
                                    ? "text-red-500"
                                    : proximo
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-[#8DA78E] dark:text-[#A3BEB0]",
                                )}
                              >
                                Vence {fechaTxt}
                              </span>
                              <span
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide",
                                  vencido
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : proximo
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                      : "bg-[#8DA78E]/10 text-[#525D53] dark:text-[#A3BEB0]",
                                )}
                              >
                                {estadoVenc}
                              </span>
                              <span className="text-xs font-black tabular-nums text-slate-600 dark:text-slate-300">
                                {fmtNum(Number(lote.cantidad_actual) || 0)} u.
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className={detalleLabelClass}>Galería</h4>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {[producto.imagen_url, producto.imagen_url_2, producto.imagen_url_3].map((imgUrl, idx) => {
                const publicUrl = imgUrl
                  ? createClient().storage.from("Imagenes_Farmacia").getPublicUrl(imgUrl).data.publicUrl
                  : null;
                return (
                  <div
                    key={idx}
                    className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl border border-[#C1D1C5]/35 bg-white dark:border-[#A3BEB0]/20 dark:bg-zinc-900/60 lg:aspect-[5/4]"
                  >
                    {publicUrl ? (
                      <img
                        src={publicUrl}
                        alt={`${producto.nombre} - img ${idx + 1}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Package className="size-6 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-3 border-t border-zinc-200 bg-[#F5F5F1] px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:px-8">
        <SigetActionButton
          label="Editar"
          accentColor={sigetAccent.editar}
          morphFrom={PencilNode}
          morphTo={SquarePenNode}
          onClick={onEditClick}
          className="w-auto shrink-0 flex-1 sm:flex-initial"
        />
      </div>
    </motion.div>
  );
}

// Filtro por ubicación
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
            className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl z-[200] opacity-100 p-2 max-h-72 overflow-y-auto custom-scrollbar"
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

function inventarioTabUnderlineClass(active: boolean) {
  return cn(
    "flex-1 min-w-0 py-2 text-xs font-black uppercase tracking-wider text-center border-b-2 cursor-pointer text-[#8DA78E] dark:text-[#A3BEB0]",
    active ? "border-[#8DA78E] dark:border-[#A3BEB0]" : "border-transparent opacity-75 hover:opacity-100",
  );
}

// Pantalla de inventario
export function VerInventario() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  const [filtroProximoVencer, setFiltroProximoVencer] = useState(false);
  const [filtroVencidos, setFiltroVencidos] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("activos");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");
  const [vistaInventario, setVistaInventario] = useState<"lotes" | "catalogo">("catalogo");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  const { data: productosCatalogo = [], isLoading: isLoadingCatalogo, refetch: refetchProductos } = useProductos();
  const { data: lotes = [], isLoading: isLoadingLotes, refetch: refetchLotes } = useLotes();

  const lotesProductoDetalle = useMemo(() => {
    if (!productoSeleccionado) return [];
    return lotesPorProductoId(
      lotes as LoteInventario[],
      idProductoCatalogo(productoSeleccionado),
    );
  }, [productoSeleccionado, lotes]);
  const ubicacionesPorProductoId = useMemo(
    () => mapUbicacionesPorProducto(lotes as LoteInventario[]),
    [lotes],
  );

  const productosCatalogoConUbicacion = useMemo(
    () =>
      productosCatalogo.map((p) => {
        const row = p as Producto;
        const idCat = row.id;
        return {
          ...row,
          ubicacion: ubicacionesPorProductoId.get(idCat) ?? row.ubicacion ?? null,
        };
      }),
    [productosCatalogo, ubicacionesPorProductoId],
  );

  const isLoading = vistaInventario === "lotes" ? isLoadingLotes : isLoadingCatalogo;
  const productos =
    vistaInventario === "lotes"
      ? (lotes as LoteInventario[]).map(mapLoteAFila)
      : productosCatalogoConUbicacion;
  const { mutateAsync: desactivarProductoAsync, isPending: isDesactivando } =
    useDesactivarProducto();
  const { mutateAsync: activarProductoAsync } = useActivarProducto();
  const { mutateAsync: registrarBajaAsync, isPending: isBajaPending } = useRegistrarBajaVencido();
  const [showDesactivarModal, setShowDesactivarModal] = useState<Producto | null>(null);
  const [showBajaModal, setShowBajaModal] = useState<Producto | null>(null);
  const [mostrarBajoStock, setMostrarBajoStock] = useState(false);

  // Escáner de código de barras
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const lastKeyTime = useRef<number>(Date.now());

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [mostrarPageSizeDropdown, setMostrarPageSizeDropdown] = useState(false);
  const pageSizeDropdownRef = useRef<HTMLDivElement>(null);
  const [mostrarReportesDropdown, setMostrarReportesDropdown] = useState(false);
  const reportesDropdownRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pageSizeDropdownRef.current && !pageSizeDropdownRef.current.contains(event.target as Node)) {
        setMostrarPageSizeDropdown(false);
      }
      if (reportesDropdownRef.current && !reportesDropdownRef.current.contains(event.target as Node)) {
        setMostrarReportesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
  }, []);

  const resetFiltrosAlerta = (activo: "stock" | "proximo" | "vencidos" | null) => {
    setFiltroStockBajo(activo === "stock");
    setFiltroProximoVencer(activo === "proximo");
    setFiltroVencidos(activo === "vencidos");
    setCurrentPage(1);
  };

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
          const found = productos.find((p) => p.codigo === scannedCode);
          if (found) {
            setBusqueda(scannedCode);
            setProductoSeleccionado(found);
            // Si estaba en otra página o pestaña, volvemos a la 1
            setCurrentPage(1);
          } else {
            toast.warn(`Código no registrado: ${scannedCode}`);
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
    const matchesSearch = productoCoincideBusquedaInventario(p, busqueda);

    const matchesStock = !filtroStockBajo || p.stock_actual <= p.stock_minimo;

    let matchesExpiring = true;
    if (filtroProximoVencer) {
      matchesExpiring = isProductoProximoAVencer(p.fecha_vencimiento);
    }

    let matchesVencidos = true;
    if (filtroVencidos) {
      matchesVencidos =
        isProductoVencido(p.fecha_vencimiento) && p.stock_actual > 0;
    }

    const matchesEstado =
      filtroEstado === "todos" ? true :
        filtroEstado === "activos" ? p.activo :
          !p.activo;

    const matchesUbicacion = !filtroUbicacion || (p.ubicacion || "Sin asignar") === filtroUbicacion;

    return (
      matchesSearch &&
      matchesStock &&
      matchesEstado &&
      matchesExpiring &&
      matchesVencidos &&
      matchesUbicacion
    );
  }).sort((a, b) => {
    const aLow = a.stock_actual <= a.stock_minimo ? 0 : 1;
    const bLow = b.stock_actual <= b.stock_minimo ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    return tituloProductoFarmacia(a).localeCompare(tituloProductoFarmacia(b), "es");
  });

  const totalItems = productosFiltrados.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const productosPaginados = productosFiltrados.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize
  );

  const inventarioTableColumnCount = vistaInventario === "catalogo" ? 6 : 10;

  const handleNuevoProducto = () => {
    router.push("/farmamuni/inventario/nuevo");
  };

  const handleDesactivarProducto = (producto: Producto) => {
    setShowDesactivarModal(producto);
  };

  const confirmDesactivar = async () => {
    if (!showDesactivarModal) return;
    try {
      await desactivarProductoAsync(showDesactivarModal.id);
      toast.success(`${showDesactivarModal.nombre} fue desactivado.`);
      if (productoSeleccionado?.id === showDesactivarModal.id) setProductoSeleccionado(null);
      setShowDesactivarModal(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(message, "No se pudo desactivar el producto."));
    }
  };

  const handleActivarProducto = async (producto: Producto) => {
    try {
      await activarProductoAsync(producto.id);
      toast.success(`${producto.nombre} está activo nuevamente.`);
      if (productoSeleccionado?.id === producto.id) {
        setProductoSeleccionado({ ...producto, activo: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(message, "No se pudo activar el producto."));
    }
  };

  const handleBajaVencido = (producto: Producto) => {
    setShowBajaModal(producto);
  };

  const confirmBajaVencido = async () => {
    if (!showBajaModal) return;
    try {
      if (vistaInventario !== "lotes") {
        toast.error("La baja por vencimiento se registra desde la vista Por lotes.");
        return;
      }
      const res = await registrarBajaAsync({ lote_id: showBajaModal.id });
      toast.success(
        `Baja registrada: ${fmtNum(res.unidades)} unidades de ${showBajaModal.nombre}.`,
      );
      if (productoSeleccionado?.id === showBajaModal.id) {
        setProductoSeleccionado(null);
      }
      setShowBajaModal(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(message, "No se pudo registrar la baja."));
    }
  };

  const handleReporteVencimientos = () => {
    try {
      descargarReporteVencimientos(productosFiltrados.map(productoParaReporte));
      toast.success("Reporte de vencimientos descargado.");
      setMostrarReportesDropdown(false);
    } catch {
      toast.error("No se pudo generar el reporte de vencimientos.");
    }
  };

  const handleReporteGestion = () => {
    try {
      descargarReporteGestion(productosFiltrados.map(productoParaReporte));
      toast.success("Resumen de gestión descargado.");
      setMostrarReportesDropdown(false);
    } catch {
      toast.error("No se pudo generar el resumen de gestión.");
    }
  };



  // Exportar lista a PDF
  const handleExportarPDF = () => {
    try {
      exportarPDF(
        productosFiltrados.map(productoParaReporte),
        vistaInventario === "lotes",
      );
      toast.success("Reporte de inventario descargado correctamente.");
      setMostrarReportesDropdown(false);
    } catch {
      toast.error("No se pudo generar el archivo PDF.");
    }
  };

  return (
    <div className={inventarioPageShellClass}>
      <div className="flex shrink-0 flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-0.5">
        <div className="flex items-center gap-3 min-w-0">
          <ModuleHeaderBackButton />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">
              Módulo
            </p>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none mt-1 truncate">
              Inventario
            </h1>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div
            className={cn(modulePillSwitchShellClass, "w-full max-w-md sm:max-w-[14rem]")}
            role="tablist"
            aria-label="Vista de inventario"
          >
            <button
              type="button"
              role="tab"
              aria-selected={vistaInventario === "lotes"}
              onClick={() => {
                setVistaInventario("lotes");
                setProductoSeleccionado(null);
                setCurrentPage(1);
              }}
              className={modulePillSwitchBtnClass(vistaInventario === "lotes")}
            >
              Egresos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vistaInventario === "catalogo"}
              onClick={() => {
                setVistaInventario("catalogo");
                setProductoSeleccionado(null);
                setFiltroProximoVencer(false);
                setCurrentPage(1);
              }}
              className={modulePillSwitchBtnClass(vistaInventario === "catalogo")}
            >
              Catálogo
            </button>
          </div>
          <SigetActionButton
            label="Crear"
            accentColor={sigetAccent.crear}
            morphFrom={PlusNode}
            morphTo={UserPlus}
            onClick={handleNuevoProducto}
            className="w-full sm:w-auto shrink-0"
          />
        </div>
      </div>

      <section
        className={cn(
          moduleControlsShellClass,
          "relative z-30 shrink-0 overflow-visible p-3 md:p-4",
        )}
      >
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8DA78E]/70" />
            <input
              type="text"
              placeholder="Buscar por nombre, genérico o código de barras..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(moduleTableSearchClass, "py-2")}
            />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              {ubicacionesUnicas.length > 0 ? (
                <LocationFilterDropdown
                  selectedLocation={filtroUbicacion}
                  onSelectLocation={(loc) => {
                    setFiltroUbicacion(loc);
                    setCurrentPage(1);
                  }}
                  locations={ubicacionesUnicas}
                  products={productos}
                />
              ) : null}
              <div className="flex w-full min-w-0 max-w-lg border-b border-[#C1D1C5]/30 dark:border-[#A3BEB0]/10 select-none">
                <button
                  type="button"
                  onClick={() => resetFiltrosAlerta(filtroStockBajo ? null : "stock")}
                  className={inventarioTabUnderlineClass(filtroStockBajo)}
                >
                  Stock bajo
                </button>
                {vistaInventario === "lotes" ? (
                  <button
                    type="button"
                    onClick={() => resetFiltrosAlerta(filtroProximoVencer ? null : "proximo")}
                    className={inventarioTabUnderlineClass(filtroProximoVencer)}
                  >
                    Vencimiento
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => resetFiltrosAlerta(filtroVencidos ? null : "vencidos")}
                  className={inventarioTabUnderlineClass(filtroVencidos)}
                >
                  Vencidos
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <div
                className={cn(modulePillSwitchShellClass, "w-full max-w-[14rem] sm:w-auto")}
                role="tablist"
                aria-label="Estado del producto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === "activos"}
                  onClick={() => {
                    setFiltroEstado("activos");
                    setCurrentPage(1);
                  }}
                  className={modulePillSwitchBtnClass(filtroEstado === "activos")}
                >
                  Activos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === "inactivos"}
                  onClick={() => {
                    setFiltroEstado("inactivos");
                    setCurrentPage(1);
                  }}
                  className={modulePillSwitchBtnClass(filtroEstado === "inactivos")}
                >
                  Inactivos
                </button>
              </div>
              <div
                className={cn("relative", mostrarReportesDropdown && "z-[250]")}
                ref={reportesDropdownRef}
              >
                <button
                  type="button"
                  onClick={() => setMostrarReportesDropdown((v) => !v)}
                  className={cn(
                    "justify-center px-3 py-2 rounded-xl border text-[11px] md:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                    mostrarReportesDropdown
                      ? "border-[#8DA78E] bg-[#8DA78E]/15 text-[#525D53] dark:text-[#A3BEB0]"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800",
                  )}
                >
                  <BarChart3 className="size-3.5 shrink-0" />
                  Informe
                  <ChevronDown
                    className={cn(
                      "size-3 shrink-0 transition-transform duration-200",
                      mostrarReportesDropdown && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {mostrarReportesDropdown ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-[250] mt-2 flex min-w-[240px] flex-col gap-0.5 rounded-2xl border border-slate-200/80 bg-white p-2 opacity-100 shadow-xl dark:border-slate-800/80 dark:bg-zinc-900"
                    >
                      <div className="mb-1 border-b border-slate-100 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800/80 dark:text-slate-500">
                        Reportes PDF
                      </div>
                      <button
                        type="button"
                        onClick={handleReporteVencimientos}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FileText className="size-3.5 shrink-0 text-amber-600" />
                        PDF vencimientos
                      </button>
                      <button
                        type="button"
                        onClick={handleReporteGestion}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <BarChart3 className="size-3.5 shrink-0 text-[#8DA78E]" />
                        PDF gestión
                      </button>
                      <button
                        type="button"
                        onClick={handleExportarPDF}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <FileDown className="size-3.5 shrink-0 text-emerald-600" />
                        Exportar
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de productos + detalle */}
      <div className="relative flex flex-col gap-3">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-50 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 rounded-full border-2 border-[#8DA78E]/30 border-t-[#8DA78E] animate-spin" />
              <span className="text-xs font-bold text-slate-500">Cargando base de datos...</span>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className={cn(moduleTableShellClass, "relative flex-none overflow-visible p-3 md:p-4")}>
          <div className="flex w-full flex-col gap-3">
            {/* Mobile: Product Cards */}
            <div className="md:hidden flex flex-col gap-3 pr-2">
              {productosPaginados.length === 0 ? (
                <div className={cn(moduleTableEmptyClass, "text-sm")}>
                  No se encontraron productos
                </div>
              ) : (
                productosPaginados.map((p) => (
                  <ProductoCard
                    key={p.id}
                    producto={p}
                    destacarStock={filtroStockBajo && p.stock_actual <= p.stock_minimo}
                    destacarProximo={
                      filtroProximoVencer && isProductoProximoAVencer(p.fecha_vencimiento)
                    }
                    destacarVencido={
                      filtroVencidos &&
                      isProductoVencido(p.fecha_vencimiento) &&
                      p.stock_actual > 0
                    }
                    onClick={() => {
                      setProductoSeleccionado(p);
                    }}
                    onEdit={() => {
                      setProductoSeleccionado(null);
                      router.push("/farmamuni/inventario/editar/" + idProductoCatalogo(p));
                    }}
                    onDesactivar={() => handleDesactivarProducto({ ...p, id: idProductoCatalogo(p) })}
                    onActivar={() => handleActivarProducto(p)}
                    onBaja={() => handleBajaVencido(p)}
                  />
                ))
              )}
            </div>

            {/* Desktop: Table */}
            <div className={cn(moduleTableDesktopWrapClass, "md:block pb-4")}>
              <div className={moduleTableDesktopScrollClass}>
              <table className={moduleTableClass}>
                <thead>
                  <tr className={moduleTableHeadRowClass}>
                    {vistaInventario === "lotes" ? (
                      <th className={moduleTableHeadCellClass}>Código</th>
                    ) : null}
                    <th className={moduleTableHeadCellClass}>Producto</th>
                    {vistaInventario === "lotes" ? (
                      <>
                        <th className={moduleTableHeadCellClass}>Laboratorio</th>
                        <th className={moduleTableHeadCellClass}>Proveedor</th>
                        <th className={cn(moduleTableHeadCellClass, "text-right")}>P. venta</th>
                        <th className={cn(moduleTableHeadCellClass, "text-right")}>Costo</th>
                        <th className={moduleTableHeadCellClass}>Venc./Lote</th>
                      </>
                    ) : null}
                    <th className={moduleTableHeadCellClass}>Ubicación</th>
                    <th className={moduleTableHeadCellClass}>Existencias</th>
                    <th className={moduleTableHeadCellClass}>Estado</th>
                    {vistaInventario === "catalogo" ? (
                      <th className={cn(moduleTableHeadCellClass, "text-right")}>P. sugerido</th>
                    ) : null}
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Acciones</th>
                  </tr>
                </thead>
                <tbody className={moduleTableBodyClass}>
                  {productosPaginados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={inventarioTableColumnCount}
                        className={moduleTableEmptyCellClass}
                      >
                        No se encontraron productos
                      </td>
                    </tr>
                  ) : (
                    [...productosPaginados].sort((a, b) => a.stock_actual - b.stock_actual).reduce((acc: React.ReactNode[], p, index, array) => {
                      const isLowStock = p.stock_actual <= p.stock_minimo;
                      const isSelected = productoSeleccionado?.id === p.id;

                      const prevProduct = index > 0 ? array[index - 1] : null;
                      const prevWasLowStock = prevProduct ? prevProduct.stock_actual <= prevProduct.stock_minimo : true;

                      if (filtroStockBajo && prevWasLowStock && !isLowStock && index > 0) {
                        acc.push(
                          <tr key={`separator-${p.id}`} className="bg-[#C1D1C5]/20 dark:bg-zinc-800/40 pointer-events-none">
                            <td
                              colSpan={inventarioTableColumnCount}
                              className="px-5 py-2 text-center text-[10px] font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]"
                            >
                              — Stock Normal —
                            </td>
                          </tr>
                        );
                      }

                      const isExpiringSoon = isProductoProximoAVencer(p.fecha_vencimiento);
                      const isVencido =
                        isProductoVencido(p.fecha_vencimiento) && p.stock_actual > 0;
                      const resaltarVencido = filtroVencidos && isVencido;
                      const resaltarProximo =
                        filtroProximoVencer && isExpiringSoon && !resaltarVencido;
                      const resaltarStock =
                        filtroStockBajo && isLowStock && !resaltarVencido && !resaltarProximo;

                      acc.push(
                        <tr
                          key={p.id}
                          onClick={() => {
                            setProductoSeleccionado(isSelected ? null : p);
                          }}
                          className={cn(
                            "hover:bg-[#8DA78E]/10 dark:hover:bg-[#A3BEB0]/15 transition-all cursor-pointer",
                            isSelected && "bg-[#8DA78E]/20 dark:bg-[#8DA78E]/25",
                            resaltarVencido &&
                              "bg-rose-500/10 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 animate-pulse",
                            resaltarStock &&
                              "text-red-500 dark:text-red-400 animate-pulse bg-red-500/5 dark:bg-red-500/10",
                            resaltarProximo &&
                              "bg-amber-500/10 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 animate-pulse",
                          )}
                        >
                          {vistaInventario === "lotes" ? (
                            <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                              {p.codigo || "Sin Código"}
                            </td>
                          ) : null}
                          <td className="px-5 py-3.5 min-w-[200px]">
                            <ProductoFarmaciaTitulo producto={p} />
                          </td>
                          {vistaInventario === "lotes" ? (
                            <>
                              <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300 max-w-[120px] truncate">
                                {p.laboratorio || "—"}
                              </td>
                              <td className="px-5 py-3.5 text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[130px] truncate">
                                {p.inv_proveedores?.nombre || "—"}
                              </td>
                              <td className="px-5 py-3.5 text-right font-black text-[#8DA78E] dark:text-[#A3BEB0]">
                                {fmtQ(p.precio_venta ?? p.precio_base)}
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                                {fmtQ(Number(p.precio_costo) || 0)}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col">
                                  {p.fecha_vencimiento ? (
                                    <span
                                      className={cn(
                                        "font-semibold",
                                        resaltarVencido
                                          ? "text-rose-600 dark:text-rose-400"
                                          : resaltarProximo
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-slate-700 dark:text-slate-300",
                                      )}
                                    >
                                      {new Date(p.fecha_vencimiento).toLocaleDateString("es-GT")}
                                      {resaltarVencido ? " · Vencido" : ""}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                  {p.numero_lote ? (
                                    <span className="text-[10px] text-slate-500">Lote: {p.numero_lote}</span>
                                  ) : null}
                                </div>
                              </td>
                            </>
                          ) : null}
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100/80 dark:bg-zinc-900/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800/80 shadow-2xs max-w-[150px]">
                              <Box className="size-3 text-[#8DA78E] shrink-0" />
                              <span className="truncate">{p.ubicacion || "Sin asignar"}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={cn(
                                "font-semibold",
                                resaltarStock ? "font-bold text-red-500 dark:text-red-400" : "text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {fmtNum(p.stock_actual)}
                            </span>
                            {resaltarStock ? (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[9px] font-bold uppercase tracking-wide">
                                Stock Bajo
                              </span>
                            ) : null}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              p.activo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            )}>
                              {p.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          {vistaInventario === "catalogo" ? (
                            <td className="px-5 py-3.5 text-right font-black text-[#8DA78E] dark:text-[#A3BEB0]">
                              {fmtQ(p.precio_base)}
                            </td>
                          ) : null}
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <ProductoAccionesMenu
                                activo={p.activo}
                                showBaja={isVencido}
                                onBaja={() => handleBajaVencido(p)}
                                onEdit={() => {
                                  setProductoSeleccionado(null);
                                  router.push(
                                    "/farmamuni/inventario/editar/" + idProductoCatalogo(p),
                                  );
                                }}
                                onDesactivar={() =>
                                  handleDesactivarProducto({ ...p, id: idProductoCatalogo(p) })
                                }
                                onActivar={() => handleActivarProducto(p)}
                              />
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
          </div>

          {/* Barra de Paginación */}
          <ModuleTableFooter
            itemCount={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[15, 30, 45]}
            setPageSize={(size) => {
              setPageSize(size);
              setMostrarPageSizeDropdown(false);
            }}
            currentPage={activePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>

        <ModalShell
          isOpen={!!showDesactivarModal}
          onClose={() => setShowDesactivarModal(null)}
          title="Desactivar producto"
          subtitle="Confirmación de inventario"
        >
          {showDesactivarModal && (
            <ModalConfirmDelete
              intent="deactivate"
              title="¿Desactivar este producto?"
              description="El registro permanece en el catálogo. Solo deja de usarse en ventas hasta que lo reactives."
              confirmText="Desactivar"
              itemDetails={{
                nombre: showDesactivarModal.nombre,
                codigo: showDesactivarModal.codigo,
                stock: showDesactivarModal.stock_actual,
                precio: showDesactivarModal.precio_base,
                imagen: showDesactivarModal.imagen_url,
                ubicacion: showDesactivarModal.ubicacion,
              }}
              onConfirm={confirmDesactivar}
              onCancel={() => setShowDesactivarModal(null)}
              loading={isDesactivando}
            />
          )}
        </ModalShell>

        <ModalShell
          isOpen={!!showBajaModal}
          onClose={() => setShowBajaModal(null)}
          title="Baja por vencimiento"
          subtitle="Salida de inventario"
        >
          {showBajaModal ? (
            <ModalConfirmDelete
              title="¿Registrar baja de producto vencido?"
              description="Se pondrán las existencias en cero. Si hay costo registrado, se reflejará un egreso en finanzas."
              confirmText="Baja"
              itemDetails={{
                nombre: showBajaModal.nombre,
                codigo: showBajaModal.codigo,
                stock: showBajaModal.stock_actual,
                precio: showBajaModal.precio_base,
                imagen: showBajaModal.imagen_url,
                ubicacion: showBajaModal.ubicacion,
              }}
              onConfirm={confirmBajaVencido}
              onCancel={() => setShowBajaModal(null)}
              loading={isBajaPending}
            />
          ) : null}
        </ModalShell>
      </div>

      <AnimatePresence>
        {productoSeleccionado && (
          <>
            <motion.div
              key="inventario-detalle-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductoSeleccionado(null)}
              className="fixed inset-0 z-[100] hidden cursor-pointer bg-black/40 backdrop-blur-sm md:block"
            />
            <div className="pointer-events-none fixed inset-0 z-[101] hidden items-center justify-center p-4 sm:p-5 md:flex">
              <motion.div
                key="inventario-detalle-panel"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 280 }}
                className="pointer-events-auto flex h-[min(820px,calc(100dvh-var(--banner-height,0px)-2rem))] max-h-[calc(100dvh-var(--banner-height,0px)-2rem)] w-full min-w-[320px] max-w-[min(960px,96vw)] flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900"
              >
                <div className="h-full min-h-0">
                  <ProductoDetalle
                    producto={productoSeleccionado}
                    lotesProducto={lotesProductoDetalle}
                    onClose={() => setProductoSeleccionado(null)}
                    onEditClick={() => {
                      const id = idProductoCatalogo(productoSeleccionado);
                      setProductoSeleccionado(null);
                      router.push(`/farmamuni/inventario/editar/${id}`);
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
