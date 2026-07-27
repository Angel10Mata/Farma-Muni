"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Truck, ImageIcon, Box, Plus } from "lucide-react";
import Swal from "sweetalert2";
import ImageUploader from "@/components/imgs/ImageUploader";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  precio_costo?: number | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  proveedor_id?: string | null;
  inv_proveedores?: { nombre: string } | null;
  created_at?: string;
  imagen_url?: string | null;
  fecha_vencimiento?: string | null;
  numero_lote?: string | null;
  ubicacion?: string | null;
}

interface EditarProductoProps {
  onClose: () => void;
  onSuccess: () => void;
  producto: Producto | null;
}

export function EditarProducto({ onClose, onSuccess, producto }: EditarProductoProps) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [precioCosto, setPrecioCosto] = useState("");
  const [stockActual, setStockActual] = useState("");
  const [stockMinimo, setStockMinimo] = useState("");
  const [activo, setActivo] = useState(true);
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [ubicacion, setUbicacion] = useState("");

  // Proveedores state
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string; nit: string | null }[]>([]);
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [mostrarSugerenciasProv, setMostrarSugerenciasProv] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<{ id: string; nombre: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const provDropdownRef = useRef<HTMLDivElement>(null);

  // Ubicaciones state
  const [ubicacionesExistentes, setUbicacionesExistentes] = useState<string[]>([]);
  const [mostrarSugerenciasUbicacion, setMostrarSugerenciasUbicacion] = useState(false);
  const ubiDropdownRef = useRef<HTMLDivElement>(null);

  // Cargar proveedores desde Supabase
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("inv_proveedores")
          .select("id, nombre, nit")
          .order("nombre", { ascending: true });
        if (!error && data) {
          setProveedores(data);
        }
      } catch (err) {
        console.error("Error al cargar proveedores:", err);
      }
    };
    fetchProveedores();
  }, []);

  // Cargar ubicaciones únicas desde Supabase
  useEffect(() => {
    const fetchUbicaciones = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("inv_productos")
          .select("ubicacion")
          .not("ubicacion", "is", null)
          .not("ubicacion", "eq", "")
          .not("ubicacion", "eq", "Sin asignar");
        if (!error && data) {
          const uniqueUbis = Array.from(new Set(data.map((d: any) => d.ubicacion))).filter(Boolean) as string[];
          setUbicacionesExistentes(uniqueUbis.sort());
        }
      } catch (err) {
        console.error("Error al cargar ubicaciones:", err);
      }
    };
    fetchUbicaciones();
  }, []);

  // Click outside listener para cerrar dropdown de proveedores
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (provDropdownRef.current && !provDropdownRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasProv(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Click outside listener para cerrar dropdown de ubicaciones
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ubiDropdownRef.current && !ubiDropdownRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasUbicacion(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cargar datos cuando cambie el producto
  useEffect(() => {
    if (producto) {
      setCodigo(producto.codigo || "");
      setNombre(producto.nombre || "");
      setDescripcion(producto.descripcion || "");
      setPrecioBase(producto.precio_base?.toString() || "0");
      setPrecioCosto(producto.precio_costo !== undefined && producto.precio_costo !== null ? producto.precio_costo.toString() : "");
      setStockActual(producto.stock_actual?.toString() || "0");
      setStockMinimo(producto.stock_minimo?.toString() || "0");
      setActivo(producto.activo !== false);
      setImagenUrl(producto.imagen_url || null);
      setFechaVencimiento(producto.fecha_vencimiento || "");
      setNumeroLote(producto.numero_lote || "");
      setUbicacion(producto.ubicacion || "");

      if (producto.proveedor_id) {
        const pNombre = producto.inv_proveedores?.nombre || "";
        setProveedorSeleccionado({ id: producto.proveedor_id, nombre: pNombre });
        setProveedorBusqueda(pNombre);
      } else {
        setProveedorSeleccionado(null);
        setProveedorBusqueda("");
      }
    }
  }, [producto]);

  // Sincronizar proveedor seleccionado si se cargan los proveedores después
  useEffect(() => {
    if (producto && producto.proveedor_id && proveedores.length > 0) {
      const match = proveedores.find((p) => p.id === producto.proveedor_id);
      if (match) {
        setProveedorSeleccionado({ id: match.id, nombre: match.nombre });
        setProveedorBusqueda(match.nombre);
      }
    }
  }, [producto, proveedores]);

  const sugerenciasProveedores = proveedorBusqueda.trim() === ""
    ? proveedores
    : proveedores.filter((p) =>
        p.nombre.toLowerCase().includes(proveedorBusqueda.toLowerCase()) ||
        (p.nit && p.nit.toLowerCase().includes(proveedorBusqueda.toLowerCase()))
      );

  const sugerenciasUbicaciones = ubicacion.trim() === ""
    ? ubicacionesExistentes
    : ubicacionesExistentes.filter((u) => u.toLowerCase().includes(ubicacion.toLowerCase()));

  // Helper para obtener colores de SweetAlert según el tema activo (claro/oscuro)
  const getSwalThemeOpts = () => {
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    return {
      background: isDark ? "#18181b" : "#F5F5F1",
      color: isDark ? "#F5F5F1" : "#525D53",
      confirmButtonColor: "#8DA78E",
      cancelButtonColor: "#525D53",
      customClass: {
        popup: "!rounded-3xl border-0",
      }
    };
  };

  const handleClose = () => {
    setValidationError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto) return;
    setValidationError(null);

    const nombreTrimmed = nombre.trim();
    if (!nombreTrimmed) {
      setValidationError("El nombre del producto es requerido");
      return;
    }

    const priceNum = parseFloat(precioBase);
    if (isNaN(priceNum) || priceNum < 0) {
      setValidationError("El precio base debe ser un número válido mayor o igual a 0");
      return;
    }

    const stockActualNum = parseFloat(stockActual);
    if (isNaN(stockActualNum) || stockActualNum < 0) {
      setValidationError("El stock actual debe ser un número válido mayor o igual a 0");
      return;
    }

    const stockMinimoNum = parseFloat(stockMinimo);
    if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
      setValidationError("El stock mínimo debe ser un número válido mayor o igual a 0");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("inv_productos")
        .update({
          codigo: codigo.trim() || null,
          nombre: nombreTrimmed,
          descripcion: descripcion.trim() || null,
          precio_base: priceNum,
          precio_costo: parseFloat(precioCosto) || 0,
          stock_actual: stockActualNum,
          stock_minimo: stockMinimoNum,
          proveedor_id: proveedorSeleccionado?.id || null,
          imagen_url: imagenUrl,
          fecha_vencimiento: fechaVencimiento || null,
          numero_lote: numeroLote.trim() || null,
          ubicacion: ubicacion.trim() || "Sin asignar",
          activo: activo
        })
        .eq("id", producto.id);

      if (error) {
        throw new Error(error.message);
      }

      Swal.fire({
        title: "¡Guardado!",
        text: "Los datos del producto han sido actualizados exitosamente en Supabase.",
        icon: "success",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        ...getSwalThemeOpts()
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      Swal.fire({
        title: "Error",
        text: "No se pudo actualizar el producto: " + err.message,
        icon: "error",
        ...getSwalThemeOpts(),
        confirmButtonColor: "#ef4444"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#F5F5F1] dark:bg-[#525D53]/10 border border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Editar Producto</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Modifica los detalles técnicos o ajusta los niveles de inventario del producto.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div className="flex flex-col gap-3 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Código de Barras / ID
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              placeholder="Ej: D30-4EB"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Nombre Comercial <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
            />
            {validationError && validationError.includes("nombre") && (
              <p className="text-xs text-red-500 font-bold mt-1">{validationError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Descripción / Componentes
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors h-20 resize-none"
            />
          </div>

          <div className="relative text-left" ref={ubiDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Ubicación
              </label>
              <button
                type="button"
                onClick={() => {
                  Swal.fire({
                    title: "Nueva Ubicación",
                    input: "text",
                    inputPlaceholder: "Ej: Estante A3, Nivel 1",
                    showCancelButton: true,
                    confirmButtonText: "Agregar",
                    cancelButtonText: "Cancelar",
                    ...getSwalThemeOpts()
                  }).then((result) => {
                    if (result.isConfirmed && result.value) {
                      const nueva = result.value.trim();
                      if (nueva) {
                        setUbicacion(nueva);
                        if (!ubicacionesExistentes.includes(nueva)) {
                          setUbicacionesExistentes([...ubicacionesExistentes, nueva].sort());
                        }
                      }
                    }
                  });
                }}
                className="text-[10px] font-bold text-[#8DA78E] hover:text-[#7a937b] flex items-center gap-1 transition-colors px-2 py-0.5 rounded-full bg-[#8DA78E]/10 cursor-pointer"
              >
                <Plus className="size-3" /> Nueva
              </button>
            </div>
            
            <div className="relative">
              <Box className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => {
                  setUbicacion(e.target.value);
                  setMostrarSugerenciasUbicacion(true);
                }}
                onFocus={() => setMostrarSugerenciasUbicacion(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setUbicacion((currentUbi) => {
                      if (currentUbi && !ubicacionesExistentes.includes(currentUbi)) {
                        return "";
                      }
                      return currentUbi;
                    });
                  }, 200);
                }}
                placeholder="Seleccionar o escribir ubicación..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors h-[38px]"
              />
            </div>

            <AnimatePresence>
              {mostrarSugerenciasUbicacion && sugerenciasUbicaciones.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-[150px] overflow-y-auto"
                >
                  {sugerenciasUbicaciones.map((ubi) => (
                    <div
                      key={ubi}
                      onClick={() => {
                        setUbicacion(ubi);
                        setMostrarSugerenciasUbicacion(false);
                      }}
                      className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between text-sm transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {ubi}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Imagen del Producto
            </label>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
              Formato vertical 4:3 (ancho 3 × alto 4).
            </p>
            <ImageUploader
              bucketName="Imagenes_Farmacia"
              currentImagePath={imagenUrl}
              onUploadSuccess={(path) => setImagenUrl(path)}
              onDeleteSuccess={() => setImagenUrl(null)}
              aspect={3 / 4}
              aspectLabel="4:3 vertical"
              permitirTodos={true}
              variant="product"
              onEstadoChange={({ uploading }) => setIsUploadingImage(uploading)}
            />
          </div>

          <div className="relative text-left" ref={provDropdownRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Proveedor
            </label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={proveedorBusqueda}
                onChange={(e) => {
                  setProveedorBusqueda(e.target.value);
                  setMostrarSugerenciasProv(true);
                  if (!e.target.value) setProveedorSeleccionado(null);
                }}
                onFocus={() => setMostrarSugerenciasProv(true)}
                placeholder="Buscar o seleccionar proveedor..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors h-[38px]"
              />
            </div>

            <AnimatePresence>
              {mostrarSugerenciasProv && sugerenciasProveedores.length > 0 && (
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
                        setProveedorSeleccionado(p);
                        setProveedorBusqueda(p.nombre);
                        setMostrarSugerenciasProv(false);
                      }}
                      className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-[#8DA78E]/10 dark:hover:bg-[#8DA78E]/20 text-left flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-950 dark:text-white">{p.nombre}</p>
                        {p.nit && <p className="text-[10px] text-slate-500">NIT: {p.nit}</p>}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Precio de Venta <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precioBase}
                onChange={(e) => setPrecioBase(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Precio de Costo
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precioCosto}
                onChange={(e) => setPrecioCosto(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Existencias <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Stock Mínimo <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="edit-activo"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="size-4 rounded border-slate-200 dark:border-slate-800 text-[#8DA78E] focus:ring-[#8DA78E]"
              />
              <label htmlFor="edit-activo" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase cursor-pointer">
                Producto Activo
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Lote
              </label>
              <input
                type="text"
                value={numeroLote}
                onChange={(e) => setNumeroLote(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Vencimiento
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="edit-activo"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="size-4 rounded border-slate-200 dark:border-slate-800 text-[#8DA78E] focus:ring-[#8DA78E]"
              />
              <label htmlFor="edit-activo" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase cursor-pointer">
                Producto Activo
              </label>
            </div>
          </div>
        </div>

        {validationError && !validationError.includes("nombre") && (
          <p className="text-xs text-red-500 font-bold mt-1">{validationError}</p>
        )}

        <DialogFooter className="mt-6 flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isUploadingImage}
            className="rounded-xl bg-[#8DA78E] text-[#F5F5F1] font-bold transition-all text-xs cursor-pointer"
          >
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
