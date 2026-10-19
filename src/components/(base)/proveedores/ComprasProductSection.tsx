"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Minus, Trash2, Receipt, Plus as PlusIcon } from "lucide-react";
import { Plus, CirclePlus, Info, CircleHelp } from "lucide";
import { toast } from "react-toastify";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  ModalCancelButton,
  ModalFechaInput,
  ModalFooter,
  ModalShell,
} from "@/components/ui/general-modal";
import { useCompras } from "./ComprasContext";
import { ComercialCompra, Proveedor } from "./lib/zod";
import { fmtQ } from "@/lib/utils";
import { verificarCodigoBarrasEnCompra } from "./lib/actions";
import { NuevoComercialCompraModal } from "./modals/NuevoComercialCompraModal";
import {
  etiquetaFormaFarmaceutica,
  etiquetaLaboratorioComercial,
  laboratoriosParaSeleccionComercial,
  normalizarTextoBusquedaProducto,
  ordenarLaboratoriosProveedorPrimero,
} from "@/components/(base)/inventario/lib/helpers";
import {
  buildVinculoProveedorCompraCtx,
  comercialesDelProveedor,
  laboratorioListaCompraInfo,
  lineaGenericaCompraDisplay,
} from "./lib/compras-helpers";
import {
  useCostosComercial,
  useLaboratoriosInventario,
  useLaboratoriosPorProveedor,
} from "@/components/(base)/inventario/lib/hooks";
import { useMargenesPrecio } from "@/components/(base)/(settings)/hooks";
import {
  cppNuevoTrasCompra,
  margenPct,
  precioBajoCostoPromedio,
  precioBajoMargenMinimo,
  precioMinimoMargen,
  precioSugerido,
} from "@/lib/precios";
import { CrearLaboratorio } from "@/components/(base)/inventario/forms/CrearLaboratorio";
import { ComprasProveedorField } from "./ComprasProveedorField";
import { cn } from "@/lib/utils";

interface ComprasProductSectionProps {
  comerciales: ComercialCompra[];
  proveedores: Proveedor[];
}

