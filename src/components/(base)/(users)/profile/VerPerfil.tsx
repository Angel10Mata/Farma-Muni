"use client";

import { useState, useEffect } from "react";
import {
  User,
  Loader2,
  ShieldCheck,
  Shield,
  X,
  ChevronDown,
} from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { toast } from "react-toastify";
import { useProfile } from "./lib/hooks";
import { useUser } from "@/components/(base)/providers/UserProvider";
import { CamposPerfil } from "./forms/CamposPerfil";
import { CamposUsuario } from "./forms/CamposUsuario";
import { updateProfile } from "./lib/actions";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface VerPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function VerPerfil({ isOpen, onClose, userId }: VerPerfilProps) {
  const sessionUser = useUser();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"perfil" | "usuario">("perfil");

  const targetId = userId || sessionUser?.id || "";
  const sessionRole = sessionUser?.user_metadata?.rol || "user";
  const isSuper = sessionRole === "super";

  const canEdit =
    ["admin", "super"].includes(sessionRole) ||
    sessionUser?.id === targetId;

  const { profile, loading, error } = useProfile(targetId, isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const roleLabels: Record<string, string> = {
    user: "Usuario (Estándar)",
    admin: "Administrador",
    super: "Super Admin",
  };

  let roleOptions: string[] = [];
  if (sessionRole === "super") {
    roleOptions = ["super", "admin", "user"];
  } else if (sessionRole === "admin") {
    roleOptions = ["admin", "user"];
  }

  const targetIsSuper = profile?.rol === "super";
  const canChangeRole =
    roleOptions.length > 0 && !(sessionRole === "admin" && targetIsSuper);

  const handleRoleUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    try {
      await updateProfile(targetId, { rol: newRole as "user" | "admin" | "super" });
      await queryClient.invalidateQueries({ queryKey: ["profile", targetId] });
      toast.success("Rol actualizado.");
    } catch {
      toast.error("Error al actualizar rol.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-10">
      <MagicCard
        className={cn(
          "w-full h-fit flex flex-col rounded-3xl border border-border/60 bg-card overflow-hidden transition-all duration-300 shadow-none",
          view === "perfil" ? "sm:max-w-[80%]" : "sm:max-w-2xl",
        )}
      >
        <div className="relative shrink-0 px-6 pt-6 pb-4 border-b border-border/40 bg-muted/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="shrink-0 relative aspect-square h-12 w-12 rounded-2xl bg-background p-1 border border-border/60">
                <div className="h-full w-full rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-6 w-6" />
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-[10px] sm:text-lg font-bold tracking-tight text-foreground truncate ">
                  {profile?.nombre || "Usuario"}
                </h2>
                <div className="mt-1 flex items-center">
                  <div className="relative group">
                    <div className="flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                      <ShieldCheck size={12} className="mr-1" />
                      <span>{profile?.rol ? roleLabels[profile.rol] || profile.rol : "USUARIO"}</span>
                      {canChangeRole && (
                        <ChevronDown size={10} className="ml-1 opacity-70" />
                      )}
                    </div>
                    {canChangeRole && (
                      <select
                        value={profile?.rol || "user"}
                        onChange={handleRoleUpdate}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role] || role.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center rounded-xl border border-border/40 bg-muted/50 p-1 shrink-0 mr-2">
              <button
                onClick={() => setView("perfil")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                  view === "perfil"
                    ? "bg-blue-700 text-blue-200 dark:bg-blue-900 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-900"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <User size={12} />
                Información
              </button>
              <button
                onClick={() => setView("usuario")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                  view === "usuario"
                    ? "bg-purple-700 text-purple-200 dark:bg-purple-900 dark:text-purple-200 ring-1 ring-purple-200 dark:ring-purple-900"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <Shield size={12} />
                Acceso
              </button>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-2 text-muted-foreground rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="sm:hidden mt-4 flex w-full items-center rounded-xl border border-border/40 bg-muted/50 p-1 z-10">
            <button
              onClick={() => setView("perfil")}
              className={cn(
                "flex-1 justify-center px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                view === "perfil"
                  ? "bg-blue-700 text-blue-200"
                  : "text-muted-foreground",
              )}
            >
              <User size={12} />
              Información
            </button>
            <button
              onClick={() => setView("usuario")}
              className={cn(
                "flex-1 justify-center px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                view === "usuario"
                  ? "bg-purple-700 text-purple-200"
                  : "text-muted-foreground",
              )}
            >
              <Shield size={12} />
              Acceso
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-4 bg-background/50 custom-scrollbar"
          style={{ height: "calc(100% - 150px)" }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm">Cargando información...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-red-500">
              <p className="text-sm font-bold">Error al cargar perfil</p>
              <p className="text-xs opacity-70">{String(error)}</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className={cn(view !== "perfil" && "hidden")}>
                <CamposPerfil userId={targetId} canEdit={canEdit} />
              </div>
              {view === "usuario" && (
                <div>
                  <CamposUsuario
                    userId={targetId}
                    canEdit={canEdit}
                    isSuper={isSuper}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </MagicCard>
    </div>
  );
}
