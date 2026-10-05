"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import { Truck } from "lucide-react";
import ImageUploader from "@/components/imgs/ImageUploader";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalFechaInput,
  ModalInput,
  ModalLabel,
  ModalShell,
  ModalSubmit,
  ModalTextarea,
  modalActionMessage,
} from "@/components/ui/general-modal";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";
import type { Proveedor } from "@/components/(base)/proveedores/lib/zod";
import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import { useCrearLoteManual, useGuardarProducto } from "../lib/hooks";
import type { ProductFormValues } from "../lib/zod";

type PasoCreacion = "producto" | "lote";

interface CrearProductoProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearProducto({ isOpen = true, onClose, onSuccess }: CrearProductoProps) {
  const [paso, setPaso] = useState<PasoCreacion>("producto");
  const [productoId, setProductoId] = useState<string | null>(null);

  // Datos del producto
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [stockMinimo, setStockMinimo] = useState("");
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [mostrarSugerenciasProv, setMostrarSugerenciasProv] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<{ id: string; nombre: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Datos del lote
  const [codigoBarras, setCodigoBarras] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [cantidadLote, setCantidadLote] = useState("");
  const [precioCostoLote, setPrecioCostoLote] = useState("");
  const [fechaVencimientoLote, setFechaVencimientoLote] = useState("");
  const [ubicacionLote, setUbicacionLote] = useState("");

  const provDropdownRef = useRef<HTMLDivElement>(null);

  const { data: proveedores = [] } = useProveedores();
  const { mutateAsync: guardarProducto, isPending: isGuardandoProducto } = useGuardarProducto();
  const { mutateAsync: crearLote, isPending: isGuardandoLote } = useCrearLoteManual();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (provDropdownRef.current && !provDropdownRef.current.contains(event.target as Node)) {
        setMostrarSugerenciasProv(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sugerenciasProveedores = proveedorBusqueda.trim() === ""
    ? proveedores
    : proveedores.filter(
        (p: Proveedor) =>
          p.nombre.toLowerCase().includes(proveedorBusqueda.toLowerCase()) ||
          (p.nit && p.nit.toLowerCase().includes(proveedorBusqueda.toLowerCase())),
      );

  // Acciones del formulario
  const handleReset = () => {
    setPaso("producto");
    setProductoId(null);
    setNombre("");
    setDescripcion("");
    setPrecioBase("");
    setStockMinimo("");
    setImagenUrl(null);
    setProveedorBusqueda("");
    setProveedorSeleccionado(null);
    setValidationError(null);
    setCodigoBarras("");
    setNumeroLote("");
    setCantidadLote("");
    setPrecioCostoLote("");
    setFechaVencimientoLote("");
    setUbicacionLote("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const buildInput = (): ProductFormValues => ({
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    precio_base: parseFloat(precioBase) || 0,
    stock_minimo: parseFloat(stockMinimo) || 0,
    activo: true,
    imagen_url: imagenUrl,
    proveedor_id: proveedorSeleccionado?.id || null,
  });

  const validarProducto = () => {
    setValidationError(null);

    if (!nombre.trim()) {
      setValidationError("El nombre del producto es requerido");
      return false;
    }

    const priceNum = parseFloat(precioBase);
    if (isNaN(priceNum) || priceNum < 0) {
      setValidationError("El precio base debe ser un número válido mayor o igual a 0");
      return false;
    }

    const stockMinimoNum = parseFloat(stockMinimo);
    if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
      setValidationError("El stock mínimo debe ser un número válido mayor o igual a 0");
      return false;
    }

    return true;
  };

  const handleContinuarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarProducto()) return;

    try {
      const res = await guardarProducto({
        id: productoId ?? undefined,
        data: buildInput(),
      });
      const id = res.id;
      if (!id) {
        toast.error("No se obtuvo el identificador del producto.");
        return;
      }
      setProductoId(id);
      const priceNum = parseFloat(precioBase) || 0;
      if (!precioCostoLote) {
        setPrecioCostoLote(String(Math.round(priceNum * 0.65 * 100) / 100));
      }
      setPaso("lote");
      setValidationError(null);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo guardar el producto."));
    }
  };

