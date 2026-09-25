"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  Check as CheckNode,
  ShieldAlert as ShieldAlertNode,
  X as XNode,
} from "lucide";
import { fmtQ } from "@/lib/utils";
import { useUserContext } from "@/components/(base)/providers/UserProvider";
import {
  ModalFooter,
  ModalShell,
  ModalField,
  ModalLabel,
  ModalTextarea,
} from "@/components/ui/general-modal";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";
import {
  useAprobarSolicitudRebaja,
  useRechazarSolicitudRebaja,
  useSolicitudesRebajaPendientes,
} from "./lib/hooks";
import { SolicitudRebajaPayloadSchema } from "./lib/zod";

type SolicitudRow = {
  id: string;
  solicitante_id: string;
  estado: string;
  payload: unknown;
  created_at: string;
  profiles?: { nombre?: string | null } | null;
};

export function SolicitudesRebajaAdmin() {
  const { effectiveRole } = useUserContext();
  const isAdmin = ["admin", "super"].includes(effectiveRole);
  const searchParams = useSearchParams();
  const router = useRouter();
  const rebajaQuery = searchParams.get("rebaja");

  const { data: solicitudes = [], isLoading } = useSolicitudesRebajaPendientes(isAdmin);
  const aprobar = useAprobarSolicitudRebaja();
  const rechazar = useRechazarSolicitudRebaja();

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  useEffect(() => {
    if (rebajaQuery && isAdmin) {
      setDetalleId(rebajaQuery);
    }
  }, [rebajaQuery, isAdmin]);

  const solicitudActiva = useMemo(() => {
    if (!detalleId) return null;
    return (solicitudes as SolicitudRow[]).find((s) => s.id === detalleId) ?? null;
  }, [detalleId, solicitudes]);

  const payloadParsed = useMemo(() => {
    if (!solicitudActiva) return null;
    const parsed = SolicitudRebajaPayloadSchema.safeParse(solicitudActiva.payload);
    return parsed.success ? parsed.data : null;
  }, [solicitudActiva]);

  const cerrarDetalle = () => {
    setDetalleId(null);
    setMotivoRechazo("");
    if (rebajaQuery) {
      router.replace("/farmamuni/ventas");
    }
  };

  if (!isAdmin) return null;

  const pendientes = solicitudes as SolicitudRow[];

  return (
    <>
      {!isLoading && pendientes.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Rebajas por autorizar
              </p>
              <p className="text-sm text-amber-800/90 dark:text-amber-100/80">
                {pendientes.length} solicitud{pendientes.length === 1 ? "" : "es"} pendiente
                {pendientes.length === 1 ? "" : "s"} de aprobación.
              </p>
            </div>
          </div>
          <SigetActionButton
            label="Revisar"
            accentColor={sigetAccent.guardar}
            morphFrom={ShieldAlertNode}
            morphTo={CheckNode}
            onClick={() => setDetalleId(pendientes[0].id)}
            className="w-full sm:w-auto shrink-0"
          />
        </div>
      )}

      <ModalShell
        open={!!detalleId}
        onClose={cerrarDetalle}
        title="Autorizar rebaja de precios"
        subtitle={
          solicitudActiva
            ? `Solicitud de ${solicitudActiva.profiles?.nombre?.trim() || "vendedor"} · ${new Date(solicitudActiva.created_at).toLocaleString("es-GT")}`
            : undefined
        }
        maxWidth="max-w-2xl"
      >
        {!solicitudActiva || !payloadParsed ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {detalleId && !solicitudActiva
              ? "La solicitud ya no está pendiente o no se encontró."
              : "Cargando detalle…"}
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Total: {fmtQ(payloadParsed.total)}
                </span>
                <span className="text-slate-500">Tipo: {payloadParsed.tipo_venta}</span>
              </div>
              {payloadParsed.observaciones ? (
                <p className="text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2 text-slate-700 dark:text-slate-200">
                  <span className="font-bold">Observación: </span>
                  {payloadParsed.observaciones}
                </p>
              ) : null}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-left">
                    <tr>
                      <th className="px-3 py-2 font-bold">Producto</th>
                      <th className="px-3 py-2 font-bold text-right">Cant.</th>
                      <th className="px-3 py-2 font-bold text-right">Base</th>
                      <th className="px-3 py-2 font-bold text-right">Aplicado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payloadParsed.items.map((item) => {
                      const rebaja = item.precio_aplicado < item.precio_base;
                      return (
                        <tr
                          key={item.producto_id}
                          className="border-t border-slate-200 dark:border-slate-800"
                        >
                          <td className="px-3 py-2">{item.producto_nombre}</td>
                          <td className="px-3 py-2 text-right">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right">{fmtQ(item.precio_base)}</td>
                          <td
                            className={`px-3 py-2 text-right font-bold ${rebaja ? "text-amber-600 dark:text-amber-400" : ""}`}
                          >
                            {fmtQ(item.precio_aplicado)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ModalField>
                <ModalLabel>Motivo de rechazo (opcional)</ModalLabel>
                <ModalTextarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={2}
                  placeholder="Indica al vendedor por qué no se autoriza"
                />
              </ModalField>
            </div>
            <ModalFooter>
              <SigetActionButton
                label="Rechazar"
                accentColor={sigetAccent.quitar}
                morphFrom={XNode}
                morphTo={XNode}
                morphOnHover={false}
                disabled={rechazar.isPending || aprobar.isPending}
                onClick={async () => {
                  if (!detalleId) return;
                  const res = await rechazar.mutateAsync({
                    solicitudId: detalleId,
                    motivo: motivoRechazo,
                  });
                  if (res.success) cerrarDetalle();
                }}
                className="w-auto shrink-0"
              />
              <SigetActionButton
                label="Aprobar"
                accentColor={sigetAccent.guardar}
                morphFrom={CheckNode}
                morphTo={CheckNode}
                morphOnHover={false}
                disabled={rechazar.isPending || aprobar.isPending}
                ariaBusy={aprobar.isPending}
                onClick={async () => {
                  if (!detalleId) return;
                  const res = await aprobar.mutateAsync(detalleId);
                  if (res.success) cerrarDetalle();
                }}
                className="w-auto shrink-0"
              />
            </ModalFooter>
          </>
        )}
      </ModalShell>
    </>
  );
}
