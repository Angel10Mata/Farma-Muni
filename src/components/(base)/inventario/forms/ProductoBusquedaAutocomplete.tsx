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
  listaModo?: "dropdown" | "panel";
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
  listaModo = "dropdown",
}: ProductoBusquedaAutocompleteProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const texto = value.trim();
  const puedeBuscar = enabled && texto.length >= MIN_CARACTERES_BUSQUEDA_PRODUCTO;

  const { data: sugerencias = [], isFetching } = useBuscarProductosSimilares(value, enabled);

  const tieneResultados = isFetching || sugerencias.length > 0;
  const mostrarListaDropdown =
    listaModo === "dropdown" && abierto && puedeBuscar && tieneResultados;
  const mostrarPanel = listaModo === "panel" && enabled;

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
    <div
      ref={containerRef}
      className={cn(
        "relative",
        listaModo === "panel" ? "flex min-h-0 flex-1 flex-col gap-2.5" : "space-y-2.5",
      )}
    >
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
          const listaActiva =
            listaModo === "panel"
              ? puedeBuscar && sugerencias.length > 0
              : mostrarListaDropdown;
          if (!listaActiva) {
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
        aria-expanded={listaModo === "panel" ? puedeBuscar : mostrarListaDropdown}
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
      {listaModo === "dropdown" &&
      texto.length > 0 &&
      texto.length < MIN_CARACTERES_BUSQUEDA_PRODUCTO ? (
        <p className="text-[10px] text-zinc-500">
          Escribe al menos {MIN_CARACTERES_BUSQUEDA_PRODUCTO} letras para ver sugerencias.
        </p>
      ) : null}

      {listaModo === "dropdown" && mostrarListaDropdown ? (
        <ListaSugerenciasProducto
          listId={listId}
          listaTitulo={listaTitulo}
          isFetching={isFetching}
          sugerencias={sugerencias}
          indiceActivo={indiceActivo}
          setIndiceActivo={setIndiceActivo}
          onSeleccionar={seleccionar}
          className="absolute left-0 right-0 top-full z-[250] mt-1 max-h-56 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        />
      ) : null}

      {mostrarPanel ? (
        <ListaSugerenciasProducto
          listId={listId}
          listaTitulo={listaTitulo}
          isFetching={isFetching}
          sugerencias={sugerencias}
          indiceActivo={indiceActivo}
          setIndiceActivo={setIndiceActivo}
          onSeleccionar={seleccionar}
          puedeBuscar={puedeBuscar}
          minCaracteres={MIN_CARACTERES_BUSQUEDA_PRODUCTO}
          className="flex min-h-[min(300px,42vh)] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40"
          listaClassName="min-h-0 flex-1 overflow-y-auto p-2"
        />
      ) : null}
    </div>
  );
}

function ListaSugerenciasProducto({
  listId,
  listaTitulo,
  isFetching,
  sugerencias,
  indiceActivo,
  setIndiceActivo,
  onSeleccionar,
  puedeBuscar = true,
  minCaracteres,
  className,
  listaClassName,
}: {
  listId: string;
  listaTitulo: string;
  isFetching: boolean;
  sugerencias: ProductoSugerencia[];
  indiceActivo: number;
  setIndiceActivo: (index: number) => void;
  onSeleccionar: (producto: ProductoSugerencia) => void;
  puedeBuscar?: boolean;
  minCaracteres?: number;
  className?: string;
  listaClassName?: string;
}) {
  const enPanel = minCaracteres !== undefined;

  return (
    <div id={listId} role="listbox" className={className}>
      <p
        className={cn(
          "shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500",
          enPanel && "border-b border-zinc-200/80 dark:border-zinc-700",
        )}
      >
        {listaTitulo}
        {isFetching ? "…" : ""}
      </p>
      <div className={listaClassName ?? "p-1.5"}>
        {enPanel && !puedeBuscar ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">
            Escribe al menos {minCaracteres} letras para buscar en el catálogo.
          </p>
        ) : null}
        {puedeBuscar && isFetching && sugerencias.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">Buscando…</p>
        ) : null}
        {puedeBuscar && !isFetching && sugerencias.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">
            Sin coincidencias en catálogo.
          </p>
        ) : null}
        {puedeBuscar
          ? sugerencias.map((producto, index) => {
              const activo = index === indiceActivo;
              const linea = lineaSugerenciaProductoCatalogo(producto);
              const comercial = producto.nombre.trim();
              const subtitulo =
                comercial && linea && comercial.toLowerCase() !== linea.toLowerCase()
                  ? linea
                  : linea && !comercial
                    ? linea
                    : null;
              const titulo = comercial || linea;
              return (
                <button
                  key={producto.id}
                  id={`${listId}-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activo}
                  onMouseEnter={() => setIndiceActivo(index)}
                  onClick={() => onSeleccionar(producto)}
                  className={cn(
                    "mb-1 w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition-colors last:mb-0",
                    activo
                      ? "bg-[#2c5f9b]/10 dark:bg-[#6f9fd4]/15"
                      : "hover:bg-white dark:hover:bg-zinc-900/80",
                    enPanel && "border border-transparent hover:border-zinc-200/80 dark:hover:border-zinc-600",
                  )}
                >
                  <span className="block text-sm font-bold text-foreground">{titulo}</span>
                  {subtitulo ? (
                    <span className="mt-0.5 block text-xs text-zinc-500">{subtitulo}</span>
                  ) : null}
                </button>
              );
            })
          : null}
      </div>
    </div>
  );
}
