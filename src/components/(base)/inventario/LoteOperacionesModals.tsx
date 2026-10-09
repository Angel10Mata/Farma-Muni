"use client";

import { useMemo, useState } from "react";
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
  toast,
} from "@/components/ui/general-modal";
import { fmtNum } from "@/lib/utils";
import { isProductoVencido } from "./lib/helpers";
import {
  useAjustarLotePorConteo,
  useDarBajaLote,
  useDevolverLoteAProveedor,
} from "./lib/hooks";

export type LoteOperacionTarget = {
  id: string;
  nombre: string;
  numero_lote: string | null;
  stock_actual: number;
  fecha_vencimiento: string | null;
};

type ModoOperacion = "conteo" | "baja" | "devolucion";

function motivoInicialBaja(lote: LoteOperacionTarget): string {
  return isProductoVencido(lote.fecha_vencimiento) ? "Vencimiento" : "";
}

function LoteOperacionForm({
  lote,
  modo,
  onClose,
}: {
  lote: LoteOperacionTarget;
  modo: ModoOperacion;
  onClose: () => void;
}) {
  const [cantidadContada, setCantidadContada] = useState(String(lote.stock_actual));
  const [cantidadDevolver, setCantidadDevolver] = useState("1");
  const [motivo, setMotivo] = useState(
    modo === "baja" ? motivoInicialBaja(lote) : "",
  );
  const [confirmar, setConfirmar] = useState(false);

  const ajustar = useAjustarLotePorConteo();
  const baja = useDarBajaLote();
  const devolver = useDevolverLoteAProveedor();

  const diferenciaConteo = useMemo(() => {
    const contada = Number(cantidadContada);
    if (Number.isNaN(contada)) return 0;
    return contada - lote.stock_actual;
  }, [cantidadContada, lote.stock_actual]);

  const loading = ajustar.isPending || baja.isPending || devolver.isPending;

  const ejecutar = async () => {
    try {
      if (modo === "conteo") {
        const contada = Number(cantidadContada);
        if (Number.isNaN(contada) || contada < 0) {
          toast.error("Indica una cantidad contada válida.");
          return;
        }
        if (motivo.trim().length < 5) {
          toast.error(modalActionMessage("VALIDATION", "El motivo es obligatorio."));
          return;
        }
        await ajustar.mutateAsync({
          lote_id: lote.id,
          cantidad_contada: contada,
          motivo: motivo.trim(),
        });
        toast.success("Ajuste por conteo registrado.");
      } else if (modo === "baja") {
        if (motivo.trim().length < 5) {
          toast.error(modalActionMessage("VALIDATION", "El motivo es obligatorio."));
          return;
        }
        const res = await baja.mutateAsync({
          lote_id: lote.id,
          motivo: motivo.trim(),
        });
        toast.success(`Baja registrada: ${fmtNum(res.unidades)} unidades.`);
      } else {
        const cant = Number(cantidadDevolver);
        if (Number.isNaN(cant) || cant <= 0 || cant > lote.stock_actual) {
          toast.error(modalActionMessage("CANTIDAD_INVALIDA", "Cantidad inválida."));
          return;
        }
        if (motivo.trim().length < 5) {
          toast.error(modalActionMessage("VALIDATION", "El motivo es obligatorio."));
          return;
        }
        await devolver.mutateAsync({
          lote_id: lote.id,
          cantidad: cant,
          motivo: motivo.trim(),
        });
        toast.success("Devolución a proveedor registrada.");
      }
      onClose();
    } catch (e) {
      const code = e instanceof Error ? e.message : "INTERNAL";
      toast.error(modalActionMessage(code, "No se pudo completar la operación."));
    }
  };

  return (
    <ModalForm
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmar) {
          setConfirmar(true);
          return;
        }
        void ejecutar();
      }}
    >
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Existencia en sistema: <strong>{fmtNum(lote.stock_actual)}</strong>
      </p>

      {modo === "conteo" ? (
        <ModalField>
          <ModalLabel>Cantidad contada</ModalLabel>
          <ModalInput
            type="number"
            min={0}
            step={1}
            value={cantidadContada}
            onChange={(e) => setCantidadContada(e.target.value)}
            required
          />
          <p className="text-xs font-semibold text-[#2c5f9b] dark:text-[#6f9fd4]">
            Diferencia: {diferenciaConteo >= 0 ? "+" : ""}
            {fmtNum(diferenciaConteo)}
          </p>
        </ModalField>
      ) : null}

      {modo === "devolucion" ? (
        <ModalField>
          <ModalLabel>Cantidad a devolver</ModalLabel>
          <ModalInput
            type="number"
            min={1}
            max={lote.stock_actual}
            step={1}
            value={cantidadDevolver}
            onChange={(e) => setCantidadDevolver(e.target.value)}
            required
          />
        </ModalField>
      ) : null}

      <ModalField>
        <ModalLabel>Motivo</ModalLabel>
        <ModalTextarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          required
          placeholder="Mínimo 5 caracteres"
        />
      </ModalField>

      {confirmar ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Confirma de nuevo para aplicar el movimiento en el kardex.
        </p>
      ) : null}

      <ModalFooter>
        <ModalCancelButton onClick={onClose} disabled={loading} />
        <ModalSubmit disabled={loading} label={confirmar ? "Confirmar" : "Continuar"} />
      </ModalFooter>
    </ModalForm>
  );
}

export function LoteOperacionesModals({
  lote,
  modo,
  onClose,
}: {
  lote: LoteOperacionTarget | null;
  modo: ModoOperacion | null;
  onClose: () => void;
}) {
  const titulo =
    modo === "conteo"
      ? "Ajustar por conteo físico"
      : modo === "baja"
        ? "Dar de baja"
        : modo === "devolucion"
          ? "Devolver a proveedor"
          : "";

  return (
    <ModalShell
      isOpen={!!lote && !!modo}
      onClose={onClose}
      title={titulo}
      subtitle={
        lote
          ? `${lote.nombre}${lote.numero_lote ? ` · Lote ${lote.numero_lote}` : ""}`
          : ""
      }
    >
      {lote && modo ? (
        <LoteOperacionForm
          key={`${lote.id}-${modo}`}
          lote={lote}
          modo={modo}
          onClose={onClose}
        />
      ) : null}
    </ModalShell>
  );
}
