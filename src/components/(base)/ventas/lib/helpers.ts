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

export function carritoTieneRebajas(carrito: ItemCarrito[]): boolean {
  return carrito.some(
    (item) => item.precio_aplicado !== item.producto.precio_base,
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
