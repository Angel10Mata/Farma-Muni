import { z } from "zod";

// Ajustes
export const appSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  require_device_authorization: z.boolean().default(false),
  enable_passkeys: z.boolean().default(false),
});

export type AppSettingsUpdate = z.infer<typeof appSettingsSchema>;