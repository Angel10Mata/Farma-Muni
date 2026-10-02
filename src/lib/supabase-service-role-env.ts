export function mensajeSiServiceRoleKeyInvalida(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    return "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. Reinicia pnpm dev después de guardar.";
  }

  if (key.startsWith("sb_publishable_")) {
    return "SUPABASE_SERVICE_ROLE_KEY tiene una clave publishable (sb_publishable_…). Esa es pública, no sirve en el servidor. En Supabase → Project Settings → API copia service_role (secret) o sb_secret_…, no publishable.";
  }

  if (key.startsWith("sb_secret_")) {
    return null;
  }

  const parts = key.split(".");
  if (parts.length !== 3) {
    return "SUPABASE_SERVICE_ROLE_KEY no es un JWT válido (¿quedó incompleta?). En Supabase: Project Settings → API → service_role → Reveal y copia la clave completa (empieza con eyJ…).";
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { role?: string };
    if (payload.role !== "service_role") {
      return "SUPABASE_SERVICE_ROLE_KEY debe ser la clave service_role (secret). No uses la anon public en esa variable.";
    }
  } catch {
    return "SUPABASE_SERVICE_ROLE_KEY está corrupta. Vuelve a copiarla desde Supabase → API → service_role.";
  }

  return null;
}
