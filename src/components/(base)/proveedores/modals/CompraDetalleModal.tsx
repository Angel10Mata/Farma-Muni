"use client";

import { AlertTriangle } from "lucide-react";
import { ModalShell } from "@/components/ui/general-modal";
import { Compra } from "../lib/zod";
import { fmtQ } from "@/lib/utils";

type TransaccionCompra = {
  id: string;
  categoria?: string;
  monto?: number;
  created_at?: string;
  concepto?: string;
};

function sumAbonosProveedor(transacciones: unknown[] | undefined): number {
  return (
    transacciones
      ?.filter((t): t is TransaccionCompra => typeof t === "object" && t !== null && (t as TransaccionCompra).categoria === "pago_proveedor")
      .reduce((sum, t) => sum + Math.abs(Number(t.monto ?? 0)), 0) ?? 0
  );
}

function pagosProveedor(transacciones: unknown[] | undefined): TransaccionCompra[] {
  return (
    transacciones?.filter(
      (t): t is TransaccionCompra =>
        typeof t === "object" && t !== null && (t as TransaccionCompra).categoria === "pago_proveedor",
    ) ?? []
  );
}

interface CompraDetalleModalProps {
  compra: Compra | null;
  onClose: () => void;
  isLoadingDetalles: boolean;
  detallesDeCompra: Array<{
    precio_costo: number;
    cantidad: number;
    subtotal: number;
    inv_productos?: { nombre?: string } | null;
  }>;
}

export function CompraDetalleModal({
  compra,
  onClose,
  isLoadingDetalles,
  detallesDeCompra,
}: CompraDetalleModalProps) {
  if (!compra) return null;

  const abonos = sumAbonosProveedor(compra.fin_transacciones);
  const isPaid = abonos >= compra.total;
  const pagos = pagosProveedor(compra.fin_transacciones);

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Detalle de Compra"
      subtitle={compra.inv_proveedores?.nombre || "Proveedor Desconocido"}
      maxWidth="max-w-md"
      fullHeight
    >
      <div className="flex flex-col gap-4 text-left">
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Proveedor</p>
          <h4 className="text-base font-black text-zinc-900 dark:text-white">
            {compra.inv_proveedores?.nombre || "Proveedor Desconocido"}
          </h4>
          <p className="mt-0.5 text-xs text-zinc-500">
            NIT: {compra.inv_proveedores?.nit || "C/F"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3 text-[11px] text-zinc-500 dark:border-zinc-700">
            <div>
              <span className="block font-bold text-zinc-400">Fecha Registro</span>
              {new Date(compra.created_at).toLocaleString("es-GT")}
            </div>
            <div>
              <span className="block font-bold text-zinc-400">Estado Pago</span>
              <span
                className={`mt-0.5 inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                  isPaid
                    ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                }`}
              >
                {isPaid ? "Pagado" : "Pendiente"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Detalle de Artículos
          </h4>
          {isLoadingDetalles ? (
            <div className="flex items-center justify-center py-10">
              <div className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-[#2c5f9b] dark:border-zinc-600" />
            </div>
          ) : (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {detallesDeCompra.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-zinc-900 dark:text-white">
                      {d.inv_productos?.nombre || "Pedido"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      Costo: {fmtQ(d.precio_costo)} | Cant: {d.cantidad}
                    </p>
                  </div>
                  <span className="shrink-0 font-black text-zinc-900 dark:text-white">
                    {fmtQ(d.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Historial de Pagos
          </h4>
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white text-xs dark:border-zinc-700 dark:bg-zinc-900">
            {pagos.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pagos.map((pago) => {
                  const createdAt = pago.created_at ?? "";
                  const dateStr = new Date(createdAt).toLocaleDateString("es-GT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const timeStr = new Date(createdAt).toLocaleTimeString("es-GT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={pago.id}
                      className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{pago.concepto}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          Fecha: {dateStr} a las {timeStr}
                        </p>
                      </div>
                      <span className="font-black text-[#2E9E77]">
                        {fmtQ(Math.abs(Number(pago.monto)))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center text-zinc-400">
                <AlertTriangle className="size-5 animate-pulse text-amber-500/80" />
                <p className="text-[11px] font-bold text-zinc-500">Pendiente de pago</p>
                <p className="text-[9px] text-zinc-400">
                  No se registran transacciones para esta compra.
                </p>
              </div>
            )}
          </div>
        </div>

        {compra.observaciones ? (
          <div className="text-xs">
            <h4 className="mb-1 font-black uppercase tracking-wider text-zinc-400">
              Notas / Observaciones
            </h4>
            <p className="rounded-xl border border-zinc-200/80 bg-white p-3 italic text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              {compra.observaciones}
            </p>
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between rounded-2xl border border-[#2c5f9b]/20 bg-[#2c5f9b]/5 p-4">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Total de la Compra
          </span>
          <span className="text-lg font-black text-[#2c5f9b] dark:text-[#6f9fd4]">
            {fmtQ(compra.total)}
          </span>
        </div>
      </div>
    </ModalShell>
  );
}
