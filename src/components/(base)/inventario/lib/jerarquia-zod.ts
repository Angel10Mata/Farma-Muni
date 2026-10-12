import { z } from "zod";
import { formaFarmaceuticaEnum, type FormaFarmaceutica } from "./zod";

export const DUPLICATE_CATALOGO_MSG =
  "Ya existe un catálogo con ese principio activo (nombre)";

export const DUPLICATE_GENERICO_MSG =
  "Ya existe un genérico con la misma concentración y forma farmacéutica en este catálogo";

export const DUPLICATE_LABORATORIO_MSG = "Ya existe un laboratorio con ese nombre";

export const DUPLICATE_COMERCIAL_MSG =
  "Ya existe un producto comercial con el mismo genérico, laboratorio, nombre y presentación";

export const invCatalogoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable().optional(),
  activo: z.boolean(),
  created_at: z.string().optional(),
});

export type InvCatalogo = z.infer<typeof invCatalogoSchema>;

export const invCatalogoResumenSchema = invCatalogoSchema.extend({
  genericos: z.number(),
  stock_vendible: z.number(),
});

export type InvCatalogoResumen = z.infer<typeof invCatalogoResumenSchema>;

export const invLaboratorioSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  activo: z.boolean(),
  proveedor_id: z.string().uuid().nullable().optional(),
  proveedor_nombre: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export type InvLaboratorio = z.infer<typeof invLaboratorioSchema>;

export const invGenericoSchema = z.object({
  generico_id: z.string().uuid(),
  catalogo_id: z.string().uuid(),
  catalogo_nombre: z.string(),
  concentracion: z.string(),
  forma_farmaceutica: z.union([formaFarmaceuticaEnum, z.string()]),
  generico_nombre: z.string(),
  requiere_receta: z.boolean(),
  stock_minimo: z.number(),
  activo: z.boolean(),
  comerciales: z.number(),
  comerciales_con_stock: z.number(),
  stock_vendible: z.number(),
  precio_desde: z.number().nullable(),
  bajo_minimo: z.boolean(),
});

export type InvGenerico = z.infer<typeof invGenericoSchema>;

export const invGenericoResumenSchema = z.object({
  generico_id: z.string().uuid(),
  generico_nombre: z.string().optional(),
  concentracion: z.string().optional(),
  forma_farmaceutica: z.union([formaFarmaceuticaEnum, z.string()]).optional(),
  requiere_receta: z.boolean().optional(),
  unidad_venta: z.string().optional(),
  stock_minimo: z.number().optional(),
  generico_activo: z.boolean().optional(),
});

export type InvGenericoResumen = z.infer<typeof invGenericoResumenSchema>;

export const invLaboratorioResumenSchema = invLaboratorioSchema.pick({
  id: true,
  nombre: true,
});

export type InvLaboratorioResumen = z.infer<typeof invLaboratorioResumenSchema>;

export const productoComercialSchema = z.object({
  producto_id: z.string().uuid(),
  nombre_comercial: z.string(),
  presentacion: z.string(),
  precio_venta: z.number(),
  imagen_url: z.string().nullable().optional(),
  activo: z.boolean(),
  generico_id: z.string().uuid(),
  generico_nombre: z.string(),
  requiere_receta: z.boolean(),
  catalogo_id: z.string().uuid(),
  catalogo_nombre: z.string(),
  laboratorio_id: z.string().uuid(),
  laboratorio_nombre: z.string(),
  stock_vendible: z.number(),
  proximo_vencimiento: z.string().nullable(),
  lotes_vendibles: z.number(),
  concentracion: z.string(),
  forma_farmaceutica: z.union([formaFarmaceuticaEnum, z.string()]),
  unidad_venta: z.string(),
  stock_minimo: z.number(),
  generico_activo: z.boolean(),
  descripcion: z.string().nullable().optional(),
  created_at: z.string().optional(),
  generico: invGenericoResumenSchema.optional(),
  laboratorio: invLaboratorioResumenSchema.optional(),
});

export type ProductoComercial = z.infer<typeof productoComercialSchema>;

export const loteJerarquiaSchema = z.object({
  id: z.string().uuid(),
  producto_id: z.string().uuid(),
  compra_detalle_id: z.string().uuid().nullable().optional(),
  codigo_barras: z.string(),
  numero_lote: z.string(),
  cantidad_inicial: z.number(),
  cantidad_actual: z.number(),
  precio_costo: z.number(),
  proveedor_id: z.string().uuid().nullable().optional(),
  fecha_vencimiento: z.string(),
  ubicacion: z.string().nullable().optional(),
  activo: z.boolean(),
});

