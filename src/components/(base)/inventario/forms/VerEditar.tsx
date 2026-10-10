"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "react-toastify";
import type { ZodError } from "zod";
import { Check, ChevronLeft, ChevronRight, Save, X } from "lucide";
import ImageUploader from "@/components/imgs/ImageUploader";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalSelect,
  ModalShell,
  ModalTextarea,
  modalAccentClass,
  modalActionMessage,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { cn } from "@/lib/utils";
import { useGuardarProducto, useProductoDuplicadoExacto } from "../lib/hooks";
import {
  lineaSugerenciaProductoCatalogo,
  nombreGenericoListoParaDuplicado,
} from "../lib/helpers";
import {
  DUPLICATE_PRODUCTO_MSG,
  EDITAR_PRODUCTO_WIZARD_PASOS,
  EDITAR_PRODUCTO_WIZARD_PASOS_META,
  FORMAS_FARMACEUTICAS,
  productoWizardPaso1Schema,
  productoWizardPaso2Schema,
  type FormaFarmaceutica,
  type ProductFormValues,
  type Producto,
  type ProductoSugerencia,
} from "../lib/zod";

const WIZARD_CONTENIDO_MIN_H = "min-h-[22rem]";

const CAMPOS_IDENTIFICACION = [
  "nombre",
  "nombre_generico",
  "concentracion",
  "forma_farmaceutica",
  "presentacion",
] as const;

const CAMPOS_VENTA = ["unidad_venta", "precio_base", "stock_minimo"] as const;

function aplicarErroresZod(
  error: ZodError,
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>,
  fields: readonly string[],
) {
  setFieldErrors((prev) => {
    const next = { ...prev };
    for (const key of fields) {
      delete next[key];
    }
    for (const issue of error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && fields.includes(path)) {
        next[path] = issue.message;
      }
    }
    return next;
  });
}

function CampoError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-bold text-red-500">{message}</p>;
}

