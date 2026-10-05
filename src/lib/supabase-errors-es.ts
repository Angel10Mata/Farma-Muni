// TRADUCCIÓN ERRORES SUPABASE

export function mensajeErrorEs(mensaje: string | undefined | null): string {
  if (!mensaje?.trim()) {
    return "Ocurrió un error desconocido.";
  }

  const original = mensaje.trim();
  const lower = original.toLowerCase();

  const reglas: { match: (s: string) => boolean; es: string }[] = [
    {
      match: (s) => s.includes("valid bearer token"),
      es: "La clave SUPABASE_SERVICE_ROLE_KEY no es válida o está incompleta. Copia de nuevo la service_role completa en .env.local y reinicia pnpm dev.",
    },
    {
      match: (s) => s.includes("user not allowed"),
      es: "No se permite crear el usuario. Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurada en el servidor y que Auth en Supabase permita crear usuarios (Dashboard → Authentication → Settings).",
    },
    {
      match: (s) =>
        s.includes("already registered") ||
        s.includes("already been registered") ||
        s.includes("duplicate key") ||
        s.includes("users_email_partial_key"),
      es: "Ese nombre de usuario o correo ya está registrado. Elige otro.",
    },
    {
      match: (s) => s.includes("invalid api key") || s.includes("invalid jwt"),
      es: "Clave de Supabase inválida. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
    },
    {
      match: (s) => s.includes("signup is disabled"),
      es: "El registro público está desactivado. La creación desde administración requiere la clave de servicio (SERVICE_ROLE).",
    },
    {
      match: (s) => s.includes("password should be at least"),
      es: "La contraseña no cumple los requisitos mínimos de seguridad.",
    },
    {
      match: (s) => s.includes("invalid email"),
      es: "El correo generado para el usuario no es válido.",
    },
    {
      match: (s) => s.includes("row-level security") || s.includes("rls"),
      es: "Permiso denegado en la base de datos (políticas RLS). Contacta al administrador técnico.",
    },
    {
      match: (s) => s.includes("violates foreign key"),
      es: "No se pudo vincular el registro con la base de datos. Revisa integridad de datos.",
    },
    {
      match: (s) => s.includes("network") || s.includes("fetch failed"),
      es: "Error de conexión con el servidor. Intenta de nuevo.",
    },
    {
      match: (s) => s.includes("rate limit"),
      es: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    },
  ];

  for (const regla of reglas) {
    if (regla.match(lower)) {
      return regla.es;
    }
  }

  if (/^error al crear perfil/i.test(original)) {
    return original;
  }

  return original;
}
