"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Check, ChevronLeft, ChevronRight, SkipForward } from "lucide";
import { Check as CheckIcon } from "lucide-react";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalFechaInput,
  ModalInput,
  ModalLabel,
  ModalSelect,
  ModalShell,
  modalAccentClass,
  modalActionMessage,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { cn } from "@/lib/utils";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";
import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import {
  useCatalogosInventario,
  useCrearLoteManual,
  useGenericosInventario,
  useGuardarCatalogoInventario,
  useGuardarComercialInventario,
  useGuardarGenericoInventario,
  useGuardarLaboratorioInventario,
  useLaboratoriosInventario,
} from "../lib/hooks";
import { FORMAS_FARMACEUTICAS, PRODUCTO_WIZARD_PASOS, PRODUCTO_WIZARD_PASOS_META } from "../lib/zod";
import type { FormaFarmaceutica } from "../lib/zod";
import { jerarquiaWizardLoteSchema } from "../lib/jerarquia-zod";

const WIZARD_CONTENIDO_MIN_H = "min-h-[22rem]";

interface CrearJerarquiaProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearJerarquia({ isOpen = true, onClose, onSuccess }: CrearJerarquiaProps) {
  const [wizardStep, setWizardStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [catalogoId, setCatalogoId] = useState("");
  const [catalogoNombreNuevo, setCatalogoNombreNuevo] = useState("");
  const [modoCatalogoNuevo, setModoCatalogoNuevo] = useState(false);

  const [genericoId, setGenericoId] = useState("");
  const [concentracion, setConcentracion] = useState("");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<FormaFarmaceutica>("tableta");
  const [requiereReceta, setRequiereReceta] = useState(false);
  const [unidadVenta, setUnidadVenta] = useState("unidad");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [modoGenericoNuevo, setModoGenericoNuevo] = useState(true);

  const [laboratorioId, setLaboratorioId] = useState("");
  const [laboratorioNombreNuevo, setLaboratorioNombreNuevo] = useState("");
  const [modoLaboratorioNuevo, setModoLaboratorioNuevo] = useState(false);

  const [nombreComercial, setNombreComercial] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [productoId, setProductoId] = useState<string | null>(null);

  const [proveedorLoteId, setProveedorLoteId] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [cantidadLote, setCantidadLote] = useState("");
  const [precioCostoLote, setPrecioCostoLote] = useState("");
  const [fechaVencimientoLote, setFechaVencimientoLote] = useState("");
  const [ubicacionLote, setUbicacionLote] = useState("");
  const [omitirLote, setOmitirLote] = useState(false);

  const { data: catalogos = [] } = useCatalogosInventario();
  const { data: genericos = [] } = useGenericosInventario(
    catalogoId ? { catalogo_id: catalogoId } : undefined,
  );
  const { data: laboratorios = [] } = useLaboratoriosInventario();
  const { data: proveedores = [] } = useProveedores();

  const { mutateAsync: guardarCatalogo, isPending: guardandoCatalogo } =
    useGuardarCatalogoInventario();
  const { mutateAsync: guardarGenerico, isPending: guardandoGenerico } =
    useGuardarGenericoInventario();
  const { mutateAsync: guardarLaboratorio, isPending: guardandoLaboratorio } =
    useGuardarLaboratorioInventario();
  const { mutateAsync: guardarComercial, isPending: guardandoComercial } =
    useGuardarComercialInventario();
  const { mutateAsync: crearLote, isPending: guardandoLote } = useCrearLoteManual();

  const catalogoSeleccionado = useMemo(
    () => catalogos.find((c) => c.id === catalogoId),
    [catalogos, catalogoId],
  );

  const isBusy =
    guardandoCatalogo ||
    guardandoGenerico ||
    guardandoLaboratorio ||
    guardandoComercial ||
    guardandoLote;

  const limpiarErrores = (keys: string[]) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  };

  const handleClose = () => {
    setWizardStep(1);
    setFieldErrors({});
    onClose();
  };

