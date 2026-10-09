"use client";

import { useState, useEffect } from "react";
import { useAppSettings, useUpdateAppSettings } from "./hooks";
import { Shield, Key, Loader2, Building2 } from "lucide-react";
import LogoKore from "@/components/(Kore)/logo/LogoKore";
import { Card } from "@/components/ui/card";
import { modulePageCenteredClass } from "@/lib/module-layout";
import { ModuleHeaderBackButton } from "@/components/(base)/layout/ModuleHeaderBackButton";
import {
  ModalField,
  ModalInput,
  ModalLabel,
  ModalTextarea,
} from "@/components/ui/general-modal";

export default function VerConfiguraciones() {
  const { data: settings, isLoading, isError } = useAppSettings();
  const { mutate: updateSettings, isPending } = useUpdateAppSettings();

  const [requireAuth, setRequireAuth] = useState<boolean>(false);
  const [enablePasskeys, setEnablePasskeys] = useState<boolean>(false);
  const [farmaciaNombre, setFarmaciaNombre] = useState("");
  const [farmaciaDireccion, setFarmaciaDireccion] = useState("");
  const [farmaciaTelefono, setFarmaciaTelefono] = useState("");
  const [diasCredito, setDiasCredito] = useState(30);

  useEffect(() => {
    if (settings) {
      setRequireAuth(settings.require_device_authorization);
      setEnablePasskeys(settings.enable_passkeys);
      setFarmaciaNombre(settings.farmacia_nombre ?? "FarmaMuni");
      setFarmaciaDireccion(settings.farmacia_direccion ?? "");
      setFarmaciaTelefono(settings.farmacia_telefono ?? "");
      setDiasCredito(settings.dias_credito ?? 30);
    }
  }, [settings]);

  const payloadBase = () => ({
    id: settings?.id,
    require_device_authorization: requireAuth,
    enable_passkeys: enablePasskeys,
    farmacia_nombre: farmaciaNombre.trim() || "FarmaMuni",
    farmacia_direccion: farmaciaDireccion.trim() || null,
    farmacia_telefono: farmaciaTelefono.trim() || null,
    dias_credito: diasCredito,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-40">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg font-medium">
        Error al cargar los ajustes del sistema.
      </div>
    );
  }

  const handleAuthChange = (checked: boolean) => {
    setRequireAuth(checked);
    updateSettings({ ...payloadBase(), require_device_authorization: checked });
  };

  const handlePasskeysChange = (checked: boolean) => {
    setEnablePasskeys(checked);
    updateSettings({ ...payloadBase(), enable_passkeys: checked });
  };

  const guardarFarmacia = () => {
    updateSettings(payloadBase());
  };

  return (
    <div className={modulePageCenteredClass}>
      <div className="w-full flex justify-center mb-4">
        <LogoKore scale={0.7} backgroundEffect="none" />
      </div>

      <div className="flex flex-col gap-1 w-full text-center items-center">
        <div className="flex items-center gap-3">
          <ModuleHeaderBackButton size="sm" />
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">
            Configuraciones
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-0.5">
          Ajustes generales del sistema y seguridad.
        </p>
      </div>

      <Card className="bg-white border border-border shadow-sm overflow-hidden w-full">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-background hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-amber-500/10 rounded-lg">
                <Shield className="size-5 text-amber-500" />
              </div>
              <div className="space-y-0.5 text-left">
                <h3 className="text-base font-semibold text-foreground">Autorización de dispositivos</h3>
                <p className="text-xs text-muted-foreground">Requerir aprobación manual para nuevos dispositivos.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={requireAuth}
                disabled={isPending}
                onChange={(e) => handleAuthChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-background hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-purple-500/10 rounded-lg">
                <Key className="size-5 text-purple-500" />
              </div>
              <div className="space-y-0.5 text-left">
                <h3 className="text-base font-semibold text-foreground">Habilitar Passkeys</h3>
                <p className="text-xs text-muted-foreground">Permitir el inicio de sesión sin contraseña.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enablePasskeys}
                disabled={isPending}
                onChange={(e) => handlePasskeysChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-background space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#2c5f9b]/10 rounded-lg">
                <Building2 className="size-5 text-[#2c5f9b]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Datos del recibo</h3>
                <p className="text-xs text-muted-foreground">
                  Nombre, dirección y teléfono que aparecen en el ticket de venta.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField>
                <ModalLabel>Nombre de la farmacia</ModalLabel>
                <ModalInput
                  value={farmaciaNombre}
                  onChange={(e) => setFarmaciaNombre(e.target.value)}
                  disabled={isPending}
                />
              </ModalField>
              <ModalField>
                <ModalLabel>Teléfono</ModalLabel>
                <ModalInput
                  value={farmaciaTelefono}
                  onChange={(e) => setFarmaciaTelefono(e.target.value)}
                  disabled={isPending}
                />
              </ModalField>
              <ModalField className="sm:col-span-2">
                <ModalLabel>Dirección</ModalLabel>
                <ModalTextarea
                  value={farmaciaDireccion}
                  onChange={(e) => setFarmaciaDireccion(e.target.value)}
                  disabled={isPending}
                  rows={2}
                />
              </ModalField>
              <ModalField>
                <ModalLabel>Días de crédito (morosidad)</ModalLabel>
                <ModalInput
                  type="number"
                  min={1}
                  max={365}
                  value={diasCredito}
                  onChange={(e) =>
                    setDiasCredito(Math.max(1, Number(e.target.value) || 30))
                  }
                  disabled={isPending}
                />
              </ModalField>
            </div>
            <button
              type="button"
              onClick={guardarFarmacia}
              disabled={isPending}
              className="text-sm font-bold text-[#2c5f9b] hover:underline disabled:opacity-50"
            >
              Guardar datos de farmacia y crédito
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
