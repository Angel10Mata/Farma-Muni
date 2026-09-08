import { z } from "zod";

export const ProductoSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string(),
  precio_base: z.number(),
  stock_actual: z.number(),
  stock_minimo: z.number(),
  imagen_url: z.string().nullable().optional(),
  imagen_url_2: z.string().nullable().optional(),
  imagen_url_3: z.string().nullable().optional(),
  ubicacion: z.string().optional(),
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
