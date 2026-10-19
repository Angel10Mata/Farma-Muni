import { z } from "zod";

// Ajustes
export const appSettingsSchema = z
  .object({
    id: z.string().uuid().optional(),
    require_device_authorization: z.boolean().default(false),
    enable_passkeys: z.boolean().default(false),
    farmacia_nombre: z.string().max(200).optional().nullable(),
    farmacia_direccion: z.string().max(500).optional().nullable(),
    farmacia_telefono: z.string().max(80).optional().nullable(),
    dias_credito: z.number().int().min(1).max(365).optional(),
    margen_ganancia_pct: z.number().min(0).max(500).optional(),
    margen_minimo_pct: z.number().min(0).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const sugerido = data.margen_ganancia_pct ?? 30;
    const minimo = data.margen_minimo_pct ?? 10;
    if (minimo > sugerido) {
      ctx.addIssue({
        code: "custom",
        message: "El margen mínimo no puede ser mayor que el margen de ganancia sugerido.",
        path: ["margen_minimo_pct"],
      });
    }
  });

export type AppSettingsUpdate = z.infer<typeof appSettingsSchema>;

export const margenesPrecioSchema = z.object({
  margen_ganancia_pct: z.number().min(0).max(500),
  margen_minimo_pct: z.number().min(0).max(500),
});

export type MargenesPrecio = z.infer<typeof margenesPrecioSchema>;