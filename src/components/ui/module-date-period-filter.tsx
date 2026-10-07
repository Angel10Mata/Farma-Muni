"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  moduleDateFilterShellClass,
  modulePillSwitchBtnClass,
  modulePillSwitchShellClass,
} from "@/components/ui/module-pill-switch";

export const moduleDateFilterControlButtonClass =
  "flex h-[42px] min-w-[8.75rem] shrink-0 cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-2.5 text-left transition-all hover:border-[#8DA78E] focus:outline-none focus:ring-1 focus:ring-[#8DA78E] dark:border-slate-800 dark:bg-zinc-900 sm:min-w-[8.75rem]";

export const moduleDateFilterPickersClass =
  "flex min-w-0 flex-wrap items-center gap-2 sm:gap-3";

export const moduleDateFilterPeriodShellClass =
  "flex h-[42px] shrink-0 items-center";

export type ModuleDatePeriodOption = {
  id: string;
  label: string;
};

type ModuleDateFilterLayoutProps = {
  className?: string;
  periodValue: string;
  periodOptions: readonly ModuleDatePeriodOption[];
  onPeriodChange: (id: string) => void;
  periodAriaLabel?: string;
  children: ReactNode;
};

export function ModuleDateFilterLayout({
  className,
  periodValue,
  periodOptions,
  onPeriodChange,
  periodAriaLabel = "Periodo",
  children,
}: ModuleDateFilterLayoutProps) {
  return (
    <div className={cn(moduleDateFilterShellClass, "items-center", className)}>
      <div
        className={cn(
          modulePillSwitchShellClass,
          moduleDateFilterPeriodShellClass,
        )}
        role="tablist"
        aria-label={periodAriaLabel}
      >
        {periodOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={periodValue === opt.id}
            onClick={() => onPeriodChange(opt.id)}
            className={cn(
              modulePillSwitchBtnClass(periodValue === opt.id),
              "py-1.5",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className={moduleDateFilterPickersClass}>{children}</div>
    </div>
  );
}
