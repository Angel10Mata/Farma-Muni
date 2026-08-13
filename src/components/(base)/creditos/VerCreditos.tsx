"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CreditCard,
  Search,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import { getSwalThemeOpts } from "@/lib/utils";

import { cn, fmtQ } from "@/lib/utils";
import { Pagination, PageSizeSelect } from "@/components/ui/pagination";
import { useResumenCreditos } from "./lib/hooks";
import { CreditoDetalle } from "./forms/CreditoDetalle";
import type { CreditoResumen } from "./lib/zod";

export function VerCreditos() {
  const [tab, setTab] = useState<"cobrar" | "pagados">("cobrar");

  const [busqueda, setBusqueda] = useState("");
  const [criterioOrden, setCriterioOrden] = useState<"saldo-desc" | "saldo-asc" | "nombre-asc">("saldo-desc");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<CreditoResumen | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: creditos = [], isLoading, refetch } = useResumenCreditos();
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    if (!isLoading && creditos.length > 0 && !hasNotified) {
      const porVencerOCaducados = creditos.filter(c => {
        if (c.saldo_pendiente <= 0) return false;
        const diasRestantes = 30 - c.dias_atraso;
        return diasRestantes <= 7;
      });

      if (porVencerOCaducados.length > 0) {
        Swal.fire({
          title: "¡Atención!",
          text: `Hay ${porVencerOCaducados.length} crédito(s) por vencer (7 días o menos) o ya vencidos.`,
          icon: "warning",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 6000,
          ...getSwalThemeOpts()
        });
      }
      setHasNotified(true);
    }
  }, [creditos, isLoading, hasNotified]);

  const creditosFiltrados = creditos.filter((c) => {
    const isActivo = tab === "cobrar" 
      ? (c.estado !== "Solventado" && c.saldo_pendiente > 0)
      : (c.estado === "Solventado" || c.saldo_pendiente <= 0);
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

  const handleExportarGlobal = () => {
    try {
      const doc = new jsPDF();
      doc.text("Reporte de Créditos", 14, 15);
      
      const tableData = creditosOrdenados.map((c) => {
        const diasRestantes = 30 - c.dias_atraso;
        const limiteStr = c.saldo_pendiente > 0 
          ? (diasRestantes < 0 ? `Vencido (${Math.abs(diasRestantes)} d)` : `${diasRestantes} días`) 
          : "—";

        return [
          c.nombre,
          c.nit,
          limiteStr,
          `${fmtQ(c.total_consumido)}`,
          `${fmtQ(c.saldo_pendiente)}`,
          c.estado
        ];
      });
      
      autoTable(doc, {
        head: [["Cliente", "NIT", "Días Restantes", "Total Consumido", "Saldo Pendiente", "Estado"]],
        body: tableData,
        startY: 22,
        theme: "striped",
        headStyles: { fillColor: [141, 167, 142], textColor: [245, 245, 241], fontStyle: "bold", fontSize: 10 },
      });
      doc.save(`Creditos_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      Swal.fire({ title: "Error", text: "No se pudo generar PDF", icon: "error", ...getSwalThemeOpts() });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 px-2 pt-32 pb-8 md:px-4 md:pt-28 relative mt-4 md:mt-8 min-h-screen">
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4">
          <div className="shrink-0 size-12 rounded-2xl bg-[#8DA78E]/10 border border-[#8DA78E]/20 flex items-center justify-center">
             <CreditCard className="size-6 text-[#8DA78E] dark:text-[#A3BEB0]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">Finanzas</p>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">
              Control de Créditos
            </h1>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex w-fit bg-[#8DA78E]/5 p-1 rounded-xl border border-[#8DA78E]/10">
          <button
            type="button"
            onClick={() => setTab("cobrar")}
            className={cn(
              "px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              tab === "cobrar"
                ? "bg-white dark:bg-[#525D53] text-[#8DA78E] dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Por Cobrar
          </button>
          <button
            type="button"
            onClick={() => setTab("pagados")}
            className={cn(
              "px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
              tab === "pagados"
                ? "bg-white dark:bg-[#525D53] text-[#8DA78E] dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Pagados
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="size-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar cliente por nombre o NIT..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/40 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={criterioOrden}
              onChange={(e) => setCriterioOrden(e.target.value as any)}
              className="w-full md:w-auto px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#8DA78E]/40 cursor-pointer"
            >
              <option value="saldo-desc">Mayor Saldo Pendiente</option>
              <option value="saldo-asc">Menor Saldo Pendiente</option>
              <option value="nombre-asc">Nombre (A-Z)</option>
            </select>
            <button
              onClick={handleExportarGlobal}
              className="px-4 py-2.5 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl whitespace-nowrap shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Exportar
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8DA78E]"></div>
            </div>
          ) : paginatedCreditos.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
              <CreditCard className="size-12 mb-3 opacity-20" />
              <p className="text-sm font-bold">No se encontraron créditos</p>
            </div>
          ) : (
            <>
              {/* Vista Móvil (Tarjetas) */}
              <div className="grid grid-cols-1 md:hidden gap-4 p-4">
                {paginatedCreditos.map((c) => (
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
                ))}
              </div>

              {/* Vista Desktop (Tabla) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-black uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                      <th className="px-5 py-3.5">Cliente</th>
                      <th className="px-5 py-3.5">NIT</th>
                      <th className="px-5 py-3.5 text-center">Días Restantes</th>
                      <th className="px-5 py-3.5 text-right">Consumido</th>
                      <th className="px-5 py-3.5 text-right">Saldo Pendiente</th>
                      <th className="px-5 py-3.5 text-center">Estado</th>
                      <th className="px-5 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                    {paginatedCreditos.map((c) => (
                      <tr 
                        key={c.cliente_id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
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
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <PageSizeSelect pageSize={pageSize} setPageSize={setPageSize} />
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {clienteSeleccionado && (
          <CreditoDetalle
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
