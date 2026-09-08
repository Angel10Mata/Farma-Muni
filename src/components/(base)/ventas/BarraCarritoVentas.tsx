"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, Plus, Minus, Package, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtQ } from "@/lib/utils";
import { useVentas } from "./ContextoVentas";
import { toast } from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { Check as CheckNode, CircleDollarSign as CircleDollarSignNode, Save as SaveNode, X as XNode } from "lucide";

export function BarraCarritoVentas() {
  const ventas = useVentas();

  return (
    <div className="w-full lg:w-[65%] flex flex-col gap-4 font-mono">
      <motion.div
        animate={{ scale: ventas.animateCart ? [1, 1.02, 1] : 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-[#525D53]/10 border border-[#C1D1C5]/40 dark:border-[#A3BEB0]/10 rounded-3xl p-5 shadow-xs flex flex-col gap-4 min-h-[380px] h-auto"
      >
        <div className="flex items-center justify-between border-b border-[#C1D1C5]/30 pb-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShoppingCart className="size-4 text-[#8DA78E]" /> Venta
          </h2>
          <span className="bg-[#8DA78E]/10 text-[#8DA78E] dark:text-[#A3BEB0] text-xs font-bold px-2 py-0.5 rounded-full">
            {ventas.carrito.length} Producto(s)
          </span>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto max-h-[280px] sm:max-h-[500px] pr-1 space-y-2.5">
          <AnimatePresence initial={false}>
            {ventas.carrito.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center py-8"
              >
                <ShoppingCart className="size-16 sm:size-20 text-slate-400 dark:text-slate-600 mb-4" strokeWidth={1.5} />
                <p className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200">Venta vacía</p>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-[250px] leading-normal mt-2 text-center">
                  Busca y agrega productos desde el panel izquierdo.
                </p>
              </motion.div>
            ) : (
              ventas.carrito.map((item, idx) => (
                <motion.div
                  key={item.producto.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/20 dark:border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 text-left"
                >
                  {ventas.editingCartItemIndex === idx ? (
                    <div className="flex flex-col gap-2.5 w-full">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">
                        Editar: {item.producto.nombre}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-slate-500">Precio Unitario</label>
                          <input
                            type="number"
                            step="0.01"
                            value={ventas.editingPrice}
                            onChange={(e) => ventas.setEditingPrice(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#8DA78E]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-slate-500">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={ventas.editingQty}
                            onChange={(e) => ventas.setEditingQty(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#8DA78E]"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <SigetActionButton
                          label="Cancelar"
                          accentColor={sigetAccent.cancelar}
                          morphFrom={XNode}
                          morphTo={XNode}
                          morphOnHover={false}
                          onClick={() => ventas.setEditingCartItemIndex(null)}
                          className="w-auto shrink-0"
                        />
                        <SigetActionButton
                          label="Guardar"
                          accentColor={sigetAccent.guardar}
                          morphFrom={SaveNode}
                          morphTo={CheckNode}
                          onClick={() => {
                            const newPrice = parseFloat(ventas.editingPrice);
                            const newQty = parseInt(ventas.editingQty);
                            if (isNaN(newPrice) || newPrice < 0 || isNaN(newQty) || newQty <= 0) {
                              toast.warn("Ingresa un precio y una cantidad válidos.");
                              return;
                            }
                            if (newQty > item.producto.stock_actual) {
                              toast.warn(`Solo hay ${item.producto.stock_actual} unidades en inventario.`);
                              return;
                            }
                            ventas.setCarrito(prev => prev.map((it, i) => i === idx ? {
                              ...it,
                              cantidad: newQty,
                              precio_aplicado: newPrice,
                              subtotal: newQty * newPrice
                            } : it));
                            ventas.setEditingCartItemIndex(null);
                          }}
                          className="w-auto shrink-0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                      {/* Left group: Image + Name/Price */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                        {/* Product First Image */}
                        <div className="size-11 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.producto.imagen_url ? (
                            <img
                              src={createClient().storage.from("Imagenes_Farmacia").getPublicUrl(item.producto.imagen_url).data.publicUrl}
                              alt={item.producto.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="size-5 text-slate-400 opacity-60" />
                          )}
                        </div>

                        {/* Name and Unit Price */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.producto.nombre}>
                            {item.producto.nombre}
                          </h4>
                          {(!item.producto.ubicacion || item.producto.ubicacion === 'Sin asignar') ? (
                            <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="size-3" /> Sin ubicación
                            </p>
                          ) : (
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.producto.ubicacion}
                            </p>
                          )}
                          <div className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium gap-1 mt-1">
                            <span>Unitario: Q</span>
                            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-zinc-900 px-1 py-0.5 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                              <input
                                type="number"
                                step="0.01"
                                value={item.precio_aplicado === 0 ? "" : item.precio_aplicado}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = val === "" ? 0 : parseFloat(val);
                                  if (!isNaN(num) && num >= 0) {
                                    ventas.setCarrito(
                                      ventas.carrito.map((it, i) =>
                                        i === idx
                                          ? {
                                              ...it,
                                              precio_aplicado: num,
                                              subtotal: it.cantidad * num
                                            }
                                          : it
                                      )
                                    );
                                  }
                                }}
                                className="w-14 bg-transparent outline-none text-slate-900 dark:text-white font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 focus:ring-0 border-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right group: Quantity + Subtotal + Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-zinc-900 px-1 py-0.5 shrink-0">
                          <button
                            onClick={() => ventas.handleAjustarCantidad(idx, -1)}
                            className="size-5 flex items-center justify-center hover:bg-slate-150 dark:hover:bg-zinc-800 text-slate-500 rounded cursor-pointer"
                          >
                            <Minus className="size-2.5" />
                          </button>
                          <span className="w-6 text-center text-[11px] font-bold text-slate-900 dark:text-white">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => ventas.handleAjustarCantidad(idx, 1)}
                            className="size-5 flex items-center justify-center hover:bg-slate-150 dark:hover:bg-zinc-800 text-slate-500 rounded cursor-pointer"
                          >
                            <Plus className="size-2.5" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="text-xs font-black text-[#8DA78E] dark:text-[#A3BEB0] min-w-[75px] text-right shrink-0">
                          {fmtQ(item.subtotal)}
                        </span>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => ventas.handleEliminarDelCarrito(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                            title="Eliminar item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Observaciones */}
        <div className="flex flex-col gap-1 text-left mt-2 border-t border-[#C1D1C5]/30 pt-3">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
            Observaciones / Comentarios
          </label>
          <textarea
            value={ventas.observaciones}
            onChange={(e) => ventas.setObservaciones(e.target.value)}
            placeholder="Notas o especificaciones adicionales de esta venta..."
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors h-20 resize-none"
          />
        </div>

        {/* Totales */}
        <div className="border-t border-[#C1D1C5]/30 pt-3 mt-auto space-y-2 text-left">
          <div className="flex items-center justify-between text-sm font-black text-slate-800 dark:text-white pt-1">
            <span>Total a pagar:</span>
            <span className="text-base text-[#8DA78E]">{fmtQ(ventas.totalCarrito)}</span>
          </div>
        </div>

        {/* Cobrar Button */}
        <div className="flex justify-end w-full mt-4">
          <SigetActionButton
            label="Cobrar"
            accentColor={sigetAccent.guardar}
            morphFrom={CircleDollarSignNode}
            morphTo={CheckNode}
            onClick={ventas.handleFinalizarVenta}
            disabled={ventas.carrito.length === 0 || ventas.isProcesandoVenta}
            ariaBusy={ventas.isProcesandoVenta}
            className="w-auto shrink-0"
          />
        </div>
      </motion.div>
    </div>
  );
}
