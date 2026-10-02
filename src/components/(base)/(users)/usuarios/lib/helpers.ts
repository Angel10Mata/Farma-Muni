export function extractRolesFromProfiles(
  users: { rol: string | null }[] | undefined,
): string[] {
  if (!users) return [];
  return Array.from(
    new Set(users.map((u) => u.rol).filter((rol): rol is string => Boolean(rol))),
  );
}

export function resolveKnownRole(
  roleOptions: string[],
  preferred?: string | null,
): string {
  if (preferred && roleOptions.includes(preferred)) return preferred;
  return roleOptions[0] ?? "user";
}
