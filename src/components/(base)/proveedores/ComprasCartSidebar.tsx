"use client";

import { Truck } from "lucide-react";
import { Save, Check } from "lucide";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { actionErrorMessage } from "@/lib/modal-toast";
import { useCompras } from "./ComprasContext";
import { fmtQ, getSwalThemeOpts } from "@/lib/utils";
import { useCrearCompra } from "./lib/hooks";
import { useAsignarLaboratorioComercial } from "@/components/(base)/inventario/lib/hooks";
import type { ItemCompraInput } from "./lib/zod";
import { ModalFechaInput, ModalField, ModalInput, ModalLabel } from "@/components/ui/general-modal";

// Props
interface ComprasCartSidebarProps {
  cargarDatos: () => void;
}

// Carrito
export function ComprasCartSidebar({ cargarDatos }: ComprasCartSidebarProps) {
  const context = useCompras();
  const { mutateAsync: crearCompraAsync } = useCrearCompra();
  const { mutateAsync: asignarLaboratorioAsync } = useAsignarLaboratorioComercial();

  const totalCarrito = context.carrito.reduce((sum, i) => sum + i.subtotal, 0);

  // Registrar compra
  const handleFinalizarCompra = async () => {
    if (!context.proveedorSeleccionado) {
      toast.warn("Seleccione un proveedor en el formulario de ingreso antes de registrar.");
      return;
    }
    if (context.carrito.length === 0) {
      toast.warn("Agrega productos a la compra antes de guardar.");
      return;
    }

    if (!context.numeroFactura.trim()) {
      toast.warn("Indica el número de factura del proveedor.");
      return;
    }

    if (
      context.estadoPago === "Pendiente" &&
      !context.fechaVencimientoPago.trim()
    ) {
      toast.warn("Indica la fecha de vencimiento de pago para compras a crédito.");
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Registrar esta Compra?",
      text: `Se cargará una compra por ${fmtQ(totalCarrito)} al proveedor ${context.proveedorSeleccionado.nombre}. Se actualizará el inventario.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, registrar",
      cancelButtonText: "Cancelar",
      ...getSwalThemeOpts(),
    });

    if (!confirm.isConfirmed) return;

    context.setIsProcesando(true);
    try {
      const asignaciones = new Map<string, string>();
      for (const item of context.carrito) {
        if (item.asignar_laboratorio_id && !item.comercial.laboratorio_id) {
          asignaciones.set(item.comercial.id, item.asignar_laboratorio_id);
        }
      }
      for (const [productoId, laboratorioId] of asignaciones) {
        await asignarLaboratorioAsync({ productoId, laboratorioId });
      }

      const itemsFormatted: ItemCompraInput[] = context.carrito.map((i) => ({
        producto_id: i.comercial.id,
        codigo_barras: i.codigo_barras,
        numero_lote: i.numero_lote,
        fecha_vencimiento: i.fecha_vencimiento,
        ubicacion: i.ubicacion ?? null,
        cantidad: i.cantidad,
        precio_costo: i.precio_costo,
        subtotal: i.subtotal,
        actualizar_precio_venta: i.actualizar_precio_venta ?? false,
        precio_venta: i.precio_venta,
      }));

      const res = await crearCompraAsync({
        proveedor_id: context.proveedorSeleccionado.id,
        total: totalCarrito,
        estado_pago: context.estadoPago,
        numero_factura: context.numeroFactura.trim(),
        fecha_vencimiento_pago:
          context.estadoPago === "Pendiente"
            ? context.fechaVencimientoPago.trim()
            : null,
        observaciones: context.observaciones.trim() || null,
        items: itemsFormatted,
      });

      if (!res.success) {
        const fail = res as { code?: string; detail?: string };
        const err = new Error(fail.code || "INTERNAL") as Error & { detail?: string };
        err.detail = fail.detail;
        throw err;
      }

      toast.success("Compra registrada correctamente. El inventario se actualizó.");

      context.limpiarCarrito();
      cargarDatos();
    } catch (e: unknown) {
      const err = e as Error & { detail?: string };
      toast.error(
        actionErrorMessage(
          { error: err.message, detail: err.detail },
          "No se pudo registrar la compra.",
        ),
      );
    } finally {
      context.setIsProcesando(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 bg-[#F5F5F1] dark:bg-zinc-900/60 border border-[#C1D1C5]/40 dark:border-zinc-800 rounded-3xl p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 border-b border-[#C1D1C5]/30 pb-2 text-left">
          Resumen de Compra
        </h3>

        {context.proveedorSeleccionado ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#C1D1C5]/40 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 px-3 py-2.5 text-left">
            <Truck className="size-4 shrink-0 text-look-2-salvia-menta dark:text-look-1-salvia-suave mt-0.5" />
            <div className="min-w-0">
              <p className="text-etiqueta font-bold uppercase text-texto-tenue">
                Proveedor
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {context.proveedorSeleccionado.nombre}
              </p>
              {context.proveedorSeleccionado.nit ? (
                <p className="text-etiqueta text-slate-500">NIT: {context.proveedorSeleccionado.nit}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-etiqueta text-amber-700 dark:text-amber-400/90 text-left font-semibold">
            Seleccione un proveedor en el panel de ingreso para continuar.
          </p>
        )}

        <ModalField className="text-left">
          <ModalLabel>Número de factura</ModalLabel>
          <ModalInput
            value={context.numeroFactura}
            onChange={(e) => context.setNumeroFactura(e.target.value)}
            placeholder="Factura del proveedor"
          />
        </ModalField>

        <div className="text-left">
          <label className="block text-xs font-bold text-texto-tenue uppercase mb-1">
            Estado de Pago
          </label>
          <div className="grid grid-cols-2 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/50 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => context.setEstadoPago("Pagado")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                context.estadoPago === "Pagado"
                  ? "bg-white dark:bg-zinc-900 text-look-2-salvia-menta shadow-xs"
                  : "text-texto-tenue"
              }`}
            >
              PAGADO
            </button>
            <button
              type="button"
              onClick={() => context.setEstadoPago("Pendiente")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                context.estadoPago === "Pendiente"
                  ? "bg-white dark:bg-zinc-900 text-amber-500 shadow-xs"
                  : "text-texto-tenue"
              }`}
            >
              PENDIENTE
            </button>
          </div>
        </div>

        {context.estadoPago === "Pendiente" && (
          <ModalField className="text-left">
            <ModalLabel>Vencimiento de pago</ModalLabel>
            <ModalFechaInput
              value={context.fechaVencimientoPago}
              onChange={context.setFechaVencimientoPago}
            />
          </ModalField>
        )}

        <div className="text-left">
          <label className="block text-xs font-bold text-texto-tenue uppercase mb-1">
            Observaciones / Comentario
          </label>
          <textarea
            value={context.observaciones}
            onChange={(e) => context.setObservaciones(e.target.value)}
            rows={2}
            placeholder="Condiciones de entrega, notas internas..."
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#8DA78E] focus:outline-none transition-colors resize-none"
          />
        </div>

        <div className="border-t border-[#C1D1C5]/30 pt-3 mt-auto space-y-2 text-left">
          <div className="flex items-center justify-between text-sm font-black text-slate-800 dark:text-white pt-1">
            <span>Total a pagar:</span>
            <span className="text-base text-look-2-salvia-menta">{fmtQ(totalCarrito)}</span>
          </div>
        </div>

        <SigetActionButton
          label="Registrar"
          accentColor={sigetAccent.guardar}
          morphFrom={Save}
          morphTo={Check}
          onClick={handleFinalizarCompra}
          disabled={context.carrito.length === 0 || context.isProcesando}
          ariaBusy={context.isProcesando}
          ariaLabel="Registrar compra"
          className="w-auto shrink-0"
        />
      </div>
    </>
  );
}
