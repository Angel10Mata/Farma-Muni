import { z } from "zod";

export const formaFarmaceuticaEnum = z.enum([
  "tableta",
  "capsula",
  "jarabe",
  "suspension",
  "crema",
  "inyectable",
  "gotas",
  "otro",
]);

export type FormaFarmaceutica = z.infer<typeof formaFarmaceuticaEnum>;

export const FORMAS_FARMACEUTICAS: { value: FormaFarmaceutica; label: string }[] = [
  { value: "tableta", label: "Tableta" },
  { value: "capsula", label: "Cápsula" },
  { value: "jarabe", label: "Jarabe" },
  { value: "suspension", label: "Suspensión" },
  { value: "crema", label: "Crema" },
  { value: "inyectable", label: "Inyectable" },
  { value: "gotas", label: "Gotas" },
  { value: "otro", label: "Otro" },
];

export const DUPLICATE_PRODUCTO_MSG =
  "Ya existe un producto con el mismo genérico, concentración, forma y presentación";

export const DUPLICATE_LOTE_MSG =
  "Ya existe un lote con ese código de barras y número de lote";

// Producto del catálogo
export const productSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  nombre_generico: z.string().trim().min(2, "El nombre genérico es requerido"),
  concentracion: z.string().trim().min(1, "La concentración es requerida"),
  forma_farmaceutica: formaFarmaceuticaEnum,
  presentacion: z.string().trim().min(1, "La presentación es requerida"),
  unidad_venta: z.string().trim().default("unidad"),
  requiere_receta: z.boolean().default(false),
  descripcion: z.string().optional(),
  precio_base: z.number().nonnegative("El precio debe ser un número positivo"),
  stock_minimo: z.number().nonnegative("El stock mínimo debe ser un número no negativo"),
  activo: z.boolean().default(true),
  imagen_url: z.string().nullable().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const bajaVencidoSchema = z.object({
  lote_id: z.string().uuid(),
  notas: z.string().trim().max(300).optional(),
});

export type BajaVencidoInput = z.infer<typeof bajaVencidoSchema>;

// Lotes y bajas
export const crearLoteManualSchema = z.object({
  producto_id: z.string().uuid(),
  proveedor_id: z.string().uuid("Debe seleccionar un proveedor"),
  codigo_barras: z.string().trim().min(1, "El código de barras es requerido"),
  numero_lote: z.string().trim().min(1, "El número de lote es requerido"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio_costo: z.number().nonnegative("El costo debe ser un número válido"),
  precio_venta: z.number().nonnegative("El precio de venta debe ser un número válido"),
  laboratorio: z.string().trim().optional().nullable(),
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
  precio_venta: z.number().optional(),
  proveedor_id: z.string().uuid().nullable().optional(),
  laboratorio: z.string().nullable().optional(),
  fecha_vencimiento: z.string(),
  ubicacion: z.string().nullable().optional(),
  activo: z.boolean(),
  inv_proveedores: z.object({ nombre: z.string() }).nullable().optional(),
  inv_productos: z
    .object({
      id: z.string(),
      nombre: z.string(),
      nombre_generico: z.string().optional(),
      concentracion: z.string().optional(),
      forma_farmaceutica: z.string().optional(),
      presentacion: z.string().optional(),
      unidad_venta: z.string().optional(),
      requiere_receta: z.boolean().optional(),
      precio_base: z.number(),
      stock_minimo: z.number(),
      stock_actual: z.number(),
      activo: z.boolean(),
    })
    .nullable()
    .optional(),
});

export type LoteInventario = z.infer<typeof loteInventarioSchema>;

// Tipos de lectura
export interface Producto {
  id: string;
  nombre: string;
  nombre_generico: string;
  concentracion: string;
  forma_farmaceutica: FormaFarmaceutica | string;
  presentacion: string;
  unidad_venta: string;
  requiere_receta: boolean;
  descripcion: string;
  precio_base: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  created_at?: string;
  imagen_url?: string | null;
}
