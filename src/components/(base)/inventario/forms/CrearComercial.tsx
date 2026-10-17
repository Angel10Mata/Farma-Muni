"use client";

import { useMemo, useState } from "react";
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
import {
  useGenericosInventario,
  useGuardarComercialInventario,
  useLaboratoriosInventario,
} from "../lib/hooks";
import { laboratoriosParaSeleccionComercial } from "../lib/helpers";
import { CrearLaboratorio } from "./CrearLaboratorio";

export interface CrearComercialProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  genericoIdInicial?: string;
}

export function CrearComercial({
  isOpen = true,
  onClose,
  onSuccess,
  genericoIdInicial,
}: CrearComercialProps) {
  const [genericoId, setGenericoId] = useState(genericoIdInicial ?? "");
  const [laboratorioId, setLaboratorioId] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [modalLab, setModalLab] = useState(false);

  const { data: genericos = [] } = useGenericosInventario();
  const { data: laboratorios = [] } = useLaboratoriosInventario();
  const laboratoriosSelect = useMemo(
    () => laboratoriosParaSeleccionComercial(laboratorios),
    [laboratorios],
  );
  const { mutateAsync: guardarComercial, isPending } = useGuardarComercialInventario();

  const cerrar = () => {
    setGenericoId(genericoIdInicial ?? "");
    setLaboratorioId("");
    setNombreComercial("");
    setPresentacion("");
    setPrecioVenta("");
    onClose();
  };

  const guardar = async () => {
    if (!genericoId) {
      toast.warn("Selecciona un producto.");
      return;
    }
    if (!nombreComercial.trim() || !presentacion.trim()) {
      toast.warn("Indica nombre comercial y presentación.");
      return;
    }
    const precio = parseFloat(precioVenta);
    if (Number.isNaN(precio) || precio < 0) {
      toast.warn("Indica un precio de venta válido.");
      return;
    }
    try {
      await guardarComercial({
        data: {
          generico_id: genericoId,
          laboratorio_id: laboratorioId ? laboratorioId : null,
          nombre_comercial: nombreComercial.trim(),
          presentacion: presentacion.trim(),
          precio_venta: precio,
          activo: true,
        },
      });
      toast.success("Marca registrada.");
      onSuccess();
      cerrar();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const detail = (err as Error & { detail?: string }).detail;
      toast.error(
        actionErrorMessage({ error: message, detail }, "No se pudo guardar la marca."),
      );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalShell
        isOpen={isOpen && !modalLab}
        onClose={cerrar}
        title="Nueva marca"
        subtitle="Marca y presentación del producto de inventario. El laboratorio se puede asignar después."
        maxWidth="max-w-lg"
      >
        <ModalForm onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {genericos.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              No hay productos.{" "}
              <Link
                href="/farmamuni/inventario?vista=generico"
                className="font-bold text-[#2c5f9b] underline"
              >
                Crea un producto
              </Link>{" "}
              primero.
            </p>
          ) : null}
          <ModalField>
            <ModalLabel htmlFor="com-gen">Producto *</ModalLabel>
            <ModalSelect
              id="com-gen"
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
          <ModalField>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ModalLabel htmlFor="com-lab">Laboratorio</ModalLabel>
              <button
                type="button"
                className="text-xs font-bold text-[#2c5f9b] underline dark:text-[#6f9fd4]"
                onClick={() => setModalLab(true)}
              >
                Crear laboratorio
              </button>
            </div>
            <ModalSelect
              id="com-lab"
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
              min="0"
              step="0.01"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
            />
          </ModalField>
          <ModalFooter className="justify-between gap-2">
            <ModalCancelButton onClick={cerrar} />
            <SigetActionButton
              label="Guardar"
              accentColor={sigetAccent.guardar}
              morphFrom={Save}
              morphTo={Check}
              type="button"
              disabled={isPending || genericos.length === 0}
              onClick={() => void guardar()}
              className="w-auto shrink-0"
            />
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
