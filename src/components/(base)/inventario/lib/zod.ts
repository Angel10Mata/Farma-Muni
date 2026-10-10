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

export const DUPLICATE_PRODUCTO_MSG = "Ya existe un producto con el mismo nombre genérico";

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

export const productoSugerenciaSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  nombre_generico: z.string(),
  concentracion: z.string(),
  forma_farmaceutica: z.string(),
  presentacion: z.string(),
  precio_base: z.number(),
});

export type ProductoSugerencia = z.infer<typeof productoSugerenciaSchema>;

export const PRODUCTO_WIZARD_PASOS = 4;

export const PRODUCTO_WIZARD_PASOS_META = [
  { titulo: "Identificación" },
  { titulo: "Venta y control" },
  { titulo: "Detalles" },
  { titulo: "Primer lote" },
] as const;

export const EDITAR_PRODUCTO_WIZARD_PASOS = 3;

export const EDITAR_PRODUCTO_WIZARD_PASOS_META = PRODUCTO_WIZARD_PASOS_META.slice(0, 3);

export const motivoInventarioSchema = z
  .string()
  .trim()
  .min(5, "El motivo debe tener al menos 5 caracteres")
  .max(500);

export const tipoMovimientoKardexEnum = z.enum([
  "entrada_compra",
  "entrada_manual",
  "salida_venta",
  "anulacion_venta",
  "ajuste_conteo",
  "baja_vencimiento",
  "devolucion_proveedor",
  "correccion",
]);

export type TipoMovimientoKardex = z.infer<typeof tipoMovimientoKardexEnum>;

export const TIPOS_MOVIMIENTO_KARDEX: {
  value: TipoMovimientoKardex;
  label: string;
}[] = [
  { value: "entrada_compra", label: "Entrada por compra" },
  { value: "entrada_manual", label: "Entrada manual" },
  { value: "salida_venta", label: "Salida por venta" },
  { value: "anulacion_venta", label: "Anulación de venta" },
  { value: "ajuste_conteo", label: "Ajuste por conteo" },
  { value: "baja_vencimiento", label: "Baja por vencimiento" },
  { value: "devolucion_proveedor", label: "Devolución a proveedor" },
  { value: "correccion", label: "Corrección" },
];

export const bajaLoteSchema = z.object({
  lote_id: z.string().uuid(),
  motivo: motivoInventarioSchema,
});

export type BajaLoteInput = z.infer<typeof bajaLoteSchema>;

export const ajustarConteoSchema = z.object({
  lote_id: z.string().uuid(),
  cantidad_contada: z.number().nonnegative("La cantidad contada no puede ser negativa"),
  motivo: motivoInventarioSchema,
});

export type AjustarConteoInput = z.infer<typeof ajustarConteoSchema>;

export const devolverProveedorSchema = z.object({
  lote_id: z.string().uuid(),
  cantidad: z.number().positive("La cantidad debe ser mayor que cero"),
  motivo: motivoInventarioSchema,
});

export type DevolverProveedorInput = z.infer<typeof devolverProveedorSchema>;

export const obtenerKardexSchema = z.object({
  productoId: z.string().uuid().optional(),
  loteId: z.string().uuid().optional(),
  tipo: tipoMovimientoKardexEnum.optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  pagina: z.number().int().positive().optional(),
});

export type ObtenerKardexInput = z.infer<typeof obtenerKardexSchema>;

export const kardexFilaSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  tipo: tipoMovimientoKardexEnum,
  cantidad: z.number(),
  saldo_lote: z.number().nullable(),
  saldo_producto: z.number().nullable(),
  referencia_tipo: z.string().nullable(),
  referencia_id: z.string().uuid().nullable(),
  motivo: z.string().nullable(),
  producto_id: z.string().uuid(),
  producto_nombre: z.string().nullable(),
  producto_nombre_generico: z.string().nullable(),
  producto_concentracion: z.string().nullable(),
  lote_id: z.string().uuid().nullable(),
  lote_numero: z.string().nullable(),
  lote_laboratorio: z.string().nullable(),
  lote_codigo_barras: z.string().nullable(),
  usuario_id: z.string().uuid().nullable(),
  usuario_nombre: z.string().nullable(),
});

export type KardexFila = z.infer<typeof kardexFilaSchema>;

export const bajaVencidoSchema = bajaLoteSchema;

export type BajaVencidoInput = BajaLoteInput;

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

export const productoWizardPaso1Schema = productSchema.pick({
  nombre: true,
  nombre_generico: true,
  concentracion: true,
  forma_farmaceutica: true,
  presentacion: true,
});

export const productoWizardPaso2Schema = productSchema.pick({
  unidad_venta: true,
  requiere_receta: true,
  precio_base: true,
  stock_minimo: true,
});

export const productoWizardLoteSchema = crearLoteManualSchema.omit({ producto_id: true });

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
