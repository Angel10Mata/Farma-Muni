import { z } from "zod";

// Proveedores
export const ProveedorSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable().optional(),
  nit: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  correo: z.string().nullable().optional(),
});

// Productos y carrito
export const ProductoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  precio_base: z.number(),
  stock_actual: z.number(),
  activo: z.boolean().optional(),
  ultimo_proveedor_id: z.string().nullable().optional(),
});

export const ItemCarritoCompraSchema = z.object({
  producto: ProductoSchema,
  codigo_barras: z.string().min(1, "Código de barras obligatorio"),
  numero_lote: z.string().min(1, "Número de lote obligatorio"),
  fecha_vencimiento: z.string().min(1, "Fecha de vencimiento obligatoria"),
  ubicacion: z.string().nullable().optional(),
  cantidad: z.number(),
  precio_costo: z.number(),
  precio_venta: z.number().nonnegative(),
  laboratorio: z.string().nullable().optional(),
  subtotal: z.number(),
});

export const CompraRecordSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  proveedor_id: z.string(),
  total: z.number(),
  estado_pago: z.string(),
  fecha_pago: z.string().nullable(),
  numero_factura: z.string().nullable().optional(),
  fecha_vencimiento_pago: z.string().nullable().optional(),
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

// Tipos
export type Proveedor = z.infer<typeof ProveedorSchema>;
export type Producto = z.infer<typeof ProductoSchema>;
export type ItemCarritoCompra = z.infer<typeof ItemCarritoCompraSchema>;
export type Compra = z.infer<typeof CompraRecordSchema>;

// Entrada de formularios
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
  codigo_barras: z.string().min(1, "El código de barras del lote es obligatorio"),
  numero_lote: z.string().min(1, "Número de lote obligatorio"),
  fecha_vencimiento: z.string().min(1, "Fecha de vencimiento obligatoria"),
  ubicacion: z.string().nullable().optional(),
  cantidad: z.number().positive(),
  precio_costo: z.number().nonnegative(),
  precio_venta: z.number().nonnegative(),
  laboratorio: z.string().nullable().optional(),
  subtotal: z.number().nonnegative(),
});

export const CompraSchema = z
  .object({
    proveedor_id: z.string().min(1, "Debe seleccionar un proveedor"),
    total: z.number().nonnegative(),
    estado_pago: z.string().min(1),
    numero_factura: z.string().trim().min(1, "El número de factura es obligatorio"),
    fecha_vencimiento_pago: z.string().nullable().optional(),
    observaciones: z.string().nullable().optional(),
    items: z.array(ItemCompraSchema).min(1, "La compra debe contener al menos un producto"),
  })
  .superRefine((val, ctx) => {
    const pagado = val.estado_pago.trim().toLowerCase() === "pagado";
    if (!pagado && !val.fecha_vencimiento_pago?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fecha_vencimiento_pago"],
        message: "La fecha de vencimiento de pago es obligatoria para compras a crédito.",
      });
    }
  });

export type ItemCompraInput = z.infer<typeof ItemCompraSchema>;
export type CompraInput = z.infer<typeof CompraSchema>;
