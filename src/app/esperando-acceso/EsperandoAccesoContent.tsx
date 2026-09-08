"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkDeviceRequest, createDeviceRequest, notifyAdminsOfArrival } from "./actions";
import { Lock, PhoneOff } from "lucide-react";
import { Lock as LockNode, Send } from "lucide";
import { toast } from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";

export default function EsperandoAccesoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const isDeviceLimit = reason === "limit";

  const [hasRequest, setHasRequest] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isDeviceLimit) return;

    const verifyRequest = async () => {
      const exists = await checkDeviceRequest();
      setHasRequest(exists);
      await notifyAdminsOfArrival();
    };
    verifyRequest();

    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [router, isDeviceLimit]);

  const handleCreateRequest = async () => {
    setLoading(true);
    const res = await createDeviceRequest();
    setLoading(false);

    if (res.success) {
      setHasRequest(true);
      toast.success("Solicitud enviada. El administrador revisará su solicitud pronto.");
    } else {
      toast.error(res.error ?? "No se pudo enviar la solicitud.");
    }
  };

  if (isDeviceLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-foreground">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-red-500/10 rounded-full">
              <PhoneOff className="size-16 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Límite de dispositivos alcanzado</h1>
          <p className="text-muted-foreground mb-6">
            Ya tienes <strong>3 dispositivos</strong> autorizados en el sistema, que es el máximo permitido.
          </p>
          <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl text-sm mb-6 text-red-600 dark:text-red-400">
            Para agregar un nuevo dispositivo, primero debes revocar el acceso a uno de los existentes o comunicarte con{" "}
            <strong>Soporte Técnico</strong>.
          </div>
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-muted hover:bg-muted/80 border border-border text-foreground py-3 rounded-xl font-semibold transition-all active:scale-95"
          >
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-foreground">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-amber-500/10 rounded-full">
            <Lock className="size-16 text-amber-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Acceso en espera</h1>
        <p className="text-muted-foreground mb-6">
          Su dispositivo está registrado pero aún no ha sido autorizado.
        </p>
        <div className="bg-muted/50 p-4 rounded-xl text-sm mb-6 border border-border italic">
          Por favor, solicite su acceso al departamento de sistemas.
        </div>
        {!hasRequest && (
          <SigetActionButton
            label="Enviar"
            accentColor={sigetAccent.guardar}
            morphFrom={LockNode}
            morphTo={Send}
            onClick={handleCreateRequest}
            disabled={loading}
            ariaLabel="Volver a enviar solicitud"
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
