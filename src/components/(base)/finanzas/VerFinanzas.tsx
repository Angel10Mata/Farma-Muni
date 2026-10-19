"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Search,
  Trash2,
  Calendar,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
} from "lucide-react";
import { BarChart3, ChartPie } from "lucide";
import Swal from "sweetalert2";
import { getSwalThemeOpts } from "@/lib/utils";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { moduleControlsShellClass, moduleListPageShellClass } from "@/lib/module-layout";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";
import {
  moduleTableBodyClass,
  moduleTableClass,
  moduleTableDesktopScrollClass,
  moduleTableDesktopWrapClass,
  moduleTableEmptyClass,
  ModuleTableFooter,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableScrollClass,
  moduleTableSearchClass,
  moduleTableShellClass,
} from "@/components/ui/module-table";
import { ModuleFilterUnderlineTabs } from "@/components/ui/module-filter-tabs";
import { ModuleInformeDropdown } from "@/components/ui/module-informe-dropdown";
import { construirMetaInforme } from "@/lib/reportes/meta-informe";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { useProfile } from "@/components/(base)/(users)/profile/lib/hooks";
import { FinanzasPeriodoSelector } from "./FinanzasPeriodoSelector";
import {
  calcularRangoPeriodoFinanzas,
  periodoFinanzasInicial,
  type PeriodoFinanzasState,
} from "./lib/periodo-finanzas-helpers";
import { obtenerReporteIngresosEgresos } from "./lib/actions";
import { construirReporteIngresosEgresosDemo } from "./lib/reporte-ingresos-egresos-demo";
import { descargarReporteIngresosEgresosPdf } from "./lib/export-reporte-ingresos-egresos-pdf";
import { descargarReporteIngresosEgresosExcel } from "./lib/export-reporte-ingresos-egresos-xlsx";

import {
  CATEGORIA_LABELS,
  FILTROS_TIPO,
  type FiltroTipo,
} from "./lib/zod";
import {
  useMovimientosFinancieros,
  useResumenFinanciero,
  useEliminarMovimiento,
  useCuentasPorPagar,
} from "./lib/hooks";
import { TarjetaCuentasPorPagar } from "@/components/(base)/proveedores/TarjetaCuentasPorPagar";
import { resumenCuentasPorPagarDesdeRpc } from "@/components/(base)/proveedores/lib/compras-helpers";
import type { TransaccionFinanciera } from "./lib/zod";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { GraficasFinanzasModal } from "./modals/GraficasFinanzasModal";

const SEARCH_DEBOUNCE_MS = 350;

