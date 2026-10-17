"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Download as DownloadNode, FileDown, Plus as PlusNode, CirclePlus } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { ModalFooter, ModalShell } from "@/components/ui/general-modal";
import { construirMetaInforme } from "@/lib/reportes/meta-informe";
import { cn, fmtQ } from "@/lib/utils";
import { codigoReciboVenta } from "@/components/(base)/ventas/lib/helpers";
import type { CreditoResumen } from "../lib/zod";
import { useDetalleCredito } from "../lib/hooks";
import { RegistrarAbono } from "./RegistrarAbono";
import {
  diasRestantesCredito,
  fechaVenceCreditoDesdeVenta,
  formatFechaCortaGt,
  PLAZO_CREDITO_DIAS,
} from "../lib/creditos-reporte-helpers";
import { descargarEstadoCuentaClientePdf } from "../lib/export-estado-cuenta-cliente-pdf";

interface CreditoDetalleProps {
  cliente: CreditoResumen;
  onClose: () => void;
  onUpdate: () => void;
}

export function VerDetalleCredito({
  cliente,
  onClose,
  onUpdate,
}: CreditoDetalleProps) {
  const { data: ventas = [], isLoading } = useDetalleCredito(cliente.cliente_id);
  const [abonoModalData, setAbonoModalData] = useState<{ ventaId: string; saldo: number } | null>(null);
  const [exportando, setExportando] = useState(false);

  const handleExportarPDF = async () => {
    setExportando(true);
    try {
      const meta = await construirMetaInforme("Usuario");
      descargarEstadoCuentaClientePdf(cliente, ventas, meta);
      toast.success("PDF exportado correctamente.");
    } catch {
      toast.error("No se pudo generar el archivo PDF.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <ModalShell
        isOpen
        onClose={onClose}
        title="Estado de Cuenta"
        subtitle={cliente.nombre}
        maxWidth="max-w-md"
        fullHeight
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Saldo Pendiente</span>
              <p className="text-xl font-black text-rose-500">{fmtQ(cliente.saldo_pendiente)}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total Consumido</span>
              <p className="text-xl font-black text-[#8DA78E]">{fmtQ(cliente.total_consumido)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin size-6 border-2 border-[#8DA78E] border-t-transparent rounded-full" />
              </div>
            ) : ventas.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-8">No hay historial de crédito.</p>
            ) : (
              ventas.map((v) => {
                const abonos =
                  v.fin_transacciones?.filter(
                    (t) => t.categoria === "abono_cliente" || t.categoria === "venta",
                  ) || [];
                const totalAbonado = abonos.reduce((sum, t) => sum + Number(t.monto), 0);
                const saldo = Math.max(0, (v.total || 0) - totalAbonado);
                const isPagado = saldo <= 0;
                const recibo = codigoReciboVenta({
                  id: v.id,
                  numero_recibo: v.numero_recibo ?? null,
                });
                const fechaVence = fechaVenceCreditoDesdeVenta(
                  v.created_at,
                  v.fecha_credito_vencimiento,
                );
                const diasRest = diasRestantesCredito(
                  v.created_at,
                  v.fecha_credito_vencimiento,
                );

                return (
                  <div
                    key={v.id}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                  >
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Recibo {recibo}
                        </span>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(v.created_at).toLocaleDateString("es-GT")}
                        </p>
                        {!isPagado ? (
                          <p
                            className={cn(
                              "text-[10px] font-bold mt-0.5",
                              diasRest < 0
                                ? "text-rose-500"
                                : diasRest <= 7
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-zinc-500",
                            )}
                          >
                            Vence {formatFechaCortaGt(fechaVence)} ·{" "}
                            {diasRest < 0
                              ? `${Math.abs(diasRest)} d vencido`
                              : `${diasRest} d restantes`}
                            {" "}(plazo {PLAZO_CREDITO_DIAS} d)
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-zinc-800 dark:text-zinc-100">
                          {fmtQ(v.total || 0)}
                        </span>
                        <p
                          className={cn(
                            "text-[9px] font-bold uppercase",
                            isPagado ? "text-[#8DA78E]" : "text-rose-500",
                          )}
                        >
                          {isPagado ? "Cancelado" : `Pendiente: ${fmtQ(saldo)}`}
                        </p>
                      </div>
                    </div>
                    {abonos.length > 0 && (
                      <div className="p-2 space-y-1">
                        {abonos.map((a) => (
                          <div
                            key={a.id}
                            className="flex justify-between items-center px-2 py-1 bg-white dark:bg-zinc-900 rounded-lg"
                          >
                            <span className="text-[10px] text-zinc-500">
                              {new Date(a.fecha_movimiento).toLocaleDateString("es-GT")}
                            </span>
                            <span className="text-[10px] font-bold text-[#8DA78E]">
                              + {fmtQ(Number(a.monto))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isPagado && (
                      <div className="p-2 border-t border-zinc-100 dark:border-zinc-700 flex justify-center">
                        <SigetActionButton
                          label="Abonar"
                          accentColor={sigetAccent.guardar}
                          morphFrom={PlusNode}
                          morphTo={CirclePlus}
                          onClick={() => setAbonoModalData({ ventaId: v.id, saldo })}
                          className="w-auto shrink-0"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <ModalFooter>
          <SigetActionButton
            label="Exportar"
            accentColor={sigetAccent.excel}
            morphFrom={DownloadNode}
            morphTo={FileDown}
            onClick={() => void handleExportarPDF()}
            disabled={exportando || isLoading}
            ariaBusy={exportando}
            className="w-auto shrink-0"
          />
        </ModalFooter>
      </ModalShell>

      {abonoModalData && (
        <RegistrarAbono
          cliente={cliente}
          ventaId={abonoModalData.ventaId}
          saldoRestante={abonoModalData.saldo}
          onClose={() => setAbonoModalData(null)}
          onSuccess={onUpdate}
        />
      )}
    </>
  );
}
