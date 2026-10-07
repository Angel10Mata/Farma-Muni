"use client";

import { useState, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  Receipt,
  ShoppingBag,
  TrendingUp,
  X as CloseIcon,
} from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import {
  ModuleDateFilterLayout,
  moduleDateFilterControlButtonClass,
} from "@/components/ui/module-date-period-filter";
import {
  Ban,
  Check as CheckNode,
  History,
  Pencil,
  Save,
  SquarePen,
  Trash,
  Trash2,
  X,
  Clock as ClockNode,
} from "lucide";
import { toast } from "react-toastify";
import { guardarProveedor, eliminarProveedor } from "../lib/actions";
import { useComprasProveedor } from "../lib/hooks";
import { cn, fmtQ } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ModalConfirmDelete,
  ModalField,
  ModalInput,
  ModalLabel,
  ModalTextarea,
  modalActionMessage,
  modalFieldClass,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";

// Tipos
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
    categoria: string;
    fecha_movimiento?: string | null;
    tipo_movimiento?: string | null;
    created_at?: string | null;
    notas?: string | null;
  }> | null;
}

interface ProveedorDetalleProps {
  proveedor: Proveedor;
  onClose: () => void;
  onUpdate: () => void;
  defaultEdit?: boolean;
}

// Constantes
const AREA_CODES = ["+502", "+503", "+504"] as const;

// Helpers — contacto
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

// Helpers — compras
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

function compraMonto(c: CompraProveedor): number {
  return Number(c.total) || 0;
}

function compraEstaPendiente(c: CompraProveedor): boolean {
  const abonos =
    c.fin_transacciones
      ?.filter((t) => t.categoria === "pago_proveedor")
      .reduce((sum, t) => sum + Math.abs(Number(t.monto)), 0) || 0;
  return abonos < compraMonto(c) && c.estado_pago !== "Pagado";
}

