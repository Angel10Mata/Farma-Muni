import type { ComercialCompra, Compra } from "./zod";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import {
  ETIQUETA_LABORATORIO_SIN_ASIGNAR,
  esLaboratorioPlaceholder,
  etiquetaFormaFarmaceutica,
  normalizarTextoBusquedaProducto,
} from "@/components/(base)/inventario/lib/helpers";

export type LineaGenericaCompraCampos = {
  catalogo_nombre: string;
  concentracion: string;
  forma_farmaceutica: string;
};

function fragmentoYaEnLinea(linea: string, fragmento: string): boolean {
  const f = fragmento.trim();
  if (!f) return true;
  const t = normalizarTextoBusquedaProducto(linea);
  const n = normalizarTextoBusquedaProducto(f);
  return t.includes(n);
}

export function lineaGenericaCompraDisplay(c: LineaGenericaCompraCampos): string {
  const catalogo = c.catalogo_nombre.trim();
  const conc = c.concentracion.trim();
  const forma = etiquetaFormaFarmaceutica(c.forma_farmaceutica) || c.forma_farmaceutica.trim();
  const base =
    conc && !fragmentoYaEnLinea(catalogo, conc) ? `${catalogo} ${conc}`.trim() : catalogo;
  if (forma && !fragmentoYaEnLinea(base, forma)) {
    return `${base} · ${forma}`;
  }
  return base;
}

export const FACTURA_DUPLICATE_MSG =
  "Esa factura ya fue registrada para este proveedor.";

export function proveedorIdVinculadoComercial(
  comercial: ComercialCompra,
  proveedorPorLaboratorioId: ReadonlyMap<string, string>,
): string | null {
  if (comercial.ultimo_proveedor_id) return comercial.ultimo_proveedor_id;
  if (comercial.laboratorio_id) {
    return proveedorPorLaboratorioId.get(comercial.laboratorio_id) ?? null;
  }
  return null;
}

export type VinculoProveedorCompraCtx = {
  laboratorioIdsDelProveedor: ReadonlySet<string>;
  nombresLaboratorioNormDelProveedor: ReadonlySet<string>;
};

export function buildVinculoProveedorCompraCtx(
  proveedorId: string,
  laboratoriosCatalogo: readonly {
    id: string;
    nombre: string;
    proveedor_id?: string | null;
  }[],
  laboratoriosVinculadosProveedor: readonly { id: string; nombre: string }[] = [],
): VinculoProveedorCompraCtx {
  const laboratorioIdsDelProveedor = new Set<string>();
  const nombresLaboratorioNormDelProveedor = new Set<string>();

  for (const lab of laboratoriosVinculadosProveedor) {
    laboratorioIdsDelProveedor.add(lab.id);
    nombresLaboratorioNormDelProveedor.add(normalizarTextoBusquedaProducto(lab.nombre));
  }

  for (const lab of laboratoriosCatalogo) {
    if (lab.proveedor_id !== proveedorId) continue;
    laboratorioIdsDelProveedor.add(lab.id);
    nombresLaboratorioNormDelProveedor.add(normalizarTextoBusquedaProducto(lab.nombre));
  }

  for (const lab of laboratoriosCatalogo) {
    const norm = normalizarTextoBusquedaProducto(lab.nombre);
    if (nombresLaboratorioNormDelProveedor.has(norm)) {
      laboratorioIdsDelProveedor.add(lab.id);
    }
  }

  return { laboratorioIdsDelProveedor, nombresLaboratorioNormDelProveedor };
}

export function comercialVinculadoAProveedor(
  comercial: ComercialCompra,
  proveedorId: string,
  ctx: VinculoProveedorCompraCtx,
): boolean {
  if (comercial.ultimo_proveedor_id === proveedorId) return true;

  if (
    comercial.laboratorio_id &&
    ctx.laboratorioIdsDelProveedor.has(comercial.laboratorio_id)
  ) {
    return true;
  }

  const nombreLab = comercial.laboratorio_nombre?.trim();
  if (nombreLab) {
    const norm = normalizarTextoBusquedaProducto(nombreLab);
    if (ctx.nombresLaboratorioNormDelProveedor.has(norm)) return true;
  }

  return false;
}

export function comercialesDelProveedor(
  comerciales: ComercialCompra[],
  proveedorId: string,
  ctx: VinculoProveedorCompraCtx,
): ComercialCompra[] {
  return comerciales.filter((c) => comercialVinculadoAProveedor(c, proveedorId, ctx));
}

