"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "react-toastify";
import { Download as DownloadNode, FileDown } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  modulePillSwitchBtnClass,
  modulePillSwitchShellClass,
} from "@/components/ui/module-pill-switch";
import {
  moduleControlsShellClass,
  moduleListPageShellClass,
} from "@/lib/module-layout";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";
import {
  moduleTableBodyClass,
  moduleTableClass,
  moduleTableDesktopScrollClass,
  moduleTableEmptyClass,
  moduleTableEmptyCellClass,
  ModuleTableFooter,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableRowClass,
  moduleTableSearchClass,
  moduleTableListShellClass,
  moduleTableDesktopWrapListClass,
} from "@/components/ui/module-table";

import { cn, fmtQ } from "@/lib/utils";
import { useResumenCreditos } from "./lib/hooks";
import { descargarReporteCreditosPdf } from "./lib/export-reporte-creditos-pdf";
import { VerDetalleCredito } from "./forms/VerDetalleCredito";
import type { CreditoResumen } from "./lib/zod";
import { useCuentasPorCobrar } from "@/components/(base)/finanzas/lib/hooks";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { useProfile } from "@/components/(base)/(users)/profile/lib/hooks";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { DEMO_CUENTAS_COBRAR } from "@/lib/demo/fixtures";
import type { CuentaPorCobrar } from "@/components/(base)/finanzas/lib/zod";

