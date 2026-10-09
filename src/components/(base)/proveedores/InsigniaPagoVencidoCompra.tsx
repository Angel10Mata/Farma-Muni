"use client";

import { cn } from "@/lib/utils";

export function InsigniaPagoVencidoCompra({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
        className,
      )}
    >
      Pago vencido
    </span>
  );
}
