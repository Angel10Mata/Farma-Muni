import { z } from "zod";

// Resumen por cliente
export const CreditoResumenSchema = z.object({
  cliente_id: z.string().uuid(),
  nombre: z.string(),
  nit: z.string(),
  limite_credito: z.string(),
  total_consumido: z.number().min(0),
  saldo_pendiente: z.number().min(0),
  estado: z.enum(["Al día", "Atrasado", "Solventado"]),
  dias_atraso: z.number().min(0),
  credito_vencido: z.boolean().optional(),
  monto_credito_vencido: z.number().min(0).optional(),
});

export type CreditoResumen = z.infer<typeof CreditoResumenSchema>;

// Detalle de ventas a crédito
export const VentaCreditoDetalleSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  tipo_venta: z.string(),
  total: z.number().nullable(),
  observaciones: z.string().nullable(),
  fin_transacciones: z.array(
    z.object({
      id: z.string().uuid(),
      monto: z.number(),
      fecha_movimiento: z.string(),
      tipo_movimiento: z.string(),
      categoria: z.string(),
    })
  ).nullable().optional(),
});

export type VentaCreditoDetalle = z.infer<typeof VentaCreditoDetalleSchema>;
