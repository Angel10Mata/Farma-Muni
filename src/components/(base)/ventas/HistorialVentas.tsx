"use client";

import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  Eye as EyeNode,
  MessageCircle as MessageCircleNode,
  Printer as PrinterNode,
  Download as DownloadNode,
  FileDown,
} from "lucide";
import { motion, AnimatePresence } from "framer-motion";
import { cn, fmtQ } from "@/lib/utils";
import { moduleControlsShellClass } from "@/lib/module-layout";
import { moduleDateFilterShellClass } from "@/components/ui/module-pill-switch";
import { ModuleDateFilterLayout } from "@/components/ui/module-date-period-filter";
import { ModuleFilterUnderlineTabs } from "@/components/ui/module-filter-tabs";
import { ModuleInformeDropdown } from "@/components/ui/module-informe-dropdown";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  codigoReciboVenta,
  formatNumeroRecibo,
  ventaCoincideFiltroPagoHistorial,
  fechaVentaCalendarioGt,
  ventaEsCreditoHistorial,
  etiquetaTipoVentaHistorial,
  resolverMesExportacionVentas,
  ventaEstaAnulada,
} from "./lib/helpers";
import { fechaCalendarioGt, ultimoDiaMesCalendario } from "@/lib/fechas-gt";
import { useHistorialVentas } from "./lib/hooks";
import {
  obtenerCorteCajaDiario,
  obtenerReporteVentasMes,
  obtenerReporteVentasReceta,
  obtenerVendedoresCorteCaja,
} from "./lib/actions";
import { descargarReporteVentasMesPdf } from "./lib/export-reporte-ventas-mes-pdf";
import { descargarReporteVentasMesExcel } from "./lib/export-reporte-ventas-mes-xlsx";
import { descargarReporteVentasRecetaPdf } from "./lib/export-reporte-ventas-receta-pdf";
import { descargarReporteVentasRecetaExcel } from "./lib/export-reporte-ventas-receta-xlsx";
import { descargarReporteCorteCajaPdf } from "./lib/export-reporte-corte-caja-pdf";
import { descargarReporteCorteCajaExcel } from "./lib/export-reporte-corte-caja-xlsx";
import { construirMetaInforme } from "@/lib/reportes/meta-informe";
import { construirReporteVentasMesDemo } from "./lib/reporte-ventas-mes-demo";
import { construirReporteCorteCajaDemo } from "./lib/reporte-corte-caja-demo";
import { etiquetaPeriodoVentasMes } from "./lib/reporte-ventas-mes";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { useProfile } from "@/components/(base)/(users)/profile/lib/hooks";
import { toast } from "@/components/ui/general-modal";
import { DetalleVentaModal } from "./modals/DetalleVentaModal";
import {
  moduleTableBodyClass,
  moduleTableCellClass,
  moduleTableClass,
  moduleTableDesktopWrapClass,
  moduleTableDesktopScrollClass,
  ModuleTableFooter,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableRowClass,
  moduleTableScrollClass,
  moduleTableSearchClass,
  moduleTableShellClass,
} from "@/components/ui/module-table";

interface HistorialVentasProps {
  mostrarInformesAdmin?: boolean;
  onPrint: (venta: any, detalles: any) => void;
  onShareWhatsApp: (venta: any) => void;
}

// Fecha legible en la tabla
function formatCustomDate(dateString: string) {
  const d = new Date(dateString);
  const weekDayStr = d.toLocaleString("es-GT", { weekday: "short" }).replace(/\./g, '');
  const weekDay = weekDayStr.charAt(0).toUpperCase() + weekDayStr.slice(1);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHour = String(hours % 12 || 12).padStart(2, "0");
  return `${weekDay} ${day}/${month}/${year} | ${formattedHour}:${minutes} ${ampm}`;
}

