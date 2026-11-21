"use client";

import { cn } from "@/lib/utils";

type SigetNuevoExistenteToggleProps = {
  ariaLabel: string;
  modoNuevo: boolean;
  onModoNuevoChange: (nuevo: boolean) => void;
  existenteDisabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function SigetNuevoExistenteToggle({
  ariaLabel,
  modoNuevo,
  onModoNuevoChange,
  existenteDisabled = false,
  compact = false,
  className,
}: SigetNuevoExistenteToggleProps) {
  const activoClass = "text-[#2c5f9b] dark:text-[#6f9fd4]";
  const inactivoClass = "text-texto-secundario";

  const irAExistente = () => {
    if (!existenteDisabled) onModoNuevoChange(false);
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900",
        compact
          ? "h-10 w-[10.75rem] gap-1.5 rounded-lg px-2 py-1"
          : "w-full gap-3 rounded-2xl px-4 py-3",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={cn(
          "min-w-0 font-semibold transition-colors",
          compact ? "flex-1 text-etiqueta leading-tight" : "flex-1 text-left text-sm",
          modoNuevo ? activoClass : inactivoClass,
        )}
        onClick={() => onModoNuevoChange(true)}
      >
        Nuevo
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={!modoNuevo}
        aria-label={modoNuevo ? "Cambiar a existente" : "Cambiar a nuevo"}
        disabled={existenteDisabled && modoNuevo}
        onClick={() => (modoNuevo ? irAExistente() : onModoNuevoChange(true))}
        className={cn(
          "relative shrink-0 rounded-full border-2 transition-colors",
          compact ? "h-5 w-9" : "h-8 w-[3.25rem]",
          modoNuevo
            ? "border-zinc-300 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800"
            : "border-[#2c5f9b] bg-[#2c5f9b] dark:border-[#6f9fd4] dark:bg-[#6f9fd4]",
          existenteDisabled && modoNuevo && "cursor-not-allowed opacity-60",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 rounded-full bg-zinc-900 shadow-sm transition-transform dark:bg-zinc-950",
            compact ? "size-3.5" : "size-6",
            !modoNuevo && (compact ? "translate-x-[1.05rem]" : "translate-x-[1.35rem]"),
          )}
        />
      </button>
      <button
        type="button"
        disabled={existenteDisabled}
        className={cn(
          "min-w-0 font-semibold transition-colors",
          compact ? "flex-1 text-right text-etiqueta leading-tight" : "flex-1 text-right text-sm",
          !modoNuevo ? activoClass : inactivoClass,
          existenteDisabled && "cursor-not-allowed opacity-40",
        )}
        onClick={irAExistente}
      >
        Existente
      </button>
    </div>
  );
}