export type LoteJerarquia = z.infer<typeof loteJerarquiaSchema>;

export const catalogoInputSchema = z.object({
  nombre: z.string().trim().min(2, "El principio activo es requerido"),
  descripcion: z.string().nullable().optional(),
  activo: z.boolean().default(true),
});

export type CatalogoInput = z.infer<typeof catalogoInputSchema>;

export const genericoInputSchema = z.object({
  catalogo_id: z.string().uuid("Debe seleccionar un catálogo"),
  concentracion: z.string().trim().min(1, "La concentración es requerida"),
  forma_farmaceutica: formaFarmaceuticaEnum,
  requiere_receta: z.boolean().default(false),
  unidad_venta: z.string().trim().min(1).default("unidad"),
  stock_minimo: z.number().nonnegative("El stock mínimo debe ser un número no negativo"),
  activo: z.boolean().default(true),
});

export type GenericoInput = z.infer<typeof genericoInputSchema>;

export const laboratorioInputSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre del laboratorio es requerido"),
  activo: z.boolean().default(true),
  proveedor_id: z.string().uuid().nullable().optional(),
});

export type LaboratorioInput = z.infer<typeof laboratorioInputSchema>;

export const laboratorioCreateInputSchema = laboratorioInputSchema.extend({
  proveedor_id: z.string().uuid("Debe seleccionar un proveedor"),
});

export type LaboratorioCreateInput = z.infer<typeof laboratorioCreateInputSchema>;

export const laboratorioUpdateInputSchema = laboratorioInputSchema.extend({
  proveedor_id: z
    .string()
    .uuid("Debe seleccionar un proveedor")
    .nullable()
    .optional(),
});

export type LaboratorioUpdateInput = z.infer<typeof laboratorioUpdateInputSchema>;

export const crearProveedorYLaboratorioInputSchema = z.object({
  proveedor: z.object({
    nombre: z.string().min(1, "El nombre es requerido").trim(),
    descripcion: z.string().nullable().optional().or(z.literal("")),
    nit: z.string().nullable().optional().or(z.literal("")),
    telefono: z.string().nullable().optional().or(z.literal("")),
    correo: z.string().email("Correo inválido").nullable().optional().or(z.literal("")),
  }),
  laboratorio: z.object({
    nombre: z.string().trim().min(2, "El nombre del laboratorio es requerido"),
    activo: z.boolean().default(true),
  }),
});

export type CrearProveedorYLaboratorioInput = z.infer<
  typeof crearProveedorYLaboratorioInputSchema
>;

export const comercialInputSchema = z.object({
  generico_id: z.string().uuid("Debe seleccionar un genérico"),
  laboratorio_id: z.string().uuid("Debe seleccionar un laboratorio"),
  nombre_comercial: z.string().trim().min(1, "El nombre comercial es requerido"),
  presentacion: z.string().trim().min(1, "La presentación es requerida"),
  precio_venta: z.number().nonnegative("El precio debe ser un número no negativo"),
  activo: z.boolean().default(true),
  descripcion: z.string().nullable().optional(),
  imagen_url: z.string().nullable().optional(),
});

export type ComercialInput = z.infer<typeof comercialInputSchema>;

export const inventarioJerarquiaFiltrosSchema = z.object({
  catalogo_id: z.string().uuid().optional(),
  generico_id: z.string().uuid().optional(),
  laboratorio_id: z.string().uuid().optional(),
  producto_id: z.string().uuid().optional(),
});

export type InventarioJerarquiaFiltros = z.infer<typeof inventarioJerarquiaFiltrosSchema>;

export const jerarquiaWizardLoteSchema = z.object({
  proveedor_id: z.string().uuid("Debe seleccionar un proveedor"),
  codigo_barras: z.string().trim().min(1, "El código de barras es requerido"),
  numero_lote: z.string().trim().min(1, "El número de lote es requerido"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio_costo: z.number().nonnegative("El costo debe ser un número válido"),
  fecha_vencimiento: z.string().trim().min(1, "La fecha de vencimiento es requerida"),
  ubicacion: z.string().trim().optional().nullable(),
});

export type JerarquiaWizardLoteInput = z.infer<typeof jerarquiaWizardLoteSchema>;

export type { FormaFarmaceutica };
