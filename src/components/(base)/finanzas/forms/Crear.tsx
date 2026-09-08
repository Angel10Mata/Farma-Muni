"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
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
import type { RegistrarMovimientoInput } from "../lib/zod";
import { useRegistrarMovimiento, useCuentasPorCobrar, useCuentasPorPagar } from "../lib/hooks";

interface Props {
  defaultTipo: "ingreso" | "egreso";
  defaultVentaId?: string | null;
  defaultCompraId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function NuevoMovimiento({
  defaultTipo,
  defaultVentaId,
  defaultCompraId,
  onClose,
  onSuccess,
}: Props) {
  const [tipo] = useState<"ingreso" | "egreso">(defaultTipo);
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [ventaId, setVentaId] = useState(defaultVentaId || "");
  const [compraId, setCompraId] = useState(defaultCompraId || "");

  const [isOpen, setIsOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  const { data: cuentasCobrar = [], isLoading: loadingCobrar } = useCuentasPorCobrar();
  const { data: cuentasPagar = [], isLoading: loadingPagar } = useCuentasPorPagar();
  const { mutateAsync: registrarMovimiento, isPending: isSubmitting } = useRegistrarMovimiento();

  const isLoadingCuentas = tipo === "ingreso" ? loadingCobrar : loadingPagar;

  const categoriasIngreso = [
    { id: "abono_cliente", label: "Abono de Cliente" },
    { id: "venta", label: "Venta Directa" },
  ];

  const categoriasEgreso = [
    { id: "pago_proveedor", label: "Pago a Proveedor" },
    { id: "gasto_fijo", label: "Gasto Fijo (Luz, Agua, Renta...)" },
    { id: "gasto_vario", label: "Gasto Vario (Limpieza, Transporte...)" },
    { id: "compra", label: "Compra de Inventario" },
  ];

  const categoriasActuales = tipo === "ingreso" ? categoriasIngreso : categoriasEgreso;
  const selectedCat = categoriasActuales.find((c) => c.id === categoria);

  useEffect(() => {
    if (defaultVentaId) setCategoria("abono_cliente");
    if (defaultCompraId) setCategoria("pago_proveedor");
  }, [defaultVentaId, defaultCompraId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria || !monto || !descripcion) {
      toast.warn("Por favor llena todos los campos.");
      return;
    }

    if (categoria === "abono_cliente" && !ventaId) {
      toast.warn("Selecciona la venta a abonar.");
      return;
    }
    if (categoria === "pago_proveedor" && !compraId) {
      toast.warn("Selecciona la compra a pagar.");
      return;
    }

    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      toast.warn("El monto debe ser un número mayor a cero.");
      return;
    }

    try {
      const payload: RegistrarMovimientoInput =
        tipo === "ingreso"
          ? {
              tipo_movimiento: "ingreso",
              categoria: categoria as "abono_cliente" | "venta",
              monto: numMonto,
              descripcion,
              venta_id: categoria === "abono_cliente" ? ventaId : null,
            }
          : {
              tipo_movimiento: "egreso",
              categoria: categoria as "pago_proveedor" | "gasto_fijo" | "gasto_vario" | "compra",
              monto: numMonto,
              descripcion,
              compra_id: categoria === "pago_proveedor" ? compraId : null,
            };

      await registrarMovimiento(payload);

      toast.success(`El ${tipo} se ha registrado correctamente.`);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el movimiento.";
      toast.error(message);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Registrar Movimiento"
      subtitle={tipo === "ingreso" ? "Ingreso" : "Egreso"}
      maxWidth="max-w-md"
    >
      <ModalForm onSubmit={handleSubmit}>
        <ModalField>
          <ModalLabel htmlFor="mov-monto">Monto (Q)</ModalLabel>
          <ModalInput
            id="mov-monto"
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            autoFocus
            required
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
          />
        </ModalField>

        <ModalField>
          <ModalLabel>Categoría</ModalLabel>
          <div className="relative" ref={catDropdownRef}>
            <button
              type="button"
              disabled={!!defaultVentaId || !!defaultCompraId}
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-lg bg-transparent px-3 text-sm font-medium text-left outline-none transition-colors focus-visible:outline-none disabled:opacity-50 cursor-pointer",
                modalFieldClass,
              )}
            >
              {selectedCat ? (
                <span className="text-zinc-800 dark:text-zinc-200">{selectedCat.label}</span>
              ) : (
                <span className="text-zinc-400">Selecciona una categoría...</span>
              )}
              <ChevronDown className="size-4 text-zinc-400 shrink-0" />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl z-[200] p-1 flex flex-col gap-0.5 opacity-100"
                >
                  {categoriasActuales.map((c) => {
                    const isSelected = categoria === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategoria(c.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg text-left flex items-center justify-between cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm",
                          isSelected
                            ? "bg-[#8DA78E]/10 text-[#8DA78E] font-bold"
                            : "text-zinc-700 dark:text-zinc-300 font-medium",
                        )}
                      >
                        <span>{c.label}</span>
                        {isSelected && <Check className="size-4 text-[#8DA78E]" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ModalField>

        {categoria === "abono_cliente" && (
          <ModalField>
            <ModalLabel htmlFor="mov-venta">Venta Pendiente</ModalLabel>
            <select
              id="mov-venta"
              value={ventaId}
              onChange={(e) => setVentaId(e.target.value)}
              disabled={!!defaultVentaId || isLoadingCuentas}
              className={cn(
                "flex h-10 w-full rounded-lg bg-transparent px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-none disabled:opacity-50",
                modalFieldClass,
              )}
            >
              <option value="" disabled>
                {isLoadingCuentas ? "Cargando..." : "Selecciona una venta..."}
              </option>
              {cuentasCobrar.map((c) => (
                <option key={c.venta_id} value={c.venta_id}>
                  {c.cliente_nombre} - Pendiente: Q{c.saldo_pendiente}
                </option>
              ))}
            </select>
          </ModalField>
        )}

        {categoria === "pago_proveedor" && (
          <ModalField>
            <ModalLabel htmlFor="mov-compra">Compra Pendiente</ModalLabel>
            <select
              id="mov-compra"
              value={compraId}
              onChange={(e) => setCompraId(e.target.value)}
              disabled={!!defaultCompraId || isLoadingCuentas}
              className={cn(
                "flex h-10 w-full rounded-lg bg-transparent px-3 text-sm text-foreground outline-none transition-colors focus-visible:outline-none disabled:opacity-50",
                modalFieldClass,
              )}
            >
              <option value="" disabled>
                {isLoadingCuentas ? "Cargando..." : "Selecciona una compra..."}
              </option>
              {cuentasPagar.map((c) => (
                <option key={c.compra_id} value={c.compra_id}>
                  {c.proveedor_nombre} - Pendiente: Q{c.saldo_pendiente}
                </option>
              ))}
            </select>
          </ModalField>
        )}

        <ModalField>
          <ModalLabel htmlFor="mov-descripcion">Descripción / Concepto</ModalLabel>
          <ModalTextarea
            id="mov-descripcion"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
        </ModalField>

        <ModalFooter>
          <ModalCancelButton onClick={onClose} disabled={isSubmitting} />
          <ModalSubmit disabled={isSubmitting} />
        </ModalFooter>
      </ModalForm>
    </ModalShell>
  );
}