// Panel detalle
function ProveedorDetallePanel({
  formData,
  proveedor,
  compras,
  isEditing,
  setFormData,
  areaCode,
  setAreaCode,
  telefonoVal,
  setTelefonoVal,
  isSaving,
  confirmEliminar,
  setConfirmEliminar,
  isDeleting,
  onClose,
  onOpenHistorial,
  onEdit,
  onCancelEdit,
  onSave,
  onConfirmDelete,
}: {
  formData: Proveedor;
  proveedor: Proveedor;
  compras: CompraProveedor[];
  isEditing: boolean;
  setFormData: Dispatch<SetStateAction<Proveedor>>;
  areaCode: (typeof AREA_CODES)[number];
  setAreaCode: Dispatch<SetStateAction<(typeof AREA_CODES)[number]>>;
  telefonoVal: string;
  setTelefonoVal: Dispatch<SetStateAction<string>>;
  isSaving: boolean;
  confirmEliminar: boolean;
  setConfirmEliminar: Dispatch<SetStateAction<boolean>>;
  isDeleting: boolean;
  onClose: () => void;
  onOpenHistorial?: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onConfirmDelete: () => void;
}) {
  const comprasPendientes = useMemo(() => compras.filter(compraEstaPendiente), [compras]);
  const ultimaCompra = compras[0]?.created_at;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex h-full w-full flex-col bg-white text-left dark:bg-zinc-800"
    >
      <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-6 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#8DA78E]/20 bg-[#8DA78E]/10">
              <Building2 className="size-5 text-[#8DA78E]" />
            </div>
            <h2 className="min-w-0 text-lg font-black leading-snug text-slate-900 dark:text-white md:text-xl">
              {formData.nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-2 text-xl font-bold text-slate-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <ModalField>
              <ModalLabel htmlFor="proveedor-detalle-nombre">Nombre Comercial</ModalLabel>
              <ModalInput
                id="proveedor-detalle-nombre"
                value={formData.nombre || ""}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </ModalField>
            <ModalField>
              <ModalLabel htmlFor="proveedor-detalle-nit">NIT / Identificación Fiscal</ModalLabel>
              <ModalInput
                id="proveedor-detalle-nit"
                value={formData.nit || ""}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              />
            </ModalField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel htmlFor="proveedor-detalle-telefono">Teléfono</ModalLabel>
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
              </ModalField>
              <ModalField>
                <ModalLabel htmlFor="proveedor-detalle-correo">Correo</ModalLabel>
                <ModalInput
                  id="proveedor-detalle-correo"
                  type="email"
                  value={formData.correo || ""}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                />
              </ModalField>
            </div>
            <ModalField>
              <ModalLabel htmlFor="proveedor-detalle-descripcion">Descripción</ModalLabel>
              <ModalTextarea
                id="proveedor-detalle-descripcion"
                value={formData.descripcion || ""}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
              />
            </ModalField>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]/70">
                Contacto
              </h4>
              <div className="flex items-center gap-2.5 text-base text-slate-600 dark:text-slate-300">
                <Mail className="size-5 shrink-0 text-[#8DA78E]" />
                <span className="truncate">{formData.correo || "No registrado"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-base text-slate-600 dark:text-slate-300">
                <Phone className="size-5 shrink-0 text-[#8DA78E]" />
                {formData.telefono ? (
                  <a
                    href={getWhatsappUrl(formData.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-green-600 hover:underline dark:text-green-400"
                  >
                    {formatPhoneDisplay(formData.telefono)}
                  </a>
                ) : (
                  <span className="text-slate-400">No registrado</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-base text-slate-600 dark:text-slate-300">
                <Receipt className="size-5 shrink-0 text-[#8DA78E]" />
                <span className="truncate">NIT: {formData.nit || "C/F"}</span>
              </div>
              {formData.descripcion ? (
                <p className="text-sm italic text-slate-500 dark:text-slate-400">{formData.descripcion}</p>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-[#C1D1C5]/20 pt-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]/70">
                Estado Financiero
              </h4>
              {comprasPendientes.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 dark:border-emerald-900/30 dark:bg-emerald-950/15">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <Check className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    No tiene pagos pendientes
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-start rounded-xl border border-[#8DA78E]/20 bg-[#8DA78E]/10 px-3.5 py-3.5 dark:border-[#A3BEB0]/15 dark:bg-[#8DA78E]/5">
                  <span className="text-xs font-bold uppercase text-[#525D53] dark:text-[#A3BEB0]">
                    Pendiente ({comprasPendientes.length}{" "}
                    {comprasPendientes.length === 1 ? "compra" : "compras"})
                  </span>
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2.5 text-xs font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]/70">
                Estadísticas
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  {
                    icon: ShoppingBag,
                    label: "Total Compras",
                    value: String(compras.length),
                    color: "text-[#8DA78E] dark:text-[#A3BEB0]",
                  },
                  {
                    icon: TrendingUp,
                    label: "Pendiente",
                    value: `${comprasPendientes.length} ${comprasPendientes.length === 1 ? "compra" : "compras"}`,
                    color: "text-rose-500",
                  },
                  {
                    icon: Calendar,
                    label: "Última Compra",
                    value: ultimaCompra
                      ? new Date(ultimaCompra).toLocaleDateString("es-GT")
                      : "Sin compras",
                    color: "text-[#8DA78E] dark:text-[#A3BEB0]",
                  },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="flex flex-col justify-center rounded-xl border border-[#C1D1C5]/30 bg-white p-2.5 dark:border-[#A3BEB0]/10 dark:bg-[#525D53]/10"
                  >
                    <div className="mb-1 flex items-center gap-1.5">
                      <Icon className={`size-4 shrink-0 ${color}`} />
                      <span className="truncate text-[10px] font-bold uppercase leading-tight tracking-wider text-[#525D53] dark:text-[#A3BEB0]/70">
                        {label}
                      </span>
                    </div>
                    <p className={`truncate text-sm font-black leading-snug ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-3 border-t border-zinc-200 bg-[#F5F5F1] p-4 dark:border-zinc-800 dark:bg-zinc-900 md:p-6 md:pt-4">
        {confirmEliminar ? (
          <ModalConfirmDelete
            message={`¿Eliminar a "${proveedor.nombre}"? Esta acción no se puede deshacer.`}
            pending={isDeleting}
            onCancel={() => setConfirmEliminar(false)}
            onConfirm={onConfirmDelete}
          />
        ) : isEditing ? (
          <>
            <SigetActionButton
              label="Cancelar"
              accentColor={sigetAccent.cancelar}
              morphFrom={X}
              morphTo={Ban}
              onClick={onCancelEdit}
              disabled={isSaving}
              className="w-auto shrink-0"
            />
            <SigetActionButton
              label="Guardar"
              accentColor={sigetAccent.guardar}
              morphFrom={Save}
              morphTo={CheckNode}
              onClick={onSave}
              disabled={isSaving}
              className="w-auto shrink-0"
            />
          </>
        ) : (
          <>
            {onOpenHistorial ? (
              <SigetActionButton
                label="Historial"
                accentColor={sigetAccent.abrir}
                morphFrom={History}
                morphTo={ClockNode}
                morphOnHover
                onClick={onOpenHistorial}
                className="w-auto shrink-0 flex-1 sm:flex-initial md:hidden"
              />
            ) : null}
            <SigetActionButton
              label="Quitar"
              accentColor={sigetAccent.quitar}
              morphFrom={Trash}
              morphTo={Trash2}
              onClick={() => setConfirmEliminar(true)}
              className="w-auto shrink-0 flex-1 sm:flex-initial"
            />
            <SigetActionButton
              label="Editar"
              accentColor={sigetAccent.editar}
              morphFrom={Pencil}
              morphTo={SquarePen}
              onClick={onEdit}
              className="w-auto shrink-0 flex-1 sm:flex-initial"
            />
          </>
        )}
      </div>
    </motion.div>
  );
}

// Export
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

  const [historialMovilAbierto, setHistorialMovilAbierto] = useState(false);
  const { data: comprasRaw = [] } = useComprasProveedor(proveedor?.id ?? null);
  const compras = comprasRaw as unknown as CompraProveedor[];

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

  return (
    <div className="fixed inset-0 z-[100]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-sm"
      />
      <div className="pointer-events-none absolute inset-0 flex items-stretch p-4">
        <div className="pointer-events-auto flex h-[calc(100dvh-var(--banner-height,0px)-2rem)] max-h-[calc(100dvh-var(--banner-height,0px)-2rem)] w-full max-w-full flex-row items-stretch gap-3">
          <div className="hidden min-h-0 min-w-0 md:flex md:flex-[7]">
            <HistorialComprasProveedorPanel
              proveedor={proveedor}
              compras={compras}
              onClose={onClose}
            />
          </div>
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900 md:flex-[3]"
          >
            <ProveedorDetallePanel
              formData={formData}
              proveedor={proveedor}
              compras={compras}
              isEditing={isEditing}
              setFormData={setFormData}
              areaCode={areaCode}
              setAreaCode={setAreaCode}
              telefonoVal={telefonoVal}
              setTelefonoVal={setTelefonoVal}
              isSaving={isSaving}
              confirmEliminar={confirmEliminar}
              setConfirmEliminar={setConfirmEliminar}
              isDeleting={isDeleting}
              onClose={onClose}
              onOpenHistorial={() => setHistorialMovilAbierto(true)}
              onEdit={() => setIsEditing(true)}
              onCancelEdit={() => setIsEditing(false)}
              onSave={handleSave}
              onConfirmDelete={handleEliminar}
            />
          </motion.div>
        </div>
      </div>
      <AnimatePresence>
        {historialMovilAbierto ? (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm md:hidden"
            onClick={() => setHistorialMovilAbierto(false)}
          >
            <div
              className="h-[min(80vh,calc(100dvh-var(--banner-height,0px)-2rem))] w-[92vw] max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <HistorialComprasProveedorPanel
                proveedor={proveedor}
                compras={compras}
                onClose={() => setHistorialMovilAbierto(false)}
                className="h-full w-full"
              />
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// Historial proveedor
function HistorialComprasProveedorPanel({
  proveedor,
  compras,
  onClose,
  className,
}: {
  proveedor: Proveedor;
  compras: CompraProveedor[];
  onClose: () => void;
  className?: string;
}) {
  const [tipoFiltroFecha, setTipoFiltroFecha] = useState<string>("semana");
  const [fechaDia, setFechaDia] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
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
        const [y, m] = fechaDia.split("-");
        const [vy, vm] = fechaCompra.split("-");
        return vy === y && vm === m;
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
          .reduce((acc, curr) => acc + compraMonto(curr), 0);
        data.push({
          fecha: `${i} ${new Date(year, month - 1, 1).toLocaleDateString("es-GT", { month: "short" })}`,
          total,
        });
      }
      return data;
    }
    if (tipoFiltroFecha === "semana") {
      const year = activeYear;
      const month = activeMonth + 1;
      let desde: string;
      let hasta: string;
      if (selectedWeekIndex !== -1) {
        const semanas = obtenerSemanasDelMes(activeMonth, activeYear);
        const semanaSeleccionada = semanas[selectedWeekIndex];
        if (!semanaSeleccionada) return [];
        desde = semanaSeleccionada.desde;
        hasta = semanaSeleccionada.hasta;
      } else {
        const daysInMonth = new Date(year, month, 0).getDate();
        desde = `${year}-${String(month).padStart(2, "0")}-01`;
        hasta = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      }
      const data = [];
      const start = new Date(`${desde}T00:00:00`);
      const end = new Date(`${hasta}T00:00:00`);
      const current = new Date(start);
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        const dayStr = `${y}-${m}-${d}`;
        const total = compras
          .filter((c) => c.created_at.split("T")[0] === dayStr)
          .reduce((acc, curr) => acc + compraMonto(curr), 0);
        data.push({
          fecha: current.toLocaleDateString("es-GT", { month: "short", day: "numeric" }),
          total,
        });
        current.setDate(current.getDate() + 1);
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
          .reduce((acc, curr) => acc + compraMonto(curr), 0);
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-zinc-900",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-4 border-b border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-800/50 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100">
            <Clock className="size-4" /> Historial de Compras
          </h3>
          <p className="mt-1 text-xs text-zinc-500">Proveedor: {proveedor.nombre}</p>
        </div>

        <div className="flex w-full flex-1 justify-center md:w-auto">
          <ModuleDateFilterLayout
            className="mx-auto w-full md:w-fit"
            periodValue={tipoFiltroFecha}
            periodOptions={[
              { id: "dia", label: "Mes/Año" },
              { id: "semana", label: "Mes" },
              { id: "rango", label: "Rango" },
            ]}
            onPeriodChange={setTipoFiltroFecha}
          >
              {tipoFiltroFecha === "dia" && (
                <CustomDatePicker
                  value={fechaDia}
                  onChange={setFechaDia}
                  placeholder="Mes y año"
                  align="left"
                  dropDirection="down"
                  granularity="month"
                />
              )}

              {tipoFiltroFecha === "semana" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative shrink-0" ref={mesDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setMostrarMesDropdown(!mostrarMesDropdown)}
                      className={cn(moduleDateFilterControlButtonClass, "sm:w-[8.75rem]")}
                    >
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-[#8DA78E]" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][activeMonth]} {activeYear}
                        </span>
                      </div>
                      <ChevronDown className="size-3 text-slate-400" />
                    </button>

                    <AnimatePresence>
                      {mostrarMesDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-1/2 z-[200] mt-1 w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 opacity-100 shadow-xl dark:border-slate-800 dark:bg-zinc-900"
                        >
                          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-900">
                            <button
                              type="button"
                              onClick={() => setActiveYear((y) => y - 1)}
                              className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <ChevronLeft className="size-3.5" />
                            </button>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeYear}</span>
                            <button
                              type="button"
                              onClick={() => setActiveYear((y) => y + 1)}
                              className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <ChevronRight className="size-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((m, idx) => (
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
                                    ? "bg-[#8DA78E] text-white"
                                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-zinc-900",
                                )}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative shrink-0" ref={semanaDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setMostrarSemanaDropdown(!mostrarSemanaDropdown)}
                      className={cn(moduleDateFilterControlButtonClass, "sm:w-[9.375rem]")}
                    >
                      <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {selectedWeekIndex === -1 ? "Todo el mes" : obtenerSemanasDelMes(activeMonth, activeYear)[selectedWeekIndex]?.label || "Semana"}
                      </span>
                      <ChevronDown className="size-3 shrink-0 text-slate-400" />
                    </button>

                    <AnimatePresence>
                      {mostrarSemanaDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-full left-1/2 z-[200] mt-1 w-[180px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 opacity-100 shadow-xl dark:border-slate-800 dark:bg-zinc-900"
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
                                ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-zinc-900",
                            )}
                          >
                            <span>Todo el mes</span>
                            {selectedWeekIndex === -1 && <Check className="size-3" />}
                          </button>
                          <div className="mx-2 my-1 h-px bg-slate-100 dark:bg-slate-800" />
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
                                  ? "bg-[#8DA78E]/10 text-[#8DA78E]"
                                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-zinc-900",
                              )}
                            >
                              <span>{sem.label}</span>
                              {selectedWeekIndex === idx && <Check className="size-3" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {tipoFiltroFecha === "rango" && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <CustomDatePicker
                    value={fechaRangoDesde}
                    onChange={setFechaRangoDesde}
                    placeholder="Desde"
                    align="left"
                    dropDirection="down"
                  />
                  <span className="text-xs text-slate-400">-</span>
                  <CustomDatePicker
                    value={fechaRangoHasta}
                    onChange={setFechaRangoHasta}
                    placeholder="Hasta"
                    align="right"
                    dropDirection="down"
                  />
                </div>
              )}
          </ModuleDateFilterLayout>
        </div>

        <button type="button" onClick={onClose} className="ml-auto cursor-pointer text-zinc-400 md:ml-0">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="h-64 w-full rounded-xl bg-white dark:bg-zinc-900">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="fecha" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `Q${value}`} />
              <Tooltip
                formatter={(value) => [fmtQ(Number(value ?? 0)), "Total"]}
                labelStyle={{ color: "#000" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Line type="monotone" dataKey="total" stroke="#8DA78E" strokeWidth={3} dot={{ r: 4, fill: "#8DA78E", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#525D53" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-8 space-y-2">
          <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#525D53] dark:text-[#A3BEB0]">
            Detalle de Compras
          </h4>
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
              const isPaid = abonos >= compraMonto(c) || c.estado_pago === "Pagado";

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/30"
                >
                  <div>
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">{fmtQ(compraMonto(c))}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-zinc-500">
                      <Clock className="size-3" /> {new Date(c.created_at).toLocaleString("es-GT")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                      isPaid
                        ? "bg-[#8DA78E]/10 text-[#8DA78E] dark:bg-[#A3BEB0]/10 dark:text-[#A3BEB0]"
                        : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
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
    </motion.div>
  );
}
