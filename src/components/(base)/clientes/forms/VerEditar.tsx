"use client";

import { useEffect, useState } from "react";
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
import { useEditarCliente } from "../lib/hooks";
import type { Cliente, ClienteInput } from "../lib/zod";

const AREA_CODES = ["+502", "+503", "+504", "+505", "+506", "+507", "+52", "+1"] as const;

interface EditarClienteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cliente: Cliente | null;
}

export function EditarCliente({ isOpen, onClose, onSuccess, cliente }: EditarClienteProps) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [areaCode, setAreaCode] = useState<(typeof AREA_CODES)[number]>("+502");
  const [direccion, setDireccion] = useState("");
  const [nit, setNit] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutateAsync: editarCliente, isPending } = useEditarCliente();

  useEffect(() => {
    if (!cliente) return;

    setNombre(cliente.nombre || "");
    setEmail(cliente.email === "No registrado" ? "" : cliente.email || "");

    if (cliente.telefono && cliente.telefono !== "No registrado") {
      const telStr = cliente.telefono.trim();
      const match = telStr.match(/^(\+\d{1,4})\s?(.*)$/);
      if (match) {
        const code = AREA_CODES.find((c) => c === match[1]) ?? "+502";
        setAreaCode(code);
        setTelefono(match[2]);
      } else {
        setAreaCode("+502");
        setTelefono(telStr);
      }
    } else {
      setAreaCode("+502");
      setTelefono("");
    }

    setDireccion(cliente.direccion === "No registrada" ? "" : cliente.direccion || "");
    setNit(cliente.nit === "C/F" ? "" : cliente.nit || "");
  }, [cliente, isOpen]);

  const handleClose = () => {
    setValidationError(null);
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
    if (!cliente) return;
    setValidationError(null);

    if (!nombre.trim()) {
      setValidationError("El nombre es requerido");
      return;
    }

    try {
      await editarCliente({ id: cliente.id, data: buildInput() });
      toast.success("Cliente actualizado correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo actualizar el cliente."));
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Cliente"
      subtitle="Actualización de datos"
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel htmlFor="editar-cliente-nombre">Nombre Completo *</ModalLabel>
          <ModalInput
            id="editar-cliente-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          {validationError ? (
            <p className="text-xs font-bold text-red-500">{validationError}</p>
          ) : null}
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-cliente-email">Correo Electrónico</ModalLabel>
          <ModalInput
            id="editar-cliente-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-cliente-telefono">Teléfono</ModalLabel>
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
              id="editar-cliente-telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="flex-1"
            />
          </div>
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-cliente-direccion">Dirección</ModalLabel>
          <ModalInput
            id="editar-cliente-direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-cliente-nit">NIT</ModalLabel>
          <ModalInput
            id="editar-cliente-nit"
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
