"use client";

import { authorizeDevice, denyDevice } from "./actions";
import { useState } from "react";
import { X, Check } from "lucide";
import Swal from "sweetalert2";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";

export function BotonAutorizarDispositivo({
  id,
  isAuthorized,
}: {
  id: string;
  isAuthorized: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleAction = async (action: "authorize" | "deny") => {
    const isDark = theme === "dark";

    if (action === "authorize") {
      const { value: friendlyName, isConfirmed } = await Swal.fire({
        title: "¿Autorizar acceso?",
        html: `<p style="font-size:13px;margin-bottom:12px;color:${isDark ? "#a1a1aa" : "#71717a"}">El usuario podrá ingresar con este dispositivo.</p>
               <input id="swal-friendly-name" class="swal2-input" placeholder="Nombre del dispositivo (ej: PC Oscar)" style="font-size:13px;" />`,
        icon: "question",
        showCancelButton: true,
        background: isDark ? "#09090b" : "#ffffff",
        color: isDark ? "#ffffff" : "#000000",
        confirmButtonColor: "#059669",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Autorizar",
        cancelButtonText: "Cancelar",
        preConfirm: () => {
          return (
            document.getElementById("swal-friendly-name") as HTMLInputElement
          )?.value.trim() || undefined;
        },
      });

      if (!isConfirmed) return;

      setLoading(true);
      try {
        const res = await authorizeDevice(id, friendlyName || undefined);
        if (res.success) {
          toast.success("Dispositivo autorizado.");
        } else {
          throw new Error(res.error);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
      return;
    }

    const result = await Swal.fire({
      title: isAuthorized ? "¿Revocar acceso?" : "¿Rechazar solicitud?",
      text: isAuthorized
        ? "Se eliminará el acceso y el dispositivo de la base de datos."
        : "Se eliminará la solicitud permanentemente.",
      icon: "warning",
      showCancelButton: true,
      background: isDark ? "#09090b" : "#ffffff",
      color: isDark ? "#ffffff" : "#000000",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, confirmar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await denyDevice(id);
      if (res.success) {
        toast.success(isAuthorized ? "Acceso revocado." : "Solicitud rechazada.");
      } else {
        throw new Error(res.error);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full gap-2 p-2">
      <SigetActionButton
        label={isAuthorized ? "Revocar" : "Rechazar"}
        accentColor={sigetAccent.quitar}
        morphFrom={X}
        morphTo={X}
        morphOnHover={false}
        onClick={() => handleAction("deny")}
        disabled={loading}
        ariaBusy={loading}
        className="flex-1"
      />
      {!isAuthorized && (
        <SigetActionButton
          label="Autorizar"
          accentColor={sigetAccent.guardar}
          morphFrom={Check}
          morphTo={Check}
          morphOnHover={false}
          onClick={() => handleAction("authorize")}
          disabled={loading}
          ariaBusy={loading}
          className="flex-1"
        />
      )}
    </div>
  );
}
