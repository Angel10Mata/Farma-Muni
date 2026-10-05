import { z } from "zod";

// Validación de entrada
export const ClienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").trim(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  telefono: z.string().optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  nit: z.string().optional().or(z.literal("")),
});

export type ClienteInput = z.infer<typeof ClienteSchema>;

// Tipos de dominio
export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  nit: string;
  totalCompras: number;
  ultimaCompra: string;
  saldo: number;
  creditosPendientes?: number;
  activo: boolean;
}

export interface VentaCliente {
  id: string;
  created_at: string;
  tipo_venta: string;
  total: number;
  observaciones: string | null;
  fin_transacciones: TransaccionVenta[] | null;
}

export interface TransaccionVenta {
  id: string;
  monto: number;
  fecha_movimiento: string;
  tipo_movimiento: string;
  categoria: string;
}

export interface CuentaPendiente {
  cliente_id: string;
  [key: string]: unknown;
}
