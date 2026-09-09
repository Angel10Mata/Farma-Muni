"use client";

import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

export default function SinAccesoContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-foreground text-center">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-10 shadow-2xl">
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-red-500/10 rounded-full animate-pulse">
            <ShieldAlert className="size-20 text-red-600 stroke-[1.5]" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 uppercase tracking-tight text-red-600">
          Acceso Restringido
        </h1>

        <p className="text-muted-foreground mb-8 text-sm">
          Usted no cuenta con los permisos suficientes para acceder a este
          módulo
        </p>

        <div className="bg-red-500/5 p-4 rounded-xl text-[10px] mb-8 border border-red-500/20 italic uppercase font-bold tracking-widest text-red-500">
          Intento de acceso no autorizado registrado.
        </div>

        <Link
          href="/farmamuni"
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold text-xs transition-all active:scale-95 uppercase"
        >
          <ArrowLeft className="size-4 stroke-3" />
          Regresar al inicio
        </Link>
      </div>
    </div>
  );
}