  const asegurarCatalogoId = async (): Promise<string | null> => {
    if (!modoCatalogoNuevo && catalogoId) return catalogoId;
    const nombre = catalogoNombreNuevo.trim();
    if (nombre.length < 2) {
      setFieldErrors((p) => ({ ...p, catalogo: "Indica el principio activo" }));
      return null;
    }
    const res = await guardarCatalogo({ data: { nombre, activo: true } });
    setCatalogoId(res.id);
    setModoCatalogoNuevo(false);
    return res.id;
  };

  const asegurarGenericoId = async (catId: string): Promise<string | null> => {
    if (!modoGenericoNuevo && genericoId) return genericoId;
    const stock = parseFloat(stockMinimo);
    if (!concentracion.trim()) {
      setFieldErrors((p) => ({ ...p, concentracion: "La concentración es requerida" }));
      return null;
    }
    const res = await guardarGenerico({
      data: {
        catalogo_id: catId,
        concentracion: concentracion.trim(),
        forma_farmaceutica: formaFarmaceutica,
        requiere_receta: requiereReceta,
        unidad_venta: unidadVenta.trim() || "unidad",
        stock_minimo: Number.isNaN(stock) ? 0 : stock,
        activo: true,
      },
    });
    setGenericoId(res.id);
    setModoGenericoNuevo(false);
    return res.id;
  };

  const asegurarLaboratorioId = async (): Promise<string | null> => {
    if (!modoLaboratorioNuevo && laboratorioId) return laboratorioId;
    const nombre = laboratorioNombreNuevo.trim();
    if (nombre.length < 2) {
      setFieldErrors((p) => ({ ...p, laboratorio: "Indica el laboratorio" }));
      return null;
    }
    const res = await guardarLaboratorio({ data: { nombre, activo: true } });
    setLaboratorioId(res.id);
    setModoLaboratorioNuevo(false);
    return res.id;
  };

  const asegurarComercialId = async (genId: string, labId: string): Promise<string | null> => {
    if (productoId) return productoId;
    const precio = parseFloat(precioVenta);
    if (!nombreComercial.trim() || !presentacion.trim() || Number.isNaN(precio)) {
      setFieldErrors((p) => ({
        ...p,
        nombre_comercial: !nombreComercial.trim() ? "Requerido" : "",
        presentacion: !presentacion.trim() ? "Requerida" : "",
        precio_venta: Number.isNaN(precio) ? "Precio inválido" : "",
      }));
      return null;
    }
    const res = await guardarComercial({
      data: {
        generico_id: genId,
        laboratorio_id: labId,
        nombre_comercial: nombreComercial.trim(),
        presentacion: presentacion.trim(),
        precio_venta: precio,
        activo: true,
      },
    });
    setProductoId(res.id);
    return res.id;
  };

  const avanzar = async () => {
    if (wizardStep === 1) {
      const id = await asegurarCatalogoId();
      if (!id) return;
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      const cat = catalogoId || (await asegurarCatalogoId());
      if (!cat) return;
      const gen = await asegurarGenericoId(cat);
      if (!gen) return;
      setWizardStep(3);
      return;
    }
    if (wizardStep === 3) {
      const lab = await asegurarLaboratorioId();
      if (!lab) return;
      setWizardStep(4);
      return;
    }
    if (wizardStep === 4) {
      const cat = catalogoId;
      const gen = genericoId;
      const lab = laboratorioId;
      if (!cat || !gen || !lab) return;
      const pid = await asegurarComercialId(gen, lab);
      if (!pid) return;
      setWizardStep(5);
      return;
    }
  };

  const retroceder = () => {
    if (wizardStep > 1) setWizardStep((s) => s - 1);
  };

