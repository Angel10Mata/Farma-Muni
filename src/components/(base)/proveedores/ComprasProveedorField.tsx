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

  const nitProveedorSeleccionado = context.proveedorSeleccionado?.nit?.trim() || null;

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
      <label className="block text-xs font-bold text-texto-tenue uppercase mb-1">
        Seleccionar proveedor
      </label>
      <div className="flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative min-w-0 w-full sm:flex-1">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-texto-tenue" />
        <input
          type="text"
          value={context.proveedorBusqueda}
          title={
            nitProveedorSeleccionado
              ? `NIT: ${nitProveedorSeleccionado}`
              : undefined
          }
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
            "w-full pl-9 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors",
            nitProveedorSeleccionado ? "pr-[7.5rem] sm:pr-32" : "pr-4",
            context.proveedorSeleccionado
              ? "border-[#8DA78E] dark:border-[#A3BEB0]/60"
              : "border-slate-200 dark:border-slate-800",
          )}
        />
        {nitProveedorSeleccionado ? (
          <span
            className="pointer-events-none absolute right-3 top-1/2 max-w-[42%] -translate-y-1/2 truncate text-right text-etiqueta font-semibold tabular-nums text-texto-tenue"
            aria-hidden
          >
            NIT: {nitProveedorSeleccionado}
          </span>
        ) : null}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-2">
          <SigetActionButton
            label="Proveedor"
            accentColor={sigetAccent.crear}
            morphFrom={UserPlus}
            morphTo={Check}
            onClick={onCrearProveedor}
            ariaLabel="Crear proveedor"
            className="w-full min-w-0 sm:w-auto sm:shrink-0"
          />
          <SigetActionButton
            label="Laboratorio"
            accentColor={sigetAccent.crear}
            morphFrom={FlaskConical}
            morphTo={TestTubeDiagonal}
            onClick={onCrearLaboratorio}
            ariaLabel="Crear laboratorio"
            className="w-full min-w-0 sm:w-auto sm:shrink-0"
          />
        </div>
      </div>
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
                <p className="text-etiqueta text-texto-tenue">NIT: {p.nit || "C/F"}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
