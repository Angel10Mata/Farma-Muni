"use client";

import { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  getRegistrationOptions,
  verifyRegistration,
  getPasskeysCount,
} from "./passkeys-actions";
import { Input } from "@/components/ui/input";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { Fingerprint, Check } from "lucide";

export function RegisterPasskey() {
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState("");
  const [passkeyCount, setPasskeyCount] = useState<number | null>(null);

  const fetchCount = async () => {
    const count = await getPasskeysCount();
    setPasskeyCount(count);
  };

  useEffect(() => {
    fetchCount();
  }, []);

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      setStatus("Por favor, ingresa un nombre para el dispositivo.");
      return;
    }

    setIsLoading(true);
    setStatus("");

    try {
      const options = await getRegistrationOptions();
      const attResp = await startRegistration({ optionsJSON: options });
      const verificationResp = await verifyRegistration(
        attResp,
        deviceName.trim(),
      );

      if (verificationResp.success) {
        localStorage.setItem("cermad-device-passkey-enabled", "true");
        setStatus("Dispositivo registrado exitosamente.");
        setDeviceName("");
        await fetchCount();
      } else {
        setStatus(`Error al verificar: ${verificationResp.error}`);
      }
    } catch (error: unknown) {
      if ((error as Error).name === "InvalidStateError") {
        localStorage.setItem("cermad-device-passkey-enabled", "true");
      }
      setStatus(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 border rounded-xl bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Configurar Ingreso Seguro</h3>
        {passkeyCount !== null && (
          <span className="text-sm font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
            {passkeyCount} / 3 Dispositivos
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Añade tu huella, rostro o PIN para iniciar sesión sin contraseña.
      </p>

      {passkeyCount !== null && passkeyCount >= 3 ? (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg font-medium border border-destructive/20 mt-2">
          Has alcanzado el límite máximo de 3 dispositivos. Modifica o elimina
          uno existente para agregar más.
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-2">
          <Input
            placeholder="Ej. Mi iPhone, Laptop Trabajo"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            disabled={isLoading || (passkeyCount !== null && passkeyCount >= 3)}
          />
          <SigetActionButton
            label={isLoading ? "Esperando" : "Registrar"}
            accentColor={sigetAccent.crear}
            morphFrom={Fingerprint}
            morphTo={Check}
            onClick={handleRegister}
            disabled={isLoading || !deviceName.trim()}
            ariaBusy={isLoading}
            className="w-full"
          />
        </div>
      )}

      {status && (
        <p className="text-sm font-medium text-primary mt-1">{status}</p>
      )}
    </div>
  );
}
