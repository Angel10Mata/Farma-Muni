"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, ChevronDown, FileDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleInformeOpcion = {
  titulo: string;
  onPdf?: () => void | Promise<void>;
  onExcel?: () => void | Promise<void>;
  pdfDisabled?: boolean;
  excelDisabled?: boolean;
};

type ModuleInformeDropdownProps = {
  items: ModuleInformeOpcion[];
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  panelMinWidthClass?: string;
  beforeItems?: React.ReactNode;
};

export function ModuleInformeDropdown({
  items,
  disabled = false,
  busy = false,
  className,
  panelMinWidthClass = "min-w-[240px]",
  beforeItems,
}: ModuleInformeDropdownProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const inactivo = disabled || busy;

  const ejecutar = (fn?: () => void | Promise<void>) => {
    if (!fn || inactivo) return;
    setAbierto(false);
    void fn();
  };

  if (items.length === 0) return null;

  return (
    <div className={cn("relative", abierto && "z-[250]", className)} ref={ref}>
      <button
        type="button"
        disabled={inactivo}
        onClick={() => setAbierto((v) => !v)}
        className={cn(
          "justify-center px-3 py-2 rounded-xl border text-[11px] md:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
          abierto
            ? "border-[#8DA78E] bg-[#8DA78E]/15 text-[#525D53] dark:text-[#A3BEB0]"
            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800",
          inactivo && "pointer-events-none opacity-60",
        )}
      >
        <BarChart3 className="size-3.5 shrink-0" />
        Informe
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform duration-200",
            abierto && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence>
        {abierto ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full z-[250] mt-2 flex flex-col gap-0.5 rounded-2xl border border-slate-200/80 bg-white p-2 opacity-100 shadow-xl dark:border-slate-800/80 dark:bg-zinc-900",
              panelMinWidthClass,
            )}
          >
            {beforeItems}
            {items.map((informe) => (
              <div
                key={informe.titulo}
                className="rounded-xl border border-transparent px-1 py-1 hover:border-slate-100 dark:hover:border-zinc-800"
              >
                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {informe.titulo}
                </p>
                <div className="flex gap-1 px-1 pb-1">
                  {informe.onPdf ? (
                    <button
                      type="button"
                      disabled={inactivo || informe.pdfDisabled}
                      onClick={() => ejecutar(informe.onPdf)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FileText className="size-3 shrink-0 text-[#8DA78E]" />
                      PDF
                    </button>
                  ) : null}
                  {informe.onExcel ? (
                    <button
                      type="button"
                      disabled={inactivo || informe.excelDisabled}
                      onClick={() => ejecutar(informe.onExcel)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FileDown className="size-3 shrink-0 text-emerald-600" />
                      Excel
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
