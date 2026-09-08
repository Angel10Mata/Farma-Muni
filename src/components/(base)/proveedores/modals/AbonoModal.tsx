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
  ModalTextarea,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { cn } from "@/lib/utils";
import { fmtQ } from "@/lib/utils";
import { Compra } from "../lib/zod";

type TransaccionCompra = {
  categoria?: string;
  monto?: number;
};

function sumAbonosProveedor(transacciones: unknown[] | undefined): number {
  return (
    transacciones
      ?.filter((t): t is TransaccionCompra => typeof t === "object" && t !== null && (t as TransaccionCompra).categoria === "pago_proveedor")
      .reduce((sum, t) => sum + Math.abs(Number(t.monto ?? 0)), 0) ?? 0
  );
}

interface AbonoModalProps {
  compra: Compra | null;
  onClose: () => void;
  onAbonar: (id: string, monto: number, metodo: string, notas: string) => Promise<boolean>;
}

const obtenerCodigoCompra = (id: string) => {
  if (!id) return "N/A";
  const cleanId = id.replace(/-/g, "").toUpperCase();
  return `${cleanId.substring(0, 3)}-${cleanId.substring(3, 6)}`;
};

export function AbonoModal({ compra, onClose, onAbonar }: AbonoModalProps) {
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoPagoAbono, setMetodoPagoAbono] = useState("Efectivo");
  const [notasAbono, setNotasAbono] = useState("");
  const [isProcesando, setIsProcesando] = useState(false);

  if (!compra) return null;

  const abonos = sumAbonosProveedor(compra.fin_transacciones);
  const saldoCompra = Math.max(0, compra.total - abonos);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(montoAbono);
    if (!amount || amount <= 0) {
      toast.warn("Ingresa un monto mayor a 0 para el abono.");
      return;
    }

    setIsProcesando(true);
    try {
      const success = await onAbonar(compra.id, amount, metodoPagoAbono, notasAbono.trim());
      if (success) {
        onClose();
      }
    } finally {
      setIsProcesando(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title={`Abonar #${obtenerCodigoCompra(compra.id)}`}
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel>Saldo Actual</ModalLabel>
          <p className="text-xl font-black text-[#2E9E77]">{fmtQ(saldoCompra)}</p>
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="abono-monto">Monto a Abonar (Q)</ModalLabel>
          <ModalInput
            id="abono-monto"
            type="number"
            step="0.01"
            min="0.01"
            value={montoAbono}
            onChange={(e) => setMontoAbono(e.target.value)}
            placeholder="0.00"
            autoFocus
            required
          />
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="abono-metodo">Método de Pago</ModalLabel>
          <select
            id="abono-metodo"
            value={metodoPagoAbono}
            onChange={(e) => setMetodoPagoAbono(e.target.value)}
            className={cn(
              "h-10 w-full rounded-lg bg-transparent px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-none",
              modalFieldClass,
            )}
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
            <option value="Cheque">Cheque</option>
          </select>
        </ModalField>

        <ModalField>
          <ModalLabel htmlFor="abono-notas">Notas (Opcional)</ModalLabel>
          <ModalTextarea
            id="abono-notas"
            value={notasAbono}
            onChange={(e) => setNotasAbono(e.target.value)}
            rows={2}
            placeholder="Referencia de transferencia, número de cheque, etc."
          />
        </ModalField>

        <ModalFooter>
          <ModalCancelButton onClick={onClose} disabled={isProcesando} />
          <ModalSubmit label="Abonar" disabled={isProcesando || !montoAbono} />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
