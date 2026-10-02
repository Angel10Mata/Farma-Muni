import { z } from "zod";

export const ProductoSchema = z.object({
  id: z.string(),
  codigo: z.string().optional(),
  nombre: z.string(),
  descripcion: z.string().optional().default(""),
  precio_base: z.number(),
  stock_actual: z.number(),
  stock_minimo: z.number(),
  imagen_url: z.string().nullable().optional(),
  activo: z.boolean(),
});

export const ClienteSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  nit: z.string(),
  direccion: z.string(),
  telefono: z.string(),
  email: z.string(),
});

export const ItemCarritoSchema = z.object({
  producto: ProductoSchema,
  lote_id: z.string().uuid().optional(),
  codigo_barras_lote: z.string().optional(),
  stock_lote: z.number().optional(),
  precio_costo_lote: z.number().optional(),
  cantidad: z.number(),
  precio_aplicado: z.number(),
  subtotal: z.number(),
});

export const VentaSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  numero_recibo: z.number(),
  cliente_id: z.string().nullable(),
  usuario_id: z.string(),
  tipo_venta: z.string(),
  total: z.number(),
  observaciones: z.string().nullable(),
  ven_clientes: z
    .object({
      nombre: z.string(),
      nit: z.string(),
    })
    .nullable()
    .optional(),
  profiles: z
    .object({
      nombre: z.string(),
    })
    .nullable()
    .optional(),
});

export type Producto = z.infer<typeof ProductoSchema>;
export type Cliente = z.infer<typeof ClienteSchema>;
export type ItemCarrito = z.infer<typeof ItemCarritoSchema>;
export type Venta = z.infer<typeof VentaSchema>;

export const ItemVentaSchema = z.object({
  producto_id: z.string().uuid(),
  lote_id: z.string().uuid().optional().nullable(),
  cantidad: z.number().positive(),
  precio_aplicado: z.number().min(0),
  subtotal: z.number().min(0),
});

export const CrearVentaSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  tipo_venta: z.enum(["Efectivo", "Tarjeta", "Crédito", "Contado", "Transferencia"]),
  total: z.number().min(0),
  observaciones: z.string().nullable().optional(),
  items: z.array(ItemVentaSchema).min(1, "La venta debe contener al menos un producto"),
});

export type ItemVentaInput = z.infer<typeof ItemVentaSchema>;
export type CrearVentaInput = z.infer<typeof CrearVentaSchema>;

export const SolicitudRebajaItemPayloadSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().positive(),
  precio_aplicado: z.number().min(0),
  precio_base: z.number().min(0),
  precio_costo: z.number().min(0).optional(),
  subtotal: z.number().min(0),
  producto_nombre: z.string(),
  producto_codigo: z.string(),
});

export const SolicitudRebajaPayloadSchema = z.object({
  cliente_id: z.string().uuid().nullable(),
  tipo_venta: z.string(),
  total: z.number().min(0),
  observaciones: z.string().nullable(),
  items: z.array(SolicitudRebajaItemPayloadSchema).min(1),
});

export const SolicitudRebajaEstadoSchema = z.enum([
  "pendiente",
  "aprobada",
  "rechazada",
  "expirada",
  "completada",
]);

export const SolicitudRebajaSchema = z.object({
  id: z.string().uuid(),
  solicitante_id: z.string().uuid(),
  estado: SolicitudRebajaEstadoSchema,
  payload: SolicitudRebajaPayloadSchema,
  venta_id: z.string().uuid().nullable().optional(),
  resuelto_por: z.string().uuid().nullable().optional(),
  resuelto_at: z.string().nullable().optional(),
  motivo_rechazo: z.string().nullable().optional(),
  created_at: z.string(),
  profiles: z
    .object({ nombre: z.string().nullable().optional() })
    .nullable()
    .optional(),
});

export type SolicitudRebajaPayload = z.infer<typeof SolicitudRebajaPayloadSchema>;
export type SolicitudRebaja = z.infer<typeof SolicitudRebajaSchema>;

export const CrearSolicitudRebajaSchema = z.object({
  payload: SolicitudRebajaPayloadSchema,
});

export type CrearSolicitudRebajaInput = z.infer<typeof CrearSolicitudRebajaSchema>;

export const VentaBitacoraAccionSchema = z.enum([
  "editar_linea",
  "quitar_linea",
  "anular",
]);

export const VentaBitacoraEntrySchema = z.object({
  id: z.string().uuid(),
  venta_id: z.string().uuid(),
  usuario_id: z.string().uuid(),
  accion: VentaBitacoraAccionSchema,
  motivo: z.string(),
  detalle: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  profiles: z
    .object({ nombre: z.string().nullable().optional() })
    .nullable()
    .optional(),
});

export type VentaBitacoraEntry = z.infer<typeof VentaBitacoraEntrySchema>;

export const MotivoModificacionVentaSchema = z
  .string()
  .trim()
  .min(3, "El motivo debe tener al menos 3 caracteres.");
