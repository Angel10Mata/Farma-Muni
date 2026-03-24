import { z } from "zod";

// ==========================================
//    ESQUEMA PARA PRODUCTOS (MEDICAMENTOS)
// ==========================================
export const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional().nullable().or(z.literal('')),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
  stock: z.coerce.number().int().nonnegative().default(0),
  stock_minimo: z.coerce.number().int().nonnegative().default(5), 
  
  // Campos de Farmacia
  lote: z.string().optional().nullable().or(z.literal('')),
  // Aceptamos string, nulo, o vacío para que la base de datos de Supabase no falle con las fechas
  fecha_caducidad: z.string().optional().nullable().or(z.literal('')),
});

// ==========================================
//    ESQUEMA PARA CLIENTES (PACIENTES)
// ==========================================
export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  
  // Validación estricta para el DPI guatemalteco
  dpi: z.string()
    .min(13, "El DPI debe tener 13 números")
    .max(13, "El DPI no puede tener más de 13 números")
    .optional()
    .nullable()
    .or(z.literal('')),
    
  telefono: z.string().optional().nullable().or(z.literal('')), // Lo hacemos opcional por si el paciente no tiene teléfono
  direccion: z.string().optional().nullable().or(z.literal('')),
  
  // Campo Médico
  condiciones_cronicas: z.string().optional().nullable().or(z.literal('')),
});

// ==========================================
//    ESQUEMA PARA VENTAS (DISPENSACIÓN)
// ==========================================
export const ventaSchema = z.object({
  cliente_id: z.string().uuid("Debes seleccionar un paciente"),
  producto_id: z.string().uuid("Debes seleccionar un medicamento"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  
  // Campos de Farmacia y Ayuda Social
  tipo_transaccion: z.string().default("Venta Normal"),
  receta_medica: z.string().optional().nullable().or(z.literal('')),
});

// ==========================================
//    ESQUEMA PARA CONSULTAS CLÍNICAS
// ==========================================
export const consultaSchema = z.object({
  cliente_id: z.string().uuid("Debes seleccionar un paciente"),
  motivo: z.string().min(1, "El motivo de la consulta es obligatorio"),
  
  // Signos vitales (opcionales)
  presion_arterial: z.string().optional().nullable().or(z.literal('')),
  temperatura: z.string().optional().nullable().or(z.literal('')),
  peso: z.string().optional().nullable().or(z.literal('')),
  
  // Evaluación médica
  sintomas: z.string().optional().nullable().or(z.literal('')),
  diagnostico: z.string().optional().nullable().or(z.literal('')),
  receta_sugerida: z.string().optional().nullable().or(z.literal('')),
});

// ==========================================
//    ESQUEMA PARA SALA DE ESPERA (TURNOS)
// ==========================================
export const turnoSchema = z.object({
  cliente_id: z.string().uuid("Debes seleccionar un paciente"),
  motivo_visita: z.string().optional().nullable().or(z.literal('')),
  estado: z.string().default('En Espera'),
});

// ==========================================
//    ESQUEMA PARA RECETAS ELECTRÓNICAS
// ==========================================
export const recetaSchema = z.object({
  cliente_id: z.string().uuid("Debes seleccionar un paciente"),
  medicamentos: z.any(), // Aquí guardaremos el arreglo de medicinas seleccionadas
  estado: z.string().default('Pendiente'),
});