export function HistorialVentas({
  mostrarInformesAdmin = true,
  onPrint,
  onShareWhatsApp,
}: HistorialVentasProps) {
  const { data: historialData = [], isLoading } = useHistorialVentas();
  const { isDemoMode } = useDemoMode();
  const { user } = useUserContext();
  const { profile } = useProfile(user?.id ?? "", !!user);

  // Filtros
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [exportandoInforme, setExportandoInforme] = useState(false);
  const [exportandoInformeExcel, setExportandoInformeExcel] = useState(false);
  const [exportandoReceta, setExportandoReceta] = useState(false);
  const [exportandoRecetaExcel, setExportandoRecetaExcel] = useState(false);
  const [exportandoCortePdf, setExportandoCortePdf] = useState(false);
  const [exportandoCorteExcel, setExportandoCorteExcel] = useState(false);
  const [fechaCorte, setFechaCorte] = useState(() => fechaCalendarioGt());
  const [usuarioCorteId, setUsuarioCorteId] = useState("");
  const [vendedoresCorte, setVendedoresCorte] = useState<
    { id: string; nombre: string }[]
  >([]);

  const esAdminHistorial = ["admin", "super"].includes(profile?.rol ?? "");

  useEffect(() => {
    if (!esAdminHistorial || isDemoMode) return;
    void obtenerVendedoresCorteCaja().then((res) => {
      if (res.success) setVendedoresCorte(res.vendedores);
    });
  }, [esAdminHistorial, isDemoMode]);
  const [tipoPagoSwitch, setTipoPagoSwitch] = useState<"todos" | "contado" | "credito">("todos");
  
  // Filtros de Fecha
  const [tipoFiltroFecha, setTipoFiltroFecha] = useState<"dia" | "semana" | "rango">("dia");
  const [fechaDia, setFechaDia] = useState<string>(() => fechaCalendarioGt());
  const [fechaRangoDesde, setFechaRangoDesde] = useState<string>("");
  const [fechaRangoHasta, setFechaRangoHasta] = useState<string>("");

  const aplicarRangoMesActual = () => {
    const hoy = fechaCalendarioGt();
    setFechaRangoDesde(`${hoy.slice(0, 7)}-01`);
    setFechaRangoHasta(hoy);
    setCurrentPage(1);
  };

  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [mostrarMesDropdown, setMostrarMesDropdown] = useState(false);
  const [mostrarSemanaDropdown, setMostrarSemanaDropdown] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [ventaDetalleSeleccionada, setVentaDetalleSeleccionada] = useState<any | null>(null);

  // Filtrar ventas
  const query = busquedaHistorial.toLowerCase();
  let filtered = historialData.filter(v => {
    // 1. Texto (recibo, notas, cliente)
    const matchesQuery = !query || 
      (v.numero_recibo && v.numero_recibo.toString().includes(query)) ||
      (v.observaciones && v.observaciones.toLowerCase().includes(query)) ||
      (v.ven_clientes?.nombre && v.ven_clientes.nombre.toLowerCase().includes(query)) ||
      codigoReciboVenta(v).toLowerCase().includes(query) ||
      (v.numero_recibo != null &&
        formatNumeroRecibo(v.numero_recibo).toLowerCase().includes(query));
    
    // 2. Tipo Pago
    const matchesTipoPago = ventaCoincideFiltroPagoHistorial(
      v.tipo_venta,
      tipoPagoSwitch,
    );

    if (!matchesQuery || !matchesTipoPago) return false;

    const fechaVenta = fechaVentaCalendarioGt(v.created_at);
    if (!fechaVenta) return false;

    if (tipoFiltroFecha === "dia" && fechaDia) {
      if (fechaVenta !== fechaDia) return false;
    } else if (tipoFiltroFecha === "rango") {
      if (fechaRangoDesde && fechaVenta < fechaRangoDesde) return false;
      if (fechaRangoHasta && fechaVenta > fechaRangoHasta) return false;
    } else if (tipoFiltroFecha === "semana") {
      const mesVenta = fechaVenta.slice(0, 7);
      const mesFiltro = `${activeYear}-${String(activeMonth + 1).padStart(2, "0")}`;
      if (mesVenta !== mesFiltro) return false;
    }

    return true;
  });

  const totalVentas = filtered.reduce((sum, v) => sum + (Number(v.total) || 0), 0);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resolverRangoInforme = (): { desde: string; hasta: string } => {
    if (tipoFiltroFecha === "rango" && fechaRangoDesde && fechaRangoHasta) {
      return { desde: fechaRangoDesde, hasta: fechaRangoHasta };
    }
    if (tipoFiltroFecha === "dia" && fechaDia) {
      return { desde: fechaDia, hasta: fechaDia };
    }
    const { year, month } = resolverMesExportacionVentas({
      tipoFiltroFecha,
      fechaDia,
      activeYear,
      activeMonth,
    });
    const monthStr = String(month).padStart(2, "0");
    const lastDay = ultimoDiaMesCalendario(year, month);
    return {
      desde: `${year}-${monthStr}-01`,
      hasta: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
    };
  };

  const exportarVentasReceta = async () => {
    const { desde, hasta } = resolverRangoInforme();
    setExportandoReceta(true);
    try {
      const res = await obtenerReporteVentasReceta(desde, hasta);
      if (!res.success) throw new Error(res.error);
      if (res.data.filas.length === 0) {
        toast.warn("No hay ventas con receta en el rango seleccionado.");
        return;
      }
      const meta = await construirMetaInforme(res.data.generadoPor);
      descargarReporteVentasRecetaPdf(res.data, meta);
      toast.success("Reporte PDF de ventas con receta generado.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo generar el reporte.";
      toast.error(msg);
    } finally {
      setExportandoReceta(false);
    }
  };

  const exportarVentasRecetaExcel = async () => {
    const { desde, hasta } = resolverRangoInforme();
    setExportandoRecetaExcel(true);
    try {
      const res = await obtenerReporteVentasReceta(desde, hasta);
      if (!res.success) throw new Error(res.error);
      if (res.data.filas.length === 0) {
        toast.warn("No hay ventas con receta en el rango seleccionado.");
        return;
      }
      const meta = await construirMetaInforme(res.data.generadoPor);
      await descargarReporteVentasRecetaExcel(res.data, meta);
      toast.success("Excel de ventas con receta generado.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo generar el reporte.";
      toast.error(msg);
    } finally {
      setExportandoRecetaExcel(false);
    }
  };

  const resolverDatosCorte = async () => {
    const generadoPor =
      profile?.nombre?.trim() || user?.email?.split("@")[0] || "Usuario";
    if (isDemoMode) {
      return {
        ...construirReporteCorteCajaDemo(
          fechaCorte,
          usuarioCorteId.trim() || null,
        ),
        generadoPor,
      };
    }
    const res = await obtenerCorteCajaDiario(
      fechaCorte,
      usuarioCorteId.trim() || null,
    );
    if (!res.success) throw new Error(res.error);
    return res.data;
  };

  const exportarCorteCajaPdf = async () => {
    setExportandoCortePdf(true);
    try {
      const data = await resolverDatosCorte();
      if (
        data.detalleVentas.length === 0 &&
        data.abonosDetalle.length === 0 &&
        data.anulaciones.length === 0
      ) {
        toast.warn("No hay movimientos para el corte seleccionado.");
        return;
      }
      const meta = await construirMetaInforme(data.generadoPor);
      descargarReporteCorteCajaPdf(data, meta);
      toast.success("Corte de caja PDF generado.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo generar el corte.";
      toast.error(msg);
    } finally {
      setExportandoCortePdf(false);
    }
  };

  const exportarCorteCajaExcel = async () => {
    setExportandoCorteExcel(true);
    try {
      const data = await resolverDatosCorte();
      if (
        data.detalleVentas.length === 0 &&
        data.abonosDetalle.length === 0 &&
        data.anulaciones.length === 0
      ) {
        toast.warn("No hay movimientos para el corte seleccionado.");
        return;
      }
      const meta = await construirMetaInforme(data.generadoPor);
      await descargarReporteCorteCajaExcel(data, meta);
      toast.success("Corte de caja Excel generado.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo generar el corte.";
      toast.error(msg);
    } finally {
      setExportandoCorteExcel(false);
    }
  };

  const exportarInformeVentasMes = async () => {
    const { year, month } = resolverMesExportacionVentas({
      tipoFiltroFecha,
      fechaDia,
      activeYear,
      activeMonth,
    });
    setExportandoInforme(true);
    try {
      const generadoPor =
        profile?.nombre?.trim() || user?.email?.split("@")[0] || "Usuario";
      let data;
      if (isDemoMode) {
        data = {
          ...construirReporteVentasMesDemo(year, month),
          generadoPor,
        };
      } else {
        const res = await obtenerReporteVentasMes(year, month);
        if (!res.success) throw new Error(res.error);
        data = res.data;
      }
      if (data.resumen.totalVentas === 0) {
        toast.warn(
          `No hay ventas en ${etiquetaPeriodoVentasMes(year, month)} para exportar.`,
        );
        return;
      }
      const meta = await construirMetaInforme(data.generadoPor);
      descargarReporteVentasMesPdf(data, meta);
      toast.success("Informe PDF generado correctamente.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo generar el informe.";
      toast.error(msg);
    } finally {
      setExportandoInforme(false);
    }
  };

  const exportarInformeVentasMesExcel = async () => {
    const { year, month } = resolverMesExportacionVentas({
      tipoFiltroFecha,
      fechaDia,
      activeYear,
      activeMonth,
    });
    setExportandoInformeExcel(true);
    try {
      const generadoPor =
        profile?.nombre?.trim() || user?.email?.split("@")[0] || "Usuario";
      let data;
      if (isDemoMode) {
        data = {
          ...construirReporteVentasMesDemo(year, month),
          generadoPor,
        };
      } else {
        const res = await obtenerReporteVentasMes(year, month);
        if (!res.success) throw new Error(res.error);
        data = res.data;
      }
      if (data.resumen.totalVentas === 0) {
        toast.warn(
          `No hay ventas en ${etiquetaPeriodoVentasMes(year, month)} para exportar.`,
        );
        return;
      }
      const meta = await construirMetaInforme(data.generadoPor);
      await descargarReporteVentasMesExcel(data, meta);
      toast.success("Informe Excel generado correctamente.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo generar el informe.";
      toast.error(msg);
    } finally {
      setExportandoInformeExcel(false);
    }
  };

  // Pantalla del historial
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <section
        className={cn(
          moduleControlsShellClass,
          "relative z-30 shrink-0 overflow-visible p-3 md:p-4",
        )}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full min-w-0 flex-1 lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-look-2-salvia-menta/70" />
              <input
                type="text"
                placeholder="Buscar recibo o cliente..."
                value={busquedaHistorial}
                onChange={(e) => {
                  setBusquedaHistorial(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn(moduleTableSearchClass, "py-2 pl-9")}
              />
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              <ModuleInformeDropdown
                busy={
                  isLoading ||
                  exportandoCortePdf ||
                  exportandoCorteExcel ||
                  exportandoReceta ||
                  exportandoRecetaExcel ||
                  exportandoInforme ||
                  exportandoInformeExcel
                }
                items={[
                  {
                    titulo: "Corte de caja",
                    onPdf: () => void exportarCorteCajaPdf(),
                    onExcel: () => void exportarCorteCajaExcel(),
                    pdfDisabled: exportandoCortePdf,
                    excelDisabled: exportandoCorteExcel,
                  },
                  ...(mostrarInformesAdmin
                    ? [
                        {
                          titulo: "Ventas con receta",
                          onPdf: () => void exportarVentasReceta(),
                          onExcel: () => void exportarVentasRecetaExcel(),
                          pdfDisabled: exportandoReceta || isDemoMode,
                          excelDisabled: exportandoRecetaExcel || isDemoMode,
                        },
                        {
                          titulo: "Ventas del mes",
                          onPdf: () => void exportarInformeVentasMes(),
                          onExcel: () => void exportarInformeVentasMesExcel(),
                          pdfDisabled: exportandoInforme,
                          excelDisabled: exportandoInformeExcel,
                        },
                      ]
                    : []),
                ]}
              />
              <ModuleFilterUnderlineTabs
                ariaLabel="Tipo de pago"
                value={tipoPagoSwitch}
                options={[
                  { id: "todos", label: "Todos" },
                  { id: "contado", label: "Contado" },
                  { id: "credito", label: "Crédito" },
                ]}
                onChange={(id) => {
                  setTipoPagoSwitch(id);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div
            className="flex flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">
                Corte de caja
              </span>
              <CustomDatePicker
                value={fechaCorte}
                onChange={setFechaCorte}
                placeholder="Fecha corte"
                align="left"
              />
              {esAdminHistorial ? (
                <select
                  value={usuarioCorteId}
                  onChange={(e) => setUsuarioCorteId(e.target.value)}
                  className="h-[42px] rounded-xl border border-zinc-200 bg-white px-2 text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  aria-label="Vendedor del corte"
                >
                  <option value="">Todos los vendedores</option>
                  {vendedoresCorte.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className={cn(moduleTableShellClass, "overflow-visible p-0")}>
        <div
          className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800 md:px-5 md:pt-4 md:pb-3 xl:flex-row xl:items-center xl:justify-between"
        >
            <ModuleDateFilterLayout
              periodValue={tipoFiltroFecha}
              periodOptions={[
                { id: "dia", label: "Día" },
                { id: "semana", label: "Mes" },
                { id: "rango", label: "Rango" },
              ]}
              onPeriodChange={(id) => {
                setTipoFiltroFecha(id as "dia" | "semana" | "rango");
                if (id === "rango" && !fechaRangoDesde && !fechaRangoHasta) {
                  aplicarRangoMesActual();
                }
                setCurrentPage(1);
              }}
            >
          <AnimatePresence mode="wait">
            {tipoFiltroFecha === "dia" && (
              <motion.div key="dia" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2">
                <CustomDatePicker
                  value={fechaDia}
                  onChange={(val) => {
                    setFechaDia(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Elegir día"
                  align="left"
                />
              </motion.div>
            )}

            {tipoFiltroFecha === "semana" && (
              <motion.div key="semana" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-row items-center gap-2">
                {/* Mes selector */}
                <div className="flex h-[42px] shrink-0 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900">
                  <button onClick={() => { activeMonth === 0 ? (setActiveMonth(11), setActiveYear(activeYear - 1)) : setActiveMonth(activeMonth - 1); setCurrentPage(1); }} className="size-4.5 rounded flex items-center justify-center text-zinc-500 cursor-pointer">
                    <ChevronLeft className="size-3" />
                  </button>
                  <div className="relative">
                    <button onClick={() => setMostrarMesDropdown(!mostrarMesDropdown)} className="text-etiqueta font-bold text-zinc-700 dark:text-zinc-300 px-2 py-1 flex items-center gap-1 cursor-pointer rounded-lg transition-colors">
                      <Calendar className="size-3 text-look-2-salvia-menta" /> {new Date(activeYear, activeMonth).toLocaleString("es-GT", { month: "short" })} {activeYear}
                    </button>
                    <AnimatePresence>
                      {mostrarMesDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 grid grid-cols-3 gap-1 min-w-[240px]"
                        >
                          {[
                            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
                            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
                          ].map((mName, mIdx) => (
                            <button
                              key={mIdx}
                              type="button"
                              onClick={() => {
                                setActiveMonth(mIdx);
                                setCurrentPage(1);
                                setMostrarMesDropdown(false);
                              }}
                              className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                activeMonth === mIdx
                                  ? "bg-[#8DA78E] text-white"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                              }`}
                            >
                              {mName}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={() => { activeMonth === 11 ? (setActiveMonth(0), setActiveYear(activeYear + 1)) : setActiveMonth(activeMonth + 1); setCurrentPage(1); }} className="size-4.5 rounded flex items-center justify-center text-zinc-500 cursor-pointer">
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {tipoFiltroFecha === "rango" && (
              <motion.div key="rango" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-wrap items-center gap-2">
                <span className="text-etiqueta font-bold text-texto-tenue shrink-0">Desde:</span>
                <CustomDatePicker
                  value={fechaRangoDesde}
                  onChange={(val) => {
                    setFechaRangoDesde(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Calendario"
                  align="left"
                />
                <span className="text-etiqueta font-bold text-texto-tenue shrink-0">Hasta:</span>
                <CustomDatePicker
                  value={fechaRangoHasta}
                  onChange={(val) => {
                    setFechaRangoHasta(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Calendario"
                  align="right"
                />
                <button
                  type="button"
                  onClick={aplicarRangoMesActual}
                  className="text-etiqueta font-bold text-look-2-salvia-menta hover:underline cursor-pointer px-1"
                >
                  Mes actual
                </button>
              </motion.div>
            )}
          </AnimatePresence>
            </ModuleDateFilterLayout>
            {filtered.length > 0 ? (
              <div
                className={cn(
                  moduleDateFilterShellClass,
                  "h-[58px] w-full shrink-0 items-center justify-center xl:w-auto",
                )}
              >
                <span className="text-xl font-black text-[#3B523D] dark:text-[#A0BCA2]">Total:</span>
                <span className="ml-2 text-xl font-black tracking-wide text-look-2-salvia-menta">
                  {fmtQ(totalVentas)}
                </span>
              </div>
            ) : null}
        </div>
      <div className={moduleTableScrollClass}>
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8DA78E]"></div></div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] px-6 py-14 text-center">
            <p className="text-sm font-bold text-texto-tenue">
              Sin registro de ventas
            </p>
          </div>
        ) : (
          <>
            {/* Vista Mobile (Tarjetas) */}
            <div className="md:hidden flex flex-col gap-3">
              {paginatedData.map((v) => {
                const date = formatCustomDate(v.created_at);
                return (
                  <div key={v.id} className={cn("bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm relative overflow-hidden", ventaEstaAnulada(v) && "border-rose-200 bg-rose-50/30 dark:bg-rose-900/10")}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Venta {codigoReciboVenta(v)}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-etiqueta font-bold uppercase tracking-wider",
                          ventaEsCreditoHistorial(v.tipo_venta)
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            : v.tipo_venta === "Tarjeta"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                        )}
                      >
                        {etiquetaTipoVentaHistorial(v.tipo_venta)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <p className="font-bold text-slate-800 dark:text-zinc-200">
                        {v.ven_clientes?.nombre || "Consumidor Final"}
                      </p>
                      <p className="text-etiqueta text-texto-tenue flex items-center gap-1.5 mt-0.5">
                        <Calendar className="size-3.5 text-look-2-salvia-menta" /> {date}
                      </p>
                      {v.observaciones && (
                        <p className="text-etiqueta text-slate-500 italic mt-1 bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-slate-100 dark:border-zinc-800/40">
                          {v.observaciones}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-900 mt-1">
                      <div className="flex flex-col">
                        <span className="text-etiqueta font-bold text-texto-tenue uppercase leading-none">Total</span>
                        <span className="text-xs font-black text-look-2-salvia-menta mt-1">{fmtQ(v.total)}</span>
                      </div>
                      <div className="flex gap-2">
                        <SigetActionButton
                          label="Detalle"
                          accentColor={sigetAccent.abrir}
                          morphFrom={EyeNode}
                          morphTo={EyeNode}
                          morphOnHover={false}
                          onClick={() => setVentaDetalleSeleccionada(v)}
                          className="w-auto shrink-0"
                        />
                        <SigetActionButton
                          label="Imprimir"
                          accentColor={sigetAccent.editar}
                          morphFrom={PrinterNode}
                          morphTo={PrinterNode}
                          morphOnHover={false}
                          onClick={() => onPrint(v, [])}
                          iconOnly
                          ariaLabel="Imprimir recibo"
                          className="w-auto shrink-0"
                        />
                        <SigetActionButton
                          label="WhatsApp"
                          accentColor={sigetAccent.activa}
                          morphFrom={MessageCircleNode}
                          morphTo={MessageCircleNode}
                          morphOnHover={false}
                          onClick={() => onShareWhatsApp(v)}
                          iconOnly
                          ariaLabel="Compartir por WhatsApp"
                          className="w-auto shrink-0"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista Desktop (Tabla) */}
            <div className={moduleTableDesktopWrapClass}>
            <div className={moduleTableDesktopScrollClass}>
              <table className={moduleTableClass}>
                <thead>
                  <tr className={moduleTableHeadRowClass}>
                    <th className={moduleTableHeadCellClass}>Recibo</th>
                    <th className={moduleTableHeadCellClass}>Fecha</th>
                    <th className={moduleTableHeadCellClass}>Cliente</th>
                    <th className={moduleTableHeadCellClass}>Pago</th>
                    <th className={cn(moduleTableHeadCellClass, "text-right")}>Total</th>
                    <th className={cn(moduleTableHeadCellClass, "text-center")}>Acciones</th>
                  </tr>
                </thead>
                <tbody className={moduleTableBodyClass}>
                  {paginatedData.map((v) => {
                    const date = formatCustomDate(v.created_at);
                    return (
                      <tr
                        key={v.id}
                        className={cn(
                          moduleTableRowClass,
                          ventaEstaAnulada(v)
                            ? "bg-rose-50/50 dark:bg-rose-500/5 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            : undefined
                        )}
                      >
                        <td className={cn(moduleTableCellClass, "font-bold text-zinc-900 dark:text-white whitespace-nowrap")}>
                          {codigoReciboVenta(v)}
                        </td>
                        <td className={cn(moduleTableCellClass, "text-zinc-500 whitespace-nowrap")}>{date}</td>
                        <td className={cn(moduleTableCellClass, "font-bold")}>
                          {v.ven_clientes?.nombre || "Consumidor Final"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-etiqueta font-bold uppercase tracking-wider",
                              ventaEsCreditoHistorial(v.tipo_venta)
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                : v.tipo_venta === "Tarjeta"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                            )}
                          >
                            {etiquetaTipoVentaHistorial(v.tipo_venta)}
                          </span>
                        </td>
                        <td className={cn(moduleTableCellClass, "text-right font-black text-look-2-salvia-menta whitespace-nowrap")}>
                          {fmtQ(v.total)}
                        </td>
                        <td className={cn(moduleTableCellClass, "whitespace-nowrap")}>
                          <div className="flex items-center justify-center gap-2">
                            <SigetActionButton
                              label="Detalle"
                              accentColor={sigetAccent.abrir}
                              morphFrom={EyeNode}
                              morphTo={EyeNode}
                              morphOnHover={false}
                              onClick={() => setVentaDetalleSeleccionada(v)}
                              className="w-auto shrink-0"
                            />
                            <SigetActionButton
                              label="Imprimir"
                              accentColor={sigetAccent.editar}
                              morphFrom={PrinterNode}
                              morphTo={PrinterNode}
                              morphOnHover={false}
                              onClick={() => onPrint(v, [])}
                              iconOnly
                              ariaLabel="Imprimir recibo"
                              className="w-auto shrink-0"
                            />
                            <SigetActionButton
                              label="WhatsApp"
                              accentColor={sigetAccent.activa}
                              morphFrom={MessageCircleNode}
                              morphTo={MessageCircleNode}
                              morphOnHover={false}
                              onClick={() => onShareWhatsApp(v)}
                              iconOnly
                              ariaLabel="Compartir por WhatsApp"
                              className="w-auto shrink-0"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </div>

      <ModuleTableFooter
        itemCount={filtered.length}
        pageSize={pageSize}
        pageSizeOptions={[15, 30, 45]}
        setPageSize={setPageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      </div>

      {ventaDetalleSeleccionada && (
        <DetalleVentaModal
          venta={ventaDetalleSeleccionada}
          onClose={() => setVentaDetalleSeleccionada(null)}
          onPrint={onPrint}
        />
      )}
    </div>
  );
}
