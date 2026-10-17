"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { Check, Save } from "lucide";
import { toast } from "react-toastify";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalShell,
} from "@/components/ui/general-modal";
import { actionErrorMessage } from "@/components/ui/modal-toast";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { getSwalThemeOpts } from "@/lib/utils";
import { useGuardarCatalogoInventario } from "../lib/hooks";

export interface CrearCatalogoProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAgregarGenerico?: (catalogoId: string, catalogoNombre: string) => void;
}

export function CrearCatalogo({
  isOpen = true,
  onClose,
  onSuccess,
  onAgregarGenerico,
}: CrearCatalogoProps) {
  const [nombre, setNombre] = useState("");
  const { mutateAsync: guardarCatalogo, isPending } = useGuardarCatalogoInventario();

  const cerrar = () => {
    setNombre("");
    onClose();
  };

  const guardar = async () => {
    const trimmed = nombre.trim();
    if (trimmed.length < 2) {
      toast.warn("Indica el nombre del principio activo (mínimo 2 caracteres).");
      return;
    }
    try {
      const res = await guardarCatalogo({
        data: { nombre: trimmed, activo: true },
      });
      const id = res.id;
      toast.success(`«${trimmed}» quedó registrado en el catálogo.`);
      onSuccess();
      setNombre("");
      if (onAgregarGenerico && id) {
        const follow = await Swal.fire({
          title: "¿Agregar concentración y forma?",
          text: "Opcional: define el producto ahora o más tarde desde Inventario → Producto.",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Sí, agregar producto",
          cancelButtonText: "Cerrar",
          ...getSwalThemeOpts(),
        });
        if (follow.isConfirmed) {
          onAgregarGenerico(id, trimmed);
        } else {
          cerrar();
        }
      } else {
        cerrar();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      const detail = (err as Error & { detail?: string }).detail;
      toast.error(
        actionErrorMessage({ error: message, detail }, "No se pudo guardar el catálogo."),
      );
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={cerrar}
      title="Registrar producto de catálogo"
      subtitle="Solo el principio activo (ej. Neomicina, Acetaminofén). Sin laboratorio, comercial ni lote."
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <ModalField>
          <ModalLabel htmlFor="cat-nombre">Nombre del principio activo *</ModalLabel>
          <ModalInput
            id="cat-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Neomicina"
            autoFocus
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
            disabled={isPending}
            onClick={() => void guardar()}
            className="w-auto shrink-0"
          />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
