"use client";

import { useMemo, useState } from "react";
import { FileDown, FileText } from "lucide";
import { Search } from "lucide-react";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  ModuleTableFooter,
  moduleTableBodyClass,
  moduleTableCellClass,
  moduleTableClass,
  moduleTableDesktopScrollClass,
  moduleTableDesktopWrapClass,
  moduleTableEmptyCellClass,
  moduleTableEmptyClass,
  moduleTableHeadCellClass,
  moduleTableHeadRowClass,
  moduleTableRowClass,
  moduleTableSearchClass,
  moduleTableShellClass,
} from "@/components/ui/module-table";
import { toast } from "@/components/ui/general-modal";
import { cn, fmtNum } from "@/lib/utils";
import { inventarioPageShellClass, moduleControlsShellClass } from "@/lib/module-layout";
import { formatFechaHoraTablaGt, fechaCalendarioGt } from "@/lib/fechas-gt";
import { InventarioSubnav } from "./InventarioSubnav";
import { useKardex, useProductos, useLotes } from "./lib/hooks";
import { obtenerKardex } from "./lib/actions";
import { demoKardexMovimientos } from "@/lib/demo/fixtures";
import {
  TIPOS_MOVIMIENTO_KARDEX,
  type TipoMovimientoKardex,
  type KardexFila,
} from "./lib/zod";
import {
  cantidadEntradaSalidaKardex,
  etiquetaTipoMovimientoKardex,
  referenciaKardexTexto,
} from "./lib/kardex-helpers";
import { tituloProductoFarmacia, productoCoincideBusquedaInventario } from "./lib/helpers";
import { descargarReporteKardex } from "./lib/reportes-pdf";