function AlertaGenericoDuplicado({ producto }: { producto: ProductoSugerencia }) {
  return (
    <div
      className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-3 dark:border-amber-800/80 dark:bg-amber-950/40"
      role="alert"
    >
      <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
        Ya existe otro producto con este nombre genérico.
      </p>
      <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/80">
        {lineaSugerenciaProductoCatalogo(producto)}
        {producto.nombre.trim() ? (
          <span className="mt-0.5 block text-[10px] opacity-80">{producto.nombre}</span>
        ) : null}
      </p>
    </div>
  );
}

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
  const [wizardStep, setWizardStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const { mutateAsync: guardarProducto, isPending } = useGuardarProducto();

  const nombreGenericoParaDuplicado = nombreGenerico.trim();

  const verificacionDuplicadoActiva =
    isOpen && wizardStep === 1 && nombreGenericoListoParaDuplicado(nombreGenericoParaDuplicado);

  const {
    data: duplicadoExactoLive,
    isFetching: buscandoDuplicado,
    isDebouncing: debounceDuplicado,
  } = useProductoDuplicadoExacto(nombreGenericoParaDuplicado, verificacionDuplicadoActiva);

  const productoDuplicadoOtro =
    verificacionDuplicadoActiva && !debounceDuplicado && !buscandoDuplicado && duplicadoExactoLive
      ? duplicadoExactoLive.id !== producto.id
        ? duplicadoExactoLive
        : null
      : null;

  const bloqueaAvancePaso1 = wizardStep === 1 && productoDuplicadoOtro !== null;

  const handleClose = () => {
    setFieldErrors({});
    setWizardStep(1);
    onClose();
  };

  const limpiarErroresCampos = (keys: readonly string[]) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        delete next[key];
      }
      return next;
    });
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

  const inputErrorClass = (key: string) =>
    fieldErrors[key]
      ? "border-red-500 dark:border-red-500 focus-visible:ring-red-500/25"
      : undefined;

  const validarPaso1 = () => {
    limpiarErroresCampos(CAMPOS_IDENTIFICACION);
    const parsed = productoWizardPaso1Schema.safeParse({
      nombre: nombre.trim(),
      nombre_generico: nombreGenerico.trim(),
      concentracion: concentracion.trim(),
      forma_farmaceutica: formaFarmaceutica,
      presentacion: presentacion.trim(),
    });
    if (!parsed.success) {
      aplicarErroresZod(parsed.error, setFieldErrors, CAMPOS_IDENTIFICACION);
      toast.warn("Revisa los datos del formulario.");
      return false;
    }
    if (debounceDuplicado || buscandoDuplicado) {
      toast.warn("Verificando si el nombre genérico ya existe…");
      return false;
    }
    if (productoDuplicadoOtro) {
      toast.warn(DUPLICATE_PRODUCTO_MSG);
      return false;
    }
    return true;
  };

  const validarPaso2 = () => {
    limpiarErroresCampos(CAMPOS_VENTA);
    const parsed = productoWizardPaso2Schema.safeParse({
      unidad_venta: unidadVenta.trim() || "unidad",
      requiere_receta: requiereReceta,
      precio_base: parseFloat(precioBase),
      stock_minimo: parseFloat(stockMinimo),
    });
    if (!parsed.success) {
      aplicarErroresZod(parsed.error, setFieldErrors, CAMPOS_VENTA);
      toast.warn("Revisa los datos del formulario.");
      return false;
    }
    return true;
  };

  const guardar = async () => {
    if (!validarPaso1() || !validarPaso2()) {
      if (!validarPaso1()) setWizardStep(1);
      else if (!validarPaso2()) setWizardStep(2);
      return;
    }

    try {
      await guardarProducto({ id: producto.id, data: buildInput() });
      toast.success("Producto actualizado correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      if (code === "DUPLICATE") {
        toast.error(DUPLICATE_PRODUCTO_MSG);
        setFieldErrors((prev) => ({ ...prev, nombre_generico: DUPLICATE_PRODUCTO_MSG }));
        setWizardStep(1);
        return;
      }
      toast.error(
        modalActionMessage(code, "No se pudo actualizar el producto.", {
          DUPLICATE: DUPLICATE_PRODUCTO_MSG,
        }),
      );
    }
  };

  const handleSiguiente = () => {
    if (wizardStep === 1) {
      if (!validarPaso1()) return;
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (!validarPaso2()) return;
      setWizardStep(3);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep < EDITAR_PRODUCTO_WIZARD_PASOS) {
      handleSiguiente();
      return;
    }
    void guardar();
  };

  const handleAtras = () => {
    limpiarErroresCampos([...CAMPOS_IDENTIFICACION, ...CAMPOS_VENTA]);
    setWizardStep((s) => Math.max(1, s - 1));
  };

  const bloqueadoPorImagen = isUploadingImage;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Producto"
      maxWidth="max-w-2xl"
      fullHeight
    >
      <ModalForm
        noValidate
        onSubmit={handleFormSubmit}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <div className="shrink-0 space-y-2">
          <div className="flex gap-1.5">
            {EDITAR_PRODUCTO_WIZARD_PASOS_META.map((meta, index) => {
              const stepNum = index + 1;
              const activo = wizardStep === stepNum;
              const completado = wizardStep > stepNum;
              return (
                <div key={meta.titulo} className="flex min-w-0 flex-1 flex-col gap-1">
                  <div
                    className={cn(
                      "h-1 rounded-full",
                      activo || completado
                        ? "bg-[#2c5f9b] dark:bg-[#6f9fd4]"
                        : "bg-zinc-200 dark:bg-zinc-700",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-center text-[10px] font-semibold md:hidden",
                      activo ? modalAccentClass : "text-muted-foreground",
                    )}
                  >
                    {stepNum}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-center text-[10px] font-semibold md:block",
                      activo ? modalAccentClass : "text-muted-foreground",
                    )}
                  >
                    {meta.titulo}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cn("min-h-0 flex-1 space-y-3", WIZARD_CONTENIDO_MIN_H)}>
          <div
            className={cn("space-y-4", wizardStep !== 1 && "hidden")}
            aria-hidden={wizardStep !== 1}
          >
            <ModalField>
              <ModalLabel htmlFor="editar-producto-nombre">Nombre comercial *</ModalLabel>
              <ModalInput
                id="editar-producto-nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  limpiarErroresCampos(["nombre"]);
                }}
                className={inputErrorClass("nombre")}
              />
              <CampoError message={fieldErrors.nombre} />
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="editar-producto-nombre-generico">Nombre genérico *</ModalLabel>
              <ModalInput
                id="editar-producto-nombre-generico"
                value={nombreGenerico}
                onChange={(e) => {
                  setNombreGenerico(e.target.value);
                  limpiarErroresCampos(["nombre_generico"]);
                }}
                className={inputErrorClass("nombre_generico")}
              />
              <CampoError message={fieldErrors.nombre_generico} />
              {debounceDuplicado || buscandoDuplicado ? (
                <p className="text-xs text-zinc-500">Comprobando catálogo…</p>
              ) : null}
              {productoDuplicadoOtro ? (
                <AlertaGenericoDuplicado producto={productoDuplicadoOtro} />
              ) : null}
            </ModalField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="editar-producto-concentracion">Concentración *</ModalLabel>
                <ModalInput
                  id="editar-producto-concentracion"
                  value={concentracion}
                  onChange={(e) => {
                    setConcentracion(e.target.value);
                    limpiarErroresCampos(["concentracion"]);
                  }}
                  className={inputErrorClass("concentracion")}
                />
                <CampoError message={fieldErrors.concentracion} />
              </ModalField>

              <ModalField>
                <ModalLabel htmlFor="editar-producto-forma">Forma farmacéutica *</ModalLabel>
                <ModalSelect
                  id="editar-producto-forma"
                  value={formaFarmaceutica}
                  onChange={(e) => {
                    setFormaFarmaceutica(e.target.value as FormaFarmaceutica);
                    limpiarErroresCampos(["forma_farmaceutica"]);
                  }}
                  className={inputErrorClass("forma_farmaceutica")}
                >
                  {FORMAS_FARMACEUTICAS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </ModalSelect>
                <CampoError message={fieldErrors.forma_farmaceutica} />
              </ModalField>
            </div>

            <ModalField>
              <ModalLabel htmlFor="editar-producto-presentacion">Presentación *</ModalLabel>
              <ModalInput
                id="editar-producto-presentacion"
                value={presentacion}
                onChange={(e) => {
                  setPresentacion(e.target.value);
                  limpiarErroresCampos(["presentacion"]);
                }}
                className={inputErrorClass("presentacion")}
              />
              <CampoError message={fieldErrors.presentacion} />
            </ModalField>
          </div>

          <div
            className={cn("space-y-4", wizardStep !== 2 && "hidden")}
            aria-hidden={wizardStep !== 2}
          >
            <ModalField>
              <ModalLabel htmlFor="editar-producto-unidad-venta">Unidad de venta</ModalLabel>
              <ModalInput
                id="editar-producto-unidad-venta"
                value={unidadVenta}
                onChange={(e) => {
                  setUnidadVenta(e.target.value);
                  limpiarErroresCampos(["unidad_venta"]);
                }}
                className={inputErrorClass("unidad_venta")}
              />
              <p className="text-[11px] text-zinc-500">
                Todo el inventario se cuenta en esta unidad.
              </p>
              <CampoError message={fieldErrors.unidad_venta} />
            </ModalField>

            <ModalField>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  Requiere receta
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={requiereReceta}
                  onClick={() => setRequiereReceta((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    requiereReceta
                      ? "bg-[#2c5f9b] dark:bg-[#6f9fd4]"
                      : "bg-zinc-300 dark:bg-zinc-600",
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="editar-producto-precio-base">Precio sugerido *</ModalLabel>
                <ModalInput
                  id="editar-producto-precio-base"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioBase}
                  onChange={(e) => {
                    setPrecioBase(e.target.value);
                    limpiarErroresCampos(["precio_base"]);
                  }}
                  className={inputErrorClass("precio_base")}
                />
                <p className="text-[11px] text-zinc-500">Precio por unidad de venta.</p>
                <CampoError message={fieldErrors.precio_base} />
              </ModalField>

              <ModalField>
                <ModalLabel htmlFor="editar-producto-stock-minimo">Existencia mínima *</ModalLabel>
                <ModalInput
                  id="editar-producto-stock-minimo"
                  type="number"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => {
                    setStockMinimo(e.target.value);
                    limpiarErroresCampos(["stock_minimo"]);
                  }}
                  className={inputErrorClass("stock_minimo")}
                />
                <CampoError message={fieldErrors.stock_minimo} />
              </ModalField>
            </div>
          </div>

          <div
            className={cn("space-y-4", wizardStep !== 3 && "hidden")}
            aria-hidden={wizardStep !== 3}
          >
            <ModalField>
              <ModalLabel htmlFor="editar-producto-descripcion">Descripción</ModalLabel>
              <ModalTextarea
                id="editar-producto-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </ModalField>

            <p className="text-xs text-zinc-500">
              Stock actual (suma de lotes):{" "}
              <strong className="text-foreground">{producto.stock_actual}</strong> unidades
            </p>

            <ModalField>
              <ModalLabel>Imagen del producto</ModalLabel>
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
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                  Activo en catálogo
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activo}
                  onClick={() => setActivo((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    activo ? "bg-[#2c5f9b] dark:bg-[#6f9fd4]" : "bg-zinc-300 dark:bg-zinc-600",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                      activo ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </label>
            </ModalField>
          </div>
        </div>

        {wizardStep === 1 && bloqueaAvancePaso1 && productoDuplicadoOtro ? (
          <p
            className="shrink-0 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-center text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            Siguiente está bloqueado: otro producto ya usa este nombre genérico. Cámbialo para
            continuar.
          </p>
        ) : null}

        <ModalFooter className="flex flex-wrap items-center justify-center gap-2">
          {wizardStep === 1 ? (
            <ModalCancelButton
              onClick={handleClose}
              disabled={isPending || bloqueadoPorImagen}
            />
          ) : (
            <SigetActionButton
              label="Atrás"
              accentColor={sigetAccent.cancelar}
              morphFrom={ChevronLeft}
              morphTo={X}
              onClick={handleAtras}
              disabled={isPending}
              type="button"
              className="w-auto shrink-0"
            />
          )}

          {wizardStep < EDITAR_PRODUCTO_WIZARD_PASOS ? (
            <SigetActionButton
              label="Siguiente"
              accentColor={sigetAccent.crear}
              morphFrom={ChevronRight}
              morphTo={ChevronRight}
              type="submit"
              disabled={isPending || bloqueadoPorImagen || bloqueaAvancePaso1}
              className="w-auto shrink-0"
            />
          ) : (
            <SigetActionButton
              label="Guardar"
              accentColor={sigetAccent.guardar}
              morphFrom={Save}
              morphTo={Check}
              type="submit"
              disabled={isPending || bloqueadoPorImagen}
              ariaBusy={isPending}
              className="w-auto shrink-0"
            />
          )}
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
