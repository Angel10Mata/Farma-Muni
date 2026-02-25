import { z } from "zod";

// --- ESQUEMA PARA PRODUCTOS ---
export const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
  stock: z.coerce.number().int().nonnegative().default(0),
  stock_minimo: z.coerce.number().int().nonnegative().default(5), // Tu nuevo campo de alerta
});

// --- ESQUEMA PARA CLIENTES ---
export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido").optional().or(z.literal('')),
  telefono: z.string().min(1, "El teléfono es obligatorio"),
  direccion: z.string().optional(),
});

// Agrega esto al final de src/lib/schemas.ts
export const ventaSchema = z.object({
  cliente_id: z.string().uuid("Debes seleccionar un cliente"),
  producto_id: z.string().uuid("Debes seleccionar un producto"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
});