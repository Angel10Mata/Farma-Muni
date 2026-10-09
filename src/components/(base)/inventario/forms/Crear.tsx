"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "react-toastify";
import type { ZodError } from "zod";
import { Check, ChevronLeft, ChevronRight, Send, SkipForward, X } from "lucide";
import ImageUploader from "@/components/imgs/ImageUploader";
import {
  ModalCancelButton,
  ModalConfirmDelete,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalFechaInput,
  ModalInput,
  ModalLabel,
  ModalShell,
  ModalTextarea,
  modalAccentClass,
  modalActionMessage,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { cn } from "@/lib/utils";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";
import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import {
  useCrearLoteManual,
  useGuardarProducto,
  useProductoDuplicadoExacto,
} from "../lib/hooks";
import { ProductoBusquedaAutocomplete } from "./ProductoBusquedaAutocomplete";
import { CrearLoteManual } from "./CrearLoteManual";
import {
  claveProductoUnico,
  identificacionProductoCompleta,
  lineaSugerenciaProductoCatalogo,
} from "../lib/helpers";
import {
  DUPLICATE_LOTE_MSG,
  DUPLICATE_PRODUCTO_MSG,
  FORMAS_FARMACEUTICAS,
  PRODUCTO_WIZARD_PASOS,
  PRODUCTO_WIZARD_PASOS_META,
  productoWizardLoteSchema,
  productoWizardPaso1Schema,
  productoWizardPaso2Schema,
  type FormaFarmaceutica,
  type ProductFormValues,
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

const CAMPOS_LOTE = [
  "proveedor_id",
  "codigo_barras",
  "numero_lote",
  "cantidad",
  "precio_costo",
  "precio_venta",
  "fecha_vencimiento",
  "laboratorio",
  "ubicacion",
] as const;

const MENSAJE_PRODUCTO_SIN_LOTE =
  "El producto quedó en el catálogo sin primer lote. Puedes registrar existencias después desde Inventario.";

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

function marcarCamposIdentificacionDuplicado(
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>,
) {
  setFieldErrors((prev) => {
    const next = { ...prev };
    for (const key of CAMPOS_IDENTIFICACION) {
      next[key] = DUPLICATE_PRODUCTO_MSG;
    }
    return next;
  });
}

function CampoError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-bold text-red-500">{message}</p>;
}

function AlertaProductoExistente({
  producto,
  modo,
  onAgregarLote,
  onCrearNuevo,
}: {
  producto: ProductoSugerencia;
  modo: "exacto" | "eleccion";
  onAgregarLote: () => void;
  onCrearNuevo?: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-3 dark:border-amber-800/80 dark:bg-amber-950/40"
      role="alert"
    >
      <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
        Este producto ya existe.
      </p>
      <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/80">
        {lineaSugerenciaProductoCatalogo(producto)}
        {producto.nombre.trim() ? (
          <span className="mt-0.5 block text-[10px] opacity-80">{producto.nombre}</span>
        ) : null}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <SigetActionButton
          label="Agregar"
          accentColor={sigetAccent.crear}
          morphFrom={ChevronRight}
          morphTo={ChevronRight}
          onClick={onAgregarLote}
          className="w-auto shrink-0"
          ariaLabel="Agregar lote a este producto"
        />
        {modo === "eleccion" && onCrearNuevo ? (
          <SigetActionButton
            label="Nuevo"
            accentColor={sigetAccent.cancelar}
            morphFrom={SkipForward}
            morphTo={ChevronRight}
            onClick={onCrearNuevo}
            className="w-auto shrink-0"
            ariaLabel="Crear uno nuevo igualmente"
          />
        ) : null}
      </div>
    </div>
  );
}

interface CrearProductoProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearProducto({ isOpen = true, onClose, onSuccess }: CrearProductoProps) {
  const [wizardStep, setWizardStep] = useState(1);
  const [productoId, setProductoId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmarDescartar, setConfirmarDescartar] = useState(false);
  const [mostrarWizard, setMostrarWizard] = useState(true);
  const [loteManualProducto, setLoteManualProducto] = useState<ProductoSugerencia | null>(null);
  const [conflictoProducto, setConflictoProducto] = useState<{
    producto: ProductoSugerencia;
    modo: "exacto" | "eleccion";
  } | null>(null);
  const [continuarTrasSugerencia, setContinuarTrasSugerencia] = useState(false);

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

  const camposIdentificacion = useMemo(
    () => ({
      nombre_generico: nombreGenerico.trim(),
      concentracion: concentracion.trim(),
      forma_farmaceutica: formaFarmaceutica,
      presentacion: presentacion.trim(),
    }),
    [nombreGenerico, concentracion, formaFarmaceutica, presentacion],
  );

  const identificacionLista = identificacionProductoCompleta(camposIdentificacion);

  const { data: duplicadoExactoLive } = useProductoDuplicadoExacto(
    camposIdentificacion,
    isOpen && mostrarWizard && wizardStep === 1 && identificacionLista && !continuarTrasSugerencia,
  );

  useEffect(() => {
    if (!isOpen || wizardStep !== 1 || continuarTrasSugerencia) return;
    if (conflictoProducto?.modo === "eleccion") return;
    if (duplicadoExactoLive) {
      setConflictoProducto({ producto: duplicadoExactoLive, modo: "exacto" });
      return;
    }
    setConflictoProducto((prev) => (prev?.modo === "exacto" ? null : prev));
  }, [duplicadoExactoLive, wizardStep, continuarTrasSugerencia, isOpen, conflictoProducto?.modo]);

  const bloqueaAvancePaso1 =
    wizardStep === 1 &&
    conflictoProducto !== null &&
    (conflictoProducto.modo === "exacto" || !continuarTrasSugerencia);

  const limpiarConflictoPorEdicion = () => {
    setContinuarTrasSugerencia(false);
    setConflictoProducto(null);
  };

  const aplicarProductoSugerido = (producto: ProductoSugerencia) => {
    const camposProducto = {
      nombre_generico: producto.nombre_generico,
      concentracion: producto.concentracion,
      forma_farmaceutica: producto.forma_farmaceutica,
      presentacion: producto.presentacion,
    };
    const modo =
      identificacionLista &&
      claveProductoUnico(camposIdentificacion) === claveProductoUnico(camposProducto)
        ? "exacto"
        : "eleccion";
    setNombreGenerico(producto.nombre_generico);
    setConcentracion(producto.concentracion);
    setFormaFarmaceutica(producto.forma_farmaceutica as FormaFarmaceutica);
    setPresentacion(producto.presentacion);
    if (!nombre.trim()) setNombre(producto.nombre);
    setContinuarTrasSugerencia(false);
    setConflictoProducto({ producto, modo });
  };

  const abrirLoteParaProducto = (producto: ProductoSugerencia) => {
    setLoteManualProducto(producto);
    setMostrarWizard(false);
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

  const handleReset = () => {
    setWizardStep(1);
    setProductoId(null);
    setFieldErrors({});
    setConfirmarDescartar(false);
    setMostrarWizard(true);
    setLoteManualProducto(null);
    setConflictoProducto(null);
    setContinuarTrasSugerencia(false);
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

  useEffect(() => {
    if (isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const tieneDatosEscritos = () => {
    if (wizardStep > 1 || productoId) return true;
    return (
      nombre.trim() !== "" ||
      nombreGenerico.trim() !== "" ||
      concentracion.trim() !== "" ||
      presentacion.trim() !== "" ||
      formaFarmaceutica !== "tableta" ||
      unidadVenta.trim() !== "unidad" ||
      requiereReceta ||
      descripcion.trim() !== "" ||
      precioBase.trim() !== "" ||
      stockMinimo.trim() !== "" ||
      imagenUrl !== null ||
      proveedorLoteId !== "" ||
      laboratorioLote.trim() !== "" ||
      codigoBarras.trim() !== "" ||
      numeroLote.trim() !== "" ||
      cantidadLote.trim() !== "" ||
      precioCostoLote.trim() !== "" ||
      precioVentaLote.trim() !== "" ||
      fechaVencimientoLote.trim() !== "" ||
      ubicacionLote.trim() !== ""
    );
  };

  const cerrarConProductoSinLote = () => {
    toast.warn(MENSAJE_PRODUCTO_SIN_LOTE);
    onSuccess();
    handleReset();
    onClose();
  };

  const solicitarCerrar = () => {
    if (productoId) {
      cerrarConProductoSinLote();
      return;
    }
    if (tieneDatosEscritos()) {
      setConfirmarDescartar(true);
      return;
    }
    handleClose();
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
    if (bloqueaAvancePaso1) {
      toast.warn("Resuelve el producto existente antes de continuar.");
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

  const validarPaso4 = () => {
    limpiarErroresCampos(CAMPOS_LOTE);
    const fechaIso = normalizarFechaCalendario(fechaVencimientoLote);
    const parsed = productoWizardLoteSchema.safeParse({
      proveedor_id: proveedorLoteId,
      codigo_barras: codigoBarras.trim(),
      numero_lote: numeroLote.trim(),
      cantidad: parseFloat(cantidadLote),
      precio_costo: parseFloat(precioCostoLote),
      precio_venta: parseFloat(precioVentaLote),
      laboratorio: laboratorioLote.trim() || null,
      fecha_vencimiento: fechaIso ?? "",
      ubicacion: ubicacionLote.trim() || null,
    });
    if (!parsed.success) {
      aplicarErroresZod(parsed.error, setFieldErrors, CAMPOS_LOTE);
      toast.warn("Revisa los datos del formulario.");
      return false;
    }
    if (!fechaIso) {
      setFieldErrors((prev) => ({
        ...prev,
        fecha_vencimiento: "Ingresa una fecha de vencimiento válida (DD/MM/AAAA)",
      }));
      toast.warn("Revisa la fecha de vencimiento.");
      return false;
    }
    return { ...parsed.data, fecha_vencimiento: fechaIso };
  };

  const guardarCatalogoYAvanzarALote = async () => {
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
      setWizardStep(4);
      limpiarErroresCampos(CAMPOS_IDENTIFICACION);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      if (code === "DUPLICATE") {
        toast.error(DUPLICATE_PRODUCTO_MSG);
        setWizardStep(1);
        setProductoId(null);
        marcarCamposIdentificacionDuplicado(setFieldErrors);
        return;
      }
      toast.error(
        modalActionMessage(code, "No se pudo guardar el producto.", {
          DUPLICATE: DUPLICATE_PRODUCTO_MSG,
        }),
      );
    }
  };

  const handleSiguiente = async () => {
    if (wizardStep === 1) {
      if (!validarPaso1()) return;
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (!validarPaso2()) return;
      setWizardStep(3);
      return;
    }
    if (wizardStep === 3) {
      await guardarCatalogoYAvanzarALote();
    }
  };

  const handleOmitirDetalles = () => {
    void guardarCatalogoYAvanzarALote();
  };

  const handleEnviar = async () => {
    if (!productoId) {
      toast.warn("Guarda el catálogo antes de registrar el lote.");
      setWizardStep(3);
      return;
    }

    const paso4 = validarPaso4();
    if (!paso4) return;

    try {
      await crearLote({
        producto_id: productoId,
        proveedor_id: paso4.proveedor_id,
        codigo_barras: paso4.codigo_barras,
        numero_lote: paso4.numero_lote,
        cantidad: paso4.cantidad,
        precio_costo: paso4.precio_costo,
        precio_venta: paso4.precio_venta,
        laboratorio: paso4.laboratorio,
        fecha_vencimiento: paso4.fecha_vencimiento,
        ubicacion: paso4.ubicacion,
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep < PRODUCTO_WIZARD_PASOS) {
      void handleSiguiente();
      return;
    }
    void handleEnviar();
  };

  const handleAtras = () => {
    limpiarErroresCampos([...CAMPOS_IDENTIFICACION, ...CAMPOS_VENTA, ...CAMPOS_LOTE]);
    setWizardStep((s) => Math.max(1, s - 1));
  };

  const isPending = isGuardandoProducto || isGuardandoLote;
  const bloqueadoPorImagen = isUploadingImage;

  const selectClass = (key: string) =>
    cn(
      modalFieldClass,
      "h-10 w-full rounded-lg bg-transparent px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-none",
      inputErrorClass(key),
    );

  return (
    <>
    <ModalShell
      isOpen={isOpen && mostrarWizard}
      onClose={solicitarCerrar}
      title="Nuevo Producto"
      maxWidth="max-w-2xl"
      fullHeight
    >
      {isOpen ? (
        <ModalForm
          onSubmit={handleFormSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="shrink-0 space-y-2">
            <div className="flex gap-1.5">
              {PRODUCTO_WIZARD_PASOS_META.map((meta, index) => {
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
                <ProductoBusquedaAutocomplete
                  id="producto-nombre"
                  label="Nombre comercial *"
                  value={nombre}
                  onChange={(v) => {
                    setNombre(v);
                    limpiarErroresCampos(["nombre"]);
                  }}
                  onSelectProducto={aplicarProductoSugerido}
                  enabled={wizardStep === 1 && isOpen && mostrarWizard}
                  error={fieldErrors.nombre}
                  inputClassName={inputErrorClass("nombre")}
                  required
                />
              </ModalField>

              <ModalField>
                <ProductoBusquedaAutocomplete
                  id="producto-nombre-generico"
                  label="Nombre genérico *"
                  value={nombreGenerico}
                  onChange={(v) => {
                    setNombreGenerico(v);
                    limpiarConflictoPorEdicion();
                    limpiarErroresCampos(["nombre_generico"]);
                  }}
                  onSelectProducto={aplicarProductoSugerido}
                  enabled={wizardStep === 1 && isOpen && mostrarWizard}
                  error={fieldErrors.nombre_generico}
                  inputClassName={inputErrorClass("nombre_generico")}
                  required
                />
              </ModalField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ModalField>
                  <ModalLabel htmlFor="producto-concentracion">Concentración *</ModalLabel>
                  <ModalInput
                    id="producto-concentracion"
                    value={concentracion}
                    onChange={(e) => {
                      setConcentracion(e.target.value);
                      limpiarConflictoPorEdicion();
                      limpiarErroresCampos(["concentracion"]);
                    }}
                    className={inputErrorClass("concentracion")}
                    required
                  />
                  <CampoError message={fieldErrors.concentracion} />
                </ModalField>

                <ModalField>
                  <ModalLabel htmlFor="producto-forma">Forma farmacéutica *</ModalLabel>
                  <select
                    id="producto-forma"
                    value={formaFarmaceutica}
                    onChange={(e) => {
                      setFormaFarmaceutica(e.target.value as FormaFarmaceutica);
                      limpiarConflictoPorEdicion();
                      limpiarErroresCampos(["forma_farmaceutica"]);
                    }}
                    className={selectClass("forma_farmaceutica")}
                  >
                    {FORMAS_FARMACEUTICAS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <CampoError message={fieldErrors.forma_farmaceutica} />
                </ModalField>
              </div>

              <ModalField>
                <ModalLabel htmlFor="producto-presentacion">Presentación *</ModalLabel>
                <ModalInput
                  id="producto-presentacion"
                  value={presentacion}
                  onChange={(e) => {
                    setPresentacion(e.target.value);
                    limpiarConflictoPorEdicion();
                    limpiarErroresCampos(["presentacion"]);
                  }}
                  className={inputErrorClass("presentacion")}
                  required
                />
                <CampoError message={fieldErrors.presentacion} />
              </ModalField>

              {conflictoProducto ? (
                <AlertaProductoExistente
                  producto={conflictoProducto.producto}
                  modo={conflictoProducto.modo}
                  onAgregarLote={() => abrirLoteParaProducto(conflictoProducto.producto)}
                  onCrearNuevo={
                    conflictoProducto.modo === "eleccion"
                      ? () => {
                          setContinuarTrasSugerencia(true);
                          setConflictoProducto(null);
                        }
                      : undefined
                  }
                />
              ) : null}
            </div>

            <div
              className={cn("space-y-4", wizardStep !== 2 && "hidden")}
              aria-hidden={wizardStep !== 2}
            >
              <ModalField>
                <ModalLabel htmlFor="producto-unidad-venta">Unidad de venta</ModalLabel>
                <ModalInput
                  id="producto-unidad-venta"
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
                  <ModalLabel htmlFor="producto-precio-base">Precio sugerido *</ModalLabel>
                  <ModalInput
                    id="producto-precio-base"
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
                  <ModalLabel htmlFor="producto-stock-minimo">Existencia mínima *</ModalLabel>
                  <ModalInput
                    id="producto-stock-minimo"
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
              <p className="text-[11px] text-zinc-500">
                Descripción e imagen son opcionales. Puedes omitir este paso y continuar al lote.
              </p>

              <ModalField>
                <ModalLabel htmlFor="producto-descripcion">Descripción / Componentes</ModalLabel>
                <ModalTextarea
                  id="producto-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </ModalField>

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
            </div>

            <div
              className={cn("space-y-4", wizardStep !== 4 && "hidden")}
              aria-hidden={wizardStep !== 4}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ModalField>
                  <ModalLabel htmlFor="lote-proveedor">Proveedor *</ModalLabel>
                  <select
                    id="lote-proveedor"
                    value={proveedorLoteId}
                    onChange={(e) => {
                      setProveedorLoteId(e.target.value);
                      limpiarErroresCampos(["proveedor_id"]);
                    }}
                    className={selectClass("proveedor_id")}
                    required
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  <CampoError message={fieldErrors.proveedor_id} />
                </ModalField>

                <ModalField>
                  <ModalLabel htmlFor="lote-laboratorio">Laboratorio</ModalLabel>
                  <ModalInput
                    id="lote-laboratorio"
                    value={laboratorioLote}
                    onChange={(e) => {
                      setLaboratorioLote(e.target.value);
                      limpiarErroresCampos(["laboratorio"]);
                    }}
                    className={inputErrorClass("laboratorio")}
                  />
                  <CampoError message={fieldErrors.laboratorio} />
                </ModalField>
              </div>

              <ModalField>
                <ModalLabel htmlFor="lote-codigo">Código de barras *</ModalLabel>
                <ModalInput
                  id="lote-codigo"
                  value={codigoBarras}
                  onChange={(e) => {
                    setCodigoBarras(e.target.value);
                    limpiarErroresCampos(["codigo_barras"]);
                  }}
                  className={inputErrorClass("codigo_barras")}
                  required
                />
                <CampoError message={fieldErrors.codigo_barras} />
              </ModalField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ModalField>
                  <ModalLabel htmlFor="lote-numero">Número de lote *</ModalLabel>
                  <ModalInput
                    id="lote-numero"
                    value={numeroLote}
                    onChange={(e) => {
                      setNumeroLote(e.target.value);
                      limpiarErroresCampos(["numero_lote"]);
                    }}
                    className={inputErrorClass("numero_lote")}
                    required
                  />
                  <CampoError message={fieldErrors.numero_lote} />
                </ModalField>

                <ModalField>
                  <ModalLabel htmlFor="lote-cantidad">Cantidad *</ModalLabel>
                  <ModalInput
                    id="lote-cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={cantidadLote}
                    onChange={(e) => {
                      setCantidadLote(e.target.value);
                      limpiarErroresCampos(["cantidad"]);
                    }}
                    className={inputErrorClass("cantidad")}
                    required
                  />
                  <CampoError message={fieldErrors.cantidad} />
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
                    onChange={(e) => {
                      setPrecioCostoLote(e.target.value);
                      limpiarErroresCampos(["precio_costo"]);
                    }}
                    className={inputErrorClass("precio_costo")}
                    required
                  />
                  <CampoError message={fieldErrors.precio_costo} />
                </ModalField>

                <ModalField>
                  <ModalLabel htmlFor="lote-precio-venta">Precio de venta *</ModalLabel>
                  <ModalInput
                    id="lote-precio-venta"
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioVentaLote}
                    onChange={(e) => {
                      setPrecioVentaLote(e.target.value);
                      limpiarErroresCampos(["precio_venta"]);
                    }}
                    className={inputErrorClass("precio_venta")}
                    required
                  />
                  <CampoError message={fieldErrors.precio_venta} />
                </ModalField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ModalField>
                  <ModalLabel htmlFor="lote-vencimiento">Fecha de vencimiento *</ModalLabel>
                  <ModalFechaInput
                    id="lote-vencimiento"
                    value={fechaVencimientoLote}
                    onChange={(v) => {
                      setFechaVencimientoLote(v);
                      limpiarErroresCampos(["fecha_vencimiento"]);
                    }}
                    required
                    className={inputErrorClass("fecha_vencimiento")}
                  />
                  <CampoError message={fieldErrors.fecha_vencimiento} />
                </ModalField>

                <ModalField>
                  <ModalLabel htmlFor="lote-ubicacion">Ubicación</ModalLabel>
                  <ModalInput
                    id="lote-ubicacion"
                    value={ubicacionLote}
                    onChange={(e) => {
                      setUbicacionLote(e.target.value);
                      limpiarErroresCampos(["ubicacion"]);
                    }}
                    className={inputErrorClass("ubicacion")}
                  />
                  <CampoError message={fieldErrors.ubicacion} />
                </ModalField>
              </div>
            </div>
          </div>

          {confirmarDescartar ? (
            <ModalConfirmDelete
              title="¿Descartar cambios?"
              message="Se perderá lo que llevas escrito en este formulario."
              confirmText="Descartar"
              intent="deactivate"
              onCancel={() => setConfirmarDescartar(false)}
              onConfirm={() => {
                setConfirmarDescartar(false);
                handleClose();
              }}
            />
          ) : null}

          <ModalFooter className="flex flex-wrap items-center justify-center gap-2">
            {wizardStep === 1 ? (
              <ModalCancelButton
                onClick={solicitarCerrar}
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
                className="w-auto shrink-0"
              />
            )}

            {wizardStep === 3 ? (
              <SigetActionButton
                label="Omitir"
                accentColor={sigetAccent.cancelar}
                morphFrom={SkipForward}
                morphTo={ChevronRight}
                type="button"
                onClick={handleOmitirDetalles}
                disabled={isPending || bloqueadoPorImagen}
                className="w-auto shrink-0"
              />
            ) : null}

            {wizardStep < PRODUCTO_WIZARD_PASOS ? (
              <SigetActionButton
                label="Siguiente"
                accentColor={sigetAccent.crear}
                morphFrom={ChevronRight}
                morphTo={ChevronRight}
                type="submit"
                disabled={isPending || bloqueadoPorImagen || (wizardStep === 1 && bloqueaAvancePaso1)}
                ariaBusy={wizardStep === 3 && isGuardandoProducto}
                className="w-auto shrink-0"
              />
            ) : (
              <SigetActionButton
                label="Enviar"
                accentColor={sigetAccent.guardar}
                morphFrom={Send}
                morphTo={Check}
                type="submit"
                disabled={isPending}
                ariaBusy={isPending}
                className="w-auto shrink-0"
              />
            )}
          </ModalFooter>
        </ModalForm>
      ) : null}
    </ModalShell>

    {loteManualProducto ? (
      <CrearLoteManual
        open={isOpen && !mostrarWizard}
        producto={loteManualProducto}
        precioVentaInicial={precioBase}
        onClose={() => {
          setMostrarWizard(true);
          setLoteManualProducto(null);
        }}
        onSuccess={() => {
          onSuccess();
          handleClose();
        }}
      />
    ) : null}
    </>
  );
}
