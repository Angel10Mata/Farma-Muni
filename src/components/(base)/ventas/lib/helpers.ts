import type { ItemCarrito, Producto, SolicitudRebajaPayload, VentaBitacoraEntry } from "./zod";
import { fechaCalendarioGt } from "@/lib/fechas-gt";
import type { LoteAsignadoVenta } from "./lotes-venta";

// Formato del recibo
export const obtenerCodigoRecibo = (id: string) => {
  if (!id) return "N/A";
  const cleanId = id.replace(/-/g, "").toUpperCase();
  return `${cleanId.substring(0, 3)}-${cleanId.substring(3, 6)}`;
};

export const formatFechaRecibo = (dateStr: string) => {
  const date = new Date(dateStr);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const dias = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
  ];

  return `${date.getDate()} de ${meses[date.getMonth()]}, ${dias[date.getDay()]}`;
};

export const formatMonedaRecibo = (value: number) =>
  `Q${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PRECIO_EPSILON = 0.001;

// Precios y rebajas
export function esRebajaDePrecio(precioAplicado: number, precioBase: number): boolean {
  return precioAplicado < precioBase - PRECIO_EPSILON;
}

export function costoUnitarioProducto(precioCosto?: number | null): number {
  return Math.max(0, Number(precioCosto) || 0);
}

export function precioMenorQueCosto(
  precioAplicado: number,
  precioCosto?: number | null,
): boolean {
  const costo = costoUnitarioProducto(precioCosto);
  return precioAplicado < costo - PRECIO_EPSILON;
}

export function mensajePrecioBajoCosto(nombre: string, costo: number): string {
  return `El precio de "${nombre}" no puede ser menor al costo (Q${costo.toFixed(2)}).`;
}

export function validarCarritoPrecioCosto(carrito: ItemCarrito[]): string | null {
  for (const item of carrito) {
    const costo = costoUnitarioProducto(item.precio_costo_lote);
    if (precioMenorQueCosto(item.precio_aplicado, costo)) {
      return mensajePrecioBajoCosto(item.producto.nombre, costo);
    }
  }
  return null;
}

export function precioReferenciaRebajaItem(item: ItemCarrito): number {
  return item.precio_venta_lote;
}

export function precioReferenciaRebajaPayload(item: {
  precio_venta_referencia?: number;
  precio_base?: number;
}): number {
  return item.precio_venta_referencia ?? item.precio_base ?? 0;
}

export function etiquetaPrecioPos(producto: Producto): string {
  if (producto.precio_venta_varios && producto.precio_venta_desde != null) {
    return `desde ${formatMonedaRecibo(producto.precio_venta_desde)}`;
  }
  const precio = producto.precio_venta_fefo ?? producto.precio_base;
  return formatMonedaRecibo(precio);
}

export function productoCoincideBusquedaPos(producto: Producto, query: string): boolean {
  const q = query.toLowerCase();
  return (
    (producto.nombre || "").toLowerCase().includes(q) ||
    (producto.nombre_generico || "").toLowerCase().includes(q) ||
    (producto.codigo || "").toLowerCase().includes(q)
  );
}

export function demoAsignarLotes(producto: Producto, cantidad: number): LoteAsignadoVenta[] | null {
  if (cantidad <= 0) return null;
  if (cantidad > producto.stock_actual) return null;
  const precio = producto.precio_venta_fefo ?? producto.precio_base;
  return [
    {
      lote_id: `demo-lote-${producto.id}`,
      cantidad,
      stock_lote: producto.stock_actual,
      precio_venta: precio,
      precio_costo: Math.round(precio * 0.65 * 100) / 100,
      codigo_barras: producto.codigo ?? `DEMO-${producto.id}`,
      laboratorio: null,
    },
  ];
}

export function carritoTieneRebajas(carrito: ItemCarrito[]): boolean {
  return carrito.some((item) =>
    esRebajaDePrecio(item.precio_aplicado, precioReferenciaRebajaItem(item)),
  );
}

export function buildSolicitudRebajaPayload(params: {
  carrito: ItemCarrito[];
  cliente_id: string | null;
  tipo_venta: string;
  total: number;
  observaciones: string | null;
}): SolicitudRebajaPayload {
  return {
    cliente_id: params.cliente_id,
    tipo_venta: params.tipo_venta,
    total: params.total,
    observaciones: params.observaciones,
    items: params.carrito.map((i) => ({
      producto_id: i.producto.id,
      lote_id: i.lote_id,
      cantidad: i.cantidad,
      precio_aplicado: i.precio_aplicado,
      precio_venta_referencia: i.precio_venta_lote,
      precio_base: i.precio_venta_lote,
      precio_costo: costoUnitarioProducto(i.precio_costo_lote),
      subtotal: i.subtotal,
      producto_nombre: i.producto.nombre,
      producto_codigo: i.codigo_barras_lote ?? i.producto.codigo ?? "",
    })),
  };
}

export function payloadCoincideConVenta(
  payload: SolicitudRebajaPayload,
  params: {
    cliente_id: string | null;
    tipo_venta: string;
    total: number;
    observaciones: string | null;
    items: {
      producto_id: string;
      lote_id?: string | null;
      cantidad: number;
      precio_aplicado: number;
      subtotal: number;
    }[];
  },
): boolean {
  if (payload.cliente_id !== params.cliente_id) return false;
  if (payload.tipo_venta !== params.tipo_venta) return false;
  if (Math.abs(payload.total - params.total) > 0.01) return false;
  const obsA = (payload.observaciones ?? "").trim();
  const obsB = (params.observaciones ?? "").trim();
  if (obsA !== obsB) return false;
  if (payload.items.length !== params.items.length) return false;

  const claveLinea = (x: {
    producto_id: string;
    lote_id?: string | null;
    cantidad: number;
    precio_aplicado: number;
    subtotal: number;
  }) =>
    `${x.producto_id}\0${x.lote_id ?? ""}\0${x.cantidad}\0${x.precio_aplicado}\0${x.subtotal}`;

  const sortedPayload = [...payload.items].sort((a, b) =>
    claveLinea({ ...a, lote_id: a.lote_id }).localeCompare(
      claveLinea({ ...b, lote_id: b.lote_id }),
    ),
  );
  const sortedVenta = [...params.items].sort((a, b) =>
    claveLinea({ ...a, lote_id: a.lote_id }).localeCompare(
      claveLinea({ ...b, lote_id: b.lote_id }),
    ),
  );

  if (sortedPayload.length !== sortedVenta.length) return false;

  for (let i = 0; i < sortedPayload.length; i++) {
    const p = sortedPayload[i];
    const v = sortedVenta[i];
    if (
      p.producto_id !== v.producto_id ||
      (p.lote_id ?? null) !== (v.lote_id ?? null) ||
      p.cantidad !== v.cantidad ||
      Math.abs(p.precio_aplicado - v.precio_aplicado) > 0.01 ||
      Math.abs(p.subtotal - v.subtotal) > 0.01
    ) {
      return false;
    }
  }
  return true;
}

// Historial de ventas
export function fechaVentaCalendarioGt(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return fechaCalendarioGt(date);
}

function claveTipoVentaHistorial(tipoVenta: string | null | undefined): string {
  return (tipoVenta ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function ventaEsCreditoHistorial(tipoVenta: string | null | undefined): boolean {
  return claveTipoVentaHistorial(tipoVenta) === "credito";
}

export function ventaEsContadoHistorial(tipoVenta: string | null | undefined): boolean {
  if (ventaEsCreditoHistorial(tipoVenta)) return false;
  const key = claveTipoVentaHistorial(tipoVenta) || "contado";
  return ["efectivo", "contado", "transferencia", "tarjeta"].includes(key);
}

export function etiquetaTipoVentaHistorial(tipoVenta: string | null | undefined): string {
  if (ventaEsCreditoHistorial(tipoVenta)) return "Crédito";
  if (ventaEsContadoHistorial(tipoVenta)) {
    const raw = (tipoVenta ?? "").trim();
    if (["Tarjeta", "Transferencia", "Efectivo"].includes(raw)) return raw;
    return "Contado";
  }
  const raw = (tipoVenta ?? "").trim();
  return raw || "—";
}

export function ventaCoincideFiltroPagoHistorial(
  tipoVenta: string | null | undefined,
  filtro: "todos" | "contado" | "credito",
): boolean {
  if (filtro === "todos") return true;
  if (filtro === "contado") return ventaEsContadoHistorial(tipoVenta);
  return ventaEsCreditoHistorial(tipoVenta);
}

export function ventaEstaAnulada(venta: {
  observaciones?: string | null;
  anulada?: boolean | null;
}): boolean {
  if (venta.anulada === true) return true;
  return (venta.observaciones ?? "").includes("[ANULADA]");
}

export function ventaEsTarjetaHistorial(
  tipoVenta: string | null | undefined,
): boolean {
  return claveTipoVentaHistorial(tipoVenta) === "tarjeta";
}

export function ventaPerteneceMesCalendarioGt(
  createdAt: string,
  year: number,
  month: number,
): boolean {
  const fecha = fechaVentaCalendarioGt(createdAt);
  if (!fecha) return false;
  const mes = `${year}-${String(month).padStart(2, "0")}`;
  return fecha.slice(0, 7) === mes;
}

export function resolverMesExportacionVentas(params: {
  tipoFiltroFecha: "dia" | "semana" | "rango";
  fechaDia: string;
  activeYear: number;
  activeMonth: number;
}): { year: number; month: number } {
  if (params.tipoFiltroFecha === "semana") {
    return { year: params.activeYear, month: params.activeMonth + 1 };
  }
  const base =
    params.tipoFiltroFecha === "dia" && params.fechaDia
      ? params.fechaDia
      : fechaCalendarioGt();
  const year = Number(base.slice(0, 4));
  const month = Number(base.slice(5, 7));
  return { year, month };
}

// Bitácora de cambios
export function resumenAccionBitacoraVenta(entry: Pick<VentaBitacoraEntry, "accion" | "detalle">): string {
  const det = entry.detalle ?? {};
  const nombre =
    typeof det.producto_nombre === "string" && det.producto_nombre.trim()
      ? det.producto_nombre
      : "Producto";

  if (entry.accion === "quitar_linea") {
    const cant =
      typeof det.cantidad_devuelta === "number" ? det.cantidad_devuelta : null;
    return cant != null ? `Quitó ${nombre} (${cant} ud.)` : `Quitó ${nombre}`;
  }

  if (entry.accion === "editar_linea") {
    const cantAnt = typeof det.cantidad_anterior === "number" ? det.cantidad_anterior : null;
    const cantNueva = typeof det.cantidad_nueva === "number" ? det.cantidad_nueva : null;
    if (cantAnt != null && cantNueva != null) {
      return `Editó ${nombre}: ${cantAnt} → ${cantNueva} ud.`;
    }
    return `Editó línea: ${nombre}`;
  }

  return "Anuló la venta completa";
}
