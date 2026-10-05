import { z } from "zod";

// Registro
export const INITIAL_USER_PASSWORD = "Acceso" as const;

export const authSchema = z.object({
  name: z.string().min(3, "El nombre es obligatorio").trim(),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+$/,
      "Solo letras minúsculas y números (sin espacios ni símbolos)",
    ),
  password: z.literal(INITIAL_USER_PASSWORD, {
    message: "La clave inicial debe ser Acceso.",
  }),
  rol: z.string().min(1, "El rol es obligatorio").trim(),
});

export type AuthInput = z.infer<typeof authSchema>;
