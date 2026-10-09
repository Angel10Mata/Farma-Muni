"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { ZodError } from "zod";
import { Check, Save } from "lucide";
import {
  ModalCancelButton,
  ModalField,
  ModalFooter,
  ModalForm,
  ModalFechaInput,
  ModalInput,
  ModalLabel,
  ModalShell,
  modalActionMessage,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { cn } from "@/lib/utils";
import { useProveedores } from "@/components/(base)/proveedores/lib/hooks";
import { normalizarFechaCalendario } from "@/lib/fechas-gt";
import { useCrearLoteManual } from "../lib/hooks";
import {
  DUPLICATE_LOTE_MSG,
  productoWizardLoteSchema,
  type ProductoSugerencia,
} from "../lib/zod";
import { lineaSugerenciaProductoCatalogo } from "../lib/helpers";

interface CrearLoteManualProps {
  open: boolean;
  producto: ProductoSugerencia;
  precioVentaInicial?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearLoteManual({
  open,
  producto,
  precioVentaInicial,
  onClose,
  onSuccess,
}: CrearLoteManualProps) {
  const [proveedorLoteId, setProveedorLoteId] = useState("");
  const [laboratorioLote, setLaboratorioLote] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [cantidadLote, setCantidadLote] = useState("");
  const [precioCostoLote, setPrecioCostoLote] = useState("");
  const [precioVentaLote, setPrecioVentaLote] = useState("");
  const [fechaVencimientoLote, setFechaVencimientoLote] = useState("");
  const [ubicacionLote, setUbicacionLote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: proveedores = [] } = useProveedores();
  const { mutateAsync: crearLote, isPending } = useCrearLoteManual();

  useEffect(() => {
    if (!open) return;
    setProveedorLoteId("");
    setLaboratorioLote("");
    setCodigoBarras("");
    setNumeroLote("");
    setCantidadLote("");
    setFechaVencimientoLote("");
    setUbicacionLote("");
    setFieldErrors({});
    const precio =
      precioVentaInicial?.trim() ||
      (producto.precio_base > 0 ? String(producto.precio_base) : "");
    setPrecioVentaLote(precio);
    const costoNum = parseFloat(precio);
    if (!Number.isNaN(costoNum) && costoNum > 0) {
      setPrecioCostoLote(String(Math.round(costoNum * 0.65 * 100) / 100));
    } else {
      setPrecioCostoLote("");
    }
  }, [open, producto.id, producto.precio_base, precioVentaInicial]);

  const selectClass = cn(
    modalFieldClass,
    "h-10 w-full rounded-lg bg-transparent px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-none",
  );

  const aplicarErrores = (error: ZodError) => {
    const next: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path[0];
      if (typeof path === "string") next[path] = issue.message;
    }
    setFieldErrors(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fechaIso = normalizarFechaCalendario(fechaVencimientoLote);
    const parsed = productoWizardLoteSchema.safeParse({
      proveedor_id: proveedorLoteId,
      codigo_barras: codigoBarras.trim(),
      numero_lote: numeroLote.trim(),
      cantidad: parseFloat(cantidadLote),
      precio_costo: parseFloat(precioCostoLote),
      precio_venta: parseFloat(precioVentaLote),
      laboratorio: laboratorioLote.trim() || null,
      fecha_vencimiento: fechaIso ?? "",
      ubicacion: ubicacionLote.trim() || null,
    });
    if (!parsed.success) {
      aplicarErrores(parsed.error);
      if (!fechaIso) {
        setFieldErrors((prev) => ({
          ...prev,
          fecha_vencimiento: "Ingresa una fecha de vencimiento válida (DD/MM/AAAA)",
        }));
      }
      toast.warn("Revisa los datos del formulario.");
      return;
    }
    if (!fechaIso) {
      setFieldErrors((prev) => ({
        ...prev,
        fecha_vencimiento: "Ingresa una fecha de vencimiento válida (DD/MM/AAAA)",
      }));
      toast.warn("Revisa la fecha de vencimiento.");
      return;
    }

    try {
      await crearLote({
        producto_id: producto.id,
        proveedor_id: parsed.data.proveedor_id,
        codigo_barras: parsed.data.codigo_barras,
        numero_lote: parsed.data.numero_lote,
        cantidad: parsed.data.cantidad,
        precio_costo: parsed.data.precio_costo,
        precio_venta: parsed.data.precio_venta,
        laboratorio: parsed.data.laboratorio,
        fecha_vencimiento: fechaIso,
        ubicacion: parsed.data.ubicacion,
      });
      toast.success("Lote registrado correctamente.");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      const detail = err instanceof Error ? (err as Error & { detail?: string }).detail : undefined;
      toast.error(
        modalActionMessage(code, "No se pudo registrar el lote.", {
          DUPLICATE: detail ?? DUPLICATE_LOTE_MSG,
        }),
      );
    }
  };

  const subtitulo = lineaSugerenciaProductoCatalogo(producto);

  return (
    <ModalShell open={open} onClose={onClose} title="Registrar lote" maxWidth="max-w-2xl" fullHeight>
      {open ? (
        <ModalForm onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="font-bold text-[#2c5f9b] dark:text-[#6f9fd4]">{subtitulo}</span>
            {producto.nombre.trim() ? (
              <span className="mt-1 block text-xs text-zinc-500">{producto.nombre}</span>
            ) : null}
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="lote-manual-proveedor">Proveedor *</ModalLabel>
                <select
                  id="lote-manual-proveedor"
                  value={proveedorLoteId}
                  onChange={(e) => setProveedorLoteId(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {fieldErrors.proveedor_id ? (
                  <p className="text-xs font-bold text-red-500">{fieldErrors.proveedor_id}</p>
                ) : null}
              </ModalField>

              <ModalField>
                <ModalLabel htmlFor="lote-manual-laboratorio">Laboratorio</ModalLabel>
                <ModalInput
                  id="lote-manual-laboratorio"
                  value={laboratorioLote}
                  onChange={(e) => setLaboratorioLote(e.target.value)}
                />
              </ModalField>
            </div>

            <ModalField>
              <ModalLabel htmlFor="lote-manual-codigo">Código de barras *</ModalLabel>
              <ModalInput
                id="lote-manual-codigo"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                required
              />
              {fieldErrors.codigo_barras ? (
                <p className="text-xs font-bold text-red-500">{fieldErrors.codigo_barras}</p>
              ) : null}
            </ModalField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="lote-manual-numero">Número de lote *</ModalLabel>
                <ModalInput
                  id="lote-manual-numero"
                  value={numeroLote}
                  onChange={(e) => setNumeroLote(e.target.value)}
                  required
                />
                {fieldErrors.numero_lote ? (
                  <p className="text-xs font-bold text-red-500">{fieldErrors.numero_lote}</p>
                ) : null}
              </ModalField>

              <ModalField>
                <ModalLabel htmlFor="lote-manual-cantidad">Cantidad *</ModalLabel>
                <ModalInput
                  id="lote-manual-cantidad"
                  type="number"
                  min="1"
                  step="1"
                  value={cantidadLote}
                  onChange={(e) => setCantidadLote(e.target.value)}
                  required
                />
                {fieldErrors.cantidad ? (
                  <p className="text-xs font-bold text-red-500">{fieldErrors.cantidad}</p>
                ) : null}
              </ModalField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="lote-manual-costo">Costo unitario *</ModalLabel>
                <ModalInput
                  id="lote-manual-costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioCostoLote}
                  onChange={(e) => setPrecioCostoLote(e.target.value)}
                  required
                />
                {fieldErrors.precio_costo ? (
                  <p className="text-xs font-bold text-red-500">{fieldErrors.precio_costo}</p>
                ) : null}
              </ModalField>

              <ModalField>
                <ModalLabel htmlFor="lote-manual-precio-venta">Precio de venta *</ModalLabel>
                <ModalInput
                  id="lote-manual-precio-venta"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioVentaLote}
                  onChange={(e) => setPrecioVentaLote(e.target.value)}
                  required
                />
                {fieldErrors.precio_venta ? (
                  <p className="text-xs font-bold text-red-500">{fieldErrors.precio_venta}</p>
                ) : null}
              </ModalField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="lote-manual-vencimiento">Fecha de vencimiento *</ModalLabel>
                <ModalFechaInput
                  id="lote-manual-vencimiento"
                  value={fechaVencimientoLote}
                  onChange={setFechaVencimientoLote}
                  required
                />
                {fieldErrors.fecha_vencimiento ? (
                  <p className="text-xs font-bold text-red-500">{fieldErrors.fecha_vencimiento}</p>
                ) : null}
              </ModalField>

              <ModalField>
                <ModalLabel htmlFor="lote-manual-ubicacion">Ubicación</ModalLabel>
                <ModalInput
                  id="lote-manual-ubicacion"
                  value={ubicacionLote}
                  onChange={(e) => setUbicacionLote(e.target.value)}
                />
              </ModalField>
            </div>
          </div>

          <ModalFooter className="flex flex-wrap items-center justify-center gap-2">
            <ModalCancelButton onClick={onClose} disabled={isPending} />
            <SigetActionButton
              label="Guardar"
              accentColor={sigetAccent.guardar}
              morphFrom={Save}
              morphTo={Check}
              type="submit"
              disabled={isPending}
              ariaBusy={isPending}
              className="w-auto shrink-0"
            />
          </ModalFooter>
        </ModalForm>
      ) : null}
    </ModalShell>
  );
}
