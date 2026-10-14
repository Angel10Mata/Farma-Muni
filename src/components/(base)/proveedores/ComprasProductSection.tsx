"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Minus, Trash2, Receipt, Plus as PlusIcon } from "lucide-react";
import { Plus, CirclePlus } from "lucide";
import { toast } from "react-toastify";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { ModalFechaInput } from "@/components/ui/general-modal";
import { useCompras } from "./ComprasContext";
import { ComercialCompra, Proveedor } from "./lib/zod";
import { fmtQ } from "@/lib/utils";
import { verificarCodigoBarrasEnCompra } from "./lib/actions";
import { NuevoComercialCompraModal } from "./modals/NuevoComercialCompraModal";
import {
  etiquetaLaboratorioComercial,
  laboratoriosParaSeleccionComercial,
  ordenarLaboratoriosProveedorPrimero,
} from "@/components/(base)/inventario/lib/helpers";
import { useLaboratoriosInventario } from "@/components/(base)/inventario/lib/hooks";
import { CrearLaboratorio } from "@/components/(base)/inventario/forms/CrearLaboratorio";

interface ComprasProductSectionProps {
  comerciales: ComercialCompra[];
  proveedores: Proveedor[];
}

function etiquetaEstadoComercial(c: ComercialCompra) {
  if (!c.activo) return "Inactivo";
  if (c.stock_vendible <= 0) return "Agotado";
  return null;
}

