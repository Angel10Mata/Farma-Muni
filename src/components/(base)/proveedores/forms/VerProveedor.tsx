"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ShoppingBag,
  Check as CheckIcon,
} from "lucide-react";
import {
  Pencil,
  SquarePen,
  Trash,
  Trash2,
  Save,
  Check,
  BookOpen,
  X,
  Ban,
  Clock as ClockNode,
} from "lucide";
import { toast } from "react-toastify";
import { guardarProveedor, eliminarProveedor } from "../lib/actions";
import { createClient } from "@/utils/supabase/client";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import { cn, fmtQ } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ModalConfirmDelete,
  ModalField,
  ModalFechaInput,
  ModalFooter,
  ModalInput,
  ModalLabel,
  ModalShell,
  ModalTextarea,
  modalActionMessage,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";

interface Proveedor {
  id: string;
  nombre: string;
  descripcion?: string | null;
  nit?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

interface CompraProveedor {
  id: string;
  created_at: string;
  total: number;
  numero_factura?: string | null;
  estado_pago?: string | null;
  fin_transacciones?: Array<{
    id: string;
    monto: number;
    created_at: string;
    categoria: string;
    notas?: string | null;
  }> | null;
}

interface ProveedorDetalleProps {
  proveedor: Proveedor;
  onClose: () => void;
  onUpdate: () => void;
  defaultEdit?: boolean;
}

const AREA_CODES = ["+502", "+503", "+504"] as const;

export const formatPhoneDisplay = (phone: string | null | undefined): string => {
  if (!phone) return "";
  let clean = phone.trim();
  const prefixRegex = /^\+\d{1,4}\s?/;
  if (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, "");
  } else if (clean.startsWith("502") && clean.length > 8) {
    clean = clean.substring(3);
  }

  const digitsOnly = clean.replace(/\D/g, "");
  if (digitsOnly.length === 8) {
    return `${digitsOnly.substring(0, 4)}-${digitsOnly.substring(4)}`;
  }

  return clean;
};

export const getWhatsappUrl = (phone: string | null | undefined): string => {
  if (!phone) return "";
  let cleaned = phone.trim().replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 8) {
      cleaned = "+502" + cleaned;
    } else if (cleaned.startsWith("502") && cleaned.length > 8) {
      cleaned = "+" + cleaned;
    } else {
      cleaned = "+502" + cleaned;
    }
  }
  return `https://wa.me/${cleaned.replace("+", "")}`;
};

