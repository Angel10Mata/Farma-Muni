"use client";

import { FlaskConical, X } from "lucide-react";
import { useDemoMode } from "@/components/(base)/providers/DemoModeProvider";

export default function DemoModeBanner() {
  const { isDemoMode, hydrated, setDemoMode } = useDemoMode();

  if (!hydrated || !isDemoMode) return null;

  return (
    <div className="fixed left-0 right-0 top-14 md:top-16 z-[95] border-b border-violet-500/40 bg-violet-600/95 dark:bg-violet-950/95 text-white shadow-md">
      <div className="mx-auto flex h-10 max-w-screen-2xl items-center justify-between gap-3 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wide">
          <FlaskConical className="size-4 shrink-0" />
          <span className="truncate">
            Modo simulación — datos de ejemplo, sin guardar cambios
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDemoMode(false)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="size-3.5" />
          Salir
        </button>
      </div>
    </div>
  );
}
