"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ArrowLeft as ArrowLeftNode } from "lucide";
import { SigetActionButton, sigetAccent } from "@/components/ui/siget-action-button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-center text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="size-16 text-red-600" strokeWidth={1.75} />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold uppercase tracking-tight">
          Página no encontrada
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Lo sentimos, la ruta que intenta consultar no existe en el sistema de{" "}
          <strong>Farmacia La Salud</strong>
        </p>
        <Link href="/farmacia-la-salud" className="inline-flex w-full justify-center">
          <SigetActionButton
            label="Regresar"
            accentColor={sigetAccent.abrir}
            morphFrom={ArrowLeftNode}
            morphTo={ArrowLeftNode}
            morphOnHover={false}
            className="w-full max-w-xs"
            ariaLabel="Regresar al panel"
          />
        </Link>
      </div>
    </div>
  );
}
