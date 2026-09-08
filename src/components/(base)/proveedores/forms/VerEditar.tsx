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
  ModalTextarea,
  modalActionMessage,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { cn } from "@/lib/utils";
import { useGuardarProveedor } from "../lib/hooks";
import type { Proveedor, ProveedorInput } from "../lib/zod";

const AREA_CODES = ["+502", "+503", "+504", "+505", "+506", "+507", "+52", "+1"] as const;

interface EditarProveedorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proveedor: Proveedor | null;
}

export function EditarProveedor({ isOpen, onClose, onSuccess, proveedor }: EditarProveedorProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nit, setNit] = useState("");
  const [areaCode, setAreaCode] = useState<(typeof AREA_CODES)[number]>("+502");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutateAsync: guardarProveedor, isPending } = useGuardarProveedor();

  useEffect(() => {
    if (!proveedor) return;

    setNombre(proveedor.nombre || "");
    setDescripcion(proveedor.descripcion || "");
    setNit(proveedor.nit || "");

    if (proveedor.telefono) {
      const telStr = proveedor.telefono.trim();
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

    setCorreo(proveedor.correo || "");
    setValidationError(null);
  }, [proveedor, isOpen]);

  const handleClose = () => {
    setValidationError(null);
    onClose();
  };

  const buildInput = (): ProveedorInput => ({
    nombre: nombre.trim(),
    descripcion: descripcion.trim() || null,
    nit: nit.trim() || null,
    telefono: telefono.trim() ? `${areaCode} ${telefono.trim()}` : null,
    correo: correo.trim() || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedor) return;
    setValidationError(null);

    if (!nombre.trim()) {
      setValidationError("El nombre es requerido");
      return;
    }

    try {
      await guardarProveedor({ id: proveedor.id, data: buildInput() });
      toast.success("Proveedor actualizado correctamente.");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo actualizar el proveedor."));
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Proveedor"
      subtitle="Actualización de datos"
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel htmlFor="editar-proveedor-nombre">Nombre Comercial *</ModalLabel>
          <ModalInput
            id="editar-proveedor-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          {validationError ? (
            <p className="text-xs font-bold text-red-500">{validationError}</p>
          ) : null}
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="editar-proveedor-nit">NIT / Identificación Fiscal</ModalLabel>
          <ModalInput
            id="editar-proveedor-nit"
            value={nit}
            onChange={(e) => setNit(e.target.value)}
            placeholder="1234567-8"
          />
        </ModalField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModalField>
            <ModalLabel htmlFor="editar-proveedor-telefono">Teléfono de Contacto</ModalLabel>
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
                id="editar-proveedor-telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="flex-1"
                placeholder="5555-1234"
              />
            </div>
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="editar-proveedor-correo">Correo Electrónico</ModalLabel>
            <ModalInput
              id="editar-proveedor-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="proveedor@email.com"
            />
          </ModalField>
        </div>

        <ModalField>
          <ModalLabel htmlFor="editar-proveedor-descripcion">Descripción / Notas</ModalLabel>
          <ModalTextarea
            id="editar-proveedor-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Distribuidora de medicamentos genéricos..."
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
