"use client";

import { useState, useMemo } from "react";
import { BotonAutorizarDispositivo } from "./BotonAutorizarDispositivo";
import {
  Monitor,
  Smartphone,
  Calendar,
  ChevronDown,
  Search,
  ShieldCheck,
  ShieldAlert,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface Device {
  id: string;
  user_id: string;
  device_name: string;
  friendly_name?: string | null;
  is_authorized: boolean;
  created_at: string;
}

interface UserGroup {
  user_id: string;
  name: string;
  devices: Device[];
}

export function AcordeonDispositivos({ groups }: { groups: UserGroup[] }) {
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pendingCount = (devices: Device[]) =>
    devices.filter((d) => !d.is_authorized).length;

  return (
    <div className="w-full lg:w-4/5 mx-auto space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre de usuario..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="p-12 text-center text-muted-foreground italic text-sm">
          {search ? "Sin resultados para esa búsqueda." : "No hay registros de dispositivos."}
        </div>
      )}

      {filtered.map((group) => {
        const isOpen = openIds.has(group.user_id);
        const pending = pendingCount(group.devices);

        return (
          <Card
            key={group.user_id}
            className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden"
          >
            {/* Header row */}
            <button
              onClick={() => toggle(group.user_id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{group.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {group.devices.length} dispositivo{group.devices.length !== 1 && "s"}
                    {pending > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                        · {pending} pendiente{pending !== 1 && "s"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {pending > 0 && (
                  <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-[11px] font-bold text-white animate-pulse">
                    {pending}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </button>

            {/* Devices list */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border divide-y divide-border/60">
                  {group.devices.map((dev) => (
                    <div
                      key={dev.id}
                      className={cn(
                        "flex transition-colors",
                        dev.is_authorized ? "bg-muted/10" : "bg-amber-500/5"
                      )}
                    >
                      {/* ── Left status bar ──
                          Icon + text rotated -90deg as one perfectly-centered unit */}
                      <div
                        className={cn(
                          "shrink-0 w-7 self-stretch relative overflow-hidden",
                          dev.is_authorized ? "bg-emerald-500/10" : "bg-amber-500/15"
                        )}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="flex items-center gap-1"
                            style={{ transform: "rotate(-90deg)", whiteSpace: "nowrap" }}
                          >
                            {dev.is_authorized ? (
                              <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ShieldAlert className="size-3 text-amber-600 dark:text-amber-400" />
                            )}
                            <span
                              className={cn(
                                "text-[8px] font-bold uppercase tracking-widest leading-none",
                                dev.is_authorized
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {dev.is_authorized ? "Autorizado" : "Pendiente"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Main content — grid of rows separated by border-b ── */}
                      <div className="flex-1 min-w-0 flex flex-col border-l border-border/30">

                        {/* Row 1: device icons · date */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background border border-border">
                            <Monitor className="size-3.5 text-muted-foreground" />
                            <Smartphone className="size-3 text-muted-foreground" />
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="size-3 shrink-0" />
                            {format(new Date(dev.created_at), "dd/MM/yyyy HH:mm", {
                              locale: es,
                            })}
                          </div>
                        </div>

                        {/* Row 2: device name — more vertical room */}
                        <div className="px-3 py-3 border-b border-border/50">
                          <p className="text-xs font-semibold leading-snug break-words">
                            {dev.friendly_name || dev.device_name}
                          </p>
                          {dev.friendly_name && (
                            <p className="text-[10px] text-muted-foreground break-words leading-snug mt-0.5">
                              {dev.device_name}
                            </p>
                          )}
                        </div>

                        {/* Row 3: segmented buttons — full width, no padding */}
                        <BotonAutorizarDispositivo id={dev.id} isAuthorized={dev.is_authorized} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
