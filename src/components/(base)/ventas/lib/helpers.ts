import type { ItemCarrito, SolicitudRebajaPayload } from "./zod";

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
    const costo = costoUnitarioProducto(item.producto.precio_costo);
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
      precio_costo: costoUnitarioProducto(i.producto.precio_costo),
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
