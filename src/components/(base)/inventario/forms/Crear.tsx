"use client";

import { useState } from "react";
import { toast } from "react-toastify";
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
  modalFieldClass,
} from "@/components/ui/general-modal";
import { cn } from "@/lib/utils";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";
import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import { useCrearLoteManual, useGuardarProducto } from "../lib/hooks";
import {
  DUPLICATE_LOTE_MSG,
  DUPLICATE_PRODUCTO_MSG,
  FORMAS_FARMACEUTICAS,
  type FormaFarmaceutica,
  type ProductFormValues,
} from "../lib/zod";

type PasoCreacion = "producto" | "lote";

interface CrearProductoProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearProducto({ isOpen = true, onClose, onSuccess }: CrearProductoProps) {
  const [paso, setPaso] = useState<PasoCreacion>("producto");
  const [productoId, setProductoId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [nombreGenerico, setNombreGenerico] = useState("");
  const [concentracion, setConcentracion] = useState("");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<FormaFarmaceutica>("tableta");
  const [presentacion, setPresentacion] = useState("");
  const [unidadVenta, setUnidadVenta] = useState("unidad");
  const [requiereReceta, setRequiereReceta] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [stockMinimo, setStockMinimo] = useState("");
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [proveedorLoteId, setProveedorLoteId] = useState("");
  const [laboratorioLote, setLaboratorioLote] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [cantidadLote, setCantidadLote] = useState("");
  const [precioCostoLote, setPrecioCostoLote] = useState("");
  const [precioVentaLote, setPrecioVentaLote] = useState("");
  const [fechaVencimientoLote, setFechaVencimientoLote] = useState("");
  const [ubicacionLote, setUbicacionLote] = useState("");

  const { data: proveedores = [] } = useProveedores();
  const { mutateAsync: guardarProducto, isPending: isGuardandoProducto } = useGuardarProducto();
  const { mutateAsync: crearLote, isPending: isGuardandoLote } = useCrearLoteManual();

  const handleReset = () => {
    setPaso("producto");
    setProductoId(null);
    setNombre("");
    setNombreGenerico("");
    setConcentracion("");
    setFormaFarmaceutica("tableta");
    setPresentacion("");
    setUnidadVenta("unidad");
    setRequiereReceta(false);
    setDescripcion("");
    setPrecioBase("");
    setStockMinimo("");
    setImagenUrl(null);
    setValidationError(null);
    setProveedorLoteId("");
    setLaboratorioLote("");
    setCodigoBarras("");
    setNumeroLote("");
    setCantidadLote("");
    setPrecioCostoLote("");
    setPrecioVentaLote("");
    setFechaVencimientoLote("");
    setUbicacionLote("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const buildInput = (): ProductFormValues => ({
    nombre: nombre.trim(),
    nombre_generico: nombreGenerico.trim(),
    concentracion: concentracion.trim(),
    forma_farmaceutica: formaFarmaceutica,
    presentacion: presentacion.trim(),
    unidad_venta: unidadVenta.trim() || "unidad",
    requiere_receta: requiereReceta,
    descripcion: descripcion.trim(),
    precio_base: parseFloat(precioBase) || 0,
    stock_minimo: parseFloat(stockMinimo) || 0,
    activo: true,
    imagen_url: imagenUrl,
  });

  const validarProducto = () => {
    setValidationError(null);

    if (!nombre.trim()) {
      setValidationError("El nombre comercial es requerido");
      return false;
    }
    if (nombreGenerico.trim().length < 2) {
      setValidationError("El nombre genérico debe tener al menos 2 caracteres");
      return false;
    }
    if (!concentracion.trim()) {
      setValidationError("La concentración es requerida");
      return false;
    }
    if (!presentacion.trim()) {
      setValidationError("La presentación es requerida");
      return false;
    }

    const priceNum = parseFloat(precioBase);
    if (isNaN(priceNum) || priceNum < 0) {
      setValidationError("El precio sugerido debe ser un número válido mayor o igual a 0");
      return false;
    }

    const stockMinimoNum = parseFloat(stockMinimo);
    if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
      setValidationError("La existencia mínima debe ser un número válido mayor o igual a 0");
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
      setPrecioVentaLote(String(priceNum));
      if (!precioCostoLote) {
        setPrecioCostoLote(String(Math.round(priceNum * 0.65 * 100) / 100));
      }
      setPaso("lote");
      setValidationError(null);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(
        modalActionMessage(code, "No se pudo guardar el producto.", {
          DUPLICATE: DUPLICATE_PRODUCTO_MSG,
        }),
      );
    }
  };

