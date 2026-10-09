import { z } from "zod";

// Ajustes
export const appSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  require_device_authorization: z.boolean().default(false),
  enable_passkeys: z.boolean().default(false),
  farmacia_nombre: z.string().max(200).optional().nullable(),
  farmacia_direccion: z.string().max(500).optional().nullable(),
  farmacia_telefono: z.string().max(80).optional().nullable(),
  dias_credito: z.number().int().min(1).max(365).optional(),
});

export type AppSettingsUpdate = z.infer<typeof appSettingsSchema>;