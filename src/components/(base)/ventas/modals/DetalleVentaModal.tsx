"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Check as CheckNode, Pencil as PencilNode, Printer as PrinterNode, Save as SaveNode, SquarePen as SquarePenNode, Trash as TrashNode, Trash2 as Trash2Node, X as XNode } from "lucide";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { fmtQ } from "@/lib/utils";
import {
  ModalCancelButton,
  ModalConfirmDelete,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalLabel,
  ModalShell,
  ModalTextarea,
  toast,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { useDetalleVenta, useAnularVenta, useEditarDetalleVenta, useEliminarDetalleVenta } from "../lib/hooks";
import { obtenerCodigoRecibo } from "../lib/helpers";

interface DetalleVentaModalProps {
  venta: any;
  onClose: () => void;
  onPrint: (venta: any, detalles: any) => void;
}

export function DetalleVentaModal({ venta, onClose, onPrint }: DetalleVentaModalProps) {
  const { data: detalles = [], isLoading } = useDetalleVenta(venta.id);
  const { mutate: anularVenta, isPending: isAnulando } = useAnularVenta();
  const { mutate: editarDetalle, isPending: isEditando } = useEditarDetalleVenta();
  const { mutate: eliminarDetalle, isPending: isEliminando } = useEliminarDetalleVenta();

  const [editingDetalleId, setEditingDetalleId] = useState<string | null>(null);
  const [editingDetalleQty, setEditingDetalleQty] = useState(0);
  const [editingDetallePrice, setEditingDetallePrice] = useState(0);

  const [confirmAnularOpen, setConfirmAnularOpen] = useState(false);
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    message: string;
    value: string;
    onConfirm: (val: string) => void;
  }>({ isOpen: false, message: "", value: "", onConfirm: () => {} });

  const isSavingDetalle = isEditando || isEliminando;

  const handleSaveDetalleVentaDirecto = (detalle: any) => {
    setPromptModal({
      isOpen: true,
      message: `Modificación de venta.\nProducto: ${detalle.inv_productos?.nombre}\nCant anterior: ${detalle.cantidad}, Cant nueva: ${editingDetalleQty}\n\nIngresa el motivo (obligatorio para bitácora):`,
      value: "",
      onConfirm: (motivo) => {
        if (!motivo.trim()) {
          toast.warn("El motivo es obligatorio.");
          return;
        }
        editarDetalle({
          detalleId: detalle.id,
          ventaId: venta.id,
          productoId: detalle.producto_id,
          nuevaCantidad: editingDetalleQty,
          nuevoPrecio: editingDetallePrice
        }, {
          onSuccess: () => setEditingDetalleId(null)
        });
        setPromptModal((prev) => ({ ...prev, isOpen: false, value: "" }));
      }
    });
  };

  const handleEliminarProductoDeVenta = (detalle: any) => {
    setPromptModal({
      isOpen: true,
      message: `Eliminar producto de venta.\nProducto: ${detalle.inv_productos?.nombre}\n\nIngresa el motivo (obligatorio):`,
      value: "",
      onConfirm: (motivo) => {
        if (!motivo.trim()) {
          toast.warn("El motivo es obligatorio.");
          return;
        }
        eliminarDetalle({
          detalleId: detalle.id,
          ventaId: venta.id,
          productoId: detalle.producto_id,
          cantidadADevolver: detalle.cantidad
        });
        setPromptModal((prev) => ({ ...prev, isOpen: false, value: "" }));
      }
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md h-[calc(100%-2rem)] m-4 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col rounded-[2rem] overflow-hidden"
        >
          <div className="flex md:hidden justify-end p-4 pb-0 shrink-0">
            <button onClick={onClose} className="p-2 text-zinc-400 bg-white dark:bg-zinc-800 rounded-full">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-4 text-left custom-scrollbar pb-6 pt-6 flex flex-col">
            <div className="bg-white dark:bg-zinc-800 p-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col gap-2 shadow-sm shrink-0">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-semibold uppercase">Recibo:</span>
                <span className="text-zinc-900 dark:text-white font-bold">
                  #{obtenerCodigoRecibo(venta.id)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-semibold uppercase">NIT de Cliente:</span>
                <span className="text-zinc-900 dark:text-white font-bold">
                  {venta.ven_clientes?.nit || "C/F"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-zinc-700 pt-2 mt-1">
                <span className="text-zinc-500 font-semibold uppercase">Vendedor:</span>
                <span className="text-zinc-900 dark:text-white font-bold text-right">
                  {venta.profiles?.nombre || "N/A"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Detalle de Artículos</h4>
              <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
                {isLoading ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2">
                    <div className="size-6 rounded-full border-2 border-[#8DA78E]/30 border-t-[#8DA78E] animate-spin" />
                    <span className="text-[10px] font-bold text-zinc-400">Cargando detalles...</span>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                    {detalles.map((d: any) => (
                      <div key={d.id} className="p-3.5 flex items-center justify-between text-xs">
                        {editingDetalleId === d.id ? (
                          <div className="flex flex-col gap-1 text-xs w-full bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <p className="font-bold text-zinc-800 dark:text-white mb-1.5">{d.inv_productos?.nombre}</p>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-[9px] uppercase font-bold text-zinc-400">Cant</label>
                                <input
                                  type="number"
                                  value={editingDetalleQty}
                                  onChange={(e) => setEditingDetalleQty(parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-white"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[9px] uppercase font-bold text-zinc-400">Precio</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingDetallePrice}
                                  onChange={(e) => setEditingDetallePrice(parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-1.5 mt-2">
                              <SigetActionButton
                                label="Cancelar"
                                accentColor={sigetAccent.cancelar}
                                morphFrom={XNode}
                                morphTo={XNode}
                                morphOnHover={false}
                                onClick={() => setEditingDetalleId(null)}
                                disabled={isSavingDetalle}
                                className="w-auto shrink-0"
                              />
                              <SigetActionButton
                                label="Guardar"
                                accentColor={sigetAccent.guardar}
                                morphFrom={SaveNode}
                                morphTo={CheckNode}
                                onClick={() => handleSaveDetalleVentaDirecto(d)}
                                disabled={isSavingDetalle}
                                className="w-auto shrink-0"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs w-full">
                            <div className="flex items-center gap-3">
                              {d.inv_productos?.imagen_url ? (
                                <img
                                  src={createClient().storage.from("Imagenes_Farmacia").getPublicUrl(d.inv_productos.imagen_url).data.publicUrl}
                                  alt={d.inv_productos?.nombre}
                                  className="w-10 h-10 object-cover rounded-lg border border-zinc-100 dark:border-zinc-800"
                                />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[8px] text-zinc-400 font-bold">N/A</div>
                              )}
                              <div>
                                <p className="font-bold text-zinc-900 dark:text-white line-clamp-1">{d.inv_productos?.nombre}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                  {d.cantidad} ud(s) x {fmtQ(d.precio_aplicado)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold text-[#8DA78E]">{fmtQ(d.subtotal)}</span>
                              <div className="flex items-center gap-1">
                                <SigetActionButton
                                  label="Editar"
                                  accentColor={sigetAccent.editar}
                                  morphFrom={PencilNode}
                                  morphTo={SquarePenNode}
                                  onClick={() => {
                                    setEditingDetalleId(d.id);
                                    setEditingDetalleQty(d.cantidad);
                                    setEditingDetallePrice(d.precio_aplicado);
                                  }}
                                  iconOnly
                                  ariaLabel="Editar artículo en venta"
                                  className="w-auto shrink-0"
                                />
                                <SigetActionButton
                                  label="Quitar"
                                  accentColor={sigetAccent.quitar}
                                  morphFrom={Trash2Node}
                                  morphTo={TrashNode}
                                  onClick={() => handleEliminarProductoDeVenta(d)}
                                  iconOnly
                                  ariaLabel="Eliminar artículo"
                                  className="w-auto shrink-0"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {venta.observaciones && (
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Observaciones</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 italic bg-white dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  {venta.observaciones}
                </p>
              </div>
            )}

            <div className="bg-[#8DA78E]/10 border border-[#8DA78E]/20 p-4 rounded-2xl flex justify-between items-center mt-6 shadow-sm">
              <span className="text-xs font-black uppercase tracking-wider text-[#8DA78E]">Total de la Venta</span>
              <span className="text-xl font-black text-[#8DA78E]">{fmtQ(venta.total)}</span>
            </div>
          </div>

          <div className="flex gap-3 p-4 md:p-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 bg-[#F5F5F1] dark:bg-zinc-900">
            <SigetActionButton
              label="Anular"
              accentColor={sigetAccent.quitar}
              morphFrom={Trash2Node}
              morphTo={TrashNode}
              onClick={() => setConfirmAnularOpen(true)}
              disabled={isLoading || isAnulando}
              className="w-full"
            />
            <SigetActionButton
              label="Imprimir"
              accentColor={sigetAccent.guardar}
              morphFrom={PrinterNode}
              morphTo={PrinterNode}
              morphOnHover={false}
              onClick={() => {
                onClose();
                onPrint(venta, detalles);
              }}
              disabled={isLoading || isAnulando}
              className="w-full"
            />
          </div>
        </motion.div>
      </div>

      <ModalShell
        open={confirmAnularOpen}
        onClose={() => setConfirmAnularOpen(false)}
        title="Anular venta"
        maxWidth="max-w-sm"
      >
        {confirmAnularOpen && (
          <ModalConfirmDelete
            message="¿Estás seguro de anular esta venta? Esta acción revertirá el inventario y no se puede deshacer."
            pending={isAnulando}
            confirmText="Anular"
            onCancel={() => setConfirmAnularOpen(false)}
            onConfirm={() => {
              anularVenta(venta.id, {
                onSuccess: () => {
                  setConfirmAnularOpen(false);
                  onClose();
                }
              });
            }}
          />
        )}
      </ModalShell>

      <ModalShell
        open={promptModal.isOpen}
        onClose={() => setPromptModal((prev) => ({ ...prev, isOpen: false, value: "" }))}
        title="Ingresa el motivo"
        maxWidth="max-w-sm"
      >
        {promptModal.isOpen && (
          <ModalForm
            onSubmit={(e) => {
              e.preventDefault();
              if (!promptModal.value.trim()) {
                toast.warn("El motivo es obligatorio.");
                return;
              }
              promptModal.onConfirm(promptModal.value);
            }}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium whitespace-pre-wrap leading-relaxed">
              {promptModal.message}
            </p>
            <ModalField>
              <ModalLabel htmlFor="motivo-venta">Motivo</ModalLabel>
              <ModalTextarea
                id="motivo-venta"
                value={promptModal.value}
                onChange={(e) => setPromptModal((prev) => ({ ...prev, value: e.target.value }))}
                placeholder="Escribe el motivo aquí..."
                required
                autoFocus
              />
            </ModalField>
            <ModalFooter>
              <ModalCancelButton
                onClick={() => setPromptModal((prev) => ({ ...prev, isOpen: false, value: "" }))}
              />
              <SigetActionButton
                label="Aceptar"
                accentColor={sigetAccent.guardar}
                morphFrom={CheckNode}
                morphTo={CheckNode}
                morphOnHover={false}
                type="submit"
                disabled={!promptModal.value.trim()}
                className="w-auto shrink-0"
              />
            </ModalFooter>
          </ModalForm>
        )}
      </ModalShell>
    </AnimatePresence>
  );
}
