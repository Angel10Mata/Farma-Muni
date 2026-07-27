"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Trash2, Receipt } from "lucide-react";
import Swal from "sweetalert2";
import { useCompras } from "./ComprasContext";
import { Producto, Proveedor } from "./types";
import { fmtQ } from "@/lib/utils";

interface ComprasProductSectionProps {
  productos: Producto[];
  proveedores: Proveedor[];
}

export function ComprasProductSection({ productos, proveedores }: ComprasProductSectionProps) {
  const context = useCompras();
  const prodDropdownRef = useRef<HTMLDivElement>(null);

  const sugerenciasProductos = productos.filter((p) => {
    if (!context.productoBusqueda) return false;
    const q = context.productoBusqueda.toLowerCase();
    return p.nombre.toLowerCase().includes(q) || (p.codigo && p.codigo.toLowerCase().includes(q));
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prodDropdownRef.current && !prodDropdownRef.current.contains(event.target as Node)) {
        context.setMostrarSugerenciasProd(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context]);

  const autoSeleccionarProveedor = (producto: Producto) => {
    if (producto.proveedor_id) {
      const prov = proveedores.find((p) => p.id === producto.proveedor_id);
      if (prov) {
        context.setProveedorSeleccionado(prov);
        context.setProveedorBusqueda(prov.nombre);
        context.setProveedorAutoSeleccionado(true);
      }
    }
  };

  const getSwalThemeOpts = () => {
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    return {
      background: isDark ? "#18181b" : "#F5F5F1",
      color: isDark ? "#F5F5F1" : "#525D53",
      confirmButtonColor: "#8DA78E",
      cancelButtonColor: "#525D53",
      customClass: { popup: "!rounded-3xl border-0" }
    };
  };

  const handleScanBarcode = (product: Producto) => {
    const cant = 1;
    const costo = product.precio_costo ?? product.precio_base ?? 1;

    context.agregarAlCarrito({
      producto: product,
      cantidad: cant,
      precio_costo: costo,
      subtotal: cant * costo
    });

    autoSeleccionarProveedor(product);

    context.setProductoSeleccionado(null);
    context.setProductoBusqueda("");
    context.setCantSeleccionada(1);
    context.setCostoSeleccionado("");

    Swal.fire({
      toast: true,
      position: "top-end",
      title: "Producto escaneado",
      text: `${product.nombre} agregado al pedido`,
      icon: "success",
      showConfirmButton: false,
      timer: 2000,
      background: "#8DA78E",
      color: "#ffffff",
      iconColor: "#ffffff"
    });
  };

  const handleAgregarAlCarrito = () => {
    if (!context.productoSeleccionado) return;
    const cant = Number(context.cantSeleccionada) || 0;
    const costo = Number(context.costoSeleccionado) || 0;

    if (cant <= 0) {
      Swal.fire({
        title: "Cantidad Inválida",
        text: "Por favor ingresa una cantidad mayor a 0.",
        icon: "warning",
        ...getSwalThemeOpts()
      });
      return;
    }
    if (costo <= 0) {
      Swal.fire({
        title: "Precio Costo Inválida",
        text: "Por favor ingresa un precio de costo mayor a 0.",
        icon: "warning",
        ...getSwalThemeOpts()
      });
      return;
    }

    context.agregarAlCarrito({
      producto: context.productoSeleccionado,
      cantidad: cant,
      precio_costo: costo,
      subtotal: cant * costo
    });

    autoSeleccionarProveedor(context.productoSeleccionado);

    context.setProductoSeleccionado(null);
    context.setProductoBusqueda("");
    context.setCantSeleccionada(1);
    context.setCostoSeleccionado("");
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
              subtotal: nuevaCant * i.precio_costo
            }
          : i
      )
    );
  };

  return (
    <>
    <div className="bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5 flex flex-col gap-5">
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 border-b border-[#C1D1C5]/30 pb-2">
        Ingreso de Compra / Entrada de Factura
      </h2>

      {/* 1. Producto y Detalles */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Autocomplete Producto */}
        <div className="md:col-span-6 relative" ref={prodDropdownRef}>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
            Buscar Producto
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={context.productoBusqueda}
              onChange={(e) => {
                context.setProductoBusqueda(e.target.value);
                context.setMostrarSugerenciasProd(true);
              }}
              onFocus={() => context.setMostrarSugerenciasProd(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const query = e.currentTarget.value.trim().toLowerCase();
                  if (!query) return;

                  const exactMatch = productos.find((p) => p.codigo?.toLowerCase() === query);
                  if (exactMatch) {
                    handleScanBarcode(exactMatch);
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
                  }
                }
              }}
              placeholder="Nombre o código de barras..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />
          </div>

          <AnimatePresence>
            {context.mostrarSugerenciasProd && sugerenciasProductos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 text-left"
              >
                {sugerenciasProductos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      context.setProductoSeleccionado(p);
                      context.setProductoBusqueda(p.nombre);
                      context.setCostoSeleccionado(p.precio_costo !== undefined && p.precio_costo !== null ? p.precio_costo : (p.precio_base ?? ""));
                      context.setMostrarSugerenciasProd(false);
                      autoSeleccionarProveedor(p);
                    }}
                    className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{p.nombre}</p>
                      <p className="text-[10px] text-slate-400">Barras: {p.codigo || "N/A"}</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                      Stock: {p.stock_actual}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cantidad Input */}
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

        {/* Costo Unitario Input */}
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 text-left">
            Costo Unitario
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
        </div>
      </div>

      {/* Botón de Agregar */}
      <button
        onClick={handleAgregarAlCarrito}
        disabled={!context.productoSeleccionado}
        className="w-fit max-w-full py-2.5 px-4 bg-[#8DA78E] disabled:opacity-40 text-[#F5F5F1] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
      >
        <Plus className="size-4" /> Agregar Producto a la Compra
      </button>
    </div>

    {/* SECCIÓN 2: Productos en el Pedido */}
    <div className="bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5 flex flex-col gap-3">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-[#C1D1C5]/20 pb-2 text-left">
        Productos en el Pedido
      </h3>

      {context.carrito.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-slate-400">
          <Receipt className="size-10 mb-2 opacity-55 text-slate-400" />
          <p className="text-xs font-semibold">Aún no hay productos cargados</p>
          <p className="text-[10px] opacity-70">Usa el panel superior para buscar e ingresar productos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {context.carrito.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {item.producto.nombre}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Código: {item.producto.codigo || "N/A"} | Costo: {fmtQ(item.precio_costo)}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/80 pt-2 sm:pt-0">
                <div className="flex items-center bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-0.5">
                  <button
                    onClick={() => handleAjustarCantidad(index, -1)}
                    className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 rounded transition-colors cursor-pointer"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => handleAjustarCantidad(index, 1)}
                    className="p-1 hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-16 text-right text-xs font-black text-slate-800 dark:text-white">
                    {fmtQ(item.subtotal)}
                  </span>
                  <button
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
    </>
  );
}
