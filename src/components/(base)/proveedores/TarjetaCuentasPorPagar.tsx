"use client";

import { Wallet } from "lucide-react";
import { cn, fmtQ } from "@/lib/utils";

type TarjetaCuentasPorPagarProps = {
  totalPendiente: number;
  totalVencido: number;
  className?: string;
};

export function TarjetaCuentasPorPagar({
  totalPendiente,
  totalVencido,
  className,
}: TarjetaCuentasPorPagarProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-4 md:p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg text-amber-600 shrink-0">
          <Wallet className="size-4 md:size-5" />
        </div>
        <h3 className="text-[10px] md:text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Cuentas por pagar
        </h3>
      </div>
      <p className="text-lg md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
        {fmtQ(totalPendiente)}
      </p>
      <p className="text-xs font-bold text-rose-500 mt-1">
        Vencido: {fmtQ(totalVencido)}
      </p>
    </div>
  );
}
