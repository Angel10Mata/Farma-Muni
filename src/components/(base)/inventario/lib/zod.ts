import { z } from "zod";

export const productSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  precio_base: z.number().nonnegative("El precio debe ser un número positivo"),
  precio_costo: z.number().nonnegative().optional(),
  stock_actual: z.number().nonnegative("El stock debe ser un número no negativo"),
  stock_minimo: z.number().nonnegative("El stock mínimo debe ser un número no negativo"),
  activo: z.boolean().default(true),
  imagen_url: z.string().nullable().optional(),
  imagen_url_2: z.string().nullable().optional(),
  imagen_url_3: z.string().nullable().optional(),
  proveedor_id: z.string().nullable().optional(),
  ubicacion: z.string().optional(),
  fecha_vencimiento: z.string().nullable().optional(),
  numero_lote: z.string().nullable().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  precio_costo?: number | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  proveedor_id?: string | null;
  inv_proveedores?: { nombre: string } | null;
  created_at?: string;
  imagen_url?: string | null;
  fecha_vencimiento?: string | null;
  numero_lote?: string | null;
  ubicacion?: string | null;
}
