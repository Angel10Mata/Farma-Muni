"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { Download as DownloadNode, FileDown, Plus as PlusNode, CirclePlus } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { ModalFooter, ModalShell } from "@/components/ui/general-modal";
import { cn, fmtQ } from "@/lib/utils";
import type { CreditoResumen } from "../lib/zod";
import { useDetalleCredito } from "../lib/hooks";
import { RegistrarAbono } from "./RegistrarAbono";

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

  const handleExportarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text(`Estado de Cuenta: ${cliente.nombre}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`NIT: ${cliente.nit}`, 14, 22);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString("es-GT")}`, 14, 27);

      const tableData: string[][] = [];
      let saldoAcumulado = 0;

      const cronologico = [...ventas].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      cronologico.forEach((v) => {
        const fecha = new Date(v.created_at).toLocaleDateString("es-GT");
        saldoAcumulado += v.total || 0;
        tableData.push([
          fecha,
          `Compra Crédito #${v.id.substring(0, 6).toUpperCase()}`,
          `${fmtQ(v.total || 0)}`,
          "-",
          `${fmtQ(saldoAcumulado)}`,
        ]);

        const abonos =
          v.fin_transacciones?.filter(
            (t) => t.categoria === "abono_cliente" || t.categoria === "venta",
          ) || [];
        abonos.sort(
          (a, b) =>
            new Date(a.fecha_movimiento).getTime() - new Date(b.fecha_movimiento).getTime(),
        );

        abonos.forEach((a) => {
          const fechaAb = new Date(a.fecha_movimiento).toLocaleDateString("es-GT");
          saldoAcumulado -= a.monto;
          tableData.push([
            fechaAb,
            "Abono",
            "-",
            `${fmtQ(a.monto)}`,
            `${fmtQ(Math.max(0, saldoAcumulado))}`,
          ]);
        });
      });

      autoTable(doc, {
        head: [["Fecha", "Descripción", "Cargo", "Abono", "Saldo"]],
        body: tableData,
        startY: 35,
        theme: "striped",
        headStyles: { fillColor: [141, 167, 142], textColor: [245, 245, 241], fontStyle: "bold" },
      });

      doc.save(`EstadoCuenta_${cliente.nombre.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF exportado correctamente.");
    } catch {
      toast.error("No se pudo generar el archivo PDF.");
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

                return (
                  <div
                    key={v.id}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                  >
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-700 flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Compra #{v.id.substring(0, 6).toUpperCase()}
                        </span>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(v.created_at).toLocaleDateString("es-GT")}
                        </p>
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
            onClick={handleExportarPDF}
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
