import { z } from "zod";

export const ProveedorSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable().optional(),
  nit: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  correo: z.string().nullable().optional(),
});

export const ProductoSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  precio_base: z.number(),
  precio_costo: z.number().nullable().optional(),
  stock_actual: z.number(),
  proveedor_id: z.string().nullable().optional(),
});

export const ItemCarritoCompraSchema = z.object({
  producto: ProductoSchema,
  cantidad: z.number(),
  precio_costo: z.number(),
  subtotal: z.number(),
});

export const CompraRecordSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  proveedor_id: z.string(),
  total: z.number(),
  estado_pago: z.string(),
  fecha_pago: z.string().nullable(),
  observaciones: z.string().nullable(),
  fin_transacciones: z.array(z.unknown()).optional(),
  inv_proveedores: z
    .object({
      nombre: z.string(),
      nit: z.string().nullable(),
    })
    .nullable()
    .optional(),
  inv_compras_detalles: z.array(z.unknown()).optional(),
});

export type Proveedor = z.infer<typeof ProveedorSchema>;
export type Producto = z.infer<typeof ProductoSchema>;
export type ItemCarritoCompra = z.infer<typeof ItemCarritoCompraSchema>;
export type Compra = z.infer<typeof CompraRecordSchema>;

export const ProveedorInputSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").trim(),
  descripcion: z.string().nullable().optional().or(z.literal("")),
  nit: z.string().nullable().optional().or(z.literal("")),
  telefono: z.string().nullable().optional().or(z.literal("")),
  correo: z.string().email("Correo inválido").nullable().optional().or(z.literal("")),
});

export type ProveedorInput = z.infer<typeof ProveedorInputSchema>;

export const ItemCompraSchema = z.object({
  producto_id: z.string().min(1),
  cantidad: z.number().positive(),
  precio_costo: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const CompraSchema = z.object({
  proveedor_id: z.string().min(1, "Debe seleccionar un proveedor"),
  total: z.number().nonnegative(),
  estado_pago: z.string().min(1),
  observaciones: z.string().nullable().optional(),
  items: z.array(ItemCompraSchema).min(1, "La compra debe contener al menos un producto"),
});

export type ItemCompraInput = z.infer<typeof ItemCompraSchema>;
export type CompraInput = z.infer<typeof CompraSchema>;
