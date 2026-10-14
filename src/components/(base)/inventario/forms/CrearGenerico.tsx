"use client";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide";
import { toast } from "react-toastify";
import Link from "next/link";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalSelect,
  ModalShell,
} from "@/components/ui/general-modal";
import { actionErrorMessage } from "@/components/ui/modal-toast";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { SigetNuevoExistenteToggle } from "@/components/ui/siget-nuevo-existente-toggle";
import {
  useCatalogosInventario,
  useGuardarCatalogoInventario,
  useGuardarGenericoInventario,
} from "../lib/hooks";
import { FORMAS_FARMACEUTICAS, type FormaFarmaceutica } from "../lib/zod";

export interface CrearGenericoProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalogoIdInicial?: string;
}

export function CrearGenerico({
  isOpen = true,
  onClose,
  onSuccess,
  catalogoIdInicial,
}: CrearGenericoProps) {
  const [catalogoId, setCatalogoId] = useState(catalogoIdInicial ?? "");
  const [modoCatalogoNuevo, setModoCatalogoNuevo] = useState(false);
  const [catalogoNombreNuevo, setCatalogoNombreNuevo] = useState("");
  const [concentracion, setConcentracion] = useState("");
  const [formaFarmaceutica, setFormaFarmaceutica] = useState<FormaFarmaceutica>("tableta");
  const [unidadVenta, setUnidadVenta] = useState("unidad");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [requiereReceta, setRequiereReceta] = useState(false);

  const { data: catalogos = [] } = useCatalogosInventario();
  const { mutateAsync: guardarCatalogo, isPending: guardandoCat } = useGuardarCatalogoInventario();
  const { mutateAsync: guardarGenerico, isPending: guardandoGen } = useGuardarGenericoInventario();

  useEffect(() => {
    if (catalogoIdInicial) setCatalogoId(catalogoIdInicial);
  }, [catalogoIdInicial]);

  const cerrar = () => {
    setCatalogoId(catalogoIdInicial ?? "");
    setModoCatalogoNuevo(false);
    setCatalogoNombreNuevo("");
    setConcentracion("");
    onClose();
  };

  const guardar = async () => {
    let catId = catalogoId;
    if (modoCatalogoNuevo) {
      const nombre = catalogoNombreNuevo.trim();
      if (nombre.length < 2) {
        toast.warn("Indica el nombre del catálogo.");
        return;
      }
      try {
        const res = await guardarCatalogo({ data: { nombre, activo: true } });
        catId = res.id ?? "";
      } catch (err) {
        const message = err instanceof Error ? err.message : undefined;
        toast.error(actionErrorMessage({ error: message }, "No se pudo crear el catálogo."));
        return;
      }
    }
    if (!catId) {
      toast.warn("Selecciona un catálogo.");
      return;
    }
    if (!concentracion.trim()) {
      toast.warn("Indica la concentración.");
      return;
    }
    const min = parseFloat(stockMinimo);
    try {
      await guardarGenerico({
        data: {
          catalogo_id: catId,
          concentracion: concentracion.trim(),
          forma_farmaceutica: formaFarmaceutica,
          requiere_receta: requiereReceta,
          unidad_venta: unidadVenta.trim() || "unidad",
          stock_minimo: Number.isNaN(min) ? 0 : min,
          activo: true,
        },
      });
      toast.success("Genérico registrado.");
      onSuccess();
      cerrar();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const detail = (err as Error & { detail?: string }).detail;
      toast.error(actionErrorMessage({ error: message, detail }, "No se pudo guardar el genérico."));
    }
  };

  if (!isOpen) return null;

  const sinCatalogos = !modoCatalogoNuevo && catalogos.length === 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={cerrar}
      title="Nuevo genérico"
      subtitle="Catálogo + concentración + forma farmacéutica"
      maxWidth="max-w-lg"
    >
      <ModalForm onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {sinCatalogos ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            No hay catálogos.{" "}
            <Link href="/farmamuni/inventario?vista=catalogo" className="font-bold text-[#2c5f9b] underline">
              Registra un principio activo
            </Link>{" "}
            primero o crea uno aquí.
          </p>
        ) : null}
        <ModalField>
          <ModalLabel>Catálogo (principio activo) *</ModalLabel>
          <SigetNuevoExistenteToggle
            compact
            ariaLabel="Catálogo nuevo o existente"
            modoNuevo={modoCatalogoNuevo}
            onModoNuevoChange={setModoCatalogoNuevo}
          />
          {modoCatalogoNuevo ? (
            <ModalInput
              value={catalogoNombreNuevo}
              onChange={(e) => setCatalogoNombreNuevo(e.target.value)}
              placeholder="Nombre del principio activo"
            />
          ) : (
            <ModalSelect value={catalogoId} onChange={(e) => setCatalogoId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {catalogos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </ModalSelect>
          )}
        </ModalField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModalField>
            <ModalLabel htmlFor="gen-conc">Concentración *</ModalLabel>
            <ModalInput
              id="gen-conc"
              value={concentracion}
              onChange={(e) => setConcentracion(e.target.value)}
              placeholder="500 mg"
            />
          </ModalField>
          <ModalField>
            <ModalLabel htmlFor="gen-forma">Forma farmacéutica *</ModalLabel>
            <ModalSelect
              id="gen-forma"
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModalField>
            <ModalLabel htmlFor="gen-unidad">Unidad de venta</ModalLabel>
            <ModalInput
              id="gen-unidad"
              value={unidadVenta}
              onChange={(e) => setUnidadVenta(e.target.value)}
            />
          </ModalField>
          <ModalField>
            <ModalLabel htmlFor="gen-min">Stock mínimo</ModalLabel>
            <ModalInput
              id="gen-min"
              type="number"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
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
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${requiereReceta ? "bg-[#2c5f9b] dark:bg-[#6f9fd4]" : "bg-zinc-300 dark:bg-zinc-600"}`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${requiereReceta ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>
        </ModalField>
        <ModalFooter className="justify-between gap-2">
          <ModalCancelButton onClick={cerrar} />
          <SigetActionButton
            label="Guardar"
            accentColor={sigetAccent.guardar}
            morphFrom={Save}
            morphTo={Check}
            type="button"
            disabled={guardandoCat || guardandoGen}
            onClick={() => void guardar()}
            className="w-auto shrink-0"
          />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
