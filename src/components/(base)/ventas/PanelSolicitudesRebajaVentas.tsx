"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { fmtQ, cn } from "@/lib/utils";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import { useVentas } from "./ContextoVentas";
import {
  useMiSolicitudRebajaPendiente,
  useSolicitudesRebajaPendientes,
} from "./lib/hooks";
import { SolicitudRebajaPayloadSchema } from "./lib/zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SolicitudRow = {
  id: string;
  solicitante_id: string;
  estado: string;
  payload: unknown;
  created_at: string;
};

function resumenPayload(payload: unknown) {
  const parsed = SolicitudRebajaPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  return parsed.data;
}

type PanelSolicitudesRebajaVentasProps = {
  onRevisarAdmin: (id: string) => void;
};

export function PanelSolicitudesRebajaVentas({
  onRevisarAdmin,
}: PanelSolicitudesRebajaVentasProps) {
  const ventas = useVentas();
  const { realRole } = useUserContext();
  const esAdminOSuper = ["admin", "super"].includes(realRole);
  const [open, setOpen] = useState(false);

  const { data: pendientes = [], isLoading: loadingAdmin, isError: errorAdmin } =
    useSolicitudesRebajaPendientes(esAdminOSuper);
  const { data: miSolicitud, isLoading: loadingMi } = useMiSolicitudRebajaPendiente(
    !esAdminOSuper,
  );

  const { restaurarEsperaRebaja } = ventas;

  useEffect(() => {
    if (!miSolicitud?.id || miSolicitud.estado !== "pendiente") return;
    restaurarEsperaRebaja(miSolicitud.id);
  }, [miSolicitud?.id, miSolicitud?.estado, restaurarEsperaRebaja]);

  const listaAdmin = pendientes as SolicitudRow[];
  const resumenMi = miSolicitud ? resumenPayload(miSolicitud.payload) : null;

  const badgeCount = useMemo(() => {
    if (esAdminOSuper) return listaAdmin.length;
    return miSolicitud?.estado === "pendiente" ? 1 : 0;
  }, [esAdminOSuper, listaAdmin.length, miSolicitud?.estado]);

  const loading = esAdminOSuper ? loadingAdmin : loadingMi;

  if (ventas.activeTab !== "pos") return null;

  if (!esAdminOSuper && !loadingMi && badgeCount === 0) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            badgeCount > 0
              ? `${badgeCount} solicitudes de rebaja pendientes`
              : "Notificaciones de rebaja"
          }
          className={cn(
            "relative inline-flex size-11 items-center justify-center rounded-xl border transition-colors cursor-pointer",
            "border-amber-300/80 bg-amber-50 text-amber-800 hover:bg-amber-100",
            "dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950/80",
            badgeCount > 0 && "ring-2 ring-amber-400/40 dark:ring-amber-500/30",
          )}
        >
          <Bell className="size-5" />
          {badgeCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-black text-white dark:bg-amber-500">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[200] w-[min(100vw-2rem,22rem)] rounded-xl border border-zinc-200 bg-white p-0 opacity-100 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
        <DropdownMenuLabel className="px-3 py-2.5 text-xs font-black uppercase tracking-wide text-amber-900 dark:text-amber-100">
          {esAdminOSuper ? "Solicitudes de rebaja" : "Tu solicitud"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-700" />

        {loading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin shrink-0" />
            Cargando…
          </div>
        ) : esAdminOSuper ? (
          errorAdmin ? (
            <p className="px-3 py-3 text-xs text-destructive font-semibold">
              No se pudieron cargar las solicitudes.
            </p>
          ) : listaAdmin.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <ul className="max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain py-1">
              {listaAdmin.map((s) => {
                const payload = resumenPayload(s.payload);
                return (
                  <li key={s.id}>
                    <DropdownMenuItem
                      className="cursor-pointer flex flex-col items-start gap-0.5 rounded-none px-3 py-2.5 focus:bg-amber-50 dark:focus:bg-amber-950/40"
                      onSelect={() => {
                        setOpen(false);
                        onRevisarAdmin(s.id);
                      }}
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {payload
                          ? `Total ${fmtQ(payload.total)} · ${payload.tipo_venta}`
                          : "Solicitud de rebaja"}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(s.created_at).toLocaleString("es-GT")}
                      </span>
                      <span className="text-[10px] font-bold text-[#2c5f9b] dark:text-[#6f9fd4] mt-0.5">
                        Toca para revisar
                      </span>
                    </DropdownMenuItem>
                  </li>
                );
              })}
            </ul>
          )
        ) : miSolicitud && resumenMi ? (
          <DropdownMenuItem
            className="cursor-pointer flex flex-col items-start gap-0.5 px-3 py-3 focus:bg-amber-50 dark:focus:bg-amber-950/40"
            onSelect={() => {
              setOpen(false);
              ventas.setShowModalAutorizacionRebaja(true);
            }}
          >
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Total {fmtQ(resumenMi.total)} · {resumenMi.tipo_venta}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Esperando confirmación administrativa
            </span>
            <span className="text-[10px] font-bold text-[#2c5f9b] dark:text-[#6f9fd4] mt-0.5">
              Ver estado
            </span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
