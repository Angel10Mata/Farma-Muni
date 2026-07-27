"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, AlertTriangle, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


export function ModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col md:items-center md:justify-center md:p-4">

      <div 
        className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 md:bg-zinc-700/20 md:backdrop-blur-sm"
        onClick={onClose}
      />


      <div
        ref={shellRef}
        className="relative flex flex-col w-full h-[100dvh] md:h-auto md:max-w-lg md:rounded-3xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden shadow-none md:shadow-lg pointer-events-auto"
      >

        <div className="hidden md:block absolute inset-0 rounded-3xl pointer-events-none p-[3px]" style={{
            background: "linear-gradient(90deg, #0e73f6 0%, #29b4f8 40%, #8958d7 75%, #de3e96 100%)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude"
        }} />


        <div className="relative flex flex-col flex-1 h-full w-full z-10 bg-zinc-100 dark:bg-zinc-800 md:bg-transparent">

          <div 
            className="flex-none flex items-center justify-between px-4 py-4 md:pt-6 md:px-6 md:pb-4 bg-zinc-100 dark:bg-zinc-800 md:bg-transparent"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
          >
            <div>
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-blue-500 hover:text-blue-400 transition-colors"
            >
              <X size={24} />
            </button>
          </div>


          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 bg-zinc-100 dark:bg-zinc-900 md:bg-transparent">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


export function ModalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      placeholder=""
      className={cn(
        "w-full bg-transparent border-2 border-[var(--color-celeste-kore)] text-foreground focus:ring-2 focus:ring-[var(--color-celeste-kore)] outline-none rounded-md px-3 py-2",
        props.className
      )}
    />
  );
}


export function ModalLabel({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-semibold text-foreground mb-1", className)} {...props}>
      {children}
    </label>
  );
}


export function ModalTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      placeholder=""
      className={cn(
        "w-full bg-transparent border-2 border-[var(--color-celeste-kore)] text-foreground focus:ring-2 focus:ring-[var(--color-celeste-kore)] outline-none rounded-md px-3 py-2 resize-y",
        props.className
      )}
    />
  );
}


export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="flex-none px-4 py-4 md:px-6 md:py-6 bg-zinc-100 dark:bg-zinc-800"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-center w-full">
        {children}
      </div>
    </div>
  );
}


export function ModalSubmit({ children, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        "w-full md:w-auto px-8 py-3 rounded-full border-2 border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
    >
      {loading ? "Guardando..." : children || "Guardar"}
    </button>
  );
}


export interface ItemDetailsPreview {
  nombre?: string;
  codigo?: string;
  stock?: number;
  precio?: number;
  imagen?: string | null;
  ubicacion?: string | null;
  categoria?: string | null;
}

export function ModalConfirmDelete({
  onConfirm,
  onCancel,
  title = "¿Eliminar registro?",
  description = "Esta acción no se puede deshacer.",
  itemDetails,
  loading = false,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
}: {
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  itemDetails?: ItemDetailsPreview;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-1 sm:p-3">
      {/* Icono de advertencia con animación aura */}
      <div className="relative mb-3 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-red-500/20 dark:bg-red-500/30 animate-pulse opacity-75" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/60 dark:to-rose-900/40 border border-red-200 dark:border-red-800/60 flex items-center justify-center shadow-inner">
          <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* Título principal y descripción */}
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
        {description}
      </p>

      {/* Ficha Resumen del Producto (si existe metadata) */}
      {itemDetails && (
        <div className="w-full mt-4 mb-2 bg-gradient-to-b from-zinc-50 to-zinc-100/80 dark:from-zinc-800/80 dark:to-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 rounded-2xl p-3.5 text-left shadow-sm">
          <div className="flex items-center gap-3.5">
            {/* Imagen o icono por defecto */}
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {itemDetails.imagen ? (
                <img
                  src={itemDetails.imagen}
                  alt={itemDetails.nombre || "Producto"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
              )}
            </div>

            {/* Datos Principales */}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {itemDetails.nombre || "Producto sin nombre"}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {itemDetails.codigo && (
                  <span className="inline-flex items-center text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-700 dark:text-zinc-300">
                    SKU: {itemDetails.codigo}
                  </span>
                )}
                {itemDetails.stock !== undefined && (
                  <span className={cn(
                    "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md",
                    itemDetails.stock > 0 
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                  )}>
                    Stock: {itemDetails.stock} ud.
                  </span>
                )}
                {itemDetails.precio !== undefined && (
                  <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ${itemDetails.precio.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nota de advertencia */}
      <div className="w-full mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2 text-left">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <span>Esta acción eliminará de forma permanente el producto y no se podrá deshacer.</span>
      </div>

      {/* Botones de Acción */}
      <div className="w-full flex items-center justify-end gap-3 mt-5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-md shadow-red-500/20 hover:shadow-red-500/35 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Eliminando...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span>{confirmText}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