export function VerFinanzas() {
  const { isDemoMode } = useDemoMode();
  const { user } = useUserContext();
  const { profile } = useProfile(user?.id ?? "", !!user);

  // Paginación y búsqueda
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<PeriodoFinanzasState>(() => ({
    ...periodoFinanzasInicial(),
    tipoFiltroFecha: "dia",
    selectedWeekIndex: 0,
  }));

  const [exportandoInforme, setExportandoInforme] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anulación de movimiento
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDesc, setDeleteDesc] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [graficasOpen, setGraficasOpen] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const { desde, hasta, resumenDesde, resumenHasta } = useMemo(
    () => calcularRangoPeriodoFinanzas(periodo),
    [periodo],
  );

  // Queries y mutaciones
  const { data: listado, isLoading } = useMovimientosFinancieros({
    page,
    pageSize,
    tipo: filtroTipo,
    search: searchTerm,
    desde,
    hasta
  });
  
  const { data: resumen = { total_ingresos: 0, total_egresos: 0, balance: 0 } } = useResumenFinanciero(resumenDesde, resumenHasta);
  const { data: cuentasPagar = [] } = useCuentasPorPagar();
  const resumenPagar = resumenCuentasPorPagarDesdeRpc(cuentasPagar);
  const { mutateAsync: anularMovimiento } = useEliminarMovimiento();

  const movimientos = listado?.data || [];
  const totalRegistros = listado?.count || 0;

  // Handlers
  const promptMotivoReverso = async (descripcion: string) => {
    const result = await Swal.fire({
      title: "¿Reversar movimiento?",
      text: `Se creará un registro inverso para: "${descripcion}".`,
      input: "textarea",
      inputPlaceholder: "Motivo obligatorio (mín. 5 caracteres)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reversar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return "El motivo es obligatorio (mínimo 5 caracteres).";
        }
        return null;
      },
      ...getSwalThemeOpts(),
    });
    return result.isConfirmed ? result.value.trim() : null;
  };

  const handleDelete = async (id: string, descripcion: string) => {
    const motivo = await promptMotivoReverso(descripcion);
    if (!motivo) return;

    setIsDeleting(true);
    try {
      await anularMovimiento({ id, motivo });
      toast.success("El movimiento fue reversado correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo reversar el registro";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Formato de presentación
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(amount);

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
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
  };

  const getCategoriaLabel = (categoria: string) =>
    CATEGORIA_LABELS[categoria as keyof typeof CATEGORIA_LABELS] ?? categoria.toUpperCase();

  const nombreGeneradorInforme =
    profile?.nombre?.trim() || user?.email?.split("@")[0] || "Usuario";

  const resolverReporteIngresosEgresos = async () => {
    if (!desde || !hasta) {
      throw new Error("Selecciona un período válido para el informe.");
    }
    if (isDemoMode) {
      return construirReporteIngresosEgresosDemo(desde, hasta, nombreGeneradorInforme);
    }
    const res = await obtenerReporteIngresosEgresos(desde, hasta);
    if (!res.success) throw new Error(res.error);
    return res.data;
  };

  const exportarInformePdf = async () => {
    if (exportandoInforme) return;
    setExportandoInforme(true);
    try {
      const reporte = await resolverReporteIngresosEgresos();
      const meta = await construirMetaInforme(reporte.generadoPor);
      descargarReporteIngresosEgresosPdf(reporte, meta);
      toast.success("Informe PDF descargado.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo generar el informe PDF.";
      toast.error(message);
    } finally {
      setExportandoInforme(false);
    }
  };

  const exportarInformeExcel = async () => {
    if (exportandoInforme) return;
    setExportandoInforme(true);
    try {
      const reporte = await resolverReporteIngresosEgresos();
      const meta = await construirMetaInforme(reporte.generadoPor);
      await descargarReporteIngresosEgresosExcel(reporte, meta);
      toast.success("Informe Excel descargado.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo generar el informe Excel.";
      toast.error(message);
    } finally {
      setExportandoInforme(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / pageSize));

  return (
    <div className={moduleListPageShellClass}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-1">
          <ModuleHeaderBackButton size="sm" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
              Control Financiero
            </h1>
            <p className="text-sm text-texto-tenue mt-1 font-medium">
              Ingresos, egresos, balance y cuentas pendientes
            </p>
          </div>
        </div>

        {/* Totales — siempre el balance real de TODO el libro mayor, calculado en Postgres */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-1">
          <div className="bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-3 md:p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 mb-2">
              <div className="p-1.5 md:p-2 bg-[#8DA78E]/10 rounded-lg text-look-2-salvia-menta shrink-0">
                <ArrowUpRight className="size-4 md:size-5" />
              </div>
              <h3 className="text-etiqueta md:text-sm font-bold text-texto-tenue uppercase tracking-wider">
                Total Ingresos
              </h3>
            </div>
            <p className="text-[12px] min-[380px]:text-sm sm:text-base md:text-2xl font-black text-look-2-salvia-menta tracking-tighter break-words whitespace-normal leading-tight">
              {formatMoney(resumen.total_ingresos)}
            </p>
          </div>

          <div className="bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-3 md:p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 mb-2">
              <div className="p-1.5 md:p-2 bg-rose-500/10 rounded-lg text-rose-500 shrink-0">
                <ArrowDownRight className="size-4 md:size-5" />
              </div>
              <h3 className="text-etiqueta md:text-sm font-bold text-texto-tenue uppercase tracking-wider">
                Total Egresos
              </h3>
            </div>
            <p className="text-[12px] min-[380px]:text-sm sm:text-base md:text-2xl font-black text-rose-500 tracking-tighter break-words whitespace-normal leading-tight">{formatMoney(resumen.total_egresos)}</p>
          </div>

          <div className="bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-3 md:p-5 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 mb-2">
              <div className="p-1.5 md:p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 shrink-0">
                <Wallet className="size-4 md:size-5" />
              </div>
              <h3 className="text-etiqueta md:text-sm font-bold text-texto-tenue uppercase tracking-wider">
                Balance Total
              </h3>
            </div>
            <p
              className={cn(
                "text-[12px] min-[380px]:text-sm sm:text-base md:text-2xl font-black tracking-tighter break-words whitespace-normal leading-tight",
                resumen.balance >= 0 ? "text-zinc-900 dark:text-white" : "text-rose-500"
              )}
            >
              {formatMoney(resumen.balance)}
            </p>
          </div>

          <TarjetaCuentasPorPagar
            totalPendiente={resumenPagar.totalPendiente}
            totalVencido={resumenPagar.totalVencido}
            className="col-span-2 md:col-span-1"
          />
        </div>

      </div>

      <section
        className={cn(
          moduleControlsShellClass,
          "relative z-30 shrink-0 overflow-visible p-3 md:p-4",
        )}
      >
        <div className="flex flex-col gap-3">
          <div className="relative w-full min-w-0 text-left lg:max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-look-2-salvia-menta/70" />
            <input
              type="text"
              placeholder="Buscar por concepto o categoría..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(moduleTableSearchClass, "py-2 pl-9")}
            />
          </div>

          <div
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
          >
            <FinanzasPeriodoSelector
              variant="lista"
              periodo={periodo}
              onPeriodoChange={setPeriodo}
              className="w-full shrink-0 sm:w-auto"
            />

            <div className="flex flex-wrap items-end justify-end gap-2 sm:shrink-0">
              <ModuleInformeDropdown
                busy={exportandoInforme}
                items={[
                  {
                    titulo: "Ingresos y egresos del período",
                    onPdf: () => void exportarInformePdf(),
                    onExcel: () => void exportarInformeExcel(),
                  },
                ]}
              />
              <SigetActionButton
                label="Gráficas"
                accentColor={sigetAccent.abrir}
                morphFrom={BarChart3}
                morphTo={ChartPie}
                type="button"
                onClick={() => setGraficasOpen(true)}
                ariaLabel="Ver gráficas del período"
                className="w-auto shrink-0"
              />
              <ModuleFilterUnderlineTabs
                ariaLabel="Tipo de movimiento"
                value={filtroTipo}
                options={FILTROS_TIPO.map((tipo) => ({ id: tipo, label: tipo }))}
                onChange={(tipo) => {
                  setPage(1);
                  setFiltroTipo(tipo);
                }}
                className="sm:justify-end"
              />
            </div>
          </div>
        </div>
      </section>

      <GraficasFinanzasModal
        open={graficasOpen}
        onClose={() => setGraficasOpen(false)}
        periodoInicial={periodo}
        tipo={filtroTipo}
        search={searchTerm}
      />

        <div className={cn(moduleTableShellClass, "relative p-0")}>
          <div className={cn(moduleTableScrollClass, "p-1 sm:p-2 md:p-4 min-h-0")}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8DA78E] mb-4"></div>
                <p className="text-sm font-medium text-texto-tenue animate-pulse">
                  Cargando registros financieros...
                </p>
              </div>
            ) : movimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#8DA78E]/10 flex items-center justify-center mb-4">
                  <FileText className="size-8 text-look-2-salvia-menta/50" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Sin registros</h3>
                <p className="text-sm text-texto-tenue mt-1 max-w-sm">
                  No se encontraron movimientos financieros que coincidan con los filtros aplicados.
                </p>
              </div>
            ) : (
              <>
                <div className="md:hidden flex flex-col gap-3 px-1">
                  {movimientos.map((mov) => {
                    const isIngreso = mov.tipo_movimiento === "ingreso";
                    const dateFormatted = formatFecha(mov.created_at ?? mov.fecha_movimiento).replace(',', '');
                    return (
                      <motion.div
                        key={mov.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={cn(
                          "relative border rounded-xl p-3 flex gap-3 items-center min-h-[88px] transition-all bg-white dark:bg-[#525D53]/10 border-[#C1D1C5]/60 dark:border-[#A3BEB0]/20 hover:border-[#8DA78E] dark:hover:border-[#A3BEB0]/60"
                        )}
                      >
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <h3 className={cn(
                                "font-black text-xs truncate uppercase leading-tight",
                                "text-slate-900 dark:text-white"
                              )}>
                                {mov.descripcion}
                              </h3>
                              <span className="text-etiqueta text-slate-500 font-medium truncate">
                                {dateFormatted}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={cn(
                                "font-black text-[13px] tabular-nums tracking-tight leading-tight",
                                mov.monto < 0 ? "text-rose-600" : (isIngreso ? "text-look-2-salvia-menta dark:text-look-1-salvia-suave" : "text-rose-500")
                              )}>
                                {isIngreso ? (mov.monto < 0 ? "-" : "+") : (mov.monto < 0 ? "+" : "-")}
                                {formatMoney(Math.abs(mov.monto))}
                              </span>
                              <span className="text-etiqueta font-black uppercase tracking-wider text-texto-tenue">
                                {getCategoriaLabel(mov.categoria)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === mov.id ? null : mov.id);
                            }}
                            className="p-1 rounded-md text-texto-tenue hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                          
                          {activeMenuId === mov.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-50 min-w-[110px]">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  void handleDelete(mov.id, mov.descripcion);
                                }}
                                className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md cursor-pointer"
                              >
                                <Trash2 className="size-3.5" /> Reversar
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className={moduleTableDesktopWrapClass}>
                  <div className={moduleTableDesktopScrollClass}>
                  <table className={moduleTableClass}>
                    <thead>
                      <tr className={moduleTableHeadRowClass}>
                        <th className={moduleTableHeadCellClass}>Fecha</th>
                        <th className={moduleTableHeadCellClass}>Concepto / Categoría</th>
                        <th className={cn(moduleTableHeadCellClass, "text-right")}>Monto</th>
                        <th className={cn(moduleTableHeadCellClass, "text-center")}>
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={moduleTableBodyClass}>
                      {movimientos.map((mov) => (
                        <motion.tr
                          key={mov.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                        >
                          <td className="px-2 sm:px-5 py-3 sm:py-4 align-top sm:align-middle">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Calendar className="size-3 sm:size-3.5 text-texto-tenue shrink-0 hidden sm:block" />
                              <span className="text-etiqueta sm:text-xs font-medium text-zinc-600 dark:text-zinc-300 break-words line-clamp-2">
                                {formatFecha(mov.created_at ?? mov.fecha_movimiento).replace(',', '')}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-5 py-3 sm:py-4 align-top sm:align-middle">
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-etiqueta sm:text-sm font-bold line-clamp-2 break-words",
                                mov.monto < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"
                              )}>
                                {mov.descripcion}
                              </span>
                              <span className="text-etiqueta sm:text-etiqueta font-bold uppercase tracking-wider text-texto-tenue mt-0.5 flex items-center gap-1 sm:gap-1.5">
                                <span className="truncate">{getCategoriaLabel(mov.categoria)}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-5 py-3 sm:py-4 text-right align-top sm:align-middle whitespace-nowrap">
                            <span
                              className={cn(
                                "text-xs sm:text-sm font-black tabular-nums tracking-tight",
                                mov.monto < 0 ? "text-rose-600" : (mov.tipo_movimiento === "ingreso" ? "text-look-2-salvia-menta" : "text-rose-500")
                              )}
                            >
                              {mov.tipo_movimiento === "ingreso" ? (mov.monto < 0 ? "-" : "+") : (mov.monto < 0 ? "+" : "-")}
                              {formatMoney(Math.abs(mov.monto))}
                            </span>
                          </td>

                          <td className="px-1 sm:px-5 py-3 sm:py-4 text-center align-top sm:align-middle">
                            <button
                              type="button"
                              onClick={() => {
                                void handleDelete(mov.id, mov.descripcion);
                              }}
                              className="p-1 sm:p-2 rounded-xl text-texto-tenue hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all focus:opacity-100 cursor-pointer"
                              title="Reversar movimiento"
                            >
                              <Trash2 className="size-3.5 sm:size-4 mx-auto" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {!isLoading && (
            <ModuleTableFooter
              itemCount={totalRegistros}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={page}
              totalPages={totalPaginas}
              onPageChange={setPage}
            />
          )}
        </div>

    </div>
  );
}
