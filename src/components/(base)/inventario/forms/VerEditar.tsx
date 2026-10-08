"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/imgs/ImageUploader";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalShell,
  ModalSubmit,
  ModalTextarea,
  modalActionMessage,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { cn } from "@/lib/utils";
import { useGuardarProducto } from "../lib/hooks";
import {
  DUPLICATE_PRODUCTO_MSG,
  FORMAS_FARMACEUTICAS,
  type FormaFarmaceutica,
  type ProductFormValues,
  type Producto,
} from "../lib/zod";

interface EditarProductoProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  producto: Producto | null;
}

export function EditarProducto({ isOpen = true, onClose, onSuccess, producto }: EditarProductoProps) {
  if (!producto) return null;

  return (
    <EditarProductoForm
      key={producto.id}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      producto={producto}
    />
  );
}

function EditarProductoForm({
  isOpen = true,
  onClose,
  onSuccess,
  producto,
}: EditarProductoProps & { producto: Producto }) {
  const [nombre, setNombre] = useState(producto.nombre || "");
  const [nombreGenerico, setNombreGenerico] = useState(producto.nombre_generico || "");
  const [concentracion, setConcentracion] = useState(producto.concentracion || "");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<FormaFarmaceutica>(
    (producto.forma_farmaceutica as FormaFarmaceutica) || "tableta",
  );
  const [presentacion, setPresentacion] = useState(producto.presentacion || "");
  const [unidadVenta, setUnidadVenta] = useState(producto.unidad_venta || "unidad");
  const [requiereReceta, setRequiereReceta] = useState(Boolean(producto.requiere_receta));
  const [descripcion, setDescripcion] = useState(producto.descripcion || "");
  const [precioBase, setPrecioBase] = useState(producto.precio_base?.toString() || "0");
  const [stockMinimo, setStockMinimo] = useState(producto.stock_minimo?.toString() || "0");
  const [activo, setActivo] = useState(producto.activo !== false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(producto.imagen_url || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutateAsync: guardarProducto, isPending } = useGuardarProducto();

  const handleClose = () => {
    setValidationError(null);
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
    activo,
    imagen_url: imagenUrl,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!nombre.trim()) {
      setValidationError("El nombre comercial es requerido");
      return;
    }
    if (nombreGenerico.trim().length < 2) {
      setValidationError("El nombre genérico debe tener al menos 2 caracteres");
      return;
    }
    if (!concentracion.trim()) {
      setValidationError("La concentración es requerida");
      return;
    }
    if (!presentacion.trim()) {
      setValidationError("La presentación es requerida");
      return;
    }

    const priceNum = parseFloat(precioBase);
    if (isNaN(priceNum) || priceNum < 0) {
      setValidationError("El precio sugerido debe ser un número válido mayor o igual a 0");
      return;
    }

    const stockMinimoNum = parseFloat(stockMinimo);
    if (isNaN(stockMinimoNum) || stockMinimoNum < 0) {
      setValidationError("La existencia mínima debe ser un número válido mayor o igual a 0");
      return;
    }

    try {
      await guardarProducto({ id: producto.id, data: buildInput() });
      toast.success("Producto actualizado correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(
        modalActionMessage(code, "No se pudo actualizar el producto.", {
          DUPLICATE: DUPLICATE_PRODUCTO_MSG,
        }),
      );
    }
  };

  const selectClass = cn(
    modalFieldClass,
    "h-10 w-full rounded-lg bg-transparent px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-none",
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Producto"
      subtitle="Catálogo maestro"
      maxWidth="max-w-2xl"
      fullHeight
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel htmlFor="editar-producto-nombre">Nombre comercial *</ModalLabel>
          <ModalInput
            id="editar-producto-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-producto-nombre-generico">Nombre genérico *</ModalLabel>
          <ModalInput
            id="editar-producto-nombre-generico"
            value={nombreGenerico}
            onChange={(e) => setNombreGenerico(e.target.value)}
            required
          />
        </ModalField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModalField>
            <ModalLabel htmlFor="editar-producto-concentracion">Concentración *</ModalLabel>
            <ModalInput
              id="editar-producto-concentracion"
              value={concentracion}
              onChange={(e) => setConcentracion(e.target.value)}
              placeholder="500 mg"
              required
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-producto-forma">Forma farmacéutica *</ModalLabel>
            <select
              id="editar-producto-forma"
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
            <ModalLabel htmlFor="editar-producto-presentacion">Presentación *</ModalLabel>
            <ModalInput
              id="editar-producto-presentacion"
              value={presentacion}
              onChange={(e) => setPresentacion(e.target.value)}
              placeholder="Caja x 100 tabletas"
              required
            />
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-producto-unidad-venta">Unidad de venta</ModalLabel>
            <ModalInput
              id="editar-producto-unidad-venta"
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
          <ModalLabel htmlFor="editar-producto-descripcion">Descripción</ModalLabel>
          <ModalTextarea
            id="editar-producto-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </ModalField>

        <p className="text-xs text-zinc-500">
          Stock actual (suma de lotes): <strong>{producto.stock_actual}</strong> unidades
        </p>

        <ModalField>
          <ModalLabel>Imagen del Producto</ModalLabel>
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
            <ModalLabel htmlFor="editar-producto-precio-base">Precio sugerido *</ModalLabel>
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
            <ModalLabel htmlFor="editar-producto-stock-minimo">Existencia mínima *</ModalLabel>
            <ModalInput
              id="editar-producto-stock-minimo"
              type="number"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
            />
          </ModalField>
        </div>

        <ModalField>
          <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="size-4 rounded border-zinc-300"
            />
            Producto activo en catálogo
          </label>
        </ModalField>

        {validationError ? <p className="text-xs font-bold text-red-500">{validationError}</p> : null}

        <ModalFooter>
          <ModalCancelButton onClick={handleClose} disabled={isPending || isUploadingImage} />
          <ModalSubmit disabled={isPending || isUploadingImage} />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