  const handleGuardarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!productoId) {
      setValidationError("Falta el producto del catálogo. Vuelve al paso anterior.");
      return;
    }

    if (!proveedorLoteId) {
      setValidationError("Selecciona un proveedor para el lote");
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
      setValidationError("El costo unitario debe ser un número válido");
      return;
    }

    const precioVenta = parseFloat(precioVentaLote);
    if (isNaN(precioVenta) || precioVenta < 0) {
      setValidationError("El precio de venta debe ser un número válido");
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
        proveedor_id: proveedorLoteId,
        codigo_barras: codigoBarras.trim(),
        numero_lote: numeroLote.trim(),
        cantidad,
        precio_costo: costo,
        precio_venta: precioVenta,
        laboratorio: laboratorioLote.trim() || null,
        fecha_vencimiento: fechaIso,
        ubicacion: ubicacionLote.trim() || null,
      });
      toast.success("Producto y primer lote registrados correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      const detail = err instanceof Error ? (err as Error & { detail?: string }).detail : undefined;
      toast.error(
        modalActionMessage(code, "No se pudo registrar el lote.", {
          DUPLICATE: detail ?? DUPLICATE_LOTE_MSG,
        }),
      );
    }
  };

  const isPending = isGuardandoProducto || isGuardandoLote;

  const selectClass = cn(
    modalFieldClass,
    "h-10 w-full rounded-lg bg-transparent px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-none",
  );

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
            <ModalLabel htmlFor="producto-nombre">Nombre comercial *</ModalLabel>
            <ModalInput
              id="producto-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="producto-nombre-generico">Nombre genérico *</ModalLabel>
            <ModalInput
              id="producto-nombre-generico"
              value={nombreGenerico}
              onChange={(e) => setNombreGenerico(e.target.value)}
              required
            />
          </ModalField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="producto-concentracion">Concentración *</ModalLabel>
              <ModalInput
                id="producto-concentracion"
                value={concentracion}
                onChange={(e) => setConcentracion(e.target.value)}
                placeholder="500 mg"
                required
              />
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="producto-forma">Forma farmacéutica *</ModalLabel>
              <select
                id="producto-forma"
                value={formaFarmaceutica}
                onChange={(e) => setFormaFarmaceutica(e.target.value as FormaFarmaceutica)}
                className={selectClass}
              >
                {FORMAS_FARMACEUTICAS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </ModalField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="producto-presentacion">Presentación *</ModalLabel>
              <ModalInput
                id="producto-presentacion"
                value={presentacion}
                onChange={(e) => setPresentacion(e.target.value)}
                placeholder="Caja x 100 tabletas"
                required
              />
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="producto-unidad-venta">Unidad de venta</ModalLabel>
              <ModalInput
                id="producto-unidad-venta"
                value={unidadVenta}
                onChange={(e) => setUnidadVenta(e.target.value)}
                placeholder="tableta"
              />
            </ModalField>
          </div>

          <ModalField>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Requiere receta</span>
              <button
                type="button"
                role="switch"
                aria-checked={requiereReceta}
                onClick={() => setRequiereReceta((v) => !v)}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  requiereReceta ? "bg-[#2c5f9b] dark:bg-[#6f9fd4]" : "bg-zinc-300 dark:bg-zinc-600",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    requiereReceta ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </label>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="producto-precio-base">Precio sugerido *</ModalLabel>
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
              <ModalLabel htmlFor="producto-stock-minimo">Existencia mínima *</ModalLabel>
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
            En el siguiente paso registrarás el primer lote (proveedor, código de barras, existencias y vencimiento).
          </p>

          {validationError ? <p className="text-xs font-bold text-red-500">{validationError}</p> : null}

          <ModalFooter>
            <ModalCancelButton onClick={handleClose} disabled={isPending || isUploadingImage} />
            <ModalSubmit label="Continuar" disabled={isPending || isUploadingImage} />
          </ModalFooter>
        </ModalForm>
      ) : (
        <ModalForm onSubmit={handleGuardarLote}>
          <button
            type="button"
            onClick={() => setPaso("producto")}
            className="mb-1 cursor-pointer text-left text-xs font-bold text-[#2c5f9b] transition-opacity hover:opacity-80 dark:text-[#6f9fd4]"
          >
            ← Volver al catálogo
          </button>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="lote-proveedor">Proveedor *</ModalLabel>
              <select
                id="lote-proveedor"
                value={proveedorLoteId}
                onChange={(e) => setProveedorLoteId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="lote-laboratorio">Laboratorio</ModalLabel>
              <ModalInput
                id="lote-laboratorio"
                value={laboratorioLote}
                onChange={(e) => setLaboratorioLote(e.target.value)}
                placeholder="Opcional"
              />
            </ModalField>
          </div>

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
              <ModalLabel htmlFor="lote-cantidad">Cantidad *</ModalLabel>
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
              <ModalLabel htmlFor="lote-costo">Costo unitario *</ModalLabel>
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
              <ModalLabel htmlFor="lote-precio-venta">Precio de venta *</ModalLabel>
              <ModalInput
                id="lote-precio-venta"
                type="number"
                step="0.01"
                min="0"
                value={precioVentaLote}
                onChange={(e) => setPrecioVentaLote(e.target.value)}
                required
              />
            </ModalField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="lote-vencimiento">Fecha de vencimiento *</ModalLabel>
              <ModalFechaInput
                id="lote-vencimiento"
                value={fechaVencimientoLote}
                onChange={setFechaVencimientoLote}
                required
              />
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="lote-ubicacion">Ubicación</ModalLabel>
              <ModalInput
                id="lote-ubicacion"
                value={ubicacionLote}
                onChange={(e) => setUbicacionLote(e.target.value)}
              />
            </ModalField>
          </div>

          {validationError ? <p className="text-xs font-bold text-red-500">{validationError}</p> : null}

          <ModalFooter>
            <ModalCancelButton onClick={handleClose} disabled={isPending} />
            <ModalSubmit disabled={isPending} label="Guardar" />
          </ModalFooter>
        </ModalForm>
      )}
    </ModalShell>
  );
}
