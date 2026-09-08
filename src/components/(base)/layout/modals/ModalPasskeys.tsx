"use client";

import type { User } from "@supabase/supabase-js";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Fingerprint, Plus, Check, X } from "lucide";
import { Fingerprint as FingerprintIcon } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
  ModalShell,
  ModalField,
  ModalLabel,
  ModalInput,
  ModalFooter,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  getRegistrationOptions,
  verifyRegistration,
  getPasskeys,
  removePasskey,
  PasskeyDevice,
} from "@/components/(base)/(auth)/login/passkeys/passkeys-actions";
import { startRegistration } from "@simplewebauthn/browser";

interface PassKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function ModalPasskeys({
  isOpen,
  onClose,
  user,
}: PassKeysModalProps) {
  const [passkeys, setPasskeys] = useState<PasskeyDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const passkeyCount = passkeys.length;

  const fetchPasskeys = useCallback(async () => {
    if (!user) return;
    const data = await getPasskeys();
    setPasskeys(data);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchPasskeys();
      setShowAddForm(false);
      setDeviceName("");
    }
  }, [isOpen, fetchPasskeys]);

  const handleDeletePasskey = async (id: string, name: string) => {
    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title: "¿Eliminar dispositivo?",
      text: `Se revocará el acceso desde "${name}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: isDark ? "#3f3f46" : "#e4e4e7",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      background: isDark ? "#09090b" : "#ffffff",
      color: isDark ? "#ffffff" : "#000000",
    });

    if (result.isConfirmed) {
      const ok = await removePasskey(id);
      if (ok) {
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
        toast.success("Dispositivo eliminado.");
      } else {
        toast.error("No se pudo eliminar el dispositivo.");
      }
    }
  };

  const handleRegisterPasskey = async () => {
    if (passkeyCount >= 3) {
      toast.warn("Solo puedes tener un máximo de 3 dispositivos seguros.");
      return;
    }

    if (!deviceName.trim()) {
      toast.warn("Ingresa un nombre para el dispositivo.");
      return;
    }

    setIsLoading(true);
    try {
      const options = await getRegistrationOptions();
      const regResp = await startRegistration({ optionsJSON: options });
      const verification = await verifyRegistration(regResp, deviceName.trim());

      if (verification.success) {
        localStorage.setItem("cermad-device-passkey-enabled", "true");
        setDeviceName("");
        setShowAddForm(false);
        fetchPasskeys();
        toast.success("Dispositivo registrado correctamente.");
      } else {
        toast.error(verification.error || "Fallo desconocido al guardar.");
      }
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === "InvalidStateError") {
        localStorage.setItem("cermad-device-passkey-enabled", "true");
        toast.info("Este dispositivo ya está registrado.");
      } else if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
        toast.error(`Error de hardware/navegador: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title="Ingreso Seguro"
      description={`${passkeyCount} / 3 dispositivos registrados`}
      maxWidth="max-w-md"
    >
      {isOpen && (
        <div className="space-y-4">
          {passkeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FingerprintIcon className="size-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No hay dispositivos registrados.</p>
              <p className="text-xs opacity-70 mt-1 max-w-[250px]">
                Añade tu huella, rostro o PIN para iniciar sesión de forma rápida
                y segura.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map((pk) => (
                <div
                  key={pk.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-background border border-border/50"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground truncate">
                      {pk.device_name}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {new Date(pk.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <SigetActionButton
                    label="Quitar"
                    accentColor={sigetAccent.quitar}
                    morphFrom={Trash2}
                    morphTo={Trash2}
                    morphOnHover={false}
                    onClick={() => handleDeletePasskey(pk.id, pk.device_name)}
                    className="w-auto shrink-0"
                  />
                </div>
              ))}
            </div>
          )}

          {showAddForm ? (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <ModalField>
                <ModalLabel htmlFor="passkey-add-name">
                  Nombre del dispositivo
                </ModalLabel>
                <ModalInput
                  id="passkey-add-name"
                  type="text"
                  placeholder="Ej. Mi iPhone"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </ModalField>
              <ModalFooter>
                <SigetActionButton
                  label="Cancelar"
                  accentColor={sigetAccent.cancelar}
                  morphFrom={X}
                  morphTo={X}
                  morphOnHover={false}
                  onClick={() => {
                    setShowAddForm(false);
                    setDeviceName("");
                  }}
                  disabled={isLoading}
                  className="w-auto shrink-0"
                />
                <SigetActionButton
                  label={isLoading ? "Esperando" : "Registrar"}
                  accentColor={sigetAccent.crear}
                  morphFrom={Fingerprint}
                  morphTo={Check}
                  onClick={handleRegisterPasskey}
                  disabled={isLoading || !deviceName.trim()}
                  ariaBusy={isLoading}
                  className="w-auto shrink-0"
                />
              </ModalFooter>
            </div>
          ) : (
            <SigetActionButton
              label="Agregar"
              accentColor={sigetAccent.crear}
              morphFrom={Plus}
              morphTo={Fingerprint}
              onClick={() => {
                if (passkeyCount >= 3) {
                  toast.warn(
                    "Has alcanzado el límite de 3 dispositivos. Elimina uno para agregar otro.",
                  );
                  return;
                }
                setShowAddForm(true);
              }}
              disabled={isLoading || passkeyCount >= 3}
              className="w-full"
            />
          )}

          {passkeyCount >= 3 && !showAddForm && (
            <p className="text-[10px] text-center text-muted-foreground px-2">
              Has alcanzado el límite de 3 dispositivos. Elimina uno para
              agregar otro.
            </p>
          )}
        </div>
      )}
    </ModalShell>
  );
}