export function VerCreditos() {
  // Estado listado y pestañas
  const [tab, setTab] = useState<"cobrar" | "pagados">("cobrar");

  const [busqueda, setBusqueda] = useState("");
  const [criterioOrden, setCriterioOrden] = useState<"saldo-desc" | "saldo-asc" | "nombre-asc">("saldo-desc");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<CreditoResumen | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Query
  const { data: creditos = [], isLoading, refetch } = useResumenCreditos();
  const { data: cuentasCobrar = [] } = useCuentasPorCobrar();
  const { isDemoMode } = useDemoMode();
  const { user } = useUserContext();
  const { profile } = useProfile(user?.id ?? "", !!user);
  const [hasNotified, setHasNotified] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [soloVencidos, setSoloVencidos] = useState(false);

  // Aviso de créditos por vencer
  useEffect(() => {
    if (!isLoading && creditos.length > 0 && !hasNotified) {
      const porVencerOCaducados = creditos.filter(c => {
        if (c.saldo_pendiente <= 0) return false;
        const diasRestantes = 30 - c.dias_atraso;
        return diasRestantes <= 7;
      });

      if (porVencerOCaducados.length > 0) {
        toast.warn(
          `Hay ${porVencerOCaducados.length} crédito(s) por vencer (7 días o menos) o ya vencidos.`,
        );
      }
      setHasNotified(true);
    }
  }, [creditos, isLoading, hasNotified]);

  // Filtro, orden y paginación
  const creditosFiltrados = creditos.filter((c) => {
    const isActivo = tab === "cobrar" 
      ? (c.estado !== "Solventado" && c.saldo_pendiente > 0)
      : (c.estado === "Solventado" || c.saldo_pendiente <= 0);
    if (soloVencidos && !c.credito_vencido) return false;
    return isActivo && ((c.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) || (c.nit || "").includes(busqueda));
  });

  const creditosOrdenados = [...creditosFiltrados].sort((a, b) => {
    if (criterioOrden === "saldo-desc") return b.saldo_pendiente - a.saldo_pendiente;
    if (criterioOrden === "saldo-asc") return a.saldo_pendiente - b.saldo_pendiente;
    if (criterioOrden === "nombre-asc") return (a.nombre || "").localeCompare(b.nombre || "");
    return 0;
  });

  const totalPages = Math.ceil(creditosOrdenados.length / pageSize) || 1;
  const paginatedCreditos = creditosOrdenados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportarGlobal = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const generadoPor =
        profile?.nombre?.trim() || user?.email?.split("@")[0] || "Usuario";
      let cuentas: CuentaPorCobrar[];
      if (isDemoMode) {
        cuentas =
          cuentasCobrar.length > 0 ? cuentasCobrar : DEMO_CUENTAS_COBRAR;
      } else {
        cuentas = cuentasCobrar;
      }
      await descargarReporteCreditosPdf({
        cuentas,
        generadoPor,
      });
      toast.success("Reporte PDF generado correctamente.");
    } catch {
      toast.error("No se pudo generar el archivo PDF.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className={moduleListPageShellClass}>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ModuleHeaderBackButton size="sm" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">Finanzas</p>
            <h1 className="text-xl font-black uppercase leading-none tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl">
              Control de Créditos
            </h1>
          </div>
        </div>

        <div className="flex w-full shrink-0 justify-end sm:w-auto">
          <div
            className={cn(
              modulePillSwitchShellClass,
              "w-full max-w-sm sm:w-auto sm:min-w-[15.5rem]",
            )}
            role="tablist"
            aria-label="Sección de créditos"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "cobrar"}
              onClick={() => setTab("cobrar")}
              className={modulePillSwitchBtnClass(tab === "cobrar", { grow: false })}
            >
              Por cobrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "pagados"}
              onClick={() => setTab("pagados")}
              className={modulePillSwitchBtnClass(tab === "pagados", { grow: false })}
            >
              Pagados
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-3">
        <section
          className={cn(
            moduleControlsShellClass,
            "relative z-30 shrink-0 overflow-visible p-3 md:p-4",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre o NIT..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={cn(moduleTableSearchClass, "pl-10 font-medium")}
              />
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <input
                  type="checkbox"
                  className="size-4 rounded"
                  checked={soloVencidos}
                  onChange={(e) => {
                    setSoloVencidos(e.target.checked);
                    setCurrentPage(1);
                  }}
                />
                Solo vencidos
              </label>
              <select
                value={criterioOrden}
                onChange={(e) => setCriterioOrden(e.target.value as typeof criterioOrden)}
                className="h-9 min-w-0 flex-1 cursor-pointer rounded-lg border-2 border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 sm:w-[230px] sm:flex-none"
              >
                <option value="saldo-desc">Mayor Saldo Pendiente</option>
                <option value="saldo-asc">Menor Saldo Pendiente</option>
                <option value="nombre-asc">Nombre (A-Z)</option>
              </select>
              <SigetActionButton
                label="Exportar"
                accentColor={sigetAccent.excel}
                morphFrom={DownloadNode}
                morphTo={FileDown}
                onClick={() => void handleExportarGlobal()}
                disabled={exportando}
                ariaBusy={exportando}
                className="h-9 w-[113px] shrink-0"
              />
            </div>
          </div>
        </section>

        <div className={moduleTableListShellClass}>
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-background/50 backdrop-blur-xs">
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 animate-spin rounded-full border-2 border-[#8DA78E]/30 border-t-[#8DA78E]" />
                <span className="text-xs font-bold text-slate-500">Cargando créditos...</span>
              </div>
            </div>
          )}

          <div className="flex w-full flex-col gap-3">
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {!isLoading && paginatedCreditos.length === 0 ? (
                  <div className={cn(moduleTableEmptyClass, "py-10 text-sm")}>
                    No se encontraron créditos
                  </div>
                ) : (
                paginatedCreditos.map((c) => (
                  <motion.div
                    key={c.cliente_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col gap-4 hover:border-[#8DA78E]/50 transition-colors cursor-pointer group"
                    onClick={() => setClienteSeleccionado(c)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 size-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                          <User className="size-5 text-zinc-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-1">
                            {c.nombre}
                          </h3>
                          <p className="text-[10px] font-medium text-zinc-500 mt-0.5 uppercase tracking-wider">
                            NIT: {c.nit}
                          </p>
                        </div>
                      </div>
                      {c.estado === "Atrasado" && (
                        <AlertCircle className="size-5 text-rose-500 shrink-0" />
                      )}
                      {c.estado === "Solventado" && (
                        <CheckCircle2 className="size-5 text-[#8DA78E] shrink-0" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div>
                        <span className="text-[9px] font-bold uppercase text-zinc-400">Total Consumido</span>
                        <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{fmtQ(c.total_consumido)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-zinc-400">Saldo Pendiente</span>
                        <p className={cn(
                          "text-sm font-black",
                          c.saldo_pendiente > 0 ? "text-rose-500" : "text-[#8DA78E]"
                        )}>
                          {fmtQ(c.saldo_pendiente)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                        c.estado === "Al día" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500" :
                        c.estado === "Atrasado" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-500" :
                        "bg-[#8DA78E]/10 text-[#8DA78E]"
                      )}>
                        {c.estado}
                      </span>
                      <button className="text-zinc-400 group-hover:text-[#8DA78E] transition-colors p-1">
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
                )}
              </div>

              <div className={moduleTableDesktopWrapListClass}>
                <div className={moduleTableDesktopScrollClass}>
                <table className={moduleTableClass}>
                  <thead>
                    <tr className={moduleTableHeadRowClass}>
                      <th className={moduleTableHeadCellClass}>Cliente</th>
                      <th className={moduleTableHeadCellClass}>NIT</th>
                      <th className={cn(moduleTableHeadCellClass, "text-center")}>Días Restantes</th>
                      <th className={cn(moduleTableHeadCellClass, "text-right")}>Consumido</th>
                      <th className={cn(moduleTableHeadCellClass, "text-right")}>Saldo Pendiente</th>
                      <th className={cn(moduleTableHeadCellClass, "text-center")}>Estado</th>
                      <th className={cn(moduleTableHeadCellClass, "text-center")}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={moduleTableBodyClass}>
                    {!isLoading && paginatedCreditos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={moduleTableEmptyCellClass}>
                          No se encontraron créditos
                        </td>
                      </tr>
                    ) : (
                    paginatedCreditos.map((c) => (
                      <tr
                        key={c.cliente_id}
                        className={cn(
                          moduleTableRowClass,
                          "group cursor-pointer",
                          c.credito_vencido &&
                            "bg-red-50 dark:bg-red-950/25 hover:bg-red-100/80 dark:hover:bg-red-950/40",
                        )}
                        onClick={() => setClienteSeleccionado(c)}
                      >
                        <td className="px-5 py-4 font-bold text-zinc-900 dark:text-white">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 size-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                              <User className="size-4 text-zinc-400" />
                            </div>
                            <span className="line-clamp-1">{c.nombre}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium">{c.nit}</td>
                        <td className="px-5 py-4 text-center">
                          {c.saldo_pendiente > 0 ? (
                            (() => {
                              const diasRestantes = 30 - c.dias_atraso;
                              if (diasRestantes < 0) {
                                return <span className="text-rose-500 font-bold bg-rose-100 dark:bg-rose-900/30 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider">Vencido</span>;
                              }
                              if (diasRestantes <= 7) {
                                return <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-md text-xs">{diasRestantes} d</span>;
                              }
                              return <span className="text-zinc-600 dark:text-zinc-400 font-bold text-xs">{diasRestantes} d</span>;
                            })()
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">{fmtQ(c.total_consumido)}</td>
                        <td className={cn(
                          "px-5 py-4 text-right font-black",
                          c.saldo_pendiente > 0 ? "text-rose-500" : "text-[#8DA78E]"
                        )}>{fmtQ(c.saldo_pendiente)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                            c.estado === "Al día" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500" :
                            c.estado === "Atrasado" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-500" :
                            "bg-[#8DA78E]/10 text-[#8DA78E]"
                          )}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button className="text-zinc-400 group-hover:text-[#8DA78E] transition-colors p-1 rounded-lg hover:bg-[#8DA78E]/10 inline-flex">
                            <ChevronRight className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
          </div>

          {!isLoading && (
            <ModuleTableFooter
              itemCount={creditosOrdenados.length}
              pageSize={pageSize}
              pageSizeOptions={[15, 30, 45]}
              setPageSize={setPageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {clienteSeleccionado && (
          <VerDetalleCredito
            cliente={clienteSeleccionado}
            onClose={() => setClienteSeleccionado(null)}
            onUpdate={() => {
              refetch(); // Invalida el query y recarga Resumen 
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
