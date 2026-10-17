"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Check, ChevronLeft, ChevronRight, Save } from "lucide";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalSelect,
  ModalShell,
  modalAccentClass,
  modalActionMessage,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { cn } from "@/lib/utils";
import {
  useGuardarComercialInventario,
  useGuardarGenericoInventario,
  useLaboratoriosInventario,
} from "../lib/hooks";
import { laboratoriosParaSeleccionComercial } from "../lib/helpers";
import { CrearLaboratorio } from "./CrearLaboratorio";
import {
  EDITAR_PRODUCTO_WIZARD_PASOS,
  EDITAR_PRODUCTO_WIZARD_PASOS_META,
  FORMAS_FARMACEUTICAS,
  type FormaFarmaceutica,
  type Producto,
} from "../lib/zod";

interface EditarJerarquiaProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  producto: Producto;
}

export function EditarJerarquia({
  isOpen = true,
  onClose,
  onSuccess,
  producto,
}: EditarJerarquiaProps) {
  const [wizardStep, setWizardStep] = useState(1);

  const [nombreComercial, setNombreComercial] = useState(producto.nombre);
  const [presentacion, setPresentacion] = useState(producto.presentacion);
  const [precioVenta, setPrecioVenta] = useState(String(producto.precio_base ?? 0));
  const [activo, setActivo] = useState(producto.activo);
  const [laboratorioId, setLaboratorioId] = useState(producto.laboratorio_id ?? "");
  const [modalLab, setModalLab] = useState(false);

  const [concentracion, setConcentracion] = useState(producto.concentracion);
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<FormaFarmaceutica>(
    (producto.forma_farmaceutica as FormaFarmaceutica) || "tableta",
  );
  const [stockMinimo, setStockMinimo] = useState(String(producto.stock_minimo ?? 0));
  const [requiereReceta, setRequiereReceta] = useState(Boolean(producto.requiere_receta));

  const { mutateAsync: guardarComercial, isPending: guardandoComercial } =
    useGuardarComercialInventario();
  const { mutateAsync: guardarGenerico, isPending: guardandoGenerico } =
    useGuardarGenericoInventario();
  const { data: laboratorios = [] } = useLaboratoriosInventario();

  const laboratoriosSelect = laboratoriosParaSeleccionComercial(laboratorios);

  const isBusy = guardandoComercial || guardandoGenerico;

  const handleClose = () => {
    setWizardStep(1);
    onClose();
  };

  const guardarPasoComercial = async () => {
    if (!producto.generico_id) {
      toast.error("Falta el producto de inventario.");
      return false;
    }
    const precio = parseFloat(precioVenta);
    if (!nombreComercial.trim() || !presentacion.trim() || Number.isNaN(precio)) {
      toast.warn("Completa nombre, presentación y precio.");
      return false;
    }
    await guardarComercial({
      id: producto.id,
      data: {
        generico_id: producto.generico_id,
        laboratorio_id: laboratorioId ? laboratorioId : null,
        nombre_comercial: nombreComercial.trim(),
        presentacion: presentacion.trim(),
        precio_venta: precio,
        activo,
        descripcion: producto.descripcion || null,
        imagen_url: producto.imagen_url ?? null,
      },
    });
    return true;
  };

  const guardarPasoGenerico = async () => {
    if (!producto.generico_id || !producto.catalogo_id) {
      toast.error("No se encontró el producto asociado.");
      return false;
    }
    const min = parseFloat(stockMinimo);
    await guardarGenerico({
      id: producto.generico_id,
      data: {
        catalogo_id: producto.catalogo_id,
        concentracion: concentracion.trim(),
        forma_farmaceutica: formaFarmaceutica,
        requiere_receta: requiereReceta,
        unidad_venta: producto.unidad_venta || "unidad",
        stock_minimo: Number.isNaN(min) ? 0 : min,
        activo: true,
      },
    });
    return true;
  };

  const handleGuardar = async () => {
    try {
      const okComercial = await guardarPasoComercial();
      if (!okComercial) return;
      if (wizardStep === 2) {
        const okGen = await guardarPasoGenerico();
        if (!okGen) return;
      }
      toast.success("Cambios guardados.");
      onSuccess();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const detail = (err as Error & { detail?: string }).detail;
      toast.error(modalActionMessage(detail ?? message, "No se pudo guardar."));
    }
  };

  const avanzar = async () => {
    const ok = await guardarPasoComercial();
    if (ok) setWizardStep(2);
  };

  return (
    <>
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar producto"
      subtitle={producto.nombre_generico}
      maxWidth="max-w-2xl"
    >
      <ModalForm onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-700">
          {EDITAR_PRODUCTO_WIZARD_PASOS_META.map((meta, index) => {
            const stepNum = index + 1;
            const activo = wizardStep === stepNum;
            return (
              <button
                key={meta.titulo}
                type="button"
                onClick={() => setWizardStep(stepNum)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase",
                  activo ? modalAccentClass : "text-muted-foreground",
                )}
              >
                {meta.titulo}
              </button>
            );
          })}
        </div>

        {wizardStep === 1 ? (
          <div className="space-y-4">
            <ModalField>
              <ModalLabel htmlFor="edit-com-nombre">Nombre comercial</ModalLabel>
              <ModalInput
                id="edit-com-nombre"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
              />
            </ModalField>
            <ModalField>
              <ModalLabel htmlFor="edit-com-pres">Presentación</ModalLabel>
              <ModalInput
                id="edit-com-pres"
                value={presentacion}
                onChange={(e) => setPresentacion(e.target.value)}
              />
            </ModalField>
            <ModalField>
              <ModalLabel htmlFor="edit-com-precio">Precio de venta</ModalLabel>
              <ModalInput
                id="edit-com-precio"
                type="number"
                step="0.01"
                min="0"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
              />
            </ModalField>
            <ModalField>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Activo</span>
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
            <ModalField>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ModalLabel htmlFor="edit-com-lab">Laboratorio</ModalLabel>
                <button
                  type="button"
                  className="text-xs font-bold text-[#2c5f9b] underline dark:text-[#6f9fd4]"
                  onClick={() => setModalLab(true)}
                >
                  Crear laboratorio
                </button>
              </div>
              <ModalSelect
                id="edit-com-lab"
                value={laboratorioId}
                onChange={(e) => setLaboratorioId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {laboratoriosSelect.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </ModalSelect>
            </ModalField>
            <p className="text-xs text-zinc-500">
              Los lotes se editan desde Inventario → vista Lotes (código, vencimiento, costo,
              ubicación). No incluyen laboratorio ni precio de venta.
            </p>
          </div>
        ) : null}

        {wizardStep === 2 ? (
          <div className="space-y-4">
            <div
              className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-3 text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
              role="alert"
            >
              Cambiar concentración o forma del producto afecta a todas las marcas
              vinculadas a este producto.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="edit-gen-conc">Concentración</ModalLabel>
                <ModalInput
                  id="edit-gen-conc"
                  value={concentracion}
                  onChange={(e) => setConcentracion(e.target.value)}
                />
              </ModalField>
              <ModalField>
                <ModalLabel htmlFor="edit-gen-forma">Forma farmacéutica</ModalLabel>
                <ModalSelect
                  id="edit-gen-forma"
                  value={formaFarmaceutica}
                  onChange={(e) => setFormaFarmaceutica(e.target.value as FormaFarmaceutica)}
                >
                  {FORMAS_FARMACEUTICAS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </ModalSelect>
              </ModalField>
            </div>
            <ModalField>
              <ModalLabel htmlFor="edit-gen-min">Existencia mínima (producto)</ModalLabel>
              <ModalInput
                id="edit-gen-min"
                type="number"
                min="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
              />
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
          </div>
        ) : null}

        <ModalFooter className="justify-between gap-2">
          <ModalCancelButton onClick={handleClose} />
          <div className="flex gap-2">
            {wizardStep > 1 ? (
              <SigetActionButton
                label="Atrás"
                accentColor={sigetAccent.cancelar}
                morphFrom={ChevronLeft}
                morphTo={ChevronLeft}
                type="button"
                onClick={() => setWizardStep(1)}
                className="w-auto shrink-0"
              />
            ) : null}
            {wizardStep < EDITAR_PRODUCTO_WIZARD_PASOS ? (
              <SigetActionButton
                label="Siguiente"
                accentColor={sigetAccent.guardar}
                morphFrom={ChevronRight}
                morphTo={ChevronRight}
                type="button"
                onClick={() => void avanzar()}
                disabled={isBusy}
                className="w-auto shrink-0"
              />
            ) : (
              <SigetActionButton
                label="Guardar"
                accentColor={sigetAccent.guardar}
                morphFrom={Save}
                morphTo={Check}
                type="button"
                onClick={() => void handleGuardar()}
                disabled={isBusy}
                className="w-auto shrink-0"
              />
            )}
          </div>
        </ModalFooter>
      </ModalForm>
    </ModalShell>
    {modalLab ? (
      <CrearLaboratorio
        isOpen
        onClose={() => setModalLab(false)}
        onSuccess={() => setModalLab(false)}
      />
    ) : null}
    </>
  );
}

export function EditarProducto(props: {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  producto: Producto | null;
}) {
  if (!props.producto) return null;
  return <EditarJerarquia {...props} producto={props.producto} />;
}
