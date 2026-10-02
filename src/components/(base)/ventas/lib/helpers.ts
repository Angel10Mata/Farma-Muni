import type { ItemCarrito, SolicitudRebajaPayload, VentaBitacoraEntry } from "./zod";
import { fechaCalendarioGt } from "@/lib/fechas-gt";

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

/** Precio de venta manual por debajo del precio base (rebaja). */
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

/** Primer error del carrito respecto al costo, o null si todo es válido. */
export function validarCarritoPrecioCosto(carrito: ItemCarrito[]): string | null {
  for (const item of carrito) {
    const costo = costoUnitarioProducto(item.precio_costo_lote);
    if (precioMenorQueCosto(item.precio_aplicado, costo)) {
      return mensajePrecioBajoCosto(item.producto.nombre, costo);
    }
  }
  return null;
}

export function carritoTieneRebajas(carrito: ItemCarrito[]): boolean {
  return carrito.some((item) =>
    esRebajaDePrecio(item.precio_aplicado, item.producto.precio_base),
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
      cantidad: i.cantidad,
      precio_aplicado: i.precio_aplicado,
      precio_base: i.producto.precio_base,
      precio_costo: costoUnitarioProducto(i.precio_costo_lote),
      subtotal: i.subtotal,
      producto_nombre: i.producto.nombre,
      producto_codigo: i.producto.codigo,
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
    items: { producto_id: string; cantidad: number; precio_aplicado: number; subtotal: number }[];
  },
): boolean {
  if (payload.cliente_id !== params.cliente_id) return false;
  if (payload.tipo_venta !== params.tipo_venta) return false;
  if (Math.abs(payload.total - params.total) > 0.01) return false;
  const obsA = (payload.observaciones ?? "").trim();
  const obsB = (params.observaciones ?? "").trim();
  if (obsA !== obsB) return false;
  if (payload.items.length !== params.items.length) return false;

  const sortedPayload = [...payload.items].sort((a, b) =>
    a.producto_id.localeCompare(b.producto_id),
  );
  const sortedVenta = [...params.items].sort((a, b) =>
    a.producto_id.localeCompare(b.producto_id),
  );

  for (let i = 0; i < sortedPayload.length; i++) {
    const p = sortedPayload[i];
    const v = sortedVenta[i];
    if (
      p.producto_id !== v.producto_id ||
      p.cantidad !== v.cantidad ||
      Math.abs(p.precio_aplicado - v.precio_aplicado) > 0.01 ||
      Math.abs(p.subtotal - v.subtotal) > 0.01
    ) {
      return false;
    }
  }
  return true;
}

export function fechaVentaCalendarioGt(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return fechaCalendarioGt(date);
}

export function ventaEsContadoHistorial(tipoVenta: string | null | undefined): boolean {
  const t = (tipoVenta ?? "Contado").trim();
  return ["Efectivo", "Contado", "Transferencia", "Tarjeta"].includes(t);
}

export function ventaEsCreditoHistorial(tipoVenta: string | null | undefined): boolean {
  const t = (tipoVenta ?? "").trim();
  return t === "Crédito" || t.toLowerCase() === "credito";
}

export function ventaCoincideFiltroPagoHistorial(
  tipoVenta: string | null | undefined,
  filtro: "todos" | "contado" | "credito",
): boolean {
  if (filtro === "todos") return true;
  if (filtro === "contado") return ventaEsContadoHistorial(tipoVenta);
  return ventaEsCreditoHistorial(tipoVenta);
}

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
