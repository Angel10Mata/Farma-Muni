export function puedeEliminarProveedor(actorRole: string): boolean {
  return actorRole === "super" || actorRole === "admin";
}