  const finalizar = async () => {
    try {
      const cat = catalogoId || (await asegurarCatalogoId());
      if (!cat) return;
      const gen = genericoId || (await asegurarGenericoId(cat));
      if (!gen) return;
      const lab = laboratorioId || (await asegurarLaboratorioId());
      if (!lab) return;
      const pid = productoId || (await asegurarComercialId(gen, lab));
      if (!pid) return;

      if (!omitirLote) {
        const fechaIso = normalizarFechaCalendario(fechaVencimientoLote);
        const parsed = jerarquiaWizardLoteSchema.safeParse({
          proveedor_id: proveedorLoteId,
          codigo_barras: codigoBarras.trim(),
          numero_lote: numeroLote.trim(),
          cantidad: parseFloat(cantidadLote),
          precio_costo: parseFloat(precioCostoLote),
          fecha_vencimiento: fechaIso,
          ubicacion: ubicacionLote.trim() || null,
        });
        if (!parsed.success) {
          const next: Record<string, string> = {};
          for (const issue of parsed.error.issues) {
            const path = issue.path[0];
            if (typeof path === "string") next[path] = issue.message;
          }
          setFieldErrors(next);
          return;
        }
        await crearLote({
          producto_id: pid,
          ...parsed.data,
          fecha_vencimiento: fechaIso,
        });
      }

      toast.success(
        omitirLote
          ? "Producto comercial registrado. Puedes agregar lotes después."
          : "Producto y primer lote registrados.",
      );
      onSuccess();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const detail = (err as Error & { detail?: string }).detail;
      toast.error(modalActionMessage(detail ?? message, "No se pudo completar el registro."));
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Nuevo producto"
      subtitle="Jerarquía: catálogo → genérico → laboratorio → comercial"
      maxWidth="max-w-2xl"
    >
      <ModalForm onSubmit={(e) => e.preventDefault()} className="flex max-h-[min(88dvh,820px)] flex-col">
        <div className="shrink-0 border-b border-zinc-200 px-1 pb-3 dark:border-zinc-700">
          <div className="grid grid-cols-5 gap-1">
            {PRODUCTO_WIZARD_PASOS_META.map((meta, index) => {
              const stepNum = index + 1;
              const activo = wizardStep === stepNum;
              const completado = wizardStep > stepNum;
              return (
                <div key={meta.titulo} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[10px] font-black",
                      completado
                        ? "bg-[#2c5f9b] text-white dark:bg-[#6f9fd4]"
                        : activo
                          ? "border-2 border-[#2c5f9b] text-[#2c5f9b] dark:border-[#6f9fd4] dark:text-[#6f9fd4]"
                          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800",
                    )}
                  >
                    {completado ? <CheckIcon className="size-3.5" /> : stepNum}
                  </span>
                  <span
                    className={cn(
                      "hidden text-center text-[9px] font-bold md:block",
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

        <div className={cn("min-h-0 flex-1 overflow-y-auto py-4", WIZARD_CONTENIDO_MIN_H)}>
          {wizardStep === 1 ? (
            <div className="space-y-4">
              <ModalField>
                <ModalLabel>Catálogo (principio activo)</ModalLabel>
                <div className="flex flex-wrap gap-2">
                  <SigetActionButton
                    label={modoCatalogoNuevo ? "Existente" : "Nuevo"}
                    accentColor={sigetAccent.editar}
                    morphFrom={ChevronRight}
                    morphTo={ChevronRight}
                    type="button"
                    onClick={() => setModoCatalogoNuevo((v) => !v)}
                    className="w-auto shrink-0"
                  />
                </div>
              </ModalField>
              {modoCatalogoNuevo ? (
                <ModalField>
                  <ModalLabel htmlFor="catalogo-nuevo">Principio activo *</ModalLabel>
                  <ModalInput
                    id="catalogo-nuevo"
                    value={catalogoNombreNuevo}
                    onChange={(e) => {
                      setCatalogoNombreNuevo(e.target.value);
                      limpiarErrores(["catalogo"]);
                    }}
                  />
                  {fieldErrors.catalogo ? (
                    <p className="text-xs font-bold text-red-500">{fieldErrors.catalogo}</p>
                  ) : null}
                </ModalField>
              ) : (
                <ModalField>
                  <ModalLabel htmlFor="catalogo-select">Seleccionar catálogo *</ModalLabel>
                  <ModalSelect
                    id="catalogo-select"
                    value={catalogoId}
                    onChange={(e) => setCatalogoId(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {catalogos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </ModalSelect>
                </ModalField>
              )}
              {catalogoSeleccionado ? (
                <p className="text-xs text-zinc-500">Seleccionado: {catalogoSeleccionado.nombre}</p>
              ) : null}
            </div>
          ) : null}

          {wizardStep === 2 ? (
            <div className="space-y-4">
              <ModalField>
                <ModalLabel>Genérico (concentración + forma)</ModalLabel>
                <SigetActionButton
                  label={modoGenericoNuevo ? "Existente" : "Nuevo"}
                  accentColor={sigetAccent.editar}
                  morphFrom={ChevronRight}
                  morphTo={ChevronRight}
                  type="button"
                  onClick={() => setModoGenericoNuevo((v) => !v)}
                  className="w-auto shrink-0"
                />
              </ModalField>
              {!modoGenericoNuevo ? (
                <ModalField>
                  <ModalLabel htmlFor="generico-select">Genérico existente</ModalLabel>
                  <ModalSelect
                    id="generico-select"
                    value={genericoId}
                    onChange={(e) => setGenericoId(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {genericos.map((g) => (
                      <option key={g.generico_id} value={g.generico_id}>
                        {g.generico_nombre}
                      </option>
                    ))}
                  </ModalSelect>
                </ModalField>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ModalField>
                      <ModalLabel htmlFor="gen-conc">Concentración *</ModalLabel>
                      <ModalInput
                        id="gen-conc"
                        value={concentracion}
                        onChange={(e) => setConcentracion(e.target.value)}
                      />
                      {fieldErrors.concentracion ? (
                        <p className="text-xs font-bold text-red-500">{fieldErrors.concentracion}</p>
                      ) : null}
                    </ModalField>
                    <ModalField>
                      <ModalLabel htmlFor="gen-forma">Forma *</ModalLabel>
                      <ModalSelect
                        id="gen-forma"
                        value={formaFarmaceutica}
                        onChange={(e) =>
                          setFormaFarmaceutica(e.target.value as FormaFarmaceutica)
                        }
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
                    <ModalLabel htmlFor="gen-stock-min">Stock mínimo (genérico)</ModalLabel>
                    <ModalInput
                      id="gen-stock-min"
                      type="number"
                      min="0"
                      value={stockMinimo}
                      onChange={(e) => setStockMinimo(e.target.value)}
                    />
                  </ModalField>
                </>
              )}
            </div>
          ) : null}

          {wizardStep === 3 ? (
            <div className="space-y-4">
              <ModalField>
                <ModalLabel>Laboratorio</ModalLabel>
                <SigetActionButton
                  label={modoLaboratorioNuevo ? "Existente" : "Nuevo"}
                  accentColor={sigetAccent.editar}
                  morphFrom={ChevronRight}
                  morphTo={ChevronRight}
                  type="button"
                  onClick={() => setModoLaboratorioNuevo((v) => !v)}
                  className="w-auto shrink-0"
                />
              </ModalField>
              {modoLaboratorioNuevo ? (
                <ModalField>
                  <ModalLabel htmlFor="lab-nuevo">Nombre del laboratorio *</ModalLabel>
                  <ModalInput
                    id="lab-nuevo"
                    value={laboratorioNombreNuevo}
                    onChange={(e) => setLaboratorioNombreNuevo(e.target.value)}
                  />
                  {fieldErrors.laboratorio ? (
                    <p className="text-xs font-bold text-red-500">{fieldErrors.laboratorio}</p>
                  ) : null}
                </ModalField>
              ) : (
                <ModalField>
                  <ModalLabel htmlFor="lab-select">Laboratorio *</ModalLabel>
                  <ModalSelect
                    id="lab-select"
                    value={laboratorioId}
                    onChange={(e) => setLaboratorioId(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {laboratorios.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </ModalSelect>
                </ModalField>
              )}
            </div>
          ) : null}

          {wizardStep === 4 ? (
            <div className="space-y-4">
              <ModalField>
                <ModalLabel htmlFor="com-nombre">Nombre comercial *</ModalLabel>
                <ModalInput
                  id="com-nombre"
                  value={nombreComercial}
                  onChange={(e) => setNombreComercial(e.target.value)}
                />
              </ModalField>
              <ModalField>
                <ModalLabel htmlFor="com-pres">Presentación *</ModalLabel>
                <ModalInput
                  id="com-pres"
                  value={presentacion}
                  onChange={(e) => setPresentacion(e.target.value)}
                />
              </ModalField>
              <ModalField>
                <ModalLabel htmlFor="com-precio">Precio de venta *</ModalLabel>
                <ModalInput
                  id="com-precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                />
              </ModalField>
            </div>
          ) : null}

          {wizardStep === 5 ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                El primer lote es opcional. El precio de venta queda en el producto comercial.
              </p>
              <SigetActionButton
                label={omitirLote ? "Lote" : "Omitir"}
                accentColor={sigetAccent.editar}
                morphFrom={SkipForward}
                morphTo={SkipForward}
                type="button"
                onClick={() => setOmitirLote((v) => !v)}
                className="w-auto shrink-0"
              />
              {!omitirLote ? (
                <>
                  <ModalField>
                    <ModalLabel htmlFor="lote-prov">Proveedor *</ModalLabel>
                    <ModalSelect
                      id="lote-prov"
                      value={proveedorLoteId}
                      onChange={(e) => setProveedorLoteId(e.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </ModalSelect>
                  </ModalField>
                  <ModalField>
                    <ModalLabel htmlFor="lote-codigo">Código de barras *</ModalLabel>
                    <ModalInput
                      id="lote-codigo"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                    />
                  </ModalField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ModalField>
                      <ModalLabel htmlFor="lote-num">Número de lote *</ModalLabel>
                      <ModalInput
                        id="lote-num"
                        value={numeroLote}
                        onChange={(e) => setNumeroLote(e.target.value)}
                      />
                    </ModalField>
                    <ModalField>
                      <ModalLabel htmlFor="lote-cant">Cantidad *</ModalLabel>
                      <ModalInput
                        id="lote-cant"
                        type="number"
                        min="0"
                        value={cantidadLote}
                        onChange={(e) => setCantidadLote(e.target.value)}
                      />
                    </ModalField>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ModalField>
                      <ModalLabel htmlFor="lote-costo">Costo *</ModalLabel>
                      <ModalInput
                        id="lote-costo"
                        type="number"
                        step="0.01"
                        min="0"
                        value={precioCostoLote}
                        onChange={(e) => setPrecioCostoLote(e.target.value)}
                      />
                    </ModalField>
                    <ModalField>
                      <ModalLabel htmlFor="lote-vence">Vencimiento *</ModalLabel>
                      <ModalFechaInput
                        id="lote-vence"
                        value={fechaVencimientoLote}
                        onChange={setFechaVencimientoLote}
                      />
                    </ModalField>
                  </div>
                  <ModalField>
                    <ModalLabel htmlFor="lote-ubi">Ubicación</ModalLabel>
                    <ModalInput
                      id="lote-ubi"
                      value={ubicacionLote}
                      onChange={(e) => setUbicacionLote(e.target.value)}
                    />
                  </ModalField>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <ModalFooter className="shrink-0 justify-between gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <div className="flex gap-2">
            {wizardStep > 1 ? (
              <SigetActionButton
                label="Atrás"
                accentColor={sigetAccent.cancelar}
                morphFrom={ChevronLeft}
                morphTo={ChevronLeft}
                type="button"
                onClick={retroceder}
                disabled={isBusy}
                className="w-auto shrink-0"
              />
            ) : (
              <ModalCancelButton onClick={handleClose} />
            )}
          </div>
          <div className="flex gap-2">
            {wizardStep < PRODUCTO_WIZARD_PASOS ? (
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
                morphFrom={Check}
                morphTo={Check}
                type="button"
                onClick={() => void finalizar()}
                disabled={isBusy}
                className="w-auto shrink-0"
              />
            )}
          </div>
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