function compraMonedaDisplay(val: number | ""): string {
  if (val === "") return "0.00";
  const n = Number(val);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function parseCompraMonedaInput(raw: string): number | "" {
  const cleaned = raw.trim().replace(/,/g, "");
  if (cleaned === "" || cleaned === ".") return "";
  const n = parseFloat(cleaned);
  if (Number.isNaN(n) || n < 0) return "";
  return Math.round(n * 100) / 100;
}

function sincronizarCompraMonedaDesdeTexto(
  raw: string,
  setValor: (val: number | "") => void,
) {
  const cleaned = raw.trim().replace(/,/g, "");
  if (cleaned === "" || cleaned === ".") {
    setValor("");
    return;
  }
  if (cleaned.endsWith(".")) return;
  setValor(parseCompraMonedaInput(raw));
}

function etiquetaEstadoComercial(c: ComercialCompra) {
  if (!c.activo) return "Inactivo";
  if (c.stock_vendible <= 0) return "Agotado";
  return null;
}

function lineaGenericaCompra(c: ComercialCompra): string {
  return lineaGenericaCompraDisplay(c);
}

function comercialCoincideBusquedaCompra(c: ComercialCompra, busqueda: string): boolean {
  const needle = normalizarTextoBusquedaProducto(busqueda);
  if (!needle) return false;
  const forma = etiquetaFormaFarmaceutica(c.forma_farmaceutica);
  const haystack = [
    c.generico_nombre,
    c.catalogo_nombre,
    c.concentracion,
    c.forma_farmaceutica,
    forma,
    lineaGenericaCompra(c),
    c.nombre_comercial,
    c.laboratorio_nombre ?? "",
  ];
  return haystack.some((t) => normalizarTextoBusquedaProducto(t).includes(needle));
}

function puntajeCoincidenciaGenericoCompra(c: ComercialCompra, busqueda: string): number {
  const needle = normalizarTextoBusquedaProducto(busqueda);
  let score = 0;
  const forma = etiquetaFormaFarmaceutica(c.forma_farmaceutica);
  const camposGenerico = [
    c.generico_nombre,
    c.catalogo_nombre,
    c.concentracion,
    c.forma_farmaceutica,
    forma,
    lineaGenericaCompra(c),
  ];
  for (const campo of camposGenerico) {
    if (normalizarTextoBusquedaProducto(campo).includes(needle)) score += 10;
  }
  if (normalizarTextoBusquedaProducto(c.nombre_comercial).includes(needle)) score += 1;
  if (normalizarTextoBusquedaProducto(c.laboratorio_nombre ?? "").includes(needle)) score += 1;
  return score;
}

type GrupoComercialCompra = {
  generico_id: string;
  lineaGenerica: string;
  catalogo_nombre: string;
  marcas: ComercialCompra[];
  puntajeGenerico: number;
};

export function ComprasProductSection({ comerciales, proveedores }: ComprasProductSectionProps) {
  const context = useCompras();
  const prodDropdownRef = useRef<HTMLDivElement>(null);
  const codigoBarrasRef = useRef<HTMLInputElement>(null);
  const [modalComercialOpen, setModalComercialOpen] = useState(false);
  const [modalLabOpen, setModalLabOpen] = useState(false);
  const [modalDetalleComercialOpen, setModalDetalleComercialOpen] = useState(false);
  const [costoMonedaTexto, setCostoMonedaTexto] = useState<string | null>(null);
  const [precioMonedaTexto, setPrecioMonedaTexto] = useState<string | null>(null);
  const [verificandoBarras, setVerificandoBarras] = useState(false);
  const precioEditadoManualRef = useRef(false);
  const { data: margenes } = useMargenesPrecio();
  const margenGanancia = margenes?.margen_ganancia_pct ?? 30;
  const margenMinimo = margenes?.margen_minimo_pct ?? 10;
  const { data: costosComercial } = useCostosComercial(context.comercialSeleccionado?.id ?? null);
  const { data: laboratorios = [] } = useLaboratoriosInventario();
  const proveedorCompra = context.proveedorSeleccionado;
  const { data: laboratoriosDelProveedor = [] } = useLaboratoriosPorProveedor(
    proveedorCompra?.id ?? null,
  );
  const laboratoriosOrdenados = useMemo(() => {
    const base = laboratoriosParaSeleccionComercial(laboratorios);
    return ordenarLaboratoriosProveedorPrimero(base, proveedorCompra?.id);
  }, [laboratorios, proveedorCompra?.id]);

  const catalogoComerciales = useMemo(
    () => [...comerciales, ...context.comercialesExtra],
    [comerciales, context.comercialesExtra],
  );

  const vinculoProveedorCompra = useMemo(() => {
    if (!proveedorCompra) {
      return buildVinculoProveedorCompraCtx("", [], []);
    }
    return buildVinculoProveedorCompraCtx(
      proveedorCompra.id,
      laboratorios,
      laboratoriosDelProveedor,
    );
  }, [laboratorios, laboratoriosDelProveedor, proveedorCompra]);

  const puedeBuscarProducto = Boolean(proveedorCompra);

  const comercialesProveedor = useMemo(() => {
    if (!proveedorCompra) return [];
    return comercialesDelProveedor(
      catalogoComerciales,
      proveedorCompra.id,
      vinculoProveedorCompra,
    );
  }, [catalogoComerciales, proveedorCompra, vinculoProveedorCompra]);

  const gruposComerciales = useMemo((): GrupoComercialCompra[] => {
    if (!proveedorCompra) return [];
    const q = context.comercialBusqueda.trim();
    const matches = q
      ? comercialesProveedor.filter((p) => comercialCoincideBusquedaCompra(p, q))
      : comercialesProveedor;
    const map = new Map<string, GrupoComercialCompra>();
    for (const p of matches) {
      let grupo = map.get(p.generico_id);
      if (!grupo) {
        grupo = {
          generico_id: p.generico_id,
          lineaGenerica: lineaGenericaCompra(p),
          catalogo_nombre: p.catalogo_nombre,
          marcas: [],
          puntajeGenerico: 0,
        };
        map.set(p.generico_id, grupo);
      }
      grupo.marcas.push(p);
      grupo.puntajeGenerico = Math.max(
        grupo.puntajeGenerico,
        puntajeCoincidenciaGenericoCompra(p, q),
      );
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.puntajeGenerico !== a.puntajeGenerico) return b.puntajeGenerico - a.puntajeGenerico;
      return a.lineaGenerica.localeCompare(b.lineaGenerica, "es");
    });
  }, [comercialesProveedor, context.comercialBusqueda, proveedorCompra]);

  const abrirNuevoComercial = () => {
    if (!proveedorCompra) {
      toast.warn("Seleccione un proveedor primero.");
      return;
    }
    context.setNuevoComercialPreset(null);
    setModalComercialOpen(true);
  };

  const abrirOtraCasaComercial = (marcas: ComercialCompra[]) => {
    if (marcas.length === 0) return;
    const ref = marcas[0];
    const ultima = marcas[marcas.length - 1];
    context.setNuevoComercialPreset({
      generico_id: ref.generico_id,
      catalogo_id: ref.catalogo_id,
      catalogo_nombre: ref.catalogo_nombre,
      generico_nombre: ref.generico_nombre,
      concentracion: ref.concentracion,
      forma_farmaceutica: ref.forma_farmaceutica,
      nombreComercialInicial: ref.catalogo_nombre,
      presentacionInicial: ultima.presentacion,
      precioVentaInicial: ultima.precio_venta,
    });
    context.setMostrarSugerenciasComercial(false);
    setModalComercialOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prodDropdownRef.current && !prodDropdownRef.current.contains(event.target as Node)) {
        context.setMostrarSugerenciasComercial(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context]);

  const lineasCarritoMismaMarca = useCallback(
    (productoId: string) =>
      context.carrito
        .filter((i) => i.comercial.id === productoId)
        .map((i) => ({ cantidad: i.cantidad, precio_costo: i.precio_costo })),
    [context.carrito],
  );

  const calcularEscenarioPrecio = useCallback(
    (comercial: ComercialCompra, cantidad: number, costoUnit: number) => {
      const precioActual = comercial.precio_venta;
      const existencia = costosComercial?.existencia_vendible ?? 0;
      const cppActual = costosComercial?.costo_promedio ?? null;
      const lineasCarrito = lineasCarritoMismaMarca(comercial.id);
      const cppNuevo =
        cantidad > 0 && costoUnit > 0
          ? cppNuevoTrasCompra({
              existenciaVendible: existencia,
              costoPromedio: cppActual,
              lineasCarrito,
              cantidadLinea: cantidad,
              costoLinea: costoUnit,
            })
          : cppActual ?? 0;
      const sugerido =
        cppNuevo > 0 ? precioSugerido(cppNuevo, margenGanancia) : precioActual;
      const precioAutollenadoCompra =
        costoUnit > 0 ? precioSugerido(costoUnit, margenMinimo) : precioActual;
      const subirSugerido = sugerido > precioActual + 0.001;
      return {
        precioActual,
        cppActual,
        cppNuevo,
        sugerido,
        precioAutollenadoCompra,
        subirSugerido,
        margenActual:
          cppActual != null && cppActual > 0 ? margenPct(precioActual, cppActual) : null,
        margenNuevo: cppNuevo > 0 ? margenPct(sugerido, cppNuevo) : null,
        precioMinimo: cppNuevo > 0 ? precioMinimoMargen(cppNuevo, margenMinimo) : 0,
      };
    },
    [costosComercial, lineasCarritoMismaMarca, margenGanancia, margenMinimo],
  );

  const seleccionarComercial = (c: ComercialCompra) => {
    precioEditadoManualRef.current = false;
    context.setComercialSeleccionado(c);
    context.setComercialBusqueda(c.nombre_comercial);
    context.setPrecioVentaEditado("");
    context.setActualizarPrecioVenta(false);
    setPrecioMonedaTexto(null);
    context.setCostoSeleccionado("");
    context.setMostrarSugerenciasComercial(false);
    context.setLaboratorioAsignarCompraId("");
    requestAnimationFrame(() => codigoBarrasRef.current?.focus());
  };

  const cantNumForm = Number(context.cantSeleccionada) || 0;
  const costoNumForm = Number(context.costoSeleccionado) || 0;
  const escenarioPrecio = useMemo(() => {
    if (!context.comercialSeleccionado) return null;
    return calcularEscenarioPrecio(context.comercialSeleccionado, cantNumForm, costoNumForm);
  }, [calcularEscenarioPrecio, context.comercialSeleccionado, cantNumForm, costoNumForm]);

  useEffect(() => {
    if (!context.comercialSeleccionado || !escenarioPrecio) return;
    if (precioEditadoManualRef.current) return;
    if (cantNumForm <= 0 || costoNumForm <= 0) {
      context.setPrecioVentaEditado("");
      context.setActualizarPrecioVenta(false);
      return;
    }
    const autoPrecio = escenarioPrecio.precioAutollenadoCompra;
    context.setPrecioVentaEditado(autoPrecio);
    context.setActualizarPrecioVenta(
      Math.abs(autoPrecio - escenarioPrecio.precioActual) > 0.001,
    );
  }, [escenarioPrecio, cantNumForm, costoNumForm, context.comercialSeleccionado?.id]);

  useEffect(() => {
    if (!context.comercialSeleccionado) {
      setModalDetalleComercialOpen(false);
    }
  }, [context.comercialSeleccionado]);

  const intentarSeleccionarComercialDesdeBusqueda = () => {
    if (!proveedorCompra) return;
    const q = context.comercialBusqueda.trim();
    if (!q) return;
    const normQ = normalizarTextoBusquedaProducto(q);
    const exactos = comercialesProveedor.filter(
      (p) => normalizarTextoBusquedaProducto(p.nombre_comercial) === normQ,
    );
    if (exactos.length === 1) {
      seleccionarComercial(exactos[0]);
      return;
    }
    const matches = comercialesProveedor.filter((p) => comercialCoincideBusquedaCompra(p, q));
    if (matches.length === 1) {
      seleccionarComercial(matches[0]);
    }
  };

  const precioEditadoNum =
    context.precioVentaEditado === "" ? 0 : Number(context.precioVentaEditado);
  const evaluarPrecioVentaFormulario =
    cantNumForm > 0 &&
    costoNumForm > 0 &&
    (context.actualizarPrecioVenta || context.precioVentaEditado !== "");
  const bloqueoPrecioVenta =
    escenarioPrecio &&
    evaluarPrecioVentaFormulario &&
    precioBajoCostoPromedio(precioEditadoNum, escenarioPrecio.cppNuevo);
  const advertenciaMargenBajo =
    escenarioPrecio &&
    evaluarPrecioVentaFormulario &&
    !bloqueoPrecioVenta &&
    precioBajoMargenMinimo(precioEditadoNum, escenarioPrecio.cppNuevo, margenMinimo);

  const handleAgregarAlCarrito = async () => {
    if (!context.comercialSeleccionado) return;
    const cant = Number(context.cantSeleccionada) || 0;
    const costo = Number(context.costoSeleccionado) || 0;
    const codigo = context.codigoBarrasLote.trim();
    const numeroLote = context.numeroLote.trim();
    const fechaVenc = context.fechaVencimientoLote.trim();

    if (!codigo) {
      toast.warn("El código de barras del lote es obligatorio.");
      return;
    }
    if (!numeroLote || !fechaVenc) {
      toast.warn("Número de lote y fecha de vencimiento son obligatorios.");
      return;
    }
    if (cant <= 0) {
      toast.warn("Por favor ingresa una cantidad mayor a 0.");
      return;
    }
    if (costo <= 0) {
      toast.warn("Por favor ingresa un precio de costo mayor a 0.");
      return;
    }

    const escenario = calcularEscenarioPrecio(context.comercialSeleccionado, cant, costo);
    const precioEditado =
      context.precioVentaEditado === "" ? 0 : Number(context.precioVentaEditado);
    const validaPrecioVenta =
      context.actualizarPrecioVenta || context.precioVentaEditado !== "";
    if (
      validaPrecioVenta &&
      precioBajoCostoPromedio(precioEditado, escenario.cppNuevo)
    ) {
      toast.error(
        `Venderías con pérdida: el precio no puede ser menor que ${fmtQ(escenario.cppNuevo)} (costo promedio tras esta compra).`,
      );
      return;
    }

    const duplicadoCarrito = context.carrito.some((i) => i.codigo_barras.trim() === codigo);
    if (duplicadoCarrito) {
      toast.warn("Ese código de barras ya está en el pedido.");
      return;
    }

    setVerificandoBarras(true);
    try {
      const check = await verificarCodigoBarrasEnCompra(codigo);
      if (!("success" in check) || !check.success) {
        toast.error("No se pudo validar el código de barras.");
        return;
      }
      if (!check.disponible) {
        toast.warn(check.detail ?? "Código de barras duplicado.");
        return;
      }
    } finally {
      setVerificandoBarras(false);
    }

    const precioCatalogo = context.comercialSeleccionado.precio_venta;
    const actualizar =
      context.actualizarPrecioVenta &&
      context.precioVentaEditado !== "" &&
      precioEditado !== precioCatalogo &&
      !Number.isNaN(precioEditado);

    if (
      validaPrecioVenta &&
      precioBajoMargenMinimo(precioEditado, escenario.cppNuevo, margenMinimo)
    ) {
      toast.warn(
        `El margen queda bajo el mínimo (${margenMinimo}%). Se recomienda al menos ${fmtQ(escenario.precioMinimo)}.`,
      );
    }

    const com = context.comercialSeleccionado;
    const asignarLab =
      !com.laboratorio_id && context.laboratorioAsignarCompraId
        ? context.laboratorioAsignarCompraId
        : undefined;

    const agregado = context.agregarAlCarrito({
      comercial: com,
      asignar_laboratorio_id: asignarLab,
      codigo_barras: codigo,
      numero_lote: numeroLote,
      fecha_vencimiento: fechaVenc,
      ubicacion: context.ubicacionLote.trim() || null,
      cantidad: cant,
      precio_costo: costo,
      subtotal: cant * costo,
      actualizar_precio_venta: actualizar,
      precio_venta: actualizar ? precioEditado : undefined,
    });

    if (!agregado) {
      toast.warn("Ese código de barras ya está en el pedido.");
      return;
    }

    context.setComercialSeleccionado(null);
    context.setComercialBusqueda("");
    context.setCantSeleccionada(1);
    context.setCostoSeleccionado("");
    context.setPrecioVentaEditado("");
    context.setActualizarPrecioVenta(false);
    precioEditadoManualRef.current = false;
    context.setCodigoBarrasLote("");
    context.setNumeroLote("");
    context.setFechaVencimientoLote("");
    context.setUbicacionLote("");
    toast.success("Lote agregado al pedido.");
  };

  const handleAjustarCantidad = (index: number, delta: number) => {
    const item = context.carrito[index];
    const nuevaCant = item.cantidad + delta;
    if (nuevaCant <= 0) {
      context.removerDelCarrito(index);
      return;
    }
    context.setCarrito(
      context.carrito.map((i, idx) =>
        idx === index
          ? {
              ...i,
              cantidad: nuevaCant,
              subtotal: nuevaCant * i.precio_costo,
            }
          : i,
      ),
    );
  };

  return (
    <>
      <div className="bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5 flex flex-col gap-5">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 border-b border-[#C1D1C5]/30 pb-2">
          Ingreso de Compra / Entrada de Factura
        </h2>

        <ComprasProveedorField
          proveedores={proveedores}
          onCrearProveedor={() => context.setIsCrearOpen(true)}
          onCrearLaboratorio={() => setModalLabOpen(true)}
        />

        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-12 gap-4 items-end transition-opacity",
            !puedeBuscarProducto && "opacity-50 pointer-events-none",
          )}
        >
          <div className="md:col-span-12" ref={prodDropdownRef}>
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Buscar producto genérico o marca
            </label>
            <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
              <div className="relative min-w-0 w-full md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-texto-tenue pointer-events-none z-[1]" />
              <input
                type="text"
                disabled={!puedeBuscarProducto}
                value={context.comercialBusqueda}
                onChange={(e) => {
                  context.setComercialBusqueda(e.target.value);
                  context.setMostrarSugerenciasComercial(true);
                  if (!e.target.value.trim()) {
                    context.setComercialSeleccionado(null);
                  }
                }}
                onFocus={() => {
                  if (puedeBuscarProducto) context.setMostrarSugerenciasComercial(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (prodDropdownRef.current?.contains(document.activeElement)) return;
                    intentarSeleccionarComercialDesdeBusqueda();
                    context.setMostrarSugerenciasComercial(false);
                  }, 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    intentarSeleccionarComercialDesdeBusqueda();
                    context.setMostrarSugerenciasComercial(false);
                  }
                }}
                placeholder={
                  puedeBuscarProducto
                    ? "Productos de este proveedor: genérico, marca o laboratorio..."
                    : "Primero seleccione un proveedor..."
                }
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100 dark:disabled:bg-zinc-800/80"
              />

            <AnimatePresence>
              {context.mostrarSugerenciasComercial && puedeBuscarProducto && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 text-left"
                >
                  {gruposComerciales.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      {context.comercialBusqueda.trim()
                        ? "Sin coincidencias con este proveedor. "
                        : "Este proveedor no tiene productos vinculados aún. "}
                      <button
                        type="button"
                        className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4] underline cursor-pointer"
                        onClick={() => {
                          context.setMostrarSugerenciasComercial(false);
                          abrirNuevoComercial();
                        }}
                      >
                        Nuevo producto comercial
                      </button>
                    </div>
                  ) : (
                    gruposComerciales.map((grupo) => (
                      <div
                        key={grupo.generico_id}
                        className="border-b border-slate-100 dark:border-slate-900 last:border-b-0"
                      >
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/80 border-b border-slate-100 dark:border-zinc-800">
                          <p className="text-etiqueta font-black text-slate-800 dark:text-slate-200">
                            {grupo.lineaGenerica}
                          </p>
                          <p className="text-etiqueta text-texto-tenue mt-0.5">
                            Catálogo: {grupo.catalogo_nombre}
                          </p>
                        </div>
                        {grupo.marcas.map((p) => {
                          const estado = etiquetaEstadoComercial(p);
                          const labInfo = laboratorioListaCompraInfo(
                            p,
                            vinculoProveedorCompra,
                            laboratorios,
                          );
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => seleccionarComercial(p)}
                              className="w-full pl-6 pr-4 py-2 border-b border-slate-50 dark:border-zinc-900/80 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left flex items-center justify-between text-xs cursor-pointer"
                            >
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{p.nombre_comercial}</p>
                                <p className="text-etiqueta text-texto-tenue mt-0.5">
                                  <span
                                    className={
                                      labInfo.pendiente
                                        ? "font-semibold text-[#2c5f9b] dark:text-[#6f9fd4]"
                                        : "text-texto-tenue"
                                    }
                                  >
                                    {labInfo.etiqueta}
                                  </span>
                                  <span className="text-texto-tenue"> · Stock vendible: {p.stock_vendible}</span>
                                </p>
                              </div>
                              {estado ? (
                                <span className="text-etiqueta bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                                  {estado}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => abrirOtraCasaComercial(grupo.marcas)}
                          className="w-full px-4 py-2 text-left text-etiqueta font-bold text-[#2c5f9b] dark:text-[#6f9fd4] hover:bg-[#2c5f9b]/5 dark:hover:bg-[#6f9fd4]/10 cursor-pointer"
                        >
                          Otra casa comercial
                        </button>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:shrink-0 md:items-stretch md:gap-1">
                <SigetActionButton
                  label="Detalle"
                  accentColor={sigetAccent.editar}
                  morphFrom={Info}
                  morphTo={CircleHelp}
                  onClick={() => setModalDetalleComercialOpen(true)}
                  disabled={!puedeBuscarProducto || !context.comercialSeleccionado}
                  ariaLabel="Ver detalle del producto comercial"
                  className="w-full min-w-0 md:w-auto md:shrink-0 md:self-stretch md:min-h-[42px]"
                />
                <SigetActionButton
                  label="Nuevo"
                  accentColor={sigetAccent.crear}
                  morphFrom={Plus}
                  morphTo={CirclePlus}
                  onClick={abrirNuevoComercial}
                  disabled={!puedeBuscarProducto}
                  ariaLabel="Nuevo producto comercial"
                  className="w-full min-w-0 md:w-auto md:shrink-0 md:self-stretch md:min-h-[42px]"
                />
              </div>
            </div>
          </div>
        </div>

        {!puedeBuscarProducto ? (
          <p className="text-etiqueta text-texto-tenue text-left -mt-2">
            Elija el proveedor de la factura para habilitar la búsqueda y el ingreso de lotes.
          </p>
        ) : null}

        <div
          className={cn(
            "md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4",
            !puedeBuscarProducto && "opacity-50 pointer-events-none",
          )}
        >
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Código de barras (lote)
            </label>
            <input
              ref={codigoBarrasRef}
              type="text"
              disabled={!puedeBuscarProducto}
              autoComplete="off"
              value={context.codigoBarrasLote}
              onChange={(e) => context.setCodigoBarrasLote(e.target.value)}
              placeholder="Escanear o escribir..."
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Nº lote
            </label>
            <input
              type="text"
              value={context.numeroLote}
              onChange={(e) => context.setNumeroLote(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Vencimiento
            </label>
            <ModalFechaInput
              value={context.fechaVencimientoLote}
              onChange={context.setFechaVencimientoLote}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Ubicación
            </label>
            <input
              type="text"
              value={context.ubicacionLote}
              onChange={(e) => context.setUbicacionLote(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-12 gap-4 items-end",
            !puedeBuscarProducto && "opacity-50 pointer-events-none",
          )}
        >
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              disabled={!puedeBuscarProducto}
              value={context.cantSeleccionada}
              onChange={(e) => {
                const val = e.target.value;
                context.setCantSeleccionada(val === "" ? "" : Number(val));
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Costo unitario
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-texto-tenue">Q</span>
              <input
                type="text"
                inputMode="decimal"
                value={costoMonedaTexto ?? compraMonedaDisplay(context.costoSeleccionado)}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCostoMonedaTexto(raw);
                  sincronizarCompraMonedaDesdeTexto(raw, context.setCostoSeleccionado);
                }}
                onFocus={(e) => {
                  setCostoMonedaTexto(compraMonedaDisplay(context.costoSeleccionado));
                  e.target.select();
                }}
                onBlur={() => {
                  setCostoMonedaTexto(null);
                }}
                className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors tabular-nums"
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-texto-tenue uppercase mb-1 text-left">
              Actualizar precio de venta
            </label>
            <div className="flex gap-2 items-center">
              <div className="relative min-w-0 flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-texto-tenue">
                  Q
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={!context.comercialSeleccionado}
                  value={precioMonedaTexto ?? compraMonedaDisplay(context.precioVentaEditado)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setPrecioMonedaTexto(raw);
                    precioEditadoManualRef.current = true;
                    sincronizarCompraMonedaDesdeTexto(raw, (num) => {
                      context.setPrecioVentaEditado(num);
                      if (context.comercialSeleccionado && num !== "") {
                        context.setActualizarPrecioVenta(
                          num !== context.comercialSeleccionado.precio_venta,
                        );
                      }
                    });
                  }}
                  onFocus={(e) => {
                    setPrecioMonedaTexto(compraMonedaDisplay(context.precioVentaEditado));
                    e.target.select();
                  }}
                  onBlur={() => {
                    setPrecioMonedaTexto(null);
                  }}
                  className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors disabled:opacity-50 tabular-nums"
                />
              </div>
              <label
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm leading-none dark:border-zinc-800 dark:bg-zinc-900",
                  !context.comercialSeleccionado && "opacity-50 pointer-events-none",
                )}
                title="Guardar nuevo precio en el comercial al registrar la compra"
              >
                <input
                  type="checkbox"
                  checked={context.actualizarPrecioVenta}
                  disabled={!context.comercialSeleccionado}
                  onChange={(e) => context.setActualizarPrecioVenta(e.target.checked)}
                  className="size-3.5 shrink-0 rounded border-slate-300"
                />
                <span className="text-etiqueta font-bold uppercase leading-tight text-texto-tenue">
                  Guardar
                </span>
              </label>
            </div>
            {bloqueoPrecioVenta && escenarioPrecio ? (
              <p className="text-etiqueta text-red-600 dark:text-red-400 mt-1 font-bold">
                Venderías con pérdida: el precio no puede ser menor que{" "}
                {fmtQ(escenarioPrecio.cppNuevo)}.
              </p>
            ) : null}
            {advertenciaMargenBajo && escenarioPrecio ? (
              <p className="text-etiqueta text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                Margen bajo el mínimo ({margenMinimo}%). Mínimo recomendado:{" "}
                {fmtQ(escenarioPrecio.precioMinimo)}.
              </p>
            ) : null}
            {escenarioPrecio &&
            cantNumForm > 0 &&
            costoNumForm > 0 &&
            !escenarioPrecio.subirSugerido &&
            escenarioPrecio.sugerido < escenarioPrecio.precioActual - 0.001 ? (
              <p className="text-etiqueta text-amber-700 dark:text-amber-300 mt-1 font-semibold">
                El costo promedio bajó. Se recomienda mantener el precio actual; si lo bajas, no lo
                pongas bajo {fmtQ(escenarioPrecio.precioMinimo)}.
              </p>
            ) : null}
          </div>
        </div>

        <SigetActionButton
          label="Agregar"
          accentColor={sigetAccent.crear}
          morphFrom={Plus}
          morphTo={CirclePlus}
          onClick={handleAgregarAlCarrito}
          disabled={
            !puedeBuscarProducto ||
            !context.comercialSeleccionado ||
            verificandoBarras ||
            Boolean(bloqueoPrecioVenta)
          }
          ariaLabel="Agregar lote a la compra"
          className="w-auto shrink-0"
        />
      </div>

      <div className="bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5 flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-texto-tenue border-b border-[#C1D1C5]/20 pb-2 text-left">
          Productos en el Pedido
        </h3>

        {context.carrito.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-texto-tenue">
            <Receipt className="size-10 mb-2 opacity-55 text-texto-tenue" />
            <p className="text-xs font-semibold">Aún no hay productos cargados</p>
            <p className="text-etiqueta opacity-70">Busca un comercial e ingresa los datos del lote.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {context.carrito.map((item, index) => (
              <div
                key={`${item.comercial.id}-${item.codigo_barras}`}
                className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {item.comercial.nombre_comercial}
                  </h4>
                  <p className="text-etiqueta text-texto-tenue mt-0.5">
                    Costo: {fmtQ(item.precio_costo)}
                    {item.actualizar_precio_venta && item.precio_venta != null
                      ? ` · Nuevo precio: ${fmtQ(item.precio_venta)} (antes ${fmtQ(item.comercial.precio_venta)})`
                      : ` · Precio venta: ${fmtQ(item.comercial.precio_venta)}`}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/80 pt-2 sm:pt-0">
                  <div className="flex items-center bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => handleAjustarCantidad(index, -1)}
                      className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 rounded transition-colors cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAjustarCantidad(index, 1)}
                      className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 rounded transition-colors cursor-pointer"
                    >
                      <PlusIcon className="size-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-16 text-right text-xs font-black text-slate-800 dark:text-white">
                      {fmtQ(item.subtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => context.removerDelCarrito(index)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {context.comercialSeleccionado ? (
        <ModalShell
          isOpen={modalDetalleComercialOpen}
          onClose={() => setModalDetalleComercialOpen(false)}
          title={context.comercialSeleccionado.nombre_comercial}
          subtitle={context.comercialSeleccionado.presentacion}
          maxWidth="max-w-lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-sm">
            <div>
              <p className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4] uppercase text-etiqueta">
                Catálogo
              </p>
              <p className="text-slate-900 dark:text-white mt-1">
                {context.comercialSeleccionado.catalogo_nombre}
              </p>
            </div>
            <div>
              <p className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4] uppercase text-etiqueta">
                Genérico
              </p>
              <p className="text-slate-900 dark:text-white mt-1">
                {context.comercialSeleccionado.concentracion}{" "}
                {context.comercialSeleccionado.forma_farmaceutica}
              </p>
              <p className="text-xs text-texto-tenue">
                {context.comercialSeleccionado.generico_nombre}
              </p>
            </div>
            <div>
              <p className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4] uppercase text-etiqueta">
                Laboratorio
              </p>
              <p className="text-slate-900 dark:text-white mt-1">
                {etiquetaLaboratorioComercial(context.comercialSeleccionado.laboratorio_nombre)}
              </p>
              {!context.comercialSeleccionado.laboratorio_id ? (
                <div className="mt-2 space-y-1">
                  <label className="text-etiqueta font-bold uppercase text-slate-500">
                    Asignar laboratorio (opcional)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={context.laboratorioAsignarCompraId}
                      onChange={(e) => context.setLaboratorioAsignarCompraId(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <option value="">Sin asignar</option>
                      {laboratoriosOrdenados.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="text-etiqueta font-bold text-[#2c5f9b] underline"
                      onClick={() => {
                        setModalDetalleComercialOpen(false);
                        setModalLabOpen(true);
                      }}
                    >
                      Nuevo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <p className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4] uppercase text-etiqueta">
                Presentación
              </p>
              <p className="text-slate-900 dark:text-white mt-1">
                {context.comercialSeleccionado.presentacion}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4] uppercase text-etiqueta">
                Precio de venta (catálogo)
              </p>
              <p className="text-slate-900 dark:text-white font-black text-lg mt-1">
                {fmtQ(context.comercialSeleccionado.precio_venta)}
              </p>
            </div>
          </div>
          <ModalFooter>
            <ModalCancelButton onClick={() => setModalDetalleComercialOpen(false)} />
          </ModalFooter>
        </ModalShell>
      ) : null}

      <NuevoComercialCompraModal
        open={modalComercialOpen}
        preset={context.nuevoComercialPreset}
        comercialesCatalogo={catalogoComerciales}
        proveedorCompra={context.proveedorSeleccionado}
        onClose={() => {
          setModalComercialOpen(false);
          context.setNuevoComercialPreset(null);
        }}
        onCreated={(c) => {
          context.setComercialesExtra((prev) => {
            if (prev.some((x) => x.id === c.id)) return prev;
            return [...prev, c];
          });
          seleccionarComercial(c);
        }}
      />
      {modalLabOpen ? (
        <CrearLaboratorio
          isOpen
          proveedorIdPreseleccionado={proveedorCompra?.id ?? null}
          onClose={() => setModalLabOpen(false)}
          onSuccess={() => setModalLabOpen(false)}
        />
      ) : null}
    </>
  );
}