export function ComprasProductSection({ comerciales, proveedores }: ComprasProductSectionProps) {
  const context = useCompras();
  const prodDropdownRef = useRef<HTMLDivElement>(null);
  const codigoBarrasRef = useRef<HTMLInputElement>(null);
  const [modalComercialOpen, setModalComercialOpen] = useState(false);
  const [modalLabOpen, setModalLabOpen] = useState(false);
  const [verificandoBarras, setVerificandoBarras] = useState(false);
  const { data: laboratorios = [] } = useLaboratoriosInventario();
  const proveedorCompra = context.proveedorSeleccionado;
  const laboratoriosOrdenados = useMemo(() => {
    const base = laboratoriosParaSeleccionComercial(laboratorios);
    return ordenarLaboratoriosProveedorPrimero(base, proveedorCompra?.id);
  }, [laboratorios, proveedorCompra?.id]);

  const catalogoComerciales = useMemo(
    () => [...comerciales, ...context.comercialesExtra],
    [comerciales, context.comercialesExtra],
  );

  const autoSeleccionarProveedor = (comercial: ComercialCompra) => {
    const provId = comercial.ultimo_proveedor_id;
    if (!provId) return;
    const prov = proveedores.find((p) => p.id === provId);
    if (!prov) return;
    context.setProveedorSeleccionado(prov);
    context.setProveedorBusqueda(prov.nombre);
    context.setProveedorAutoSeleccionado(true);
  };

  const sugerenciasComerciales = catalogoComerciales.filter((p) => {
    if (!context.comercialBusqueda) return false;
    const q = context.comercialBusqueda.toLowerCase();
    return (p.nombre_comercial || "").toLowerCase().includes(q);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prodDropdownRef.current && !prodDropdownRef.current.contains(event.target as Node)) {
        context.setMostrarSugerenciasComercial(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context]);

  const seleccionarComercial = (c: ComercialCompra) => {
    context.setComercialSeleccionado(c);
    context.setComercialBusqueda(c.nombre_comercial);
    context.setPrecioVentaEditado(c.precio_venta);
    context.setActualizarPrecioVenta(false);
    context.setCostoSeleccionado(Math.round(c.precio_venta * 0.65 * 100) / 100);
    context.setMostrarSugerenciasComercial(false);
    context.setLaboratorioAsignarCompraId("");
    autoSeleccionarProveedor(c);
    requestAnimationFrame(() => codigoBarrasRef.current?.focus());
  };

  const precioVentaEfectivo =
    context.precioVentaEditado === ""
      ? context.comercialSeleccionado?.precio_venta ?? 0
      : Number(context.precioVentaEditado);

  const costoNum = Number(context.costoSeleccionado) || 0;
  const costoMayorQueVenta =
    context.comercialSeleccionado && costoNum > 0 && costoNum > precioVentaEfectivo;

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
    const precioEditado =
      context.precioVentaEditado === "" ? precioCatalogo : Number(context.precioVentaEditado);
    const actualizar =
      context.actualizarPrecioVenta && precioEditado !== precioCatalogo && !Number.isNaN(precioEditado);

    if (costo > precioEditado) {
      toast.warn("El costo unitario es mayor que el precio de venta del comercial.");
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 relative" ref={prodDropdownRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
              Buscar producto comercial
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={context.comercialBusqueda}
                onChange={(e) => {
                  context.setComercialBusqueda(e.target.value);
                  context.setMostrarSugerenciasComercial(true);
                }}
                onFocus={() => context.setMostrarSugerenciasComercial(true)}
                placeholder="Nombre comercial..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
            </div>

            <AnimatePresence>
              {context.mostrarSugerenciasComercial && context.comercialBusqueda && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 text-left"
                >
                  {sugerenciasComerciales.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      Sin coincidencias.{" "}
                      <button
                        type="button"
                        className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4] underline cursor-pointer"
                        onClick={() => {
                          context.setMostrarSugerenciasComercial(false);
                          setModalComercialOpen(true);
                        }}
                      >
                        Nuevo producto comercial
                      </button>
                    </div>
                  ) : (
                    sugerenciasComerciales.map((p) => {
                      const estado = etiquetaEstadoComercial(p);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => seleccionarComercial(p)}
                          className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{p.nombre_comercial}</p>
                            <p className="text-[10px] text-slate-400">
                              {p.catalogo_nombre} · Stock vendible: {p.stock_vendible}
                            </p>
                          </div>
                          {estado ? (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                              {estado}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="md:col-span-6 flex items-end justify-end">
            <SigetActionButton
              label="Nuevo"
              accentColor={sigetAccent.crear}
              morphFrom={Plus}
              morphTo={CirclePlus}
              onClick={() => setModalComercialOpen(true)}
              ariaLabel="Nuevo producto comercial"
              className="w-auto shrink-0"
            />
          </div>
        </div>

        {context.comercialSeleccionado ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-4 text-left text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px]">Catálogo</p>
              <p className="text-slate-900 dark:text-white">{context.comercialSeleccionado.catalogo_nombre}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px]">Genérico</p>
              <p className="text-slate-900 dark:text-white">
                {context.comercialSeleccionado.concentracion}{" "}
                {context.comercialSeleccionado.forma_farmaceutica}
              </p>
              <p className="text-[10px] text-slate-400">{context.comercialSeleccionado.generico_nombre}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px]">Laboratorio</p>
              <p className="text-slate-900 dark:text-white">
                {etiquetaLaboratorioComercial(context.comercialSeleccionado.laboratorio_nombre)}
              </p>
              {!context.comercialSeleccionado.laboratorio_id ? (
                <div className="mt-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
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
                      className="text-[10px] font-bold text-[#2c5f9b] underline"
                      onClick={() => setModalLabOpen(true)}
                    >
                      Nuevo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px]">Presentación</p>
              <p className="text-slate-900 dark:text-white">{context.comercialSeleccionado.presentacion}</p>
            </div>
            <div className="md:col-span-2">
              <p className="font-bold text-slate-500 uppercase text-[10px]">Precio de venta (catálogo)</p>
              <p className="text-slate-900 dark:text-white font-black">{fmtQ(context.comercialSeleccionado.precio_venta)}</p>
            </div>
          </div>
        ) : null}

        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
              Código de barras (lote)
            </label>
            <input
              ref={codigoBarrasRef}
              type="text"
              autoComplete="off"
              value={context.codigoBarrasLote}
              onChange={(e) => context.setCodigoBarrasLote(e.target.value)}
              placeholder="Escanear o escribir..."
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
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
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
              Vencimiento
            </label>
            <ModalFechaInput
              value={context.fechaVencimientoLote}
              onChange={context.setFechaVencimientoLote}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={context.cantSeleccionada}
              onChange={(e) => {
                const val = e.target.value;
                context.setCantSeleccionada(val === "" ? "" : Number(val));
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
              Costo unitario
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Q</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={context.costoSeleccionado}
                onChange={(e) => {
                  const val = e.target.value;
                  context.setCostoSeleccionado(val === "" ? "" : Number(val));
                }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {costoMayorQueVenta ? (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                El costo supera el precio de venta del comercial.
              </p>
            ) : null}
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
              Actualizar precio de venta
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Q</span>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={!context.comercialSeleccionado}
                value={context.precioVentaEditado}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = val === "" ? "" : Number(val);
                  context.setPrecioVentaEditado(num);
                  if (context.comercialSeleccionado && num !== "") {
                    context.setActualizarPrecioVenta(num !== context.comercialSeleccionado.precio_venta);
                  }
                }}
                className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <label className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={context.actualizarPrecioVenta}
                disabled={!context.comercialSeleccionado}
                onChange={(e) => context.setActualizarPrecioVenta(e.target.checked)}
                className="rounded border-slate-300"
              />
              Guardar nuevo precio en el comercial al registrar la compra
            </label>
          </div>
        </div>

        <SigetActionButton
          label="Agregar"
          accentColor={sigetAccent.crear}
          morphFrom={Plus}
          morphTo={CirclePlus}
          onClick={handleAgregarAlCarrito}
          disabled={!context.comercialSeleccionado || verificandoBarras}
          ariaLabel="Agregar lote a la compra"
          className="w-auto shrink-0"
        />
      </div>

      <div className="bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5 flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-[#C1D1C5]/20 pb-2 text-left">
          Productos en el Pedido
        </h3>

        {context.carrito.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400">
            <Receipt className="size-10 mb-2 opacity-55 text-slate-400" />
            <p className="text-xs font-semibold">Aún no hay productos cargados</p>
            <p className="text-[10px] opacity-70">Busca un comercial e ingresa los datos del lote.</p>
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
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Barras: {item.codigo_barras} | Lote: {item.numero_lote} | Costo: {fmtQ(item.precio_costo)}
                    {item.actualizar_precio_venta && item.precio_venta != null
                      ? ` | Nuevo precio venta: ${fmtQ(item.precio_venta)}`
                      : ""}
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

      <NuevoComercialCompraModal
        open={modalComercialOpen}
        proveedorCompra={context.proveedorSeleccionado}
        onClose={() => setModalComercialOpen(false)}
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
