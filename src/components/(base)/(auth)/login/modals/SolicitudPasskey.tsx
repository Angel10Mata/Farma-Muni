"use client";

import { useState, useEffect } from "react";
import {
  getRegistrationOptions,
  verifyRegistration,
  getPasskeysCount,
} from "../passkeys/passkeys-actions";
import { startRegistration } from "@simplewebauthn/browser";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { Fingerprint, Check, X } from "lucide";
import {
  ModalShell,
  ModalForm,
  ModalField,
  ModalLabel,
  ModalInput,
  ModalFooter,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";

export function SolicitudPasskey() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [passkeyCount, setPasskeyCount] = useState<number | null>(null);
  const [errorStatus, setErrorStatus] = useState("");

  useEffect(() => {
    const checkStatus = async () => {
      const dismissed = localStorage.getItem("passkey-prompt-dismissed");
      if (dismissed === "true") return;

      const supports = browserSupportsWebAuthn();
      if (supports) {
        const count = await getPasskeysCount();
        setPasskeyCount(count);
        if (count < 3) {
          setIsVisible(true);
        }
      }
    };
    checkStatus();
  }, []);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem("passkey-prompt-dismissed", "true");
    }
    setIsVisible(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setErrorStatus("Debes ingresar un nombre para el dispositivo.");
      return;
    }

    setIsPending(true);
    setErrorStatus("");
    try {
      const options = await getRegistrationOptions();
      const regResp = await startRegistration({ optionsJSON: options });
      const verification = await verifyRegistration(regResp, deviceName.trim());

      if (verification.success) {
        localStorage.setItem("passkey-prompt-dismissed", "true");
        localStorage.setItem("cermad-device-passkey-enabled", "true");
        setIsVisible(false);
      } else {
        setErrorStatus(`Error: ${verification.error}`);
      }
    } catch (error: unknown) {
      if ((error as Error).name === "InvalidStateError") {
        localStorage.setItem("cermad-device-passkey-enabled", "true");
        setErrorStatus("Este dispositivo ya está registrado.");
      } else {
        setErrorStatus(`Error: ${(error as Error).message}`);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ModalShell
      open={isVisible}
      onClose={handleDismiss}
      title="Activar Ingreso Seguro"
      description="Usa tu huella, rostro o PIN para entrar de forma más rápida y segura en las próximas visitas."
      maxWidth="max-w-sm"
    >
      {isVisible && (
        <ModalForm onSubmit={handleRegister}>
          {passkeyCount !== null && (
            <p className="text-xs font-semibold text-muted-foreground text-center">
              Dispositivos registrados: {passkeyCount} / 3
            </p>
          )}

          <ModalField>
            <ModalLabel htmlFor="passkey-device-name">
              Nombre del dispositivo
            </ModalLabel>
            <ModalInput
              id="passkey-device-name"
              type="text"
              placeholder="Ej. Mi iPhone, Computadora"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={isPending}
              autoFocus
            />
          </ModalField>

          {errorStatus && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg text-center">
              {errorStatus}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="size-4 rounded border-input bg-background"
            />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              No volver a preguntar en este dispositivo
            </span>
          </label>

          <ModalFooter>
            <SigetActionButton
              label="Después"
              accentColor={sigetAccent.cancelar}
              morphFrom={X}
              morphTo={X}
              morphOnHover={false}
              onClick={handleDismiss}
              disabled={isPending}
              className="w-auto shrink-0"
            />
            <SigetActionButton
              label={isPending ? "Esperando" : "Activar"}
              accentColor={sigetAccent.guardar}
              morphFrom={Fingerprint}
              morphTo={Check}
              type="submit"
              disabled={isPending || !deviceName.trim()}
              ariaBusy={isPending}
              className="w-auto shrink-0"
            />
          </ModalFooter>
        </ModalForm>
      )}
    </ModalShell>
  );
}
