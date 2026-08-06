"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Package, Check, ChevronDown, UserPlus, X, AlertTriangle, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtQ } from "@/lib/utils";
import { Producto, Cliente } from "./types";
import { usePOS } from "./POSContext";
import Swal from "sweetalert2";
import { getSwalThemeOpts } from "@/lib/utils";

interface POSProductSectionProps {
  productos: Producto[];
  clientes: Cliente[];
}

export function POSProductSection({ productos, clientes }: POSProductSectionProps) {
  const pos = usePOS();
  
  const clienteDropdownRef = useRef<HTMLDivElement>(null);
  const prodDropdownRef = useRef<HTMLDivElement>(null);

  const sugerenciasClientes = clientes.filter((c) => {
    if (!pos.clienteBusqueda || pos.clienteBusqueda === "Consumidor Final") return false;
    const query = pos.clienteBusqueda.toLowerCase();
    return (
      (c.nombre || "").toLowerCase().includes(query) ||
      (c.nit && c.nit.toLowerCase().includes(query))
    );
  });

  const sugerenciasProductos = productos.filter((p) => {
    if (!pos.productoBusqueda) return false;
    const query = pos.productoBusqueda.toLowerCase();
    return (
      (p.nombre || "").toLowerCase().includes(query) ||
      (p.codigo && p.codigo.toLowerCase().includes(query))
    );
  });

  return (
    <div className="w-full lg:w-[35%] flex flex-col font-mono animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="bg-[#F9FAF9] dark:bg-[#2A312B] border border-[#E5E9E5] dark:border-[#3D473F] rounded-2xl p-5 shadow-sm flex flex-col gap-5">
        
        {/* Título */}
        <div className="pb-3 border-b border-[#E5E9E5] dark:border-[#3D473F]">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0B2136] dark:text-slate-200">
            Punto de Venta
          </h2>
        </div>

        {/* 1. Selección de Cliente */}
        <div className="flex flex-col gap-1.5 w-full relative text-left" ref={clienteDropdownRef}>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Seleccionar Cliente
          </label>
          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={pos.clienteBusqueda}
                onChange={(e) => {
                  pos.setClienteBusqueda(e.target.value);
                  pos.setMostrarSugerenciasCli(true);
                }}
                onFocus={() => pos.setMostrarSugerenciasCli(true)}
                placeholder="Consumidor Final..."
                className="w-full pl-10 pr-10 h-[46px] border rounded-xl text-sm bg-white dark:bg-zinc-900 border-[#E5E9E5] dark:border-[#3D473F] text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
              {pos.clienteBusqueda !== "Consumidor Final" && (
                <button
                  type="button"
                  onClick={() => {
                    pos.setClienteBusqueda("Consumidor Final");
                    pos.setClienteSeleccionado(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => pos.setIsCrearClienteOpen(true)}
              className="h-[46px] w-[46px] shrink-0 border border-[#D5DDD5] dark:border-[#4B564D] bg-[#EBEFEA] dark:bg-[#3D473F] text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center hover:bg-[#D5DDD5] dark:hover:bg-[#4B564D] transition-colors cursor-pointer"
            >
              <UserPlus className="size-4" />
            </button>
          </div>

          <AnimatePresence>
            {pos.mostrarSugerenciasCli && sugerenciasClientes.length > 0 && (
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
                      pos.setClienteSeleccionado(c);
                      pos.setClienteBusqueda(c.nombre);
                      pos.setMostrarSugerenciasCli(false);
                    }}
                    className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left text-sm cursor-pointer transition-colors"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{c.nombre}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">NIT: {c.nit || "C/F"}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Método de Pago */}
        <div className="flex flex-col gap-1.5 w-full relative text-left">
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Método de Pago
          </label>
          <button
            type="button"
            onClick={() => pos.setMostrarMetodoPagoDropdown(!pos.mostrarMetodoPagoDropdown)}
            className="w-full flex items-center justify-center relative h-[46px] border border-[#E5E9E5] dark:border-[#3D473F] rounded-xl bg-white dark:bg-zinc-900/60 text-sm font-black cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-[#0B2136] dark:text-slate-100"
          >
            <span className={pos.tipoVenta === "Crédito" ? "text-amber-600 dark:text-amber-400" : ""}>
              {pos.tipoVenta === "Contado" ? "Contado" : "Crédito"}
            </span>
            <ChevronDown className="absolute right-3 size-4 text-slate-400" />
          </button>

          <AnimatePresence>
            {pos.mostrarMetodoPagoDropdown && (
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
                      if (opt.id === "Crédito" && !pos.clienteSeleccionado) {
                        Swal.fire({
                          title: "Cliente requerido",
                          text: "Para seleccionar pago al crédito, debe seleccionar un cliente.",
                          icon: "warning",
                          ...getSwalThemeOpts()
                        });
                        return;
                      }
                      pos.setTipoVenta(opt.id as any);
                      pos.setMostrarMetodoPagoDropdown(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      pos.tipoVenta === opt.id
                        ? "bg-[#8DA78E]/10 text-[#8DA78E] dark:text-[#A3BEB0]"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {pos.tipoVenta === opt.id && <Check className="size-3.5" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Búsqueda manual de producto */}
        <div className="flex flex-col gap-1.5 w-full relative text-left" ref={prodDropdownRef}>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Búsqueda manual de producto
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <input
              type="text"
              value={pos.productoBusqueda}
              onChange={(e) => {
                pos.setProductoBusqueda(e.target.value);
                pos.setMostrarSugerenciasProd(true);
              }}
              onFocus={() => pos.setMostrarSugerenciasProd(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const query = e.currentTarget.value.trim().toLowerCase();
                  if (!query) return;
                  
                  const exactMatch = productos.find(p => p.codigo?.toLowerCase() === query);
                  if (exactMatch) {
                    pos.handleAgregarAlCarrito(exactMatch, 1);
                  } else {
                    Swal.fire({
                      toast: true,
                      position: "top-end",
                      title: "Producto no encontrado",
                      text: `No se encontró el código: ${query}`,
                      icon: "error",
                      background: "#ef4444",
                      color: "#ffffff",
                      showConfirmButton: false,
                      timer: 3000,
                      iconColor: "#ffffff"
                    });
                    pos.setProductoBusqueda("");
                  }
                }
              }}
              placeholder="Nombre o código de barras..."
              className="w-full pl-12 pr-4 h-[46px] border rounded-xl text-sm bg-white dark:bg-zinc-900 border-[#E5E9E5] dark:border-[#3D473F] text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />
          </div>

          <AnimatePresence>
            {pos.mostrarSugerenciasProd && sugerenciasProductos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 top-full mt-1 max-h-[380px] overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 text-left"
              >
                {sugerenciasProductos.map((p) => {
                  const isLow = p.stock_actual <= p.stock_minimo;
                  const isOut = p.stock_actual <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        pos.setProductoSeleccionado(p);
                        pos.setProductoBusqueda(p.nombre);
                        pos.setMostrarSugerenciasProd(false);
                      }}
                      disabled={isOut}
                      className={`w-full px-4 py-2.5 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left flex items-center justify-between text-xs cursor-pointer ${
                        isOut ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {p.imagen_url ? (
                          <img
                            src={createClient().storage.from("Imagenes_Farmacia").getPublicUrl(p.imagen_url).data.publicUrl}
                            alt={p.nombre}
                            className="w-10 h-10 object-cover rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-zinc-800 text-slate-400">
                            <Search className="size-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-950 dark:text-white">{p.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-500">Cód: {p.codigo || "C/F"}</p>
                            <span className="text-[10px] text-slate-300">|</span>
                            {(!p.ubicacion || p.ubicacion === 'Sin asignar') ? (
                              <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                                <AlertTriangle className="size-3" /> Sin ubicación
                              </p>
                            ) : (
                              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                {p.ubicacion}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#8DA78E]">{fmtQ(p.precio_base)}</p>
                        <p className={`text-[9px] font-bold ${isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-slate-400"}`}>
                          Stock: {p.stock_actual}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Cantidad y Añadir */}
        <div className="flex items-end gap-3 w-full">
          <div className="w-[35%]">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 text-left truncate">
              Cantidad
            </label>
            <div className="flex items-center justify-between gap-0.5 border border-[#E5E9E5] dark:border-[#3D473F] rounded-xl bg-white dark:bg-zinc-900 px-1 h-[46px] w-full">
              <button
                type="button"
                onClick={() => pos.setCantSeleccionada(Math.max(1, (Number(pos.cantSeleccionada) || 0) - 1))}
                className="size-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-[#0B2136] dark:text-slate-400 rounded-md cursor-pointer shrink-0"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="number"
                min="1"
                value={pos.cantSeleccionada}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    pos.setCantSeleccionada("");
                  } else {
                    const parsed = parseInt(val);
                    pos.setCantSeleccionada(isNaN(parsed) ? 1 : Math.max(1, parsed));
                  }
                }}
                className="w-full text-center text-sm font-black bg-transparent border-0 focus:outline-none focus:ring-0 text-[#0B2136] dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0"
              />
              <button
                type="button"
                onClick={() => pos.setCantSeleccionada((Number(pos.cantSeleccionada) || 0) + 1)}
                className="size-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 text-[#0B2136] dark:text-slate-400 rounded-md cursor-pointer shrink-0"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => pos.handleAgregarAlCarrito()}
            disabled={!pos.productoSeleccionado}
            className="w-[65%] h-[46px] bg-[#C6D2C6] hover:bg-[#A9BCA9] disabled:opacity-50 disabled:bg-[#C6D2C6] text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-xs shrink-0"
          >
            Añadir
          </button>
        </div>

        {/* Galería de Imágenes (Si existe) */}
        <AnimatePresence>
          {pos.productoSeleccionado && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden mt-1"
            >
              <div className="flex flex-col gap-2 bg-white dark:bg-zinc-900 border border-[#E5E9E5] dark:border-[#3D473F] rounded-xl p-3 shadow-sm w-full">
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Galería de Imágenes (3 Máx)</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    pos.productoSeleccionado.imagen_url,
                    pos.productoSeleccionado.imagen_url_2,
                    pos.productoSeleccionado.imagen_url_3
                  ].map((imgUrl, imgIdx) => {
                    if (imgUrl) {
                      const fullUrl = createClient().storage.from("Imagenes_Farmacia").getPublicUrl(imgUrl).data.publicUrl;
                      return (
                        <img
                          key={imgIdx}
                          src={fullUrl}
                          alt={`${pos.productoSeleccionado?.nombre} ${imgIdx + 1}`}
                          onClick={() => pos.setImagenAmpliadaUrl(fullUrl)}
                          className="aspect-square w-full object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 shadow-xs cursor-pointer hover:opacity-85 transition-opacity"
                        />
                      );
                    } else {
                      return (
                        <div key={imgIdx} className="aspect-square w-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-zinc-950 text-slate-400">
                          <Package className="size-4 opacity-50" />
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
