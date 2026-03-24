import { z } from "zod";

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

  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe tener una mayúscula")
    .regex(/[0-9]/, "Debe tener un número")
    .regex(/[^A-Za-z0-9]/, "Debe tener un símbolo (!@#$...)"),

  rol: z.enum(["user", "admin", "super", "rrhh"], {
    message: "Selecciona un rol válido",
  }),
});

export type AuthInput = z.infer<typeof authSchema>;
