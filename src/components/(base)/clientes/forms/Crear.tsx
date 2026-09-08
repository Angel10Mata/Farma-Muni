"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalInput,
  ModalLabel,
  ModalShell,
  ModalSubmit,
  modalActionMessage,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { cn } from "@/lib/utils";
import { useCrearCliente } from "../lib/hooks";
import type { ClienteInput } from "../lib/zod";

interface CrearClienteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AREA_CODES = ["+502", "+503", "+504", "+505", "+506", "+507", "+52", "+1"] as const;

export function CrearCliente({ isOpen, onClose, onSuccess }: CrearClienteProps) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [areaCode, setAreaCode] = useState<(typeof AREA_CODES)[number]>("+502");
  const [direccion, setDireccion] = useState("");
  const [nit, setNit] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutateAsync: crearCliente, isPending } = useCrearCliente();

  const handleReset = () => {
    setNombre("");
    setEmail("");
    setTelefono("");
    setAreaCode("+502");
    setDireccion("");
    setNit("");
    setValidationError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const buildInput = (): ClienteInput => ({
    nombre: nombre.trim(),
    email: email.trim(),
    telefono: telefono.trim() ? `${areaCode} ${telefono.trim()}` : "",
    direccion: direccion.trim(),
    nit: nit.trim(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!nombre.trim()) {
      setValidationError("El nombre es requerido");
      return;
    }

    try {
      await crearCliente(buildInput());
      toast.success("Cliente guardado correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo guardar el cliente."));
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Nuevo Cliente"
      subtitle="Registro de cliente"
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel htmlFor="cliente-nombre">Nombre Completo *</ModalLabel>
          <ModalInput
            id="cliente-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          {validationError ? (
            <p className="text-xs font-bold text-red-500">{validationError}</p>
          ) : null}
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="cliente-email">Correo Electrónico</ModalLabel>
          <ModalInput
            id="cliente-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="cliente-telefono">Teléfono</ModalLabel>
          <div className="flex gap-2">
            <select
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value as (typeof AREA_CODES)[number])}
              className={cn(
                "h-10 w-24 shrink-0 rounded-lg bg-transparent px-2 text-sm text-foreground outline-none transition-colors focus-visible:outline-none",
                modalFieldClass,
              )}
            >
              {AREA_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <ModalInput
              id="cliente-telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="flex-1"
            />
          </div>
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="cliente-direccion">Dirección</ModalLabel>
          <ModalInput
            id="cliente-direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="cliente-nit">NIT</ModalLabel>
          <ModalInput
            id="cliente-nit"
            value={nit}
            onChange={(e) => setNit(e.target.value)}
          />
        </ModalField>

        <ModalFooter>
          <ModalCancelButton onClick={handleClose} disabled={isPending} />
          <ModalSubmit disabled={isPending} />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
