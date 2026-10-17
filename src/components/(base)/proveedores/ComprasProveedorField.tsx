"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Check, FlaskConical, TestTubeDiagonal } from "lucide";
import { User } from "lucide-react";
import { toast } from "react-toastify";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { useCompras } from "./ComprasContext";
import type { Proveedor } from "./lib/zod";
import { cn } from "@/lib/utils";

type Props = {
  proveedores: Proveedor[];
  onProveedorChange?: () => void;
  onCrearProveedor: () => void;
  onCrearLaboratorio: () => void;
};

export function ComprasProveedorField({
  proveedores,
  onProveedorChange,
  onCrearProveedor,
  onCrearLaboratorio,
}: Props) {
  const context = useCompras();
  const provDropdownRef = useRef<HTMLDivElement>(null);

  const sugerencias = useMemo(() => {
    const q = context.proveedorBusqueda.trim().toLowerCase();
    if (!q) return [];
    return proveedores.filter(
      (p) =>
        p.activo !== false &&
        ((p.nombre || "").toLowerCase().includes(q) ||
          (p.nit && p.nit.toLowerCase().includes(q))),
    );
  }, [proveedores, context.proveedorBusqueda]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (provDropdownRef.current && !provDropdownRef.current.contains(event.target as Node)) {
        context.setMostrarSugerenciasProv(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context]);

  const limpiarProductoEnCurso = () => {
    context.setComercialSeleccionado(null);
    context.setComercialBusqueda("");
    context.setMostrarSugerenciasComercial(false);
    context.setLaboratorioAsignarCompraId("");
    context.setCodigoBarrasLote("");
    context.setNumeroLote("");
    context.setFechaVencimientoLote("");
    context.setUbicacionLote("");
    context.setPrecioVentaEditado("");
    context.setActualizarPrecioVenta(false);
    context.setCostoSeleccionado("");
    context.setCantSeleccionada(1);
  };

  const elegirProveedor = (p: Proveedor) => {
    if (
      context.proveedorSeleccionado?.id !== p.id &&
      context.carrito.length > 0
    ) {
      toast.warn("No puede cambiar el proveedor mientras haya productos en el pedido.");
      return;
    }
    if (context.proveedorSeleccionado?.id !== p.id) {
      limpiarProductoEnCurso();
      onProveedorChange?.();
    }
    context.setProveedorSeleccionado(p);
    context.setProveedorBusqueda(p.nombre);
    context.setProveedorAutoSeleccionado(false);
    context.setMostrarSugerenciasProv(false);
  };

  return (
    <div className="relative text-left" ref={provDropdownRef}>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
        Seleccionar proveedor
      </label>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch max-w-3xl">
        <div className="relative flex-1 min-w-0">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          value={context.proveedorBusqueda}
          onChange={(e) => {
            const val = e.target.value;
            context.setProveedorBusqueda(val);
            context.setMostrarSugerenciasProv(true);
            context.setProveedorAutoSeleccionado(false);
            if (!val.trim()) {
              if (context.carrito.length > 0) {
                toast.warn("No puede quitar el proveedor mientras haya productos en el pedido.");
                context.setProveedorBusqueda(context.proveedorSeleccionado?.nombre ?? "");
                return;
              }
              context.setProveedorSeleccionado(null);
              limpiarProductoEnCurso();
            }
          }}
          onFocus={() => context.setMostrarSugerenciasProv(true)}
          placeholder="Escribe nombre o NIT del proveedor..."
          className={cn(
            "w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors",
            context.proveedorSeleccionado
              ? "border-[#8DA78E] dark:border-[#A3BEB0]/60"
              : "border-slate-200 dark:border-slate-800",
          )}
        />
        </div>
        <div className="flex gap-2 shrink-0 sm:items-center">
          <SigetActionButton
            label="Proveedor"
            accentColor={sigetAccent.crear}
            morphFrom={UserPlus}
            morphTo={Check}
            onClick={onCrearProveedor}
            ariaLabel="Crear proveedor"
            className="w-auto shrink-0"
          />
          <SigetActionButton
            label="Laboratorio"
            accentColor={sigetAccent.crear}
            morphFrom={FlaskConical}
            morphTo={TestTubeDiagonal}
            onClick={onCrearLaboratorio}
            ariaLabel="Crear laboratorio"
            className="w-auto shrink-0"
          />
        </div>
      </div>
      {context.proveedorSeleccionado?.nit ? (
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
          NIT: {context.proveedorSeleccionado.nit}
        </p>
      ) : null}

      <AnimatePresence>
        {context.mostrarSugerenciasProv && sugerencias.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 max-w-3xl mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50"
          >
            {sugerencias.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegirProveedor(p)}
                className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left text-xs cursor-pointer"
              >
                <p className="font-bold text-slate-900 dark:text-white">{p.nombre}</p>
                <p className="text-[10px] text-slate-400">NIT: {p.nit || "C/F"}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
