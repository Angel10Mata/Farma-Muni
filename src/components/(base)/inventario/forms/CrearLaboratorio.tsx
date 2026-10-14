"use client";

import { useState } from "react";
import { Check, Save } from "lucide";
import { toast } from "react-toastify";
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
import { useGuardarLaboratorioInventario } from "../lib/hooks";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";

export interface CrearLaboratorioProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proveedorIdPreseleccionado?: string | null;
}

export function CrearLaboratorio({
  isOpen = true,
  onClose,
  onSuccess,
  proveedorIdPreseleccionado,
}: CrearLaboratorioProps) {
  const [nombre, setNombre] = useState("");
  const [proveedorId, setProveedorId] = useState(proveedorIdPreseleccionado ?? "");
  const { mutateAsync: guardarLaboratorio, isPending } = useGuardarLaboratorioInventario();
  const { data: proveedores = [] } = useProveedores();

  const cerrar = () => {
    setNombre("");
    setProveedorId(proveedorIdPreseleccionado ?? "");
    onClose();
  };

  const guardar = async () => {
    const trimmed = nombre.trim();
    if (trimmed.length < 2) {
      toast.warn("Indica el nombre del laboratorio.");
      return;
    }
    try {
      await guardarLaboratorio({
        data: {
          nombre: trimmed,
          activo: true,
          proveedor_id: proveedorId ? proveedorId : null,
        },
      });
      toast.success("Laboratorio registrado.");
      onSuccess();
      cerrar();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const detail = (err as Error & { detail?: string }).detail;
      toast.error(
        actionErrorMessage({ error: message, detail }, "No se pudo guardar el laboratorio."),
      );
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={cerrar}
      title="Nuevo laboratorio"
      subtitle="Solo el nombre. El proveedor es opcional."
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <ModalField>
          <ModalLabel htmlFor="lab-nombre">Nombre del laboratorio *</ModalLabel>
          <ModalInput
            id="lab-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </ModalField>
        <ModalField>
          <ModalLabel htmlFor="lab-prov">Proveedor (opcional)</ModalLabel>
          <ModalSelect
            id="lab-prov"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            disabled={Boolean(proveedorIdPreseleccionado)}
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </ModalSelect>
        </ModalField>
        <ModalFooter className="justify-between gap-2">
          <ModalCancelButton onClick={cerrar} />
          <SigetActionButton
            label="Guardar"
            accentColor={sigetAccent.guardar}
            morphFrom={Save}
            morphTo={Check}
            type="button"
            disabled={isPending}
            onClick={() => void guardar()}
            className="w-auto shrink-0"
          />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
