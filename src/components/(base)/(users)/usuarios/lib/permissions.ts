export const ROLE_LABELS: Record<string, string> = {
  user: "Usuario (Estándar)",
  admin: "Administrador",
  super: "Super Admin",
};

export const ROLE_ORDER = ["super", "admin", "user"] as const;

const KNOWN_ROLES = [...ROLE_ORDER];
const KNOWN_ROLE_SET = new Set<string>(KNOWN_ROLES);

export function getManageableRoles(
  actorRole: string,
  customRoles: string[] = [],
): string[] {
  if (actorRole === "super") {
    const extras = customRoles.filter((r) => !KNOWN_ROLE_SET.has(r));
    return orderRoles([...KNOWN_ROLES, ...extras]);
  }
  if (actorRole === "admin") {
    return orderRoles(KNOWN_ROLES.filter((r) => r !== "super"));
  }
  return [];
}

export function isKnownRole(role: string): boolean {
  return KNOWN_ROLE_SET.has(role);
}

export function canManageUsers(actorRole: string): boolean {
  return getManageableRoles(actorRole).length > 0;
}

export function canCreateUsers(actorRole: string): boolean {
  return canManageUsers(actorRole);
}

export function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "super") return true;
  return getManageableRoles(actorRole).includes(targetRole);
}

export function isUserVisibleToActor(
  targetRole: string | null | undefined,
  actorRole: string,
): boolean {
  if (actorRole === "super") return true;
  const role = targetRole || "user";
  return getManageableRoles(actorRole).includes(role);
}

export function orderRoles(roles: string[]): string[] {
  const uniqueRoles = Array.from(new Set(roles));
  return uniqueRoles.sort((a, b) => {
    const indexA = ROLE_ORDER.indexOf(a as (typeof ROLE_ORDER)[number]);
    const indexB = ROLE_ORDER.indexOf(b as (typeof ROLE_ORDER)[number]);
    const keyA = indexA >= 0 ? indexA : ROLE_ORDER.length;
    const keyB = indexB >= 0 ? indexB : ROLE_ORDER.length;
    if (keyA !== keyB) return keyA - keyB;
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });
}
