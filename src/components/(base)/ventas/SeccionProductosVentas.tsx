"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Package, Check, ChevronDown, UserPlus, X, AlertTriangle, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtQ } from "@/lib/utils";
import { ComercialVenta, GenericoVenta, Cliente } from "./lib/zod";
import { useVentas } from "./ContextoVentas";
import { toast } from "@/components/ui/general-modal";
import { buscarLotePorCodigoBarras } from "./lib/actions";
import { etiquetaLaboratorioComercial } from "@/components/(base)/inventario/lib/helpers";
import {
  agruparComercialesVentaBusqueda,
  buscarGenericoPorId,
  etiquetaPrecioComercial,
  mensajeCreditoVencidoCliente,
} from "./lib/helpers";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { useUserContext } from "@/components/(base)/providers/UserProvider";

interface SeccionProductosVentasProps {
  genericos: GenericoVenta[];
  comerciales: ComercialVenta[];
  clientes: Cliente[];
}

export function SeccionProductosVentas({
  genericos,
  comerciales,
  clientes,
}: SeccionProductosVentasProps) {
  const ventas = useVentas();
  const { isDemoMode } = useDemoMode();
  const { realRole, simulatedRole } = useUserContext();
  const esAdminSesion =
    ["admin", "super"].includes(realRole) && simulatedRole === null;

  // Referencias y sugerencias de búsqueda
  const clienteDropdownRef = useRef<HTMLDivElement>(null);
  const prodDropdownRef = useRef<HTMLDivElement>(null);

  const sugerenciasClientes = clientes.filter((c) => {
    if (!ventas.clienteBusqueda || ventas.clienteBusqueda === "Consumidor Final") return false;
    const query = ventas.clienteBusqueda.toLowerCase();
    return (
      (c.nombre || "").toLowerCase().includes(query) ||
      (c.nit && c.nit.toLowerCase().includes(query))
    );
  });

  const gruposComerciales = useMemo(
    () => agruparComercialesVentaBusqueda(comerciales, genericos, ventas.genericoBusqueda),
    [comerciales, genericos, ventas.genericoBusqueda],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prodDropdownRef.current && !prodDropdownRef.current.contains(event.target as Node)) {
        ventas.setMostrarSugerenciasProd(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ventas]);

  const seleccionarComercialVenta = (c: ComercialVenta) => {
    const g = buscarGenericoPorId(genericos, c.generico_id);
    if (!g) return;
    ventas.setGenericoSeleccionado(g);
    ventas.setComercialSeleccionado(c);
    ventas.setGenericoBusqueda(c.nombre_comercial);
    ventas.setMostrarSugerenciasProd(false);
  };

  // Panel de cliente y productos
  return (
    <div className="w-full lg:w-[35%] flex flex-col font-mono animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="bg-[#F9FAF9] dark:bg-[#2A312B] border border-[#E5E9E5] dark:border-[#3D473F] rounded-2xl p-5 shadow-sm flex flex-col gap-5">
        
        {/* Título */}
        <div className="pb-3 border-b border-[#E5E9E5] dark:border-[#3D473F]">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0B2136] dark:text-slate-200">
            Punto de Venta
          </h2>
        </div>

        {ventas.advertenciaVencimientoPos ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-xs font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{ventas.advertenciaVencimientoPos}</span>
          </div>
        ) : null}

        {/* 1. Selección de Cliente */}
        <div className="flex flex-col gap-1.5 w-full relative text-left" ref={clienteDropdownRef}>
          <label className="block text-etiqueta font-bold text-texto-tenue uppercase tracking-wide">
            Seleccionar Cliente
          </label>
          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-texto-tenue" />
              <input
                type="text"
                value={ventas.clienteBusqueda}
                onChange={(e) => {
                  ventas.setClienteBusqueda(e.target.value);
                  ventas.setMostrarSugerenciasCli(true);
                }}
                onFocus={() => ventas.setMostrarSugerenciasCli(true)}
                placeholder="Consumidor Final..."
                className="w-full pl-10 pr-10 h-[46px] border rounded-xl text-sm bg-white dark:bg-zinc-900 border-[#E5E9E5] dark:border-[#3D473F] text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
              {ventas.clienteBusqueda !== "Consumidor Final" && (
                <button
                  type="button"
                  onClick={() => {
                    ventas.setClienteBusqueda("Consumidor Final");
                    ventas.setClienteSeleccionado(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-tenue hover:text-red-500 transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => ventas.setIsCrearClienteOpen(true)}
              className="h-[46px] w-[46px] shrink-0 border border-[#D5DDD5] dark:border-[#4B564D] bg-[#EBEFEA] dark:bg-[#3D473F] text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center hover:bg-[#D5DDD5] dark:hover:bg-[#4B564D] transition-colors cursor-pointer"
            >
              <UserPlus className="size-4" />
            </button>
          </div>

          <AnimatePresence>
            {ventas.mostrarSugerenciasCli && sugerenciasClientes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 text-left"
              >
                {sugerenciasClientes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      ventas.setClienteSeleccionado(c);
                      ventas.setClienteBusqueda(c.nombre);
                      ventas.setMostrarSugerenciasCli(false);
                    }}
                    className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left text-sm cursor-pointer transition-colors"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{c.nombre}</p>
                    <p className="text-etiqueta text-slate-500 mt-0.5">NIT: {c.nit || "C/F"}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Método de Pago */}
        <div className="flex flex-col gap-1.5 w-full relative text-left">
          <label className="block text-etiqueta font-bold text-texto-tenue uppercase tracking-wide">
            Método de Pago
          </label>
          <button
            type="button"
            onClick={() => ventas.setMostrarMetodoPagoDropdown(!ventas.mostrarMetodoPagoDropdown)}
            className="w-full flex items-center justify-center relative h-[46px] border border-[#E5E9E5] dark:border-[#3D473F] rounded-xl bg-white dark:bg-zinc-900/60 text-sm font-black cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-[#0B2136] dark:text-slate-100"
          >
            <span className={ventas.tipoVenta === "Crédito" ? "text-amber-600 dark:text-amber-400" : ""}>
              {ventas.tipoVenta === "Contado" ? "Contado" : "Crédito"}
            </span>
            <ChevronDown className="absolute right-3 size-4 text-texto-tenue" />
          </button>

          <AnimatePresence>
            {ventas.mostrarMetodoPagoDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5"
              >
                {[
                  { id: "Contado", label: "Contado" },
                  { id: "Crédito", label: "Crédito" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (opt.id === "Crédito" && !ventas.clienteSeleccionado) {
                        toast.warn("Para pago al crédito debes seleccionar un cliente.");
                        return;
                      }
                      if (
                        opt.id === "Crédito" &&
                        ventas.creditoVencido?.vencido &&
                        !ventas.autorizarCreditoMoroso
                      ) {
                        toast.warn(
                          `Cliente con crédito vencido por Q${ventas.creditoVencido.total.toFixed(2)}. Solo contado o autorización admin.`,
                        );
                        return;
                      }
                      ventas.setTipoVenta(opt.id as "Contado" | "Crédito");
                      ventas.setMostrarMetodoPagoDropdown(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      ventas.tipoVenta === opt.id
                        ? "bg-[#8DA78E]/10 text-look-2-salvia-menta dark:text-look-1-salvia-suave"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {ventas.tipoVenta === opt.id && <Check className="size-3.5" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {ventas.clienteSeleccionado && ventas.creditoVencido?.vencido && (
          <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3 text-left text-xs text-red-800 dark:text-red-200">
            <p className="font-bold">
              {mensajeCreditoVencidoCliente(
                ventas.creditoVencido.total,
                ventas.creditoVencido.desde ?? "",
              )}
            </p>
            {esAdminSesion && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  className="size-4 rounded border-red-400"
                  checked={ventas.autorizarCreditoMoroso}
                  onChange={(e) => ventas.setAutorizarCreditoMoroso(e.target.checked)}
                />
                Autorizar crédito de todos modos
              </label>
            )}
          </div>
        )}

        <div
          className={`flex flex-col gap-1.5 w-full text-left ${ventas.mostrarSugerenciasProd ? "relative z-[60]" : ""}`}
          ref={prodDropdownRef}
        >
          <label className="block text-etiqueta font-bold text-texto-tenue uppercase tracking-wide">
            Buscar genérico o escanear código de barras
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-texto-tenue pointer-events-none" />
            <input
              type="text"
              value={ventas.genericoBusqueda}
              onChange={(e) => {
                ventas.setGenericoBusqueda(e.target.value);
                ventas.setMostrarSugerenciasProd(true);
              }}
              onFocus={() => ventas.setMostrarSugerenciasProd(true)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const query = e.currentTarget.value.trim();
                  if (!query) return;

                  if (!isDemoMode) {
                    const res = await buscarLotePorCodigoBarras(query);
                    if (res.success) {
                      await ventas.handleAgregarAlCarrito(
                        res.comercial,
                        res.generico,
                        1,
                        {
                          lote_id: res.lote.id,
                          codigo_barras_lote: res.lote.codigo_barras,
                          stock_lote: res.lote.cantidad_actual,
                          precio_costo_lote: res.lote.precio_costo,
                          numero_lote: res.lote.numero_lote,
                          fecha_vencimiento: res.lote.fecha_vencimiento,
                          cantidad: 1,
                        },
                      );
                      ventas.setGenericoBusqueda("");
                      return;
                    }
                  }

                  toast.error(`No se encontró lote activo para: ${query}`);
                  ventas.setGenericoBusqueda("");
                }
              }}
              placeholder="Genérico o código de barras del lote..."
              className="w-full pl-12 pr-4 h-[46px] border rounded-xl text-sm bg-white dark:bg-zinc-900 border-[#E5E9E5] dark:border-[#3D473F] text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />

            <AnimatePresence>
              {ventas.mostrarSugerenciasProd ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white text-left opacity-100 shadow-xl dark:border-slate-800 dark:bg-zinc-950"
                >
                {gruposComerciales.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    {ventas.genericoBusqueda.trim()
                      ? "Sin coincidencias con stock disponible."
                      : "No hay productos con stock para vender."}
                  </div>
                ) : (
                  gruposComerciales.map((grupo) => (
                    <div
                      key={grupo.generico_id}
                      className="border-b border-slate-100 dark:border-slate-900 last:border-b-0"
                    >
                      <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-900/80 border-b border-slate-100 dark:border-zinc-800">
                        <p className="text-sm font-black leading-snug text-slate-800 dark:text-slate-200">
                          {grupo.lineaGenerica}
                        </p>
                        <p className="text-xs text-texto-tenue mt-1">
                          Catálogo: {grupo.catalogo_nombre}
                        </p>
                      </div>
                      {grupo.marcas.map((c) => (
                        <button
                          key={c.producto_id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => seleccionarComercialVenta(c)}
                          className="w-full pl-5 pr-4 py-2.5 border-b border-slate-50 dark:border-zinc-900/80 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left flex items-center justify-between gap-3 text-sm cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
                              {c.nombre_comercial}
                            </p>
                            <p className="text-xs leading-relaxed text-texto-tenue mt-0.5">
                              Laboratorio: {etiquetaLaboratorioComercial(c.laboratorio_nombre)}
                              <span className="text-texto-tenue">
                                {" "}
                                · Stock vendible: {c.stock_vendible}
                              </span>
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-slate-600 tabular-nums dark:text-slate-300">
                            {etiquetaPrecioComercial(c)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* 4. Cantidad y Añadir */}
        <div className="flex items-end gap-3 w-full">
          <div className="w-[35%]">
            <label className="block text-etiqueta font-bold text-texto-tenue uppercase tracking-wide mb-1.5 text-left truncate">
              Cantidad
            </label>
            <div className="flex items-center justify-between gap-0.5 border border-[#E5E9E5] dark:border-[#3D473F] rounded-xl bg-white dark:bg-zinc-900 px-1 h-[46px] w-full">
              <button
                type="button"
                onClick={() => ventas.setCantSeleccionada(Math.max(1, (Number(ventas.cantSeleccionada) || 0) - 1))}
                className="size-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-[#0B2136] dark:text-slate-400 rounded-md cursor-pointer shrink-0"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="number"
                min="1"
                value={ventas.cantSeleccionada}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    ventas.setCantSeleccionada("");
                  } else {
                    const parsed = parseInt(val);
                    ventas.setCantSeleccionada(isNaN(parsed) ? 1 : Math.max(1, parsed));
                  }
                }}
                className="w-full text-center text-sm font-black bg-transparent border-0 focus:outline-none focus:ring-0 text-[#0B2136] dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0"
              />
              <button
                type="button"
                onClick={() => ventas.setCantSeleccionada((Number(ventas.cantSeleccionada) || 0) + 1)}
                className="size-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-[#0B2136] dark:text-slate-400 rounded-md cursor-pointer shrink-0"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => ventas.handleAgregarAlCarrito()}
            disabled={!ventas.comercialSeleccionado}
            className="w-[65%] h-[46px] bg-[#C6D2C6] hover:bg-[#A9BCA9] disabled:opacity-50 disabled:bg-[#C6D2C6] text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-xs shrink-0"
          >
            Añadir
          </button>
        </div>

        {/* Galería de Imágenes (Si existe) */}
        <AnimatePresence>
          {ventas.comercialSeleccionado?.imagen_url && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden mt-1"
            >
              <div className="flex flex-col gap-2 bg-white dark:bg-zinc-900 border border-[#E5E9E5] dark:border-[#3D473F] rounded-xl p-3 shadow-sm w-full">
                <span className="text-etiqueta uppercase tracking-widest font-black text-texto-tenue">
                  Imagen del comercial
                </span>
                <img
                  src={
                    createClient()
                      .storage.from("Imagenes_Farmacia")
                      .getPublicUrl(ventas.comercialSeleccionado.imagen_url).data.publicUrl
                  }
                  alt={ventas.comercialSeleccionado.nombre_comercial}
                  onClick={() =>
                    ventas.setImagenAmpliadaUrl(
                      createClient()
                        .storage.from("Imagenes_Farmacia")
                        .getPublicUrl(ventas.comercialSeleccionado!.imagen_url!).data.publicUrl,
                    )
                  }
                  className="aspect-square max-h-32 w-auto object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
