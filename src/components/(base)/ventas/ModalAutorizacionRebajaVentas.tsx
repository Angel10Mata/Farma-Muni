"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  ModalFooter,
  ModalShell,
  ModalField,
  ModalLabel,
  ModalInput,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import { Check as CheckNode, X as XNode } from "lucide";
import { useVentas } from "./ContextoVentas";
import { useUserContext } from "@/components/(base)/providers/UserProvider";

export function ModalAutorizacionRebajaVentas() {
  const ventas = useVentas();
  const { realRole } = useUserContext();
  const esAdminOSuper = ["admin", "super"].includes(realRole);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");

  const limpiar = () => {
    setUsuario("");
    setClave("");
  };

  const cerrar = () => {
    limpiar();
    ventas.setShowModalAutorizacionRebaja(false);
  };

  const enviar = async () => {
    await ventas.confirmarRebajaConAdmin(usuario, clave);
    limpiar();
  };

  return (
    <ModalShell
      open={ventas.showModalAutorizacionRebaja}
      onClose={cerrar}
      title={
        esAdminOSuper
          ? "Confirmar rebaja de precios"
          : "Esperando confirmación"
      }
      subtitle={
        esAdminOSuper
          ? "Ingresa tus credenciales de administrador para autorizar esta venta"
          : "Un administrador o super admin debe confirmar antes de registrar el cobro"
      }
      maxWidth="max-w-lg"
      headerActions={
        esAdminOSuper ? (
          <div className="size-10 rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <ShieldCheck className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
        ) : undefined
      }
    >
      {esAdminOSuper ? (
        <>
          <div className="space-y-4">
            <ModalField>
              <ModalLabel htmlFor="rebaja-admin-user">Usuario administrador</ModalLabel>
              <ModalInput
                id="rebaja-admin-user"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ej. admin"
              />
            </ModalField>
            <ModalField>
              <ModalLabel htmlFor="rebaja-admin-pass">Contraseña</ModalLabel>
              <ModalInput
                id="rebaja-admin-pass"
                type="password"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="••••••••"
              />
            </ModalField>
            <p className="text-xs text-muted-foreground">
              También recibirás una notificación push si tienes la campana activada en el menú.
            </p>
          </div>
          <ModalFooter>
            <SigetActionButton
              label="Cancelar"
              accentColor={sigetAccent.cancelar}
              morphFrom={XNode}
              morphTo={XNode}
              morphOnHover={false}
              onClick={cerrar}
              className="w-auto shrink-0"
            />
            <SigetActionButton
              label="Autorizar venta"
              accentColor={sigetAccent.guardar}
              morphFrom={CheckNode}
              morphTo={CheckNode}
              morphOnHover={false}
              disabled={
                !usuario.trim() ||
                !clave ||
                ventas.isValidandoAutorizacionRebaja
              }
              ariaBusy={ventas.isValidandoAutorizacionRebaja}
              onClick={enviar}
              className="w-auto shrink-0"
            />
          </ModalFooter>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="size-14 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Loader2 className="size-7 text-amber-600 dark:text-amber-400 animate-spin" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 max-w-sm">
              Esperando confirmación administrativa
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              Se notificó a administración. No modifiques el carrito hasta que autoricen la rebaja.
              Luego vuelve a pulsar <span className="font-bold">Cobrar</span>.
            </p>
          </div>
          <ModalFooter>
            <SigetActionButton
              label="Cerrar"
              accentColor={sigetAccent.cancelar}
              morphFrom={XNode}
              morphTo={XNode}
              morphOnHover={false}
              onClick={cerrar}
              className="w-auto shrink-0 mx-auto"
            />
          </ModalFooter>
        </>
      )}
    </ModalShell>
  );
}
