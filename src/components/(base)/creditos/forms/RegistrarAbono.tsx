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
} from "@/components/ui/general-modal";
import { fmtQ } from "@/lib/utils";
import type { CreditoResumen } from "../lib/zod";
import { useRegistrarMovimiento } from "../../finanzas/lib/hooks";

interface ModalAbonoProps {
  cliente: CreditoResumen;
  ventaId: string;
  saldoRestante: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegistrarAbono({
  cliente,
  ventaId,
  saldoRestante,
  onClose,
  onSuccess,
}: ModalAbonoProps) {
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const { mutateAsync: registrarMovimiento, isPending } = useRegistrarMovimiento();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(monto);
    if (isNaN(val) || val <= 0) {
      toast.warn("Ingresa un monto válido mayor a 0.");
      return;
    }
    if (val > saldoRestante) {
      toast.warn(`El monto no puede ser mayor al saldo restante (${fmtQ(saldoRestante)}).`);
      return;
    }

    try {
      await registrarMovimiento({
        tipo_movimiento: "ingreso",
        categoria: "abono_cliente",
        venta_id: ventaId,
        monto: val,
        descripcion: descripcion.trim() || `Abono a crédito de ${cliente.nombre}`,
      });
      toast.success("Abono registrado correctamente.");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo registrar el abono.";
      toast.error(message);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Registrar Abono"
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel>Saldo Pendiente</ModalLabel>
          <p className="text-lg font-black text-rose-500">{fmtQ(saldoRestante)}</p>
        </ModalField>
        <ModalField>
          <ModalLabel htmlFor="abono-monto">Monto a Abonar (Q)</ModalLabel>
          <ModalInput
            id="abono-monto"
            type="number"
            min="0.01"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            autoFocus
            required
          />
        </ModalField>
        <ModalField>
          <ModalLabel htmlFor="abono-descripcion">Descripción (Opcional)</ModalLabel>
          <ModalInput
            id="abono-descripcion"
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </ModalField>
        <ModalFooter>
          <ModalCancelButton onClick={onClose} disabled={isPending} />
          <ModalSubmit label="Abonar" disabled={isPending} />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