function obtenerSemanasDelMes(month: number, year: number) {
  const weeks: Array<{ desde: string; hasta: string; label: string }> = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let currentStart = new Date(firstDay);

  while (currentStart <= lastDay) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + (7 - (currentStart.getDay() || 7)));
    const end = currentEnd > lastDay ? new Date(lastDay) : currentEnd;
    const desde = `${year}-${String(month + 1).padStart(2, "0")}-${String(currentStart.getDate()).padStart(2, "0")}`;
    const hasta = `${year}-${String(month + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    weeks.push({
      desde,
      hasta,
      label: `${currentStart.getDate()} al ${end.getDate()} ${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][month]}`,
    });
    currentStart = new Date(end);
    currentStart.setDate(currentStart.getDate() + 1);
  }
  return weeks;
}

export function VerProveedor({
  proveedor,
  onClose,
  onUpdate,
  defaultEdit = false,
}: ProveedorDetalleProps) {
  const [isEditing, setIsEditing] = useState(defaultEdit);
  const [formData, setFormData] = useState<Proveedor>(proveedor);
  const [areaCode, setAreaCode] = useState<(typeof AREA_CODES)[number]>("+502");
  const [telefonoVal, setTelefonoVal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  const [compras, setCompras] = useState<CompraProveedor[]>([]);
  const [showHistorial, setShowHistorial] = useState(false);

  useEffect(() => {
    async function loadCompras() {
      if (!proveedor?.id) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("inv_compras")
          .select(
            "id, created_at, total, numero_factura, estado_pago, fin_transacciones(id, monto, created_at, categoria, notas)",
          )
          .eq("proveedor_id", proveedor.id)
          .order("created_at", { ascending: false });
        if (data) setCompras(data as CompraProveedor[]);
      } catch (err) {
        console.error(err);
      }
    }
    loadCompras();
  }, [proveedor?.id]);

  useEffect(() => {
    setFormData(proveedor);
    setIsEditing(defaultEdit);

    if (proveedor?.telefono) {
      const telStr = proveedor.telefono.trim();
      const match = telStr.match(/^(\+\d{1,4})\s?(.*)$/);
      if (match) {
        setAreaCode(match[1] as (typeof AREA_CODES)[number]);
        setTelefonoVal(match[2]);
      } else {
        setAreaCode("+502");
        setTelefonoVal(telStr);
      }
    } else {
      setAreaCode("+502");
      setTelefonoVal("");
    }
  }, [proveedor, defaultEdit]);

  const handleSave = async () => {
    const nombreTrimmed = formData.nombre?.trim();
    if (!nombreTrimmed) {
      toast.warn("El nombre es requerido.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await guardarProveedor(proveedor.id, {
        nombre: nombreTrimmed,
        descripcion: formData.descripcion?.trim() || null,
        nit: formData.nit?.trim() || null,
        telefono: telefonoVal.trim() ? `${areaCode} ${telefonoVal.trim()}` : null,
        correo: formData.correo?.trim() || null,
      });

      if (!res.success) throw new Error(res.code);

      setIsEditing(false);
      onUpdate();
      toast.success("Proveedor actualizado correctamente.");
    } catch (error: unknown) {
      const code = error instanceof Error ? error.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo guardar el proveedor."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async () => {
    setIsDeleting(true);
    try {
      const res = await eliminarProveedor(proveedor.id);
      if (!res.success) throw new Error(res.code);
      toast.success("Proveedor eliminado correctamente.");
      onUpdate();
      onClose();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : undefined;
      toast.error(modalActionMessage(code, "No se pudo eliminar el proveedor."));
    } finally {
      setIsDeleting(false);
      setConfirmEliminar(false);
    }
  };

  const abonosRealizados = compras
    .flatMap((c) => {
      const pagos =
        c.fin_transacciones?.filter((t) => t.categoria === "pago_proveedor") || [];
      return pagos.map((p) => ({
        ...p,
        compraId: c.id,
        numero_factura: c.numero_factura || c.id.substring(0, 8),
      }));
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <ModalShell
        isOpen
        onClose={onClose}
        title="Detalle del Proveedor"
        subtitle={formData.nombre}
        maxWidth="max-w-md"
        fullHeight
      >
        <div className="space-y-4">
          <ModalField>
            <ModalLabel htmlFor="proveedor-detalle-nombre">Nombre Comercial</ModalLabel>
            {isEditing ? (
              <ModalInput
                id="proveedor-detalle-nombre"
                value={formData.nombre || ""}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            ) : (
              <p className="text-base font-black text-zinc-900 dark:text-white">{formData.nombre}</p>
            )}
          </ModalField>

          <ModalField>
            <ModalLabel htmlFor="proveedor-detalle-nit">NIT / Identificación Fiscal</ModalLabel>
            {isEditing ? (
              <ModalInput
                id="proveedor-detalle-nit"
                value={formData.nit || ""}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              />
            ) : (
              <p className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 font-mono text-xs uppercase dark:border-zinc-700 dark:bg-zinc-800">
                {formData.nit || "C/F"}
              </p>
            )}
          </ModalField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField>
              <ModalLabel htmlFor="proveedor-detalle-telefono">Teléfono</ModalLabel>
              {isEditing ? (
                <div className="flex gap-2">
                  <select
                    value={areaCode}
                    onChange={(e) =>
                      setAreaCode(e.target.value as (typeof AREA_CODES)[number])
                    }
                    className={cn(
                      "h-10 w-20 shrink-0 rounded-lg bg-transparent px-2 text-sm outline-none",
                      modalFieldClass,
                    )}
                  >
                    {AREA_CODES.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <ModalInput
                    id="proveedor-detalle-telefono"
                    value={telefonoVal}
                    onChange={(e) => setTelefonoVal(e.target.value)}
                    className="flex-1"
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                  {formData.telefono ? (
                    <a
                      href={getWhatsappUrl(formData.telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-green-600 hover:underline dark:text-green-400"
                    >
                      {formatPhoneDisplay(formData.telefono)}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              )}
            </ModalField>

            <ModalField>
              <ModalLabel htmlFor="proveedor-detalle-correo">Correo</ModalLabel>
              {isEditing ? (
                <ModalInput
                  id="proveedor-detalle-correo"
                  type="email"
                  value={formData.correo || ""}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                />
              ) : (
                <p className="truncate rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                  {formData.correo || "—"}
                </p>
              )}
            </ModalField>
          </div>

          <ModalField>
            <ModalLabel htmlFor="proveedor-detalle-descripcion">Descripción</ModalLabel>
            {isEditing ? (
              <ModalTextarea
                id="proveedor-detalle-descripcion"
                value={formData.descripcion || ""}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
              />
            ) : (
              <p className="min-h-[50px] rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-xs italic text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                {formData.descripcion || "Sin descripción."}
              </p>
            )}
          </ModalField>

          {!isEditing && (
            <div className="space-y-2">
              <ModalLabel>
                <span className="inline-flex items-center gap-1.5">
                  <Receipt className="size-3.5" /> Abonos Realizados
                </span>
              </ModalLabel>
              {abonosRealizados.length === 0 ? (
                <p className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-xs italic text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                  No hay abonos registrados para este proveedor.
                </p>
              ) : (
                <div className="max-h-[160px] space-y-2 overflow-y-auto pr-1">
                  {abonosRealizados.map((abono) => (
                    <div
                      key={abono.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-zinc-50 p-2.5 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-800/80"
                    >
                      <div>
                        <p className="text-sm font-black text-[#2E9E77]">{fmtQ(abono.monto)}</p>
                        <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                          <ShoppingBag className="size-3" /> Factura/Ref: {abono.numero_factura}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                          {new Date(abono.created_at).toLocaleDateString("es-GT")}
                        </p>
                        <p className="text-[9px] text-zinc-400">
                          {new Date(abono.created_at).toLocaleTimeString("es-GT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {confirmEliminar ? (
          <ModalConfirmDelete
            message={`¿Eliminar a "${proveedor.nombre}"? Esta acción no se puede deshacer.`}
            pending={isDeleting}
            onCancel={() => setConfirmEliminar(false)}
            onConfirm={handleEliminar}
          />
        ) : (
          <ModalFooter>
            <SigetActionButton
              label="Historial"
              accentColor={sigetAccent.abrir}
              morphFrom={BookOpen}
              morphTo={ClockNode}
              onClick={() => setShowHistorial(true)}
              className="w-auto shrink-0"
            />
            {isEditing ? (
              <>
                <SigetActionButton
                  label="Cancelar"
                  accentColor={sigetAccent.cancelar}
                  morphFrom={X}
                  morphTo={Ban}
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="w-auto shrink-0"
                />
                <SigetActionButton
                  label="Guardar"
                  accentColor={sigetAccent.guardar}
                  morphFrom={Save}
                  morphTo={Check}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-auto shrink-0"
                />
              </>
            ) : (
              <>
                <SigetActionButton
                  label="Quitar"
                  accentColor={sigetAccent.quitar}
                  morphFrom={Trash}
                  morphTo={Trash2}
                  onClick={() => setConfirmEliminar(true)}
                  className="w-auto shrink-0"
                />
                <SigetActionButton
                  label="Editar"
                  accentColor={sigetAccent.editar}
                  morphFrom={Pencil}
                  morphTo={SquarePen}
                  onClick={() => setIsEditing(true)}
                  className="w-auto shrink-0"
                />
              </>
            )}
          </ModalFooter>
        )}
      </ModalShell>

      {showHistorial && (
        <HistorialComprasProveedorModal
          proveedor={proveedor}
          compras={compras}
          onClose={() => setShowHistorial(false)}
        />
      )}
    </>
  );
}

function HistorialComprasProveedorModal({
  proveedor,
  compras,
  onClose,
}: {
  proveedor: Proveedor;
  compras: CompraProveedor[];
  onClose: () => void;
}) {
  const [tipoFiltroFecha, setTipoFiltroFecha] = useState<string>("semana");
  const [fechaDia, setFechaDia] = useState<string>(fechaCalendarioGt());
  const [activeMonth, setActiveMonth] = useState(() => new Date().getMonth());
  const [activeYear, setActiveYear] = useState(() => new Date().getFullYear());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(-1);
  const [mostrarMesDropdown, setMostrarMesDropdown] = useState(false);
  const [mostrarSemanaDropdown, setMostrarSemanaDropdown] = useState(false);
  const [fechaRangoDesde, setFechaRangoDesde] = useState<string>("");
  const [fechaRangoHasta, setFechaRangoHasta] = useState<string>("");

  const mesDropdownRef = useRef<HTMLDivElement>(null);
  const semanaDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mesDropdownRef.current && !mesDropdownRef.current.contains(event.target as Node)) {
        setMostrarMesDropdown(false);
      }
      if (semanaDropdownRef.current && !semanaDropdownRef.current.contains(event.target as Node)) {
        setMostrarSemanaDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      const fechaCompra = c.created_at.split("T")[0];
      if (tipoFiltroFecha === "dia") {
        return fechaCompra === fechaDia;
      }
      if (tipoFiltroFecha === "semana") {
        const [y, m] = fechaCompra.split("-").map(Number);
        if (m - 1 !== activeMonth || y !== activeYear) return false;
        if (selectedWeekIndex !== -1) {
          const semanas = obtenerSemanasDelMes(activeMonth, activeYear);
          const semanaSeleccionada = semanas[selectedWeekIndex];
          if (semanaSeleccionada) {
            return (
              fechaCompra >= semanaSeleccionada.desde && fechaCompra <= semanaSeleccionada.hasta
            );
          }
        }
        return true;
      }
      if (tipoFiltroFecha === "rango") {
        if (!fechaRangoDesde || !fechaRangoHasta) return true;
        return fechaCompra >= fechaRangoDesde && fechaCompra <= fechaRangoHasta;
      }
      return true;
    });
  }, [
    compras,
    tipoFiltroFecha,
    fechaDia,
    activeMonth,
    activeYear,
    selectedWeekIndex,
    fechaRangoDesde,
    fechaRangoHasta,
  ]);

  const chartData = useMemo(() => {
    if (tipoFiltroFecha === "dia") {
      const parts = fechaDia.split("-").map(Number);
      if (parts.length < 3) return [];
      const [year, month] = parts;
      const daysInMonth = new Date(year, month, 0).getDate();
      const data = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        const total = compras
          .filter((c) => c.created_at.split("T")[0] === dayStr)
          .reduce((acc, curr) => acc + curr.total, 0);
        data.push({
          fecha: `${i} ${new Date(year, month - 1, 1).toLocaleDateString("es-GT", { month: "short" })}`,
          total,
        });
      }
      return data;
    }
    if (tipoFiltroFecha === "semana") {
      const data = [];
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(activeYear, i, 1);
        const monthName = monthDate.toLocaleDateString("es-GT", { month: "short" });
        const monthStr = String(i + 1).padStart(2, "0");
        const total = compras
          .filter((c) => {
            const [vy, vm] = c.created_at.split("T")[0].split("-");
            return vy === String(activeYear) && vm === monthStr;
          })
          .reduce((acc, curr) => acc + curr.total, 0);
        data.push({
          fecha: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          total,
        });
      }
      return data;
    }
    if (tipoFiltroFecha === "rango") {
      if (!fechaRangoDesde || !fechaRangoHasta) return [];
      const start = new Date(fechaRangoDesde + "T00:00:00");
      const end = new Date(fechaRangoHasta + "T23:59:59");
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
      const data = [];
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      let daysCount = 0;
      while (current <= end && daysCount < 366) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        const dayStr = `${y}-${m}-${d}`;
        const total = compras
          .filter((c) => c.created_at.split("T")[0] === dayStr)
          .reduce((acc, curr) => acc + curr.total, 0);
        data.push({
          fecha: current.toLocaleDateString("es-GT", { month: "short", day: "numeric" }),
          total,
        });
        current.setDate(current.getDate() + 1);
        daysCount++;
      }
      return data;
    }
    return [];
  }, [compras, tipoFiltroFecha, fechaDia, activeYear, fechaRangoDesde, fechaRangoHasta]);

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Historial de Compras"
      subtitle={proveedor.nombre}
      maxWidth="max-w-4xl"
      fullHeight
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {[
              { id: "dia", label: "Día" },
              { id: "semana", label: "Mes" },
              { id: "rango", label: "Rango" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTipoFiltroFecha(opt.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                  tipoFiltroFecha === opt.id
                    ? "bg-white text-[#2c5f9b] dark:bg-zinc-900 dark:text-[#6f9fd4]"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tipoFiltroFecha === "dia" && (
              <ModalFechaInput
                id="historial-proveedor-dia"
                value={fechaDia}
                onChange={setFechaDia}
                className="h-[34px] max-w-[140px]"
              />
            )}

            {tipoFiltroFecha === "semana" && (
              <>
                <div className="relative" ref={mesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMostrarMesDropdown(!mostrarMesDropdown)}
                    className={cn(
                      "flex h-[34px] min-w-[140px] items-center justify-between gap-1.5 rounded-xl border bg-white px-2.5 text-xs font-semibold dark:bg-zinc-900",
                      modalFieldClass,
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-[#2c5f9b] dark:text-[#6f9fd4]" />
                      {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][activeMonth]} {activeYear}
                    </span>
                    <ChevronDown className="size-3 text-zinc-400" />
                  </button>
                  <AnimatePresence>
                    {mostrarMesDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 z-[200] mt-1 w-48 rounded-xl border border-zinc-200 bg-white p-2 opacity-100 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <div className="mb-2 flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setActiveYear((y) => y - 1)}
                            className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <ChevronLeft className="size-3.5" />
                          </button>
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{activeYear}</span>
                          <button
                            type="button"
                            onClick={() => setActiveYear((y) => y + 1)}
                            className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map(
                            (m, idx) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setActiveMonth(idx);
                                  setMostrarMesDropdown(false);
                                  setSelectedWeekIndex(-1);
                                }}
                                className={cn(
                                  "cursor-pointer rounded-lg px-1 py-1.5 text-[10px] font-bold transition-all",
                                  activeMonth === idx
                                    ? "bg-[#2c5f9b] text-white dark:bg-[#6f9fd4]"
                                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800",
                                )}
                              >
                                {m}
                              </button>
                            ),
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative" ref={semanaDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMostrarSemanaDropdown(!mostrarSemanaDropdown)}
                    className={cn(
                      "flex h-[34px] min-w-[150px] items-center justify-between gap-1.5 rounded-xl border bg-white px-2.5 text-xs font-semibold dark:bg-zinc-900",
                      modalFieldClass,
                    )}
                  >
                    <span className="truncate">
                      {selectedWeekIndex === -1
                        ? "Todo el mes"
                        : obtenerSemanasDelMes(activeMonth, activeYear)[selectedWeekIndex]?.label || "Semana"}
                    </span>
                    <ChevronDown className="size-3 shrink-0 text-zinc-400" />
                  </button>
                  <AnimatePresence>
                    {mostrarSemanaDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 z-[200] mt-1 w-[180px] rounded-xl border border-zinc-200 bg-white py-1 opacity-100 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWeekIndex(-1);
                            setMostrarSemanaDropdown(false);
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs font-bold",
                            selectedWeekIndex === -1
                              ? "bg-[#2c5f9b]/10 text-[#2c5f9b] dark:text-[#6f9fd4]"
                              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800",
                          )}
                        >
                          <span>Todo el mes</span>
                          {selectedWeekIndex === -1 && <CheckIcon className="size-3" />}
                        </button>
                        <div className="mx-2 my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                        {obtenerSemanasDelMes(activeMonth, activeYear).map((sem, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedWeekIndex(idx);
                              setMostrarSemanaDropdown(false);
                            }}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs font-semibold",
                              selectedWeekIndex === idx
                                ? "bg-[#2c5f9b]/10 text-[#2c5f9b] dark:text-[#6f9fd4]"
                                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800",
                            )}
                          >
                            <span>{sem.label}</span>
                            {selectedWeekIndex === idx && <CheckIcon className="size-3" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {tipoFiltroFecha === "rango" && (
              <div className="flex flex-wrap items-center gap-2">
                <ModalFechaInput
                  id="historial-proveedor-desde"
                  value={fechaRangoDesde}
                  onChange={setFechaRangoDesde}
                  className="h-[34px] max-w-[140px]"
                />
                <span className="text-xs text-zinc-400">-</span>
                <ModalFechaInput
                  id="historial-proveedor-hasta"
                  value={fechaRangoHasta}
                  onChange={setFechaRangoHasta}
                  className="h-[34px] max-w-[140px]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="h-64 w-full rounded-xl bg-zinc-50 dark:bg-zinc-800">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="fecha" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `Q${value}`}
              />
              <Tooltip
                formatter={(value) => [fmtQ(Number(value ?? 0)), "Total"]}
                contentStyle={{ borderRadius: "12px", border: "none" }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#2c5f9b"
                strokeWidth={3}
                dot={{ r: 4, fill: "#2c5f9b", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#6f9fd4" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <ModalLabel>Detalle de Compras</ModalLabel>
          {comprasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <ShoppingBag className="mb-3 size-12 opacity-20" />
              <p className="text-sm font-bold">No hay compras registradas en este período.</p>
            </div>
          ) : (
            comprasFiltradas.map((c) => {
              const abonos =
                c.fin_transacciones
                  ?.filter((t) => t.categoria === "pago_proveedor")
                  .reduce((sum, t) => sum + Math.abs(Number(t.monto)), 0) || 0;
              const isPaid = abonos >= c.total || c.estado_pago === "Pagado";

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <div>
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">{fmtQ(c.total)}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-zinc-500">
                      <Clock className="size-3" /> {new Date(c.created_at).toLocaleString("es-GT")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                      isPaid
                        ? "bg-[#2E9E77]/10 text-[#2E9E77]"
                        : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                    )}
                  >
                    {isPaid ? "Pagado" : "Pendiente"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ModalShell>
  );
}
