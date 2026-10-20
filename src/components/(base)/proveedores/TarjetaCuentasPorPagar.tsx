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
        "bg-white dark:bg-[#171a17] border border-[#C1D1C5]/30 dark:border-[#525D53]/30 rounded-2xl p-3 md:p-4 lg:p-5 shadow-sm min-w-0",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg text-amber-600 shrink-0">
          <Wallet className="size-4 md:size-5" />
        </div>
        <h3 className="text-etiqueta md:text-sm font-bold text-texto-tenue uppercase tracking-wider">
          Cuentas por pagar
        </h3>
      </div>
      <p className="text-[12px] min-[380px]:text-sm sm:text-base md:text-lg lg:text-2xl font-black text-zinc-900 dark:text-white max-md:tracking-tighter max-md:break-words max-md:whitespace-normal max-md:leading-tight md:tracking-tight">
        {fmtQ(totalPendiente)}
      </p>
      <p className="text-xs font-bold text-rose-500 mt-1">
        Vencido: {fmtQ(totalVencido)}
      </p>
    </div>
  );
}
