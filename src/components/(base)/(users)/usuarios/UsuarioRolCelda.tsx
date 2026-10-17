"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { updateProfile } from "@/components/(base)/(users)/profile/lib/actions";
import { modalActionMessage } from "@/components/ui/modal-toast";
import {
  ROLE_LABELS,
  canAssignRole,
  canManageUsers,
  getManageableRoles,
} from "./lib/permissions";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  rol: string | null;
  actorRealRole: string;
  isSelf: boolean;
  onUpdated: () => void;
};

export function UsuarioRolCelda({
  userId,
  rol,
  actorRealRole,
  isSelf,
  onUpdated,
}: Props) {
  const [pending, setPending] = useState(false);
  const roleKey = rol || "user";
  const label = ROLE_LABELS[roleKey] || roleKey;
  const manageable = getManageableRoles(actorRealRole);
  const canEdit =
    !isSelf &&
    canManageUsers(actorRealRole) &&
    (actorRealRole === "super" || roleKey !== "super");

  const badgeClass =
    "text-[10px] font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10 max-w-[180px] truncate";

  if (!canEdit) {
    return <span className={cn(badgeClass, "inline-block capitalize")}>{label}</span>;
  }

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    if (newRole === roleKey) return;
    if (!canAssignRole(actorRealRole, newRole)) {
      toast.error("No tienes permiso para asignar ese rol.");
      return;
    }
    setPending(true);
    try {
      const result = await updateProfile(userId, {
        rol: newRole as "user" | "admin" | "super",
      });
      if (result && "code" in result) {
        toast.error(modalActionMessage(result.code, "No se pudo actualizar el rol."));
        return;
      }
      toast.success("Rol actualizado.");
      onUpdated();
    } catch {
      toast.error("Error al actualizar el rol.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="relative inline-flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
      <select
        value={roleKey}
        onChange={handleChange}
        disabled={pending}
        aria-label={`Rol de usuario: ${label}`}
        className={cn(
          badgeClass,
          "cursor-pointer appearance-none pr-6 text-right capitalize text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          pending && "opacity-60",
        )}
      >
        {manageable.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r] || r}
          </option>
        ))}
      </select>
    </div>
  );
}
