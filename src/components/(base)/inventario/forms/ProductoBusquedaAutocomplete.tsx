"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ModalInput, ModalLabel } from "@/components/ui/general-modal";
import { cn } from "@/lib/utils";
import {
  lineaSugerenciaProductoCatalogo,
  MIN_CARACTERES_BUSQUEDA_PRODUCTO,
} from "../lib/helpers";
import { useBuscarProductosSimilares } from "../lib/hooks";
import type { ProductoSugerencia } from "../lib/zod";

type ProductoBusquedaAutocompleteProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelectProducto: (producto: ProductoSugerencia) => void;
  enabled: boolean;
  error?: string;
  inputClassName?: string;
  required?: boolean;
  listaTitulo?: string;
};

export function ProductoBusquedaAutocomplete({
  id,
  label,
  value,
  onChange,
  onSelectProducto,
  enabled,
  error,
  inputClassName,
  required,
  listaTitulo = "Productos parecidos",
}: ProductoBusquedaAutocompleteProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const texto = value.trim();
  const puedeBuscar = enabled && texto.length >= MIN_CARACTERES_BUSQUEDA_PRODUCTO;

  const { data: sugerencias = [], isFetching } = useBuscarProductosSimilares(value, enabled);

  const mostrarLista =
    abierto &&
    puedeBuscar &&
    (isFetching || sugerencias.length > 0);

  useEffect(() => {
    setIndiceActivo(-1);
  }, [value, sugerencias.length]);

  useEffect(() => {
    if (puedeBuscar && (isFetching || sugerencias.length > 0)) {
      setAbierto(true);
    }
  }, [puedeBuscar, isFetching, sugerencias.length]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const seleccionar = (producto: ProductoSugerencia) => {
    setAbierto(false);
    setIndiceActivo(-1);
    onSelectProducto(producto);
  };

  return (
    <div ref={containerRef} className="relative space-y-2.5">
      <ModalLabel htmlFor={id}>{label}</ModalLabel>
      <ModalInput
        id={id}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          if (next.trim().length >= MIN_CARACTERES_BUSQUEDA_PRODUCTO) {
            setAbierto(true);
          }
        }}
        onFocus={() => {
          if (texto.length >= MIN_CARACTERES_BUSQUEDA_PRODUCTO) {
            setAbierto(true);
          }
        }}
        onKeyDown={(e) => {
          if (!mostrarLista) {
            if (e.key === "Escape") setAbierto(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndiceActivo((i) => Math.min(i + 1, sugerencias.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndiceActivo((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && indiceActivo >= 0) {
            e.preventDefault();
            const item = sugerencias[indiceActivo];
            if (item) seleccionar(item);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setAbierto(false);
            setIndiceActivo(-1);
          }
        }}
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          indiceActivo >= 0 ? `${listId}-opt-${indiceActivo}` : undefined
        }
        className={inputClassName}
        required={required}
        autoComplete="off"
      />
      {error ? <p className="text-xs font-bold text-red-500">{error}</p> : null}
      {texto.length > 0 && texto.length < MIN_CARACTERES_BUSQUEDA_PRODUCTO ? (
        <p className="text-[10px] text-zinc-500">
          Escribe al menos {MIN_CARACTERES_BUSQUEDA_PRODUCTO} letras para ver sugerencias.
        </p>
      ) : null}

      {mostrarLista ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[250] mt-1 max-h-56 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            {listaTitulo}
            {isFetching ? "…" : ""}
          </p>
          {isFetching && sugerencias.length === 0 ? (
            <p className="px-2 py-2 text-xs text-zinc-500">Buscando…</p>
          ) : null}
          {!isFetching && sugerencias.length === 0 ? (
            <p className="px-2 py-2 text-xs text-zinc-500">Sin coincidencias en catálogo.</p>
          ) : null}
          {sugerencias.map((producto, index) => {
            const activo = index === indiceActivo;
            const linea = lineaSugerenciaProductoCatalogo(producto);
            const comercial = producto.nombre.trim();
            return (
              <button
                key={producto.id}
                id={`${listId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={activo}
                onMouseEnter={() => setIndiceActivo(index)}
                onClick={() => seleccionar(producto)}
                className={cn(
                  "w-full cursor-pointer rounded-lg px-2.5 py-2 text-left transition-colors",
                  activo
                    ? "bg-[#2c5f9b]/10 dark:bg-[#6f9fd4]/15"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                <span className="block text-xs font-semibold text-foreground">{linea}</span>
                {comercial ? (
                  <span className="block text-[10px] text-zinc-500">{comercial}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
