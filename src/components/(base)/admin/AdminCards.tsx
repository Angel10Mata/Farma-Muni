"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MorphIconBox } from "@/components/ui/morph-hover-icon";
import { adminIconColors, adminMorphIcons } from "@/lib/morph-icons";

const adminOptions = [
  {
    id: "dispositivos",
    href: "/farmamuni/admin/dispositivos",
    title: "Dispositivos",
    desc: "Autorizar o rechazar solicitudes de acceso por dispositivo.",
    color: "border-amber-500/20 bg-amber-500/5 dark:border-amber-500/40",
  },
  {
    id: "usuarios",
    href: "/farmamuni/admin/usuarios",
    title: "Usuarios",
    desc: "Gestionar cuentas de usuario, roles y permisos.",
    color: "border-purple-500/20 bg-purple-500/5 dark:border-purple-500/40",
  },
  {
    id: "configuraciones",
    href: "/farmamuni/admin/configuraciones",
    title: "Configuraciones",
    desc: "Ajustes generales del sistema y seguridad.",
    color: "border-blue-500/20 bg-blue-500/5 dark:border-blue-500/40",
  },
] as const;

function AdminCard({
  opt,
  pendingDevices,
}: {
  opt: (typeof adminOptions)[number];
  pendingDevices: number;
}) {
  const [hovered, setHovered] = useState(false);
  const pair = adminMorphIcons[opt.id];
  const palette = adminIconColors[opt.id];

  return (
    <div
      id={`card-${opt.id}`}
      className={cn(
        "group relative overflow-hidden rounded-4xl md:rounded-[2.5rem] border flex shadow-sm cursor-pointer",
        opt.color,
      )}
    >
      <Link
        href={opt.href}
        className="w-full h-full flex flex-row items-center justify-start gap-4 md:gap-6 p-4 md:p-6 outline-none relative z-10"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <MorphIconBox
          from={pair.from}
          to={pair.to}
          size={40}
          color={palette.color}
          strokeWidth={1.75}
          spring="snappy"
          padding="md"
          hovered={hovered}
          boxClassName={palette.boxClass}
        />

        <div className="flex flex-col space-y-0 md:space-y-1 relative z-10 flex-1">
          <h3 className="text-base md:text-xl font-bold tracking-tight text-foreground">
            {opt.title}
          </h3>
          <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 font-medium italic">
            {opt.desc}
          </p>
        </div>

        {opt.id === "dispositivos" && pendingDevices > 0 && (
          <span className="shrink-0 flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full bg-amber-500 text-xs font-bold text-white animate-pulse z-10">
            {pendingDevices}
          </span>
        )}
      </Link>
      <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-current opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
    </div>
  );
}

export function AdminCards({ pendingDevices }: { pendingDevices: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {adminOptions.map((opt) => (
        <AdminCard key={opt.href} opt={opt} pendingDevices={pendingDevices} />
      ))}
    </div>
  );
}
