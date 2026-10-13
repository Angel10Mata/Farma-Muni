"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
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
} from "@/components/ui/general-modal";
import { actionErrorMessage } from "@/components/ui/modal-toast";
import Link from "next/link";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { SigetNuevoExistenteToggle } from "@/components/ui/siget-nuevo-existente-toggle";
import { cn, getSwalThemeOpts } from "@/lib/utils";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";
import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import {
  useCatalogosInventario,
  useComercialesInventario,
  useCrearLoteManual,
  useGenericosInventario,
  useGuardarCatalogoInventario,
  useGuardarComercialInventario,
  useGuardarGenericoInventario,
  useLaboratoriosInventario,
} from "../lib/hooks";
import {
  buscarGenericoCoincidente,
  elegirGenericoReferenciaCatalogo,
  laboratoriosParaSeleccionComercial,
} from "../lib/helpers";
import { FORMAS_FARMACEUTICAS, PRODUCTO_WIZARD_PASOS, PRODUCTO_WIZARD_PASOS_META } from "../lib/zod";
import type { FormaFarmaceutica } from "../lib/zod";
import { jerarquiaWizardLoteSchema, type ProductoComercial } from "../lib/jerarquia-zod";

const WIZARD_CONTENIDO_MIN_H = "min-h-[18rem]";
const WIZARD_SECCION_TITULO =
  "text-[10px] font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]/70";

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
  const [modoComercialNuevo, setModoComercialNuevo] = useState(true);
  const [comercialExistenteId, setComercialExistenteId] = useState("");
  const [concentracion, setConcentracion] = useState("");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<FormaFarmaceutica>("tableta");
  const [requiereReceta, setRequiereReceta] = useState(false);
  const [unidadVenta, setUnidadVenta] = useState("unidad");
  const [stockMinimo, setStockMinimo] = useState("0");

  const [laboratorioId, setLaboratorioId] = useState("");

  const [nombreComercial, setNombreComercial] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
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

  const nombreCatalogoPaso1 = useMemo(() => {
    if (modoCatalogoNuevo) return catalogoNombreNuevo.trim();
    return catalogos.find((c) => c.id === catalogoId)?.nombre ?? "";
  }, [modoCatalogoNuevo, catalogoNombreNuevo, catalogoId, catalogos]);

  const genericoCoincidente = useMemo(
    () =>
      buscarGenericoCoincidente(genericos, concentracion, formaFarmaceutica),
    [genericos, concentracion, formaFarmaceutica],
  );

  const crearGenericoNuevo = !genericoCoincidente;

  const { data: comercialesDelGenerico = [] } = useComercialesInventario(
    genericoCoincidente ? { generico_id: genericoCoincidente.generico_id } : undefined,
    { enabled: !!genericoCoincidente },
  );

  const puedeElegirComercialExistente = comercialesDelGenerico.length > 0;

  const catalogoIdAutollenadoRef = useRef<string | null>(null);

  const { data: laboratorios = [] } = useLaboratoriosInventario();
  const { data: proveedores = [] } = useProveedores();

  const { mutateAsync: guardarCatalogo, isPending: guardandoCatalogo } =
    useGuardarCatalogoInventario();
  const { mutateAsync: guardarGenerico, isPending: guardandoGenerico } =
    useGuardarGenericoInventario();
  const { mutateAsync: guardarComercial, isPending: guardandoComercial } =
    useGuardarComercialInventario();
  const { mutateAsync: crearLote, isPending: guardandoLote } = useCrearLoteManual();

  const isBusy =
    guardandoCatalogo ||
    guardandoGenerico ||
    guardandoComercial ||
    guardandoLote;

  const laboratoriosSeleccionables = useMemo(
    () => laboratoriosParaSeleccionComercial(laboratorios),
    [laboratorios],
  );

  const limpiarErrores = (keys: string[]) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  };

  const aplicarComercialExistente = (c: ProductoComercial) => {
    setComercialExistenteId(c.producto_id);
    setNombreComercial(c.nombre_comercial);
    setPresentacion(c.presentacion);
    setPrecioVenta(String(c.precio_venta));
    setLaboratorioId(c.laboratorio_id);
    const lab = laboratoriosSeleccionables.find((l) => l.id === c.laboratorio_id);
    setProveedorLoteId(lab?.proveedor_id ?? "");
    limpiarErrores(["nombre_comercial", "presentacion", "precio_venta", "laboratorio"]);
  };

  const proveedorLoteVinculado = useMemo(() => {
    const lab = laboratoriosSeleccionables.find((l) => l.id === laboratorioId);
    if (!lab?.proveedor_id) return null;
    const nombre =
      lab.proveedor_nombre ??
      proveedores.find((p) => p.id === lab.proveedor_id)?.nombre ??
      "Proveedor";
    return { id: lab.proveedor_id, nombre };
  }, [laboratoriosSeleccionables, laboratorioId, proveedores]);

  useEffect(() => {
    if (proveedorLoteVinculado) {
      setProveedorLoteId(proveedorLoteVinculado.id);
    }
  }, [proveedorLoteVinculado]);

  const genericoComercialAutollenadoRef = useRef<string | null>(null);

  useEffect(() => {
    const genId = genericoCoincidente?.generico_id;
    if (!genId || comercialesDelGenerico.length === 0) {
      genericoComercialAutollenadoRef.current = null;
      setModoComercialNuevo(true);
      setComercialExistenteId("");
      return;
    }
    if (genericoComercialAutollenadoRef.current === genId) return;
    genericoComercialAutollenadoRef.current = genId;
    setModoComercialNuevo(false);
    aplicarComercialExistente(comercialesDelGenerico[0]);
  }, [genericoCoincidente?.generico_id, comercialesDelGenerico]);

  useEffect(() => {
    if (modoCatalogoNuevo || !catalogoId) {
      catalogoIdAutollenadoRef.current = null;
      return;
    }
    if (genericos.length === 0) {
      if (catalogoIdAutollenadoRef.current === catalogoId) {
        setConcentracion("");
        catalogoIdAutollenadoRef.current = null;
      }
      return;
    }
    if (catalogoIdAutollenadoRef.current === catalogoId) return;

    const ref = elegirGenericoReferenciaCatalogo(genericos);
    if (!ref) return;

    catalogoIdAutollenadoRef.current = catalogoId;
    setConcentracion(ref.concentracion);
    setFormaFarmaceutica(ref.forma_farmaceutica as FormaFarmaceutica);
    setRequiereReceta(ref.requiere_receta);
    setStockMinimo(String(ref.stock_minimo));
    limpiarErrores(["concentracion"]);
  }, [catalogoId, modoCatalogoNuevo, genericos]);

  const reiniciarWizard = () => {
    setWizardStep(1);
    setFieldErrors({});
    setCatalogoId("");
    setCatalogoNombreNuevo("");
    setModoCatalogoNuevo(false);
    setModoComercialNuevo(true);
    setComercialExistenteId("");
    setConcentracion("");
    setFormaFarmaceutica("tableta");
    setRequiereReceta(false);
    setUnidadVenta("unidad");
    setStockMinimo("0");
    setLaboratorioId("");
    setNombreComercial("");
    setPresentacion("");
    setPrecioVenta("");
    setProveedorLoteId("");
    setCodigoBarras("");
    setNumeroLote("");
    setCantidadLote("");
    setPrecioCostoLote("");
    setFechaVencimientoLote("");
    setUbicacionLote("");
    setOmitirLote(false);
  };

  const cerrarWizard = () => {
    reiniciarWizard();
    onClose();
  };

  const solicitarCierre = async () => {
    const result = await Swal.fire({
      title: "¿Salir sin terminar?",
      text:
        "No se guardará nada hasta que completes el asistente y pulses Guardar. ¿Seguro que deseas salir?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Salir",
      cancelButtonText: "Continuar",
      ...getSwalThemeOpts(),
    });
    if (result.isConfirmed) {
      cerrarWizard();
    }
  };

  const validarPaso1 = (): boolean => {
    if (modoCatalogoNuevo) {
      if (catalogoNombreNuevo.trim().length < 2) {
        setFieldErrors((p) => ({ ...p, catalogo: "Indica el nombre genérico" }));
        return false;
      }
      return true;
    }
    if (!catalogoId) {
      setFieldErrors((p) => ({ ...p, catalogo: "Selecciona un nombre genérico" }));
      return false;
    }
    return true;
  };

  const validarPaso2Generico = (): boolean => {
    if (!nombreCatalogoPaso1) {
      toast.warn("Primero indica o elige el nombre genérico.");
      return false;
    }
    if (!concentracion.trim()) {
      setFieldErrors((p) => ({ ...p, concentracion: "La concentración es requerida" }));
      return false;
    }
    return true;
  };

  const validarPaso3 = (): boolean => {
    if (!laboratorioId) {
      setFieldErrors((p) => ({ ...p, laboratorio: "Selecciona un laboratorio" }));
      return false;
    }
    return true;
  };

  const validarPaso4 = (): boolean => {
    if (!modoComercialNuevo) {
      if (!comercialExistenteId) {
        setFieldErrors((p) => ({
          ...p,
          nombre_comercial: "Selecciona un producto comercial",
        }));
        return false;
      }
      return true;
    }
    const precio = parseFloat(precioVenta);
    if (!nombreComercial.trim() || !presentacion.trim() || Number.isNaN(precio)) {
      setFieldErrors((p) => ({
        ...p,
        nombre_comercial: !nombreComercial.trim() ? "Requerido" : "",
        presentacion: !presentacion.trim() ? "Requerida" : "",
        precio_venta: Number.isNaN(precio) ? "Precio inválido" : "",
      }));
      return false;
    }
    return true;
  };

  const avanzar = () => {
    setFieldErrors({});
    if (wizardStep === 1) {
      if (!validarPaso1() || !validarPaso2Generico()) return;
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (!validarPaso3() || !validarPaso4()) return;
      setWizardStep(3);
    }
  };

  const retroceder = () => {
    if (wizardStep > 1) setWizardStep((s) => s - 1);
  };

  const persistirJerarquia = async (): Promise<string | null> => {
    const crearCatalogoNuevo = modoCatalogoNuevo;

    let catId = catalogoId;
    if (crearCatalogoNuevo) {
      const nombre = catalogoNombreNuevo.trim();
      const res = await guardarCatalogo({ data: { nombre, activo: true } });
      catId = res.id;
      setCatalogoId(catId);
      setModoCatalogoNuevo(false);
    }
    if (!catId) return null;

    let genId = genericoCoincidente?.generico_id ?? "";
    if (crearGenericoNuevo) {
      const stock = parseFloat(stockMinimo);
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
      genId = res.id;
    }
    if (!genId) return null;

    if (!modoComercialNuevo && comercialExistenteId) {
      return comercialExistenteId;
    }

    const labId = laboratorioId;
    if (!labId) return null;

    const precio = parseFloat(precioVenta);
    if (!validarPaso4()) return null;

    const resComercial = await guardarComercial({
      data: {
        generico_id: genId,
        laboratorio_id: labId,
        nombre_comercial: nombreComercial.trim(),
        presentacion: presentacion.trim(),
        precio_venta: precio,
        activo: true,
      },
    });
    return resComercial.id;
  };

  const finalizar = async () => {
    if (
      !validarPaso1() ||
      !validarPaso2Generico() ||
      !validarPaso3() ||
      !validarPaso4()
    ) {
      toast.warn("Revisa los datos de los pasos anteriores.");
      return;
    }
    try {
      const pid = await persistirJerarquia();
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

      const soloLoteExistente = !modoComercialNuevo && !!comercialExistenteId;
      toast.success(
        soloLoteExistente
          ? omitirLote
            ? "Producto comercial sin cambios."
            : "Lote registrado en el producto existente."
          : omitirLote
            ? "Producto comercial registrado. Puedes agregar lotes después."
            : "Producto y primer lote registrados.",
      );
      onSuccess();
      cerrarWizard();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const detail = (err as Error & { detail?: string }).detail;
      toast.error(
        actionErrorMessage({ error: message, detail }, "No se pudo completar el registro."),
      );
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => void solicitarCierre()}
      title="Nuevo producto"
      subtitle="Define la jerarquía del producto y, si quieres, el primer lote"
      maxWidth="max-w-2xl"
    >
      <ModalForm onSubmit={(e) => e.preventDefault()} className="flex max-h-[min(88dvh,820px)] flex-col">
        <div className="shrink-0 border-b border-zinc-200 px-1 pb-3 dark:border-zinc-700">
          <div className="grid grid-cols-3 gap-2">
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
            <div className="space-y-5">
              <section className="space-y-4">
                <ModalField>
                  <ModalLabel htmlFor={modoCatalogoNuevo ? "catalogo-nuevo" : "catalogo-select"}>
                    Nombre genérico *
                  </ModalLabel>
                  <div className="space-y-2">
                    <SigetNuevoExistenteToggle
                      compact
                      ariaLabel="Nombre genérico nuevo o existente"
                      modoNuevo={modoCatalogoNuevo}
                      onModoNuevoChange={(nuevo) => {
                        setModoCatalogoNuevo(nuevo);
                        if (nuevo) {
                          setCatalogoId("");
                        } else {
                          setCatalogoNombreNuevo("");
                        }
                        limpiarErrores(["catalogo"]);
                      }}
                    />
                    {modoCatalogoNuevo ? (
                      <ModalInput
                        id="catalogo-nuevo"
                        value={catalogoNombreNuevo}
                        onChange={(e) => {
                          setCatalogoNombreNuevo(e.target.value);
                          limpiarErrores(["catalogo"]);
                        }}
                      />
                    ) : (
                      <ModalSelect
                        id="catalogo-select"
                        value={catalogoId}
                        onChange={(e) => {
                          const id = e.target.value;
                          catalogoIdAutollenadoRef.current = null;
                          setCatalogoId(id);
                          if (!id) {
                            setConcentracion("");
                          }
                          limpiarErrores(["catalogo"]);
                        }}
                      >
                        <option value="">Seleccionar…</option>
                        {catalogos.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </ModalSelect>
                    )}
                  </div>
                  {fieldErrors.catalogo ? (
                    <p className="text-xs font-bold text-red-500">{fieldErrors.catalogo}</p>
                  ) : null}
                </ModalField>
              </section>

              <section className="space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ModalField>
                    <ModalLabel htmlFor="gen-conc">Concentración *</ModalLabel>
                    <ModalInput
                      id="gen-conc"
                      value={concentracion}
                      onChange={(e) => {
                        setConcentracion(e.target.value);
                        limpiarErrores(["concentracion"]);
                      }}
                      placeholder="Ej: 500 mg"
                      disabled={!nombreCatalogoPaso1}
                    />
                  </ModalField>
                  <ModalField>
                    <ModalLabel htmlFor="gen-forma">Forma *</ModalLabel>
                    <ModalSelect
                      id="gen-forma"
                      value={formaFarmaceutica}
                      onChange={(e) =>
                        setFormaFarmaceutica(e.target.value as FormaFarmaceutica)
                      }
                      disabled={!nombreCatalogoPaso1}
                    >
                      {FORMAS_FARMACEUTICAS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </ModalSelect>
                  </ModalField>
                </div>
                {fieldErrors.concentracion ? (
                  <p className="text-xs font-bold text-red-500">{fieldErrors.concentracion}</p>
                ) : null}
                {genericoCoincidente && concentracion.trim() ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ya existe este genérico ({genericoCoincidente.generico_nombre}). En el paso 2
                    podrás elegir un producto comercial existente (p. ej. para un nuevo lote) o
                    registrar uno nuevo.
                  </p>
                ) : concentracion.trim() && nombreCatalogoPaso1 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Se creará un genérico nuevo bajo «{nombreCatalogoPaso1}» al guardar.
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}

          {wizardStep === 2 ? (
            <div className="space-y-5">
              {puedeElegirComercialExistente ? (
                <ModalField>
                  <ModalLabel>¿Comercial nuevo o existente?</ModalLabel>
                  <SigetNuevoExistenteToggle
                    compact
                    ariaLabel="Producto comercial nuevo o existente"
                    modoNuevo={modoComercialNuevo}
                    onModoNuevoChange={(nuevo) => {
                      setModoComercialNuevo(nuevo);
                      if (!nuevo) {
                        const c = comercialesDelGenerico.find(
                          (x) => x.producto_id === comercialExistenteId,
                        );
                        aplicarComercialExistente(c ?? comercialesDelGenerico[0]);
                      } else {
                        setComercialExistenteId("");
                        setNombreComercial("");
                        setPresentacion("");
                        setPrecioVenta("");
                        setLaboratorioId("");
                        setProveedorLoteId("");
                      }
                      limpiarErrores([
                        "nombre_comercial",
                        "presentacion",
                        "precio_venta",
                        "laboratorio",
                      ]);
                    }}
                  />
                  {!modoComercialNuevo && comercialExistenteId ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Producto existente: en el paso 3 solo registrarás el lote (no se duplica el
                      comercial).
                    </p>
                  ) : null}
                </ModalField>
              ) : null}

              <section className="space-y-4">
                <p className={WIZARD_SECCION_TITULO}>Laboratorio</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Los laboratorios nuevos se registran en{" "}
                  <Link
                    href="/farmamuni/proveedores"
                    className="font-bold text-[#2c5f9b] underline dark:text-[#6f9fd4]"
                  >
                    Proveedores
                  </Link>
                  .
                </p>
                <ModalField>
                  <ModalLabel htmlFor="lab-select">Laboratorio *</ModalLabel>
                  <ModalSelect
                    id="lab-select"
                    value={laboratorioId}
                    disabled={!modoComercialNuevo && !!comercialExistenteId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setLaboratorioId(id);
                      const lab = laboratoriosSeleccionables.find((l) => l.id === id);
                      setProveedorLoteId(lab?.proveedor_id ?? "");
                      limpiarErrores(["laboratorio"]);
                    }}
                  >
                    <option value="">Seleccionar…</option>
                    {laboratoriosSeleccionables.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                        {l.proveedor_nombre ? ` · ${l.proveedor_nombre}` : ""}
                      </option>
                    ))}
                  </ModalSelect>
                  {fieldErrors.laboratorio ? (
                    <p className="text-xs font-bold text-red-500">{fieldErrors.laboratorio}</p>
                  ) : null}
                </ModalField>
              </section>

              <section className="space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                <p className={WIZARD_SECCION_TITULO}>Producto comercial</p>
                {nombreCatalogoPaso1 && concentracion.trim() ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Producto comercial para «{nombreCatalogoPaso1}» ·{" "}
                    {genericoCoincidente?.generico_nombre ??
                      `${concentracion.trim()} · ${
                        FORMAS_FARMACEUTICAS.find((f) => f.value === formaFarmaceutica)?.label ??
                        formaFarmaceutica
                      }`}
                    .
                  </p>
                ) : null}
                <ModalField>
                  <ModalLabel htmlFor="com-nombre">Nombre comercial *</ModalLabel>
                  {puedeElegirComercialExistente && !modoComercialNuevo ? (
                    <ModalSelect
                      id="com-nombre"
                      value={comercialExistenteId}
                      onChange={(e) => {
                        const row = comercialesDelGenerico.find(
                          (c) => c.producto_id === e.target.value,
                        );
                        if (row) aplicarComercialExistente(row);
                      }}
                    >
                      <option value="">Seleccionar…</option>
                      {comercialesDelGenerico.map((c) => (
                        <option key={c.producto_id} value={c.producto_id}>
                          {c.nombre_comercial} · {c.laboratorio_nombre} · {c.presentacion}
                        </option>
                      ))}
                    </ModalSelect>
                  ) : (
                    <ModalInput
                      id="com-nombre"
                      value={nombreComercial}
                      onChange={(e) => {
                        setNombreComercial(e.target.value);
                        limpiarErrores(["nombre_comercial"]);
                      }}
                    />
                  )}
                  {fieldErrors.nombre_comercial ? (
                    <p className="text-xs font-bold text-red-500">{fieldErrors.nombre_comercial}</p>
                  ) : null}
                </ModalField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ModalField>
                    <ModalLabel htmlFor="com-pres">Presentación de venta *</ModalLabel>
                    <ModalInput
                      id="com-pres"
                      value={presentacion}
                      readOnly={!modoComercialNuevo && !!comercialExistenteId}
                      disabled={!modoComercialNuevo && !!comercialExistenteId}
                      onChange={(e) => {
                        setPresentacion(e.target.value);
                        limpiarErrores(["presentacion"]);
                      }}
                      placeholder="Ej: Caja 20 tabletas, Frasco 120 ml"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Empaque y cantidad de venta. La forma farmacéutica va en el paso anterior.
                    </p>
                    {fieldErrors.presentacion ? (
                      <p className="text-xs font-bold text-red-500">{fieldErrors.presentacion}</p>
                    ) : null}
                  </ModalField>
                  <ModalField>
                    <ModalLabel htmlFor="com-precio">Precio de venta *</ModalLabel>
                    <ModalInput
                      id="com-precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioVenta}
                      readOnly={!modoComercialNuevo && !!comercialExistenteId}
                      disabled={!modoComercialNuevo && !!comercialExistenteId}
                      onChange={(e) => setPrecioVenta(e.target.value)}
                    />
                    {fieldErrors.precio_venta ? (
                      <p className="text-xs font-bold text-red-500">{fieldErrors.precio_venta}</p>
                    ) : null}
                  </ModalField>
                </div>
                {crearGenericoNuevo ? (
                  <ModalField>
                    <ModalLabel htmlFor="gen-stock-min">Stock mínimo (genérico)</ModalLabel>
                    <ModalInput
                      id="gen-stock-min"
                      type="number"
                      min="0"
                      value={stockMinimo}
                      onChange={(e) => setStockMinimo(e.target.value)}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Aplica al genérico nuevo que definiste en el paso anterior.
                    </p>
                  </ModalField>
                ) : null}
              </section>
            </div>
          ) : null}

          {wizardStep === 3 ? (
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
                    {proveedorLoteVinculado ? (
                      <ModalInput
                        id="lote-prov"
                        readOnly
                        value={proveedorLoteVinculado.nombre}
                        className="cursor-default bg-zinc-50 dark:bg-zinc-800/80"
                      />
                    ) : (
                      <>
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
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          El laboratorio elegido no tiene proveedor vinculado; asígnalo en Proveedores.
                        </p>
                      </>
                    )}
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
              <ModalCancelButton onClick={() => void solicitarCierre()} />
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
                onClick={avanzar}
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
