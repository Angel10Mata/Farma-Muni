import { z } from "zod";

export const productSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().optional(),
  precio_base: z.number().nonnegative("El precio debe ser un número positivo"),
  stock_minimo: z.number().nonnegative("El stock mínimo debe ser un número no negativo"),
  activo: z.boolean().default(true),
  imagen_url: z.string().nullable().optional(),
  proveedor_id: z.string().nullable().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const bajaVencidoSchema = z.object({
  lote_id: z.string().uuid(),
  notas: z.string().trim().max(300).optional(),
});

export type BajaVencidoInput = z.infer<typeof bajaVencidoSchema>;

export const crearLoteManualSchema = z.object({
  producto_id: z.string().uuid(),
  codigo_barras: z.string().trim().min(1, "El código de barras es requerido"),
  numero_lote: z.string().trim().min(1, "El número de lote es requerido"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio_costo: z.number().nonnegative("El costo debe ser un número válido"),
  fecha_vencimiento: z.string().trim().min(1, "La fecha de vencimiento es requerida"),
  ubicacion: z.string().trim().optional().nullable(),
});

export type CrearLoteManualInput = z.infer<typeof crearLoteManualSchema>;

export const loteInventarioSchema = z.object({
  id: z.string().uuid(),
  producto_id: z.string().uuid(),
  compra_detalle_id: z.string().uuid().nullable().optional(),
  codigo_barras: z.string(),
  numero_lote: z.string(),
  cantidad_inicial: z.number(),
  cantidad_actual: z.number(),
  precio_costo: z.number(),
  fecha_vencimiento: z.string(),
  ubicacion: z.string().nullable().optional(),
  activo: z.boolean(),
  inv_productos: z
    .object({
      id: z.string(),
      nombre: z.string(),
      precio_base: z.number(),
      stock_minimo: z.number(),
      stock_actual: z.number(),
      activo: z.boolean(),
      inv_proveedores: z.object({ nombre: z.string() }).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type LoteInventario = z.infer<typeof loteInventarioSchema>;

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  proveedor_id?: string | null;
  inv_proveedores?: { nombre: string } | null;
  created_at?: string;
  imagen_url?: string | null;
}