export function VerKardex() {
  const { isDemoMode } = useDemoMode();
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productoId, setProductoId] = useState<string | undefined>();
  const [loteId, setLoteId] = useState<string | undefined>();
  const [tipo, setTipo] = useState<TipoMovimientoKardex | "">("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  const { data: productos = [] } = useProductos();
  const { data: lotes = [] } = useLotes();

  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) return productos.slice(0, 12);
    const q = busquedaProducto.trim().toLowerCase();
    return productos
      .filter(
        (p) =>
          productoCoincideBusquedaInventario(
            { nombre: p.nombre, nombre_generico: p.nombre_generico, codigo: "" },
            busquedaProducto,
          ) || (p.concentracion || "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [productos, busquedaProducto]);

  const productoSeleccionado = productos.find((p) => p.id === productoId);

  const lotesFiltrados = useMemo(() => {
    const base = productoId
      ? lotes.filter((l) => l.producto_id === productoId)
      : lotes;
    return base.slice(0, 80);
  }, [lotes, productoId]);

  const { data, isLoading, isFetching } = useKardex({
    productoId,
    loteId,
    tipo: tipo || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    pagina,
  });

  const filas = data?.filas ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const descargarPdf = async () => {
    try {
      let todas: KardexFila[] = [];
      if (isDemoMode) {
        todas = demoKardexMovimientos({
          productoId,
          loteId,
          tipo: tipo || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          pagina: 1,
          pageSize: 5000,
        }).filas;
      } else {
        let page = 1;
        let more = true;
        while (more) {
          const res = await obtenerKardex({
            productoId,
            loteId,
            tipo: tipo || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
            pagina: page,
          });
          if ("code" in res) throw new Error(res.code);
          todas = todas.concat(res.data.filas);
          more = todas.length < res.data.total;
          page += 1;
          if (page > 40) break;
        }
      }
      descargarReporteKardex(todas, {
        productoLabel: productoSeleccionado?.nombre,
        loteNumero: lotes.find((l) => l.id === loteId)?.numero_lote,
        tipo: tipo || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      });
      toast.success("PDF de kardex descargado.");
    } catch {
      toast.error("No se pudo generar el PDF.");
    }
  };

  return (
    <div className={inventarioPageShellClass}>
      <div className="flex shrink-0 flex-col gap-3 py-0.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <ModuleHeaderBackButton />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8DA78E] dark:text-[#A3BEB0]">
                Módulo
              </p>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none mt-1 truncate">
                Kardex
              </h1>
            </div>
          </div>
          <InventarioSubnav />
        </div>
        <SigetActionButton
          label="Descargar"
          accentColor={sigetAccent.abrir}
          morphFrom={FileText}
          morphTo={FileDown}
          onClick={() => void descargarPdf()}
          className="w-full sm:w-auto self-end"
          ariaLabel="Descargar PDF del kardex"
        />
      </div>

      {productoId && data?.stockProductoActual != null ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            data.saldoCoincide === false
              ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100"
              : "border-[#C1D1C5]/50 bg-[#F5F5F1] text-slate-800 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100",
          )}
        >
          <p>
            Saldo actual del producto: <strong>{fmtNum(data.stockProductoActual)}</strong>
            {data.ultimoSaldoProductoKardex != null ? (
              <>
                {" "}
                · Último saldo en kardex:{" "}
                <strong>{fmtNum(data.ultimoSaldoProductoKardex)}</strong>
              </>
            ) : null}
          </p>
          {data.saldoCoincide === false ? (
            <p className="mt-1 text-xs font-semibold">
              Los saldos no coinciden; revisa movimientos o sincronización de stock.
            </p>
          ) : data.saldoCoincide === true ? (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              Coincide con el último movimiento del kardex.
            </p>
          ) : null}
        </div>
      ) : null}

      <section className={cn(moduleControlsShellClass, "p-3 md:p-4 space-y-3")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8DA78E]/70" />
            <input
              type="text"
              placeholder="Buscar producto por nombre o genérico..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              className={cn(moduleTableSearchClass, "py-2")}
            />
            {busquedaProducto.trim() || !productoId ? (
              <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                {productosFiltrados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800",
                        productoId === p.id && "bg-[#8DA78E]/15 font-bold",
                      )}
                      onClick={() => {
                        setProductoId(p.id);
                        setLoteId(undefined);
                        setPagina(1);
                        setBusquedaProducto(p.nombre);
                      }}
                    >
                      {tituloProductoFarmacia(p)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {productoId ? (
              <button
                type="button"
                className="mt-1 text-[10px] font-bold text-[#2c5f9b] dark:text-[#6f9fd4]"
                onClick={() => {
                  setProductoId(undefined);
                  setBusquedaProducto("");
                  setPagina(1);
                }}
              >
                Quitar filtro de producto
              </button>
            ) : null}
          </div>

          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#8DA78E]">
            Lote
            <select
              value={loteId ?? ""}
              onChange={(e) => {
                setLoteId(e.target.value || undefined);
                setPagina(1);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Todos</option>
              {lotesFiltrados.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.numero_lote} ({fmtNum(l.cantidad_actual)})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#8DA78E]">
            Tipo de movimiento
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoMovimientoKardex | "");
                setPagina(1);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Todos</option>
              {TIPOS_MOVIMIENTO_KARDEX.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#8DA78E]">
            Desde
            <input
              type="date"
              value={desde}
              max={hasta || fechaCalendarioGt()}
              onChange={(e) => {
                setDesde(e.target.value);
                setPagina(1);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-[#8DA78E]">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde}
              max={fechaCalendarioGt()}
              onChange={(e) => {
                setHasta(e.target.value);
                setPagina(1);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>
      </section>

      <div className={moduleTableShellClass}>
        <div className={moduleTableDesktopWrapClass}>
          <div className={moduleTableDesktopScrollClass}>
            <table className={moduleTableClass}>
              <thead>
                <tr className={moduleTableHeadRowClass}>
                  {[
                    "Fecha / hora",
                    "Producto",
                    "Lote",
                    "Tipo",
                    "Entrada",
                    "Salida",
                    "Saldo lote",
                    "Saldo producto",
                    "Usuario",
                    "Motivo / ref.",
                  ].map((h) => (
                    <th key={h} className={moduleTableHeadCellClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={moduleTableBodyClass}>
                {isLoading || isFetching ? (
                  <tr>
                    <td colSpan={10} className={moduleTableEmptyCellClass}>
                      <span className={moduleTableEmptyClass}>Cargando kardex…</span>
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={moduleTableEmptyCellClass}>
                      <span className={moduleTableEmptyClass}>Sin movimientos</span>
                    </td>
                  </tr>
                ) : (
                  filas.map((f) => {
                    const { entrada, salida } = cantidadEntradaSalidaKardex(f.cantidad);
                    return (
                      <tr key={f.id} className={moduleTableRowClass}>
                        <td className={moduleTableCellClass}>
                          {formatFechaHoraTablaGt(f.created_at)}
                        </td>
                        <td className={moduleTableCellClass}>
                          <span className="font-semibold">
                            {f.producto_nombre_generico || f.producto_nombre}
                          </span>
                          {f.producto_concentracion ? (
                            <span className="block text-[10px] text-slate-500">
                              {f.producto_concentracion}
                            </span>
                          ) : null}
                        </td>
                        <td className={moduleTableCellClass}>
                          {f.lote_numero ?? "—"}
                          {f.lote_laboratorio ? (
                            <span className="block text-[10px] text-slate-500">
                              {f.lote_laboratorio}
                            </span>
                          ) : null}
                        </td>
                        <td className={moduleTableCellClass}>
                          {etiquetaTipoMovimientoKardex(f.tipo)}
                        </td>
                        <td
                          className={cn(
                            moduleTableCellClass,
                            entrada != null && "font-bold text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {entrada != null ? `+${fmtNum(entrada)}` : "—"}
                        </td>
                        <td
                          className={cn(
                            moduleTableCellClass,
                            salida != null && "font-bold text-rose-700 dark:text-rose-400",
                          )}
                        >
                          {salida != null ? `−${fmtNum(salida)}` : "—"}
                        </td>
                        <td className={moduleTableCellClass}>
                          {f.saldo_lote != null ? fmtNum(f.saldo_lote) : "—"}
                        </td>
                        <td className={moduleTableCellClass}>
                          {f.saldo_producto != null ? fmtNum(f.saldo_producto) : "—"}
                        </td>
                        <td className={moduleTableCellClass}>
                          {f.usuario_nombre ?? "—"}
                        </td>
                        <td className={moduleTableCellClass}>
                          {referenciaKardexTexto(
                            f.referencia_tipo,
                            f.referencia_id,
                            f.motivo,
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ModuleTableFooter
          itemCount={total}
          pageSize={pageSize}
          pageSizeOptions={[50]}
          setPageSize={() => {}}
          currentPage={pagina}
          totalPages={totalPages}
          onPageChange={setPagina}
        />
      </div>
    </div>
  );
}
