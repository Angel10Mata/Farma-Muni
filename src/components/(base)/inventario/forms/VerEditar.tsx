"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import { Box, Truck } from "lucide-react";
import ImageUploader from "@/components/imgs/ImageUploader";
import {
  ModalCancelButton,
  ModalField,
  ModalFechaInput,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalShell,
  ModalSubmit,
  ModalTextarea,
  modalActionMessage,
} from "@/components/ui/general-modal";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";
import type { Proveedor } from "@/components/(base)/proveedores/lib/zod";
import { useGuardarProducto, useUbicaciones } from "../lib/hooks";
import type { ProductFormValues, Producto } from "../lib/zod";

interface EditarProductoProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  producto: Producto | null;
}

export function EditarProducto({ isOpen = true, onClose, onSuccess, producto }: EditarProductoProps) {
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
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [mostrarSugerenciasProv, setMostrarSugerenciasProv] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<{ id: string; nombre: string } | null>(null);
  const [mostrarSugerenciasUbicacion, setMostrarSugerenciasUbicacion] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const provDropdownRef = useRef<HTMLDivElement>(null);
  const ubiDropdownRef = useRef<HTMLDivElement>(null);

  const { data: proveedores = [] } = useProveedores();
  const { data: ubicacionesExistentes = [] } = useUbicaciones();
  const { mutateAsync: guardarProducto, isPending } = useGuardarProducto();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (provDropdownRef.current && !provDropdownRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasProv(false);
      }
      if (ubiDropdownRef.current && !ubiDropdownRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasUbicacion(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!producto) return;

    setCodigo(producto.codigo || "");
    setNombre(producto.nombre || "");
    setDescripcion(producto.descripcion || "");
    setPrecioBase(producto.precio_base?.toString() || "0");
    setPrecioCosto(
      producto.precio_costo !== undefined && producto.precio_costo !== null
        ? producto.precio_costo.toString()
        : "",
    );
    setStockActual(producto.stock_actual?.toString() || "0");
    setStockMinimo(producto.stock_minimo?.toString() || "0");
    setActivo(producto.activo !== false);
    setImagenUrl(producto.imagen_url || null);
    setFechaVencimiento(producto.fecha_vencimiento || "");
    setNumeroLote(producto.numero_lote || "");
    setUbicacion(producto.ubicacion && producto.ubicacion !== "Sin asignar" ? producto.ubicacion : "");

    if (producto.proveedor_id) {
      const pNombre = producto.inv_proveedores?.nombre || "";
      setProveedorSeleccionado({ id: producto.proveedor_id, nombre: pNombre });
      setProveedorBusqueda(pNombre);
    } else {
      setProveedorSeleccionado(null);
      setProveedorBusqueda("");
    }
  }, [producto, isOpen]);

  useEffect(() => {
    if (producto?.proveedor_id && proveedores.length > 0) {
      const match = proveedores.find((p) => p.id === producto.proveedor_id);
      if (match) {
        setProveedorSeleccionado({ id: match.id, nombre: match.nombre });
        setProveedorBusqueda(match.nombre);
      }
    }
  }, [producto, proveedores]);

  const sugerenciasProveedores = proveedorBusqueda.trim() === ""
    ? proveedores
    : proveedores.filter(
        (p: Proveedor) =>
          p.nombre.toLowerCase().includes(proveedorBusqueda.toLowerCase()) ||
          (p.nit && p.nit.toLowerCase().includes(proveedorBusqueda.toLowerCase())),
      );

  const sugerenciasUbicaciones = ubicacion.trim() === ""
    ? ubicacionesExistentes
    : ubicacionesExistentes.filter((u) => u.toLowerCase().includes(ubicacion.toLowerCase()));

  const handleClose = () => {
    setValidationError(null);
    onClose();
  };

  const buildInput = (): ProductFormValues => ({
    nombre: nombre.trim(),
    codigo: codigo.trim(),
    descripcion: descripcion.trim(),
    precio_base: parseFloat(precioBase) || 0,
    precio_costo: precioCosto.trim() ? parseFloat(precioCosto) : 0,
    stock_actual: parseFloat(stockActual) || 0,
    stock_minimo: parseFloat(stockMinimo) || 0,
    activo,
    imagen_url: imagenUrl,
    proveedor_id: proveedorSeleccionado?.id || null,
    ubicacion: ubicacion.trim() || "Sin asignar",
    fecha_vencimiento: fechaVencimiento || null,
    numero_lote: numeroLote.trim() || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto) return;
    setValidationError(null);

    if (!nombre.trim()) {
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

    try {
      await guardarProducto({ id: producto.id, data: buildInput() });
      toast.success("Producto actualizado correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo actualizar el producto."));
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Producto"
      subtitle="Actualización de datos"
      maxWidth="max-w-2xl"
      fullHeight
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel htmlFor="editar-producto-codigo">Código de Barras / ID</ModalLabel>
          <ModalInput
            id="editar-producto-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: D30-4EB"
          />
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-producto-nombre">Nombre Comercial *</ModalLabel>
          <ModalInput
            id="editar-producto-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          {validationError?.includes("nombre") ? (
            <p className="text-xs font-bold text-red-500">{validationError}</p>
          ) : null}
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-producto-descripcion">Descripción / Componentes</ModalLabel>
          <ModalTextarea
            id="editar-producto-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </ModalField>

        <ModalField>
          <div className="relative" ref={ubiDropdownRef}>
            <ModalLabel htmlFor="editar-producto-ubicacion">Ubicación</ModalLabel>
            <div className="relative">
              <Box className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <ModalInput
                id="editar-producto-ubicacion"
                value={ubicacion}
                onChange={(e) => {
                  setUbicacion(e.target.value);
                  setMostrarSugerenciasUbicacion(true);
                }}
                onFocus={() => setMostrarSugerenciasUbicacion(true)}
                placeholder="Seleccionar o escribir ubicación..."
                className="pl-9"
              />
            </div>
            <AnimatePresence>
              {mostrarSugerenciasUbicacion && sugerenciasUbicaciones.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute z-[200] mt-1 max-h-[150px] w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white opacity-100 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {sugerenciasUbicaciones.map((ubi) => (
                    <button
                      key={ubi}
                      type="button"
                      onClick={() => {
                        setUbicacion(ubi);
                        setMostrarSugerenciasUbicacion(false);
                      }}
                      className="w-full border-b border-zinc-100 px-4 py-2 text-left text-sm font-medium text-zinc-700 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {ubi}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </ModalField>

        <ModalField>
          <ModalLabel>Imagen del Producto</ModalLabel>
          <p className="text-[11px] text-zinc-500">Formato vertical 4:3 (ancho 3 × alto 4).</p>
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
        </ModalField>

        <ModalField>
          <div className="relative" ref={provDropdownRef}>
            <ModalLabel htmlFor="editar-producto-proveedor">Proveedor</ModalLabel>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <ModalInput
                id="editar-producto-proveedor"
                value={proveedorBusqueda}
                onChange={(e) => {
                  setProveedorBusqueda(e.target.value);
                  setMostrarSugerenciasProv(true);
                  if (!e.target.value) setProveedorSeleccionado(null);
                }}
                onFocus={() => setMostrarSugerenciasProv(true)}
                placeholder="Buscar o seleccionar proveedor..."
                className="pl-9"
              />
            </div>
            <AnimatePresence>
              {mostrarSugerenciasProv && sugerenciasProveedores.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-[200] mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white opacity-100 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {sugerenciasProveedores.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProveedorSeleccionado({ id: p.id, nombre: p.nombre });
                        setProveedorBusqueda(p.nombre);
                        setMostrarSugerenciasProv(false);
                      }}
                      className="w-full border-b border-zinc-100 px-4 py-2 text-left transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    >
                      <p className="text-xs font-bold text-zinc-950 dark:text-white">{p.nombre}</p>
                      {p.nit ? <p className="text-[10px] text-zinc-500">NIT: {p.nit}</p> : null}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </ModalField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModalField>
            <ModalLabel htmlFor="editar-producto-precio-base">Precio de Venta *</ModalLabel>
            <ModalInput
              id="editar-producto-precio-base"
              type="number"
              step="0.01"
              min="0"
              value={precioBase}
              onChange={(e) => setPrecioBase(e.target.value)}
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-producto-precio-costo">Precio de Costo</ModalLabel>
            <ModalInput
              id="editar-producto-precio-costo"
              type="number"
              step="0.01"
              min="0"
              value={precioCosto}
              onChange={(e) => setPrecioCosto(e.target.value)}
              placeholder="Opcional"
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-producto-stock-actual">Existencias *</ModalLabel>
            <ModalInput
              id="editar-producto-stock-actual"
              type="number"
              min="0"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-producto-stock-minimo">Stock Mínimo *</ModalLabel>
            <ModalInput
              id="editar-producto-stock-minimo"
              type="number"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-producto-lote">Lote</ModalLabel>
            <ModalInput
              id="editar-producto-lote"
              value={numeroLote}
              onChange={(e) => setNumeroLote(e.target.value)}
              placeholder="Opcional"
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-producto-vencimiento">Vencimiento</ModalLabel>
            <ModalFechaInput
              id="editar-producto-vencimiento"
              value={fechaVencimiento}
              onChange={setFechaVencimiento}
            />
          </ModalField>
        </div>

        <ModalField>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editar-producto-activo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="size-4 rounded border-zinc-200 text-[#2c5f9b] focus:ring-[#2c5f9b] dark:border-zinc-700"
            />
            <ModalLabel htmlFor="editar-producto-activo" className="mb-0 cursor-pointer">
              Producto Activo
            </ModalLabel>
          </div>
        </ModalField>

        {validationError && !validationError.includes("nombre") ? (
          <p className="text-xs font-bold text-red-500">{validationError}</p>
        ) : null}

        <ModalFooter>
          <ModalCancelButton onClick={handleClose} disabled={isPending || isUploadingImage} />
          <ModalSubmit disabled={isPending || isUploadingImage} />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