function resolverNombreLaboratorioVinculoProveedor(
  comercial: ComercialCompra,
  ctx: VinculoProveedorCompraCtx,
  laboratoriosCatalogo: readonly { id: string; nombre: string }[],
): string | null {
  if (comercial.laboratorio_id && ctx.laboratorioIdsDelProveedor.has(comercial.laboratorio_id)) {
    const porId = laboratoriosCatalogo.find((l) => l.id === comercial.laboratorio_id);
    if (porId?.nombre.trim()) return porId.nombre.trim();
  }

  const nombreLab = comercial.laboratorio_nombre?.trim() ?? "";
  if (nombreLab && !esLaboratorioPlaceholder(nombreLab)) {
    const norm = normalizarTextoBusquedaProducto(nombreLab);
    if (ctx.nombresLaboratorioNormDelProveedor.has(norm)) return nombreLab;
  }

  for (const lab of laboratoriosCatalogo) {
    if (!ctx.laboratorioIdsDelProveedor.has(lab.id)) continue;
    if (comercial.laboratorio_id && lab.id === comercial.laboratorio_id) {
      return lab.nombre.trim();
    }
  }

  return null;
}

export type LaboratorioListaCompraInfo = {
  etiqueta: string;
  pendiente: boolean;
};

export function laboratorioListaCompraInfo(
  comercial: ComercialCompra,
  ctx: VinculoProveedorCompraCtx,
  laboratoriosCatalogo: readonly { id: string; nombre: string }[],
): LaboratorioListaCompraInfo {
  const nombreCatalogo = comercial.laboratorio_nombre?.trim() ?? "";
  const nombrePorId =
    comercial.laboratorio_id
      ? (laboratoriosCatalogo.find((l) => l.id === comercial.laboratorio_id)?.nombre?.trim() ?? "")
      : "";

  const nombreEfectivo =
    nombreCatalogo && !esLaboratorioPlaceholder(nombreCatalogo)
      ? nombreCatalogo
      : nombrePorId && !esLaboratorioPlaceholder(nombrePorId)
        ? nombrePorId
        : "";

  if (nombreEfectivo) {
    return { etiqueta: `Laboratorio: ${nombreEfectivo}`, pendiente: false };
  }

  const vinculo = resolverNombreLaboratorioVinculoProveedor(comercial, ctx, laboratoriosCatalogo);
  if (vinculo) {
    return { etiqueta: `Se asignará a: ${vinculo}`, pendiente: true };
  }

  return {
    etiqueta: `Laboratorio: ${ETIQUETA_LABORATORIO_SIN_ASIGNAR}`,
    pendiente: true,
  };
}

export function esEstadoCompraPagado(estado: string | null | undefined): boolean {
  return (estado ?? "").trim().toLowerCase() === "pagado";
}

const CATEGORIAS_PAGO_COMPRA = new Set(["pago_proveedor", "compra"]);

export function totalPagadoCompra(
  finTransacciones: unknown[] | null | undefined,
): number {
  return (
    finTransacciones
      ?.filter(
        (t): t is { categoria?: string; monto?: number } =>
          typeof t === "object" && t !== null,
      )
      .filter((t) => CATEGORIAS_PAGO_COMPRA.has(t.categoria ?? ""))
      .reduce((sum, t) => sum + Number(t.monto ?? 0), 0) ?? 0
  );
}

export function saldoPendienteCompra(compra: {
  total: number;
  fin_transacciones?: unknown[] | null;
}): number {
  const pagado = totalPagadoCompra(compra.fin_transacciones);
  return Math.max(0, (Number(compra.total) || 0) - pagado);
}

export function compraEstaPagada(compra: Compra): boolean {
  const saldo = saldoPendienteCompra(compra);
  return saldo <= 0.009 || esEstadoCompraPagado(compra.estado_pago);
}

export function compraPagoVencido(
  compra: {
    fecha_vencimiento_pago?: string | null;
    total: number;
    fin_transacciones?: unknown[] | null;
    estado_pago?: string | null;
  },
  hoy?: string,
): boolean {
  if (compraEstaPagada(compra as Compra)) return false;
  const vence = compra.fecha_vencimiento_pago?.trim();
  if (!vence) return false;
  const hoyGt = hoy ?? fechaCalendarioGt();
  return vence < hoyGt;
}

export function formatearFechaCompraGt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function resumenCuentasPorPagarDesdeCompras(compras: Compra[]) {
  let totalPendiente = 0;
  let totalVencido = 0;
  const hoy = fechaCalendarioGt();

  for (const c of compras) {
    const saldo = saldoPendienteCompra(c);
    if (saldo <= 0.009) continue;
    totalPendiente += saldo;
    if (compraPagoVencido(c, hoy)) {
      totalVencido += saldo;
    }
  }

  return { totalPendiente, totalVencido };
}

export function resumenCuentasPorPagarDesdeRpc(
  cuentas: {
    saldo_pendiente: number;
    fecha_vencimiento_pago?: string | null;
  }[],
) {
  let totalPendiente = 0;
  let totalVencido = 0;
  const hoy = fechaCalendarioGt();

  for (const c of cuentas) {
    const saldo = Number(c.saldo_pendiente) || 0;
    if (saldo <= 0.009) continue;
    totalPendiente += saldo;
    const vence = c.fecha_vencimiento_pago?.trim();
    if (vence && vence < hoy) {
      totalVencido += saldo;
    }
  }

  return { totalPendiente, totalVencido };
}
