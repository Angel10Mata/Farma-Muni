"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, User } from "lucide-react";
import { Save, Check } from "lucide";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { modalActionMessage } from "@/components/ui/general-modal";
import { useCompras } from "./ComprasContext";
import { Proveedor } from "./lib/zod";
import { fmtQ, getSwalThemeOpts } from "@/lib/utils";
import { useCrearCompra } from "./lib/hooks";
import type { ItemCompraInput } from "./lib/zod";

interface ComprasCartSidebarProps {
  proveedores: Proveedor[];
  cargarDatos: () => void;
}

export function ComprasCartSidebar({ proveedores, cargarDatos }: ComprasCartSidebarProps) {
  const context = useCompras();
  const provDropdownRef = useRef<HTMLDivElement>(null);
  const { mutateAsync: crearCompraAsync } = useCrearCompra();

  const totalCarrito = context.carrito.reduce((sum, i) => sum + i.subtotal, 0);

  const sugerenciasProveedores = proveedores.filter((p) => {
    if (!context.proveedorBusqueda) return false;
    const q = context.proveedorBusqueda.toLowerCase();
    return (p.nombre || "").toLowerCase().includes(q) || (p.nit && p.nit.toLowerCase().includes(q));
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (provDropdownRef.current && !provDropdownRef.current.contains(event.target as Node)) {
        context.setMostrarSugerenciasProv(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context]);

  const handleFinalizarCompra = async () => {
    if (!context.proveedorSeleccionado) {
      toast.warn("Por favor selecciona un proveedor antes de registrar la compra.");
      return;
    }
    if (context.carrito.length === 0) {
      toast.warn("Agrega productos a la compra antes de guardar.");
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Registrar esta Compra?",
      text: `Se cargará una compra por ${fmtQ(totalCarrito)} al proveedor ${context.proveedorSeleccionado.nombre}. Se actualizará el inventario.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, registrar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
    });

    if (!confirm.isConfirmed) return;

    context.setIsProcesando(true);
    try {
      const itemsFormatted: ItemCompraInput[] = context.carrito.map((i) => ({
        producto_id: i.producto.id,
        cantidad: i.cantidad,
        precio_costo: i.precio_costo,
        subtotal: i.subtotal
      }));

      const res = await crearCompraAsync({
        proveedor_id: context.proveedorSeleccionado.id,
        total: totalCarrito,
        estado_pago: context.estadoPago,
        observaciones: context.observaciones.trim() || null,
        items: itemsFormatted
      });

      if (!res.success) {
        throw new Error(res.code || "Error");
      }

      toast.success("Compra registrada correctamente. El inventario se actualizó.");

      context.limpiarCarrito();
      cargarDatos();
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo registrar la compra."));
    } finally {
      context.setIsProcesando(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 border-b border-[#C1D1C5]/30 pb-2 text-left">
          Resumen de Compra
        </h3>

        <div className="relative text-left" ref={provDropdownRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Seleccionar Proveedor
            </label>
            {context.proveedorAutoSeleccionado && context.proveedorSeleccionado && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#8DA78E] dark:text-[#A3BEB0] bg-[#8DA78E]/10 dark:bg-[#8DA78E]/20 px-2 py-0.5 rounded-full">
                <Truck className="size-2.5" />
                Auto
              </span>
            )}
          </div>
          <div className="flex gap-1.5 items-center">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={context.proveedorBusqueda}
                onChange={(e) => {
                  context.setProveedorBusqueda(e.target.value);
                  context.setMostrarSugerenciasProv(true);
                  context.setProveedorAutoSeleccionado(false);
                  if (!e.target.value) context.setProveedorSeleccionado(null);
                }}
                onFocus={() => context.setMostrarSugerenciasProv(true)}
                placeholder="Escribe nombre o NIT del proveedor..."
                className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors ${
                  context.proveedorAutoSeleccionado && context.proveedorSeleccionado
                    ? "border-[#8DA78E] dark:border-[#A3BEB0]/60"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              />
            </div>
          </div>

          <AnimatePresence>
            {context.mostrarSugerenciasProv && sugerenciasProveedores.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 text-left"
              >
                {sugerenciasProveedores.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      context.setProveedorSeleccionado(p);
                      context.setProveedorBusqueda(p.nombre);
                      context.setMostrarSugerenciasProv(false);
                    }}
                    className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{p.nombre}</p>
                      <p className="text-[10px] text-slate-400">NIT: {p.nit || "C/F"}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-left">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
            Estado de Pago
          </label>
          <div className="grid grid-cols-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/50 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => context.setEstadoPago("Pagado")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                context.estadoPago === "Pagado"
                  ? "bg-white dark:bg-zinc-900 text-[#8DA78E] shadow-xs"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              PAGADO
            </button>
            <button
              type="button"
              onClick={() => context.setEstadoPago("Pendiente")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                context.estadoPago === "Pendiente"
                  ? "bg-white dark:bg-zinc-900 text-amber-500 shadow-xs"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              PENDIENTE
            </button>
          </div>
        </div>

        <div className="text-left">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
            Observaciones / Comentario
          </label>
          <textarea
            value={context.observaciones}
            onChange={(e) => context.setObservaciones(e.target.value)}
            rows={2}
            placeholder="Número de factura del proveedor, condiciones de entrega..."
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors resize-none"
          />
        </div>

        <div className="border-t border-[#C1D1C5]/30 pt-3 mt-auto space-y-2 text-left">
          <div className="flex items-center justify-between text-sm font-black text-slate-800 dark:text-white pt-1">
            <span>Total a pagar:</span>
            <span className="text-base text-[#8DA78E]">{fmtQ(totalCarrito)}</span>
          </div>
        </div>

        <SigetActionButton
          label="Registrar"
          accentColor={sigetAccent.guardar}
          morphFrom={Save}
          morphTo={Check}
          onClick={handleFinalizarCompra}
          disabled={context.carrito.length === 0 || context.isProcesando}
          ariaBusy={context.isProcesando}
          ariaLabel="Registrar compra"
          className="w-auto shrink-0"
        />
      </div>
    </>
  );
}
