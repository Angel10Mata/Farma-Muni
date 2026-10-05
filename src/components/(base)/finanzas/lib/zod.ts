import { z } from "zod";

// Tipos y categorías del libro mayor
export const TIPOS_MOVIMIENTO = ["ingreso", "egreso"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const CATEGORIAS_INGRESO = ["venta", "abono_cliente"] as const;
export const CATEGORIAS_EGRESO = [
  "compra",
  "pago_proveedor",
  "gasto_fijo",
  "gasto_vario",
] as const;

export type CategoriaIngreso = (typeof CATEGORIAS_INGRESO)[number];
export type CategoriaEgreso = (typeof CATEGORIAS_EGRESO)[number];
export type CategoriaMovimiento = CategoriaIngreso | CategoriaEgreso;

export const CATEGORIA_LABELS: Record<CategoriaMovimiento, string> = {
  venta: "Venta Directa",
  abono_cliente: "Abono de Cliente",
  compra: "Compra / Surtido",
  pago_proveedor: "Pago a Proveedor",
  gasto_fijo: "Gasto Fijo",
  gasto_vario: "Gasto Vario",
};

export const CATEGORIAS_POR_TIPO: Record<TipoMovimiento, readonly string[]> = {
  ingreso: CATEGORIAS_INGRESO,
  egreso: CATEGORIAS_EGRESO,
};

// Schemas de registro
const camposComunes = {
  monto: z
    .number({ message: "El monto debe ser un número." })
    .finite("El monto no es un número válido.")
    .positive("El monto debe ser mayor a cero.")
    .max(1_000_000, "El monto excede el límite permitido para un solo movimiento."),
  descripcion: z
    .string()
    .trim()
    .min(3, "La descripción debe tener al menos 3 caracteres.")
    .max(200, "La descripción es demasiado larga (máx. 200 caracteres)."),
  fecha_movimiento: z.string().datetime({ offset: true }).optional(),
};

const ingresoSchema = z.object({
  tipo_movimiento: z.literal("ingreso"),
  categoria: z.enum(CATEGORIAS_INGRESO, {
    message: "Categoría de ingreso no válida.",
  }),
  venta_id: z.string().uuid("La venta seleccionada no es válida.").nullable().optional(),
  ...camposComunes,
});

const egresoSchema = z.object({
  tipo_movimiento: z.literal("egreso"),
  categoria: z.enum(CATEGORIAS_EGRESO, {
    message: "Categoría de egreso no válida.",
  }),
  compra_id: z.string().uuid("La compra seleccionada no es válida.").nullable().optional(),
  gasto_fijo_id: z.string().uuid("El gasto fijo seleccionado no es válido.").nullable().optional(),
  ...camposComunes,
});

export const registrarMovimientoSchema = z
  .discriminatedUnion("tipo_movimiento", [ingresoSchema, egresoSchema])
  .superRefine((val, ctx) => {
    if (val.categoria === "abono_cliente" && !val.venta_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["venta_id"],
        message: "Debes seleccionar la venta a crédito que se está abonando.",
      });
    }
    if (val.categoria === "pago_proveedor" && !("compra_id" in val && val.compra_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["compra_id"],
        message: "Debes seleccionar la compra que se está pagando.",
      });
    }
  });

export type RegistrarMovimientoInput = z.infer<typeof registrarMovimientoSchema>;

// Tipos de respuesta y listados
export interface TransaccionFinanciera {
  id: string;
  created_at: string;
  fecha_movimiento: string;
  tipo_movimiento: TipoMovimiento;
  categoria: CategoriaMovimiento;
  descripcion: string;
  monto: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  gasto_fijo_id: string | null;
  venta_id: string | null;
  compra_id: string | null;
  usuario_id: string;
}

export interface ResumenFinanciero {
  total_ingresos: number;
  total_egresos: number;
  balance: number;
}

export const FILTROS_TIPO = ["todos", "ingreso", "egreso"] as const;
export type FiltroTipo = (typeof FILTROS_TIPO)[number];

export interface CuentaPorCobrar {
  venta_id: string;
  cliente_id: string;
  cliente_nombre: string;
  numero_recibo: string | null;
  fecha_venta: string;
  total: number;
  total_cobrado: number;
  saldo_pendiente: number;
}

export interface CuentaPorPagar {
  compra_id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  fecha_compra: string;
  total: number;
  total_pagado: number;
  saldo_pendiente: number;
}