  const handleGuardarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!productoId) {
      setValidationError("Falta el producto del catálogo. Vuelve al paso anterior.");
      return;
    }

    if (!codigoBarras.trim()) {
      setValidationError("El código de barras del lote es requerido");
      return;
    }
    if (!numeroLote.trim()) {
      setValidationError("El número de lote es requerido");
      return;
    }

    const cantidad = parseFloat(cantidadLote);
    if (isNaN(cantidad) || cantidad <= 0) {
      setValidationError("La cantidad debe ser mayor a 0");
      return;
    }

    const costo = parseFloat(precioCostoLote);
    if (isNaN(costo) || costo < 0) {
      setValidationError("El precio de costo debe ser un número válido");
      return;
    }

    const fechaIso = normalizarFechaCalendario(fechaVencimientoLote);
    if (!fechaIso) {
      setValidationError("Ingresa una fecha de vencimiento válida (DD/MM/AAAA)");
      return;
    }

    try {
      await crearLote({
        producto_id: productoId,
        codigo_barras: codigoBarras.trim(),
        numero_lote: numeroLote.trim(),
        cantidad,
        precio_costo: costo,
        fecha_vencimiento: fechaIso,
        ubicacion: ubicacionLote.trim() || null,
      });
      toast.success("Producto y primer lote registrados correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(
        modalActionMessage(code, "No se pudo registrar el lote.", {
          DUPLICATE: "Ese código de barras ya existe en otro lote.",
        }),
      );
    }
  };

  const isPending = isGuardandoProducto || isGuardandoLote;

  // Formulario de alta
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={paso === "producto" ? "Nuevo Producto" : "Registrar lote"}
      subtitle={
        paso === "producto"
          ? "Paso 1 · Catálogo maestro"
          : `Paso 2 · ${nombre.trim() || "Producto"}`
      }
      maxWidth="max-w-2xl"
      fullHeight
    >
      {paso === "producto" ? (
        <ModalForm onSubmit={handleContinuarProducto}>
          <ModalField>
            <ModalLabel htmlFor="producto-nombre">Nombre Comercial *</ModalLabel>
            <ModalInput
              id="producto-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            {validationError?.includes("nombre") ? (
              <p className="text-xs font-bold text-red-500">{validationError}</p>
            ) : null}
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="producto-descripcion">Descripción / Componentes</ModalLabel>
            <ModalTextarea
              id="producto-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
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
              <ModalLabel htmlFor="producto-proveedor">Proveedor</ModalLabel>
              <div className="relative">
                <Truck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <ModalInput
                  id="producto-proveedor"
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
              <ModalLabel htmlFor="producto-precio-base">Precio de Venta *</ModalLabel>
              <ModalInput
                id="producto-precio-base"
                type="number"
                step="0.01"
                min="0"
                value={precioBase}
                onChange={(e) => setPrecioBase(e.target.value)}
              />
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="producto-stock-minimo">Stock Mínimo Alerta *</ModalLabel>
              <ModalInput
                id="producto-stock-minimo"
                type="number"
                min="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
              />
            </ModalField>
          </div>

          <p className="text-[11px] text-zinc-500">
            En el siguiente paso registrarás el primer lote (código de barras, existencias y vencimiento).
          </p>

          {validationError && !validationError.includes("nombre") ? (
            <p className="text-xs font-bold text-red-500">{validationError}</p>
          ) : null}

          <ModalFooter>
            <ModalCancelButton onClick={handleClose} disabled={isPending || isUploadingImage} />
            <ModalSubmit
              label="Continuar"
              disabled={isPending || isUploadingImage}
            />
          </ModalFooter>
        </ModalForm>
      ) : (
        <ModalForm onSubmit={handleGuardarLote}>
          <button
            type="button"
            onClick={() => setPaso("producto")}
            className="mb-1 text-left text-xs font-bold text-[#2c5f9b] transition-opacity hover:opacity-80 dark:text-[#6f9fd4] cursor-pointer"
          >
            ← Volver al catálogo
          </button>

          <ModalField>
            <ModalLabel htmlFor="lote-codigo">Código de barras *</ModalLabel>
            <ModalInput
              id="lote-codigo"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              required
            />
          </ModalField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="lote-numero">Número de lote *</ModalLabel>
              <ModalInput
                id="lote-numero"
                value={numeroLote}
                onChange={(e) => setNumeroLote(e.target.value)}
                required
              />
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="lote-cantidad">Existencias iniciales *</ModalLabel>
              <ModalInput
                id="lote-cantidad"
                type="number"
                min="1"
                step="1"
                value={cantidadLote}
                onChange={(e) => setCantidadLote(e.target.value)}
                required
              />
            </ModalField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="lote-costo">Precio de costo *</ModalLabel>
              <ModalInput
                id="lote-costo"
                type="number"
                step="0.01"
                min="0"
                value={precioCostoLote}
                onChange={(e) => setPrecioCostoLote(e.target.value)}
                required
              />
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="lote-vencimiento">Fecha de vencimiento *</ModalLabel>
              <ModalFechaInput
                id="lote-vencimiento"
                value={fechaVencimientoLote}
                onChange={setFechaVencimientoLote}
                required
              />
            </ModalField>
          </div>

          <ModalField>
            <ModalLabel htmlFor="lote-ubicacion">Ubicación</ModalLabel>
            <ModalInput
              id="lote-ubicacion"
              value={ubicacionLote}
              onChange={(e) => setUbicacionLote(e.target.value)}
            />
          </ModalField>

          {validationError ? (
            <p className="text-xs font-bold text-red-500">{validationError}</p>
          ) : null}

          <ModalFooter>
            <ModalCancelButton onClick={handleClose} disabled={isPending} />
            <ModalSubmit disabled={isPending} label="Guardar" />
          </ModalFooter>
        </ModalForm>
      )}
    </ModalShell>
  );
}